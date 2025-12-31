# backend/uploads/main.py
import os
import shutil
import asyncio
import json
import io
from contextlib import asynccontextmanager
from datetime import datetime, timedelta
from typing import Optional, List

import httpx
from starlette.middleware.base import BaseHTTPMiddleware
from fastapi import FastAPI, File, UploadFile, HTTPException, Depends, status, Form, Request
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.staticfiles import StaticFiles
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr
from sqlalchemy import Column, Integer, String, DateTime, Float, Boolean, ForeignKey, create_engine, select, desc
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import declarative_base, sessionmaker, relationship, Session
from dotenv import load_dotenv

# ✅ IMPORT DU NETTOYEUR ET SÉCURITÉ
from cleanup import start_cleanup_loop
from openai import OpenAI
from security_service_local import SecurityService

# Charger les variables d'environnement
load_dotenv()

# Initialiser le service de sécurité
security_service = SecurityService()

# --- Configuration ---
SECRET_KEY = os.getenv("JWT_SECRET", "CHANGE_THIS_TO_A_STRONG_SECRET")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60
TTL_MINUTES = 1440  # 24 heures au lieu de 3 jours

# Utilise une variable d'environnement pour la clé OpenAI, ou mets-la ici si test local
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
openai_client = OpenAI(api_key=OPENAI_API_KEY)

DATABASE_URL = "sqlite:///./auth.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# --- Dependency pour la DB (Gestion automatique des fermetures) ---
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- Models Base de Données ---
class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    # Relations
    analyses = relationship("Analysis", back_populates="owner")
    patients = relationship("Patient", back_populates="doctor")

class Patient(Base):
    __tablename__ = "patients"
    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String, index=True)
    age = Column(Integer)
    gender = Column(String)
    phone = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    doctor_id = Column(Integer, ForeignKey("users.id"))

    doctor = relationship("User", back_populates="patients")
    analyses = relationship("Analysis", back_populates="patient")

class Analysis(Base):
    __tablename__ = "analyses"
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, index=True)
    has_glaucoma = Column(Boolean)
    confidence = Column(Float)
    timestamp = Column(DateTime, default=datetime.utcnow)
    user_id = Column(Integer, ForeignKey("users.id"))
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=True)

    owner = relationship("User", back_populates="analyses")
    patient = relationship("Patient", back_populates="analyses")

Base.metadata.create_all(bind=engine)

# --- SCHEMAS PYDANTIC (Nettoyés et Ordonnés) ---

class UserCreate(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

class PatientCreate(BaseModel):
    full_name: str
    age: int
    gender: str
    phone: Optional[str] = None

# ✅ On fusionne les deux définitions de AnalysisResponse
class AnalysisResponse(BaseModel):
    id: int
    filename: str
    has_glaucoma: bool
    confidence: float
    timestamp: datetime
    image_url: Optional[str] = None
    is_expired: bool = False
    patient_name: Optional[str] = None

class PatientDetail(BaseModel):
    id: int
    full_name: str
    age: int
    gender: str
    phone: Optional[str]
    analyses: List[AnalysisResponse] = []

# --- Helpers ---
def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_user_by_email(db: Session, email: str):
    return db.execute(select(User).where(User.email == email)).scalar_one_or_none()

def authenticate_user(db: Session, email: str, password: str):
    user = get_user_by_email(db, email)
    if not user or not verify_password(password, user.hashed_password):
        return None
    return user

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Impossible d'authentifier",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
        token_data = TokenData(email=email)
    except JWTError:
        raise credentials_exception

    user = get_user_by_email(db, token_data.email)
    if user is None:
        raise credentials_exception
    return user

# --- Config Dossiers ---
UPLOAD_DIRECTORY = "uploaded_images"
DL_SERVICE_URL = "http://localhost:8001/analyze/"
os.makedirs(UPLOAD_DIRECTORY, exist_ok=True)

# --- Lifespan ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    print("🚀 Démarrage du nettoyeur...")
    cleaner_task = asyncio.create_task(
        start_cleanup_loop(UPLOAD_DIRECTORY, TTL_MINUTES)
    )
    yield
    print("🛑 Arrêt du nettoyeur...")
    cleaner_task.cancel()
    try:
        await cleaner_task
    except asyncio.CancelledError:
        pass

# --- APP ---
app = FastAPI(lifespan=lifespan)

class ForceCorsMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Methods"] = "*"
        response.headers["Access-Control-Allow-Headers"] = "*"
        return response

app.add_middleware(ForceCorsMiddleware)

origins = ["http://localhost:5173", "http://localhost:3000"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/images", StaticFiles(directory=UPLOAD_DIRECTORY), name="images")

# --- Routes Auth ---
@app.post("/signup", status_code=201)
def signup(user_in: UserCreate, db: Session = Depends(get_db)):
    try:
        existing_user = get_user_by_email(db, user_in.email)
        if existing_user:
            raise HTTPException(status_code=400, detail="Email déjà utilisé")

        hashed_password = get_password_hash(user_in.password)
        new_user = User(email=user_in.email, hashed_password=hashed_password)
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        return {"msg": "Utilisateur créé", "email": new_user.email}
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Erreur intégrité BD")

@app.post("/token", response_model=Token)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Identifiants invalides")
    
    access_token = create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}


# --- Route Chat ---
@app.post("/chat")
async def chat_with_doctor(
        message: str = Form(...),
        file: UploadFile = File(None),
        history: str = Form("[]"),
        analysis_context: str = Form(None) # Le contexte envoyé par le Frontend
):
    system_instruction = """
    Tu es un Assistant Clinique IA spécialisé en Ophtalmologie. Tu t'adresses exclusivement à des médecins.
    
    TON RÔLE :
    1. Assister le médecin dans l'interprétation des images de fond d'œil.
    2. Rédiger des suggestions de comptes-rendus médicaux en langage technique (ex: utiliser des termes comme 'Rapport C/D', 'Règle ISNT', 'Excavation papillaire').
    3. Proposer des diagnostics différentiels basés sur les données fournies.
    
    TON TON :
    - Professionnel, concis, technique, factuel.
    - Pas de "Je suis une IA", va droit au but médical.
    """

    # 1. ANALYSE IMAGE (Si uploadé dans le chat)
    current_image_context = ""
    if file:
        file_location = os.path.join(UPLOAD_DIRECTORY, f"chat_{file.filename}")
        with open(file_location, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        try:
            async with httpx.AsyncClient() as client:
                with open(file_location, "rb") as f:
                    files = {'file': (file.filename, f, file.content_type)}
                    response = await client.post(DL_SERVICE_URL, files=files)

            if response.status_code == 200:
                result = response.json()
                status = "GLAUCOME DÉTECTÉ (Risque Élevé)" if result['prediction_class'] == 1 else "AUCUNE ANOMALIE DÉTECTÉE (Sain)"
                confiance = f"{result['probability']*100:.1f}%"
                current_image_context = f"[NOUVELLE IMAGE ANALYSÉE]\nStatut: {status}\nConfiance: {confiance}\n"
        except Exception as e:
            current_image_context = f"[ERREUR] Impossible d'analyser l'image : {str(e)}"
        finally:
            # Nettoyage du fichier temporaire du chat
            if os.path.exists(file_location):
                os.remove(file_location)

    # 2. CONSTRUCTION DU CONTEXTE FINAL
    # On privilégie l'image qu'on vient d'uploader, sinon on prend le contexte envoyé par le front
    final_context_str = current_image_context if current_image_context else (analysis_context or "")

    # 3. PRÉPARATION DES MESSAGES
    try:
        messages_history = json.loads(history)
    except:
        messages_history = []

    gpt_messages = [{"role": "system", "content": system_instruction}]
    for msg in messages_history[-5:]:
        gpt_messages.append(msg)

    final_user_content = f"{final_context_str}\n\nQuestion: {message}" if final_context_str else message
    gpt_messages.append({"role": "user", "content": final_user_content})

    # 4. GÉNÉRATEUR DE STREAM
    async def generate_response():
        try:
            # Réponse simulée pour la démonstration (sans OpenAI)
            demo_response = """
Analyse de l'image de fond d'œil :

**Diagnostic IA :** Glaucome détecté avec une confiance de 98.5%

**Observations cliniques :**
- Excavation papillaire importante
- Rapport cup/disc élevé (>0.7)
- Amincissement de l'anneau neuro-rétinien
- Signes compatibles avec une neuropathie optique glaucomateuse

**Recommandations :**
1. Confirmation par examen clinique approfondi
2. Mesure de la pression intraoculaire
3. Champ visuel automatisé
4. OCT du nerf optique et des fibres nerveuses
5. Suivi ophtalmologique rapproché

**Note :** Cette analyse IA est un outil d'aide au diagnostic et ne remplace pas l'expertise médicale.
            """
            
            # Simuler un streaming progressif
            words = demo_response.split()
            for i, word in enumerate(words):
                yield word + " "
                if i % 5 == 0:  # Pause tous les 5 mots
                    import asyncio
                    await asyncio.sleep(0.1)
                    
        except Exception as e:
            yield f"Erreur de génération : {str(e)}"

    return StreamingResponse(generate_response(), media_type="text/plain")


# --- Routes Patients ---

@app.get("/patients")
def get_my_patients(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    patients = db.query(Patient).filter(Patient.doctor_id == current_user.id).all()
    return patients

@app.get("/patients/{patient_id}", response_model=PatientDetail)
def get_patient_details(patient_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    patient = db.query(Patient).filter(
        Patient.id == patient_id,
        Patient.doctor_id == current_user.id
    ).first()

    if not patient:
        raise HTTPException(status_code=404, detail="Patient introuvable")

    analyses_formatted = []
    sorted_analyses = sorted(patient.analyses, key=lambda x: x.timestamp, reverse=True)

    for ana in sorted_analyses:
        file_path = os.path.join(UPLOAD_DIRECTORY, ana.filename)
        exists = os.path.exists(file_path)
        
        # Gestion des fichiers chiffrés
        if exists and ana.filename.endswith('.encrypted'):
            image_url = f"http://localhost:8000/secure-image/{ana.filename}"
            display_filename = ana.filename.replace('.encrypted', '')
        elif exists:
            image_url = f"http://localhost:8000/images/{ana.filename}"
            display_filename = ana.filename
        else:
            image_url = None
            display_filename = ana.filename.replace('.encrypted', '') if ana.filename.endswith('.encrypted') else ana.filename

        analyses_formatted.append({
            "id": ana.id,
            "filename": display_filename,
            "has_glaucoma": ana.has_glaucoma,
            "confidence": ana.confidence,
            "timestamp": ana.timestamp,
            "image_url": image_url,
            "is_expired": not exists,
            "patient_name": patient.full_name
        })

    response = {
        "id": patient.id,
        "full_name": patient.full_name,
        "age": patient.age,
        "gender": patient.gender,
        "phone": patient.phone,
        "analyses": analyses_formatted
    }
    return response

@app.post("/patients", status_code=201)
def create_patient(patient: PatientCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    new_patient = Patient(
        full_name=patient.full_name,
        age=patient.age,
        gender=patient.gender,
        phone=patient.phone,
        doctor_id=current_user.id
    )
    db.add(new_patient)
    db.commit()
    db.refresh(new_patient)
    
    return {"message": "Patient enregistré", "patient": new_patient}


# --- Routes Upload & History ---

@app.post("/uploadfile/")
async def create_upload_file(
        file: UploadFile = File(...),
        patient_id: int = Form(...),
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
):
    if not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="Fichier invalide.")

    timestamp_str = datetime.now().strftime("%Y%m%d_%H%M%S")
    clean_filename = f"{timestamp_str}_{file.filename}"
    file_location = os.path.join(UPLOAD_DIRECTORY, clean_filename)

    try:
        # 1. Sauvegarde temporaire
        with open(file_location, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # 2. Chiffrement sécurisé
        encrypted_path = security_service.secure_file_upload(
            file_location, 
            current_user.email, 
            current_user.id, 
            patient_id
        )
        
    except Exception as e:
        if os.path.exists(file_location):
            os.remove(file_location)
        raise HTTPException(status_code=500, detail=f"Erreur sécurisation: {e}")
    finally:
        await file.close()

    analysis_result = {}
    temp_file_for_analysis = None
    
    try:
        # 3. Déchiffrement temporaire pour analyse IA
        temp_file_for_analysis = security_service.secure_file_access(
            encrypted_path, 
            current_user.email, 
            current_user.id,
            temp_access=True
        )
        
        # 4. Analyse IA
        async with httpx.AsyncClient(timeout=60.0) as client:
            with open(temp_file_for_analysis, "rb") as f:
                files = {'file': (clean_filename, f, file.content_type)}
                response = await client.post(DL_SERVICE_URL, files=files)

            if response.status_code == 200:
                analysis_result = response.json()

                # Vérifier patient
                patient = db.query(Patient).filter(Patient.id == patient_id, Patient.doctor_id == current_user.id).first()
                if not patient:
                    raise HTTPException(status_code=404, detail="Patient introuvable")

                # Sauvegarder avec nom chiffré
                encrypted_filename = os.path.basename(encrypted_path)
                new_analysis = Analysis(
                    filename=encrypted_filename,
                    has_glaucoma=bool(analysis_result.get("prediction_class") == 1),
                    confidence=float(analysis_result.get("probability", 0)),
                    user_id=current_user.id,
                    patient_id=patient.id
                )
                db.add(new_analysis)
                db.commit()
            else:
                analysis_result = {"error": "Erreur DL", "details": response.text}
    except httpx.RequestError:
        analysis_result = {"error": "Service DL injoignable"}
    finally:
        # 5. Nettoyage fichier temporaire
        if temp_file_for_analysis and os.path.exists(temp_file_for_analysis):
            security_service.cleanup_temp_file(temp_file_for_analysis, current_user.email, current_user.id)

    return {
        "filename": clean_filename,
        "message": "Analyse terminée (fichier sécurisé)",
        "analysis": {
            **analysis_result,
            "patient_name": patient.full_name if 'patient' in locals() and patient else "Inconnu"
        }
    }

@app.get("/history", response_model=List[AnalysisResponse])
def get_user_history(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    analyses = db.execute(
        select(Analysis)
        .where(Analysis.user_id == current_user.id)
        .order_by(desc(Analysis.timestamp))
    ).scalars().all()

    history_data = []
    for ana in analyses:
        file_path = os.path.join(UPLOAD_DIRECTORY, ana.filename)
        exists = os.path.exists(file_path)
        
        # Pour les fichiers chiffrés, utiliser l'endpoint sécurisé
        if exists and ana.filename.endswith('.encrypted'):
            image_url = f"http://localhost:8000/secure-image/{ana.filename}"
            # Nom d'affichage sans l'extension .encrypted
            display_filename = ana.filename.replace('.encrypted', '')
        elif exists:
            # Fichiers non chiffrés (rétrocompatibilité)
            image_url = f"http://localhost:8000/images/{ana.filename}"
            display_filename = ana.filename
        else:
            image_url = None
            display_filename = ana.filename.replace('.encrypted', '') if ana.filename.endswith('.encrypted') else ana.filename
        
        pat_name = ana.patient.full_name if ana.patient else "Inconnu"

        history_data.append({
            "id": ana.id,
            "filename": display_filename,
            "has_glaucoma": ana.has_glaucoma,
            "confidence": ana.confidence,
            "timestamp": ana.timestamp,
            "image_url": image_url,
            "is_expired": not exists,
            "patient_name": pat_name
        })

    return history_data

@app.get("/dashboard/stats")
def get_dashboard_stats(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    total_patients = db.query(Patient).filter(Patient.doctor_id == current_user.id).count()
    total_analyses = db.query(Analysis).filter(Analysis.user_id == current_user.id).count()
    total_glaucoma = db.query(Analysis).filter(
        Analysis.user_id == current_user.id,
        Analysis.has_glaucoma == True
    ).count()

    recent_patients = db.query(Patient).filter(Patient.doctor_id == current_user.id) \
        .order_by(desc(Patient.created_at)).limit(5).all()

    return {
        "total_patients": total_patients,
        "total_analyses": total_analyses,
        "total_glaucoma": total_glaucoma,
        "recent_patients": recent_patients
    }

@app.post("/chat/guide")
async def chat_guide(
        message: str = Form(...),
        history: str = Form("[]")
):
    # 👇 CONTEXTE FONCTIONNEL (Mode d'emploi)
    app_manual = """
    FONCTIONNALITÉS DE L'APPLICATION (MODE D'EMPLOI) :
    1. DASHBOARD : C'est l'écran d'accueil. Vous pouvez y voir vos statistiques et le bouton "Nouveau Patient" pour créer un dossier.
    2. ANALYSE : Pour analyser une image, allez dans le Dashboard ou cliquez sur "Analyse".
       - Étape 1 : Sélectionnez le patient dans la liste.
       - Étape 2 : Glissez l'image du fond d'œil.
       - Résultat : L'IA affiche le diagnostic (Sain/Glaucome) et une vue 3D.
    3. VUE 3D : Permet de visualiser le relief de la rétine pour mieux voir l'excavation du nerf optique.
    4. HISTORIQUE : Retrouvez tous les examens passés, classés par date ou par patient.
    5. RAPPORT PDF : Disponible après chaque analyse pour impression.
    """

    system_instruction = f"""
    Tu es le "Guide Support" de l'application GlaucomaAI. Tu t'adresses à des médecins.
    
    TES RÈGLES D'OR :
    1. Ton seul but est d'expliquer COMMENT UTILISER l'application.
    2. NE PARLE JAMAIS de technique (pas de Python, React, CNN, MobileNet, etc.). Si on demande comment l'IA marche, réponds simplement : "Notre système analyse la texture de la rétine pour identifier les anomalies", c'est tout.
    3. Sois court, poli et serviable.
    4. Si le médecin a un problème, guide-le étape par étape selon le manuel ci-dessous.

    {app_manual}
    """

    # Préparation des messages
    try:
        messages_history = json.loads(history)
    except:
        messages_history = []

    gpt_messages = [{"role": "system", "content": system_instruction}]

    # On garde un historique court pour le support
    for msg in messages_history[-3:]:
        gpt_messages.append(msg)

    gpt_messages.append({"role": "user", "content": message})

    # Générateur de stream
    async def generate_response():
        try:
            stream = openai_client.chat.completions.create(
                model="gpt-4o",
                messages=gpt_messages,
                stream=True,
            )
            for chunk in stream:
                if chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content
        except Exception as e:
            yield f"Désolé, je ne peux pas répondre pour le moment. ({str(e)})"

    return StreamingResponse(generate_response(), media_type="text/plain")