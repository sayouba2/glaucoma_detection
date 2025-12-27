# backend/uploads/main.py
import os
import shutil
import asyncio
import json
from contextlib import asynccontextmanager
from datetime import datetime, timedelta
from typing import Optional, List

import httpx
from starlette.middleware.base import BaseHTTPMiddleware
from fastapi import FastAPI, File, UploadFile, HTTPException, Depends, status, Form, Header
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

# ✅ IMPORT DU NETTOYEUR
from cleanup import start_cleanup_loop
from openai import OpenAI

# --- Configuration ---
SECRET_KEY = os.getenv("JWT_SECRET", "CHANGE_THIS_TO_A_STRONG_SECRET")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60
TTL_MINUTES = 4320

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
openai_client = OpenAI(api_key=OPENAI_API_KEY)

DATABASE_URL = "sqlite:///./auth.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# --- SYSTÈME DE TRADUCTION BACKEND ---
# Dictionnaire des messages API
MESSAGES = {
    "fr": {
        "email_taken": "Email déjà utilisé",
        "db_error": "Erreur intégrité BD",
        "login_fail": "Identifiants invalides",
        "auth_fail": "Impossible d'authentifier",
        "patient_404": "Patient introuvable",
        "patient_created": "Patient enregistré",
        "file_invalid": "Fichier invalide (image requise)",
        "save_error": "Erreur sauvegarde",
        "dl_error": "Service DL injoignable",
        "analysis_done": "Analyse terminée",
        "glaucoma_high": "GLAUCOME DÉTECTÉ (Risque Élevé)",
        "glaucoma_low": "AUCUNE ANOMALIE DÉTECTÉE (Sain)",
        "lang_name": "Français"
    },
    "en": {
        "email_taken": "Email already registered",
        "db_error": "DB Integrity Error",
        "login_fail": "Invalid credentials",
        "auth_fail": "Could not authenticate",
        "patient_404": "Patient not found",
        "patient_created": "Patient registered",
        "file_invalid": "Invalid file (image required)",
        "save_error": "Save error",
        "dl_error": "DL Service unreachable",
        "analysis_done": "Analysis complete",
        "glaucoma_high": "GLAUCOMA DETECTED (High Risk)",
        "glaucoma_low": "NO ANOMALY DETECTED (Healthy)",
        "lang_name": "English"
    },
    "es": {
        "email_taken": "Correo ya registrado",
        "db_error": "Error de integridad BD",
        "login_fail": "Credenciales inválidas",
        "auth_fail": "No se pudo autenticar",
        "patient_404": "Paciente no encontrado",
        "patient_created": "Paciente registrado",
        "file_invalid": "Archivo inválido (se requiere imagen)",
        "save_error": "Error al guardar",
        "dl_error": "Servicio DL inalcanzable",
        "analysis_done": "Análisis completado",
        "glaucoma_high": "GLAUCOMA DETECTADO (Alto Riesgo)",
        "glaucoma_low": "NINGUNA ANOMALÍA DETECTADA (Sano)",
        "lang_name": "Spanish"
    },
    "ar": {
        "email_taken": "البريد الإلكتروني مسجل بالفعل",
        "db_error": "خطأ في قاعدة البيانات",
        "login_fail": "بيانات الاعتماد غير صالحة",
        "auth_fail": "تعذر المصادقة",
        "patient_404": "المريض غير موجود",
        "patient_created": "تم تسجيل المريض",
        "file_invalid": "ملف غير صالح (مطلوب صورة)",
        "save_error": "خطأ في الحفظ",
        "dl_error": "خدمة التحليل غير متاحة",
        "analysis_done": "اكتمل التحليل",
        "glaucoma_high": "تم اكتشاف جلوكوما (خطر مرتفع)",
        "glaucoma_low": "لم يتم اكتشاف أي تشوهات (سليم)",
        "lang_name": "Arabic"
    }
}

# Fonction helper pour récupérer la langue et les messages
def get_messages(accept_language: str = Header("fr")):
    # On prend les 2 premiers caractères (ex: "fr-FR" -> "fr")
    lang_code = accept_language.split(",")[0].split("-")[0]
    return MESSAGES.get(lang_code, MESSAGES["fr"]) # Fallback sur FR

def get_language_name(accept_language: str = Header("fr")):
    lang_code = accept_language.split(",")[0].split("-")[0]
    return MESSAGES.get(lang_code, MESSAGES["fr"])["lang_name"]


# --- Dependency pour la DB ---
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

# --- SCHEMAS PYDANTIC ---
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
    # Note: On garde le message d'erreur hardcodé ici car il est souvent interne au protocole OAuth
    # mais on pourrait le traduire aussi si besoin strict.
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not authenticate",
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

# Middleware pour CORS (Images statiques)
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
def signup(
        user_in: UserCreate,
        db: Session = Depends(get_db),
        accept_language: str = Header("fr") # ✅ Réception de la langue
):
    msgs = get_messages(accept_language)
    try:
        existing_user = get_user_by_email(db, user_in.email)
        if existing_user:
            raise HTTPException(status_code=400, detail=msgs["email_taken"]) # ✅ Message traduit

        hashed_password = get_password_hash(user_in.password)
        new_user = User(email=user_in.email, hashed_password=hashed_password)
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        return {"msg": "Utilisateur créé", "email": new_user.email}
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail=msgs["db_error"])

@app.post("/token", response_model=Token)
def login_for_access_token(
        form_data: OAuth2PasswordRequestForm = Depends(),
        db: Session = Depends(get_db),
        accept_language: str = Header("fr")
):
    msgs = get_messages(accept_language)
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=msgs["login_fail"]) # ✅ Traduit
    access_token = create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}


# --- Route Chat ---
@app.post("/chat")
async def chat_with_doctor(
        message: str = Form(...),
        file: UploadFile = File(None),
        history: str = Form("[]"),
        analysis_context: str = Form(None),
        accept_language: str = Header("fr") # ✅ Récupération de la langue
):
    msgs = get_messages(accept_language)
    lang_name = get_language_name(accept_language) # ex: "English"

    # ✅ INSTRUCTION SYSTÈME DYNAMIQUE
    system_instruction = f"""
    You are an AI Clinical Assistant specialized in Ophthalmology.
    
    IMPORTANT: You MUST answer in {lang_name}.
    
    YOUR ROLE:
    1. Assist the doctor in interpreting fundus images.
    2. Suggest medical reports using technical terminology appropriate for {lang_name}.
    3. Propose differential diagnoses.
    
    TONE: Professional, concise, technical, factual. No "I am an AI", go straight to the medical point.
    """

    # 1. ANALYSE IMAGE
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
                # ✅ Statut traduit pour l'IA
                status_txt = msgs["glaucoma_high"] if result['prediction_class'] == 1 else msgs["glaucoma_low"]
                confiance = f"{result['probability']*100:.1f}%"
                current_image_context = f"[IMAGE CONTEXT]\nStatus: {status_txt}\nConfidence: {confiance}\n"
        except Exception as e:
            current_image_context = f"[ERROR] Image analysis failed: {str(e)}"

    # 2. CONTEXTE
    final_context_str = current_image_context if current_image_context else (analysis_context or "")

    # 3. MESSAGES
    try:
        messages_history = json.loads(history)
    except:
        messages_history = []

    gpt_messages = [{"role": "system", "content": system_instruction}]
    for msg in messages_history[-5:]:
        gpt_messages.append(msg)

    final_user_content = f"{final_context_str}\n\nQuestion: {message}" if final_context_str else message
    gpt_messages.append({"role": "user", "content": final_user_content})

    # 4. GÉNÉRATION
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
            yield f"Error: {str(e)}"

    return StreamingResponse(generate_response(), media_type="text/plain")


# --- Routes Patients ---

@app.get("/patients")
def get_my_patients(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    patients = db.query(Patient).filter(Patient.doctor_id == current_user.id).all()
    return patients

@app.get("/patients/{patient_id}", response_model=PatientDetail)
def get_patient_details(
        patient_id: int,
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db),
        accept_language: str = Header("fr")
):
    msgs = get_messages(accept_language)
    patient = db.query(Patient).filter(
        Patient.id == patient_id,
        Patient.doctor_id == current_user.id
    ).first()

    if not patient:
        raise HTTPException(status_code=404, detail=msgs["patient_404"]) # ✅ Traduit

    analyses_formatted = []
    sorted_analyses = sorted(patient.analyses, key=lambda x: x.timestamp, reverse=True)

    for ana in sorted_analyses:
        file_path = os.path.join(UPLOAD_DIRECTORY, ana.filename)
        exists = os.path.exists(file_path)
        image_url = f"http://localhost:8000/images/{ana.filename}" if exists else None

        analyses_formatted.append({
            "id": ana.id,
            "filename": ana.filename,
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
def create_patient(
        patient: PatientCreate,
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db),
        accept_language: str = Header("fr")
):
    msgs = get_messages(accept_language)
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
    return {"message": msgs["patient_created"], "patient": new_patient} # ✅ Traduit


# --- Routes Upload & History ---

@app.post("/uploadfile/")
async def create_upload_file(
        file: UploadFile = File(...),
        patient_id: int = Form(...),
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db),
        accept_language: str = Header("fr")
):
    msgs = get_messages(accept_language)

    if not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail=msgs["file_invalid"]) # ✅ Traduit

    timestamp_str = datetime.now().strftime("%Y%m%d_%H%M%S")
    clean_filename = f"{timestamp_str}_{file.filename}"
    file_location = os.path.join(UPLOAD_DIRECTORY, clean_filename)

    try:
        with open(file_location, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"{msgs['save_error']}: {e}") # ✅ Traduit
    finally:
        await file.close()

    analysis_result = {}
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            with open(file_location, "rb") as f:
                files = {'file': (clean_filename, f, file.content_type)}
                response = await client.post(DL_SERVICE_URL, files=files)

            if response.status_code == 200:
                analysis_result = response.json()

                patient = db.query(Patient).filter(Patient.id == patient_id, Patient.doctor_id == current_user.id).first()
                if not patient:
                    raise HTTPException(status_code=404, detail=msgs["patient_404"])

                new_analysis = Analysis(
                    filename=clean_filename,
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
        analysis_result = {"error": msgs["dl_error"]} # ✅ Traduit

    return {
        "filename": clean_filename,
        "message": msgs["analysis_done"], # ✅ Traduit
        "analysis": {
            **analysis_result,
            "patient_name": patient.full_name if 'patient' in locals() and patient else "Inconnu"
        }
    }

@app.get("/history", response_model=List[AnalysisResponse])
def get_user_history(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Pas de message utilisateur ici, juste des données, donc pas de traduction nécessaire
    analyses = db.execute(
        select(Analysis)
        .where(Analysis.user_id == current_user.id)
        .order_by(desc(Analysis.timestamp))
    ).scalars().all()

    history_data = []
    for ana in analyses:
        file_path = os.path.join(UPLOAD_DIRECTORY, ana.filename)
        exists = os.path.exists(file_path)
        image_url = f"http://localhost:8000/images/{ana.filename}" if exists else None
        pat_name = ana.patient.full_name if ana.patient else "Inconnu"

        history_data.append({
            "id": ana.id,
            "filename": ana.filename,
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
        history: str = Form("[]"),
        accept_language: str = Header("fr")
):
    lang_name = get_language_name(accept_language)

    # 👇 CONTEXTE FONCTIONNEL (Mode d'emploi)
    # On laisse le manuel en français pour l'instant (l'IA traduira à la volée)
    app_manual = """
    APP MANUAL:
    1. DASHBOARD: Home screen with stats and 'New Patient'.
    2. ANALYSIS: Select patient -> Upload fundus image -> Get Result + 3D View.
    3. 3D VIEW: Visualize retina relief.
    4. HISTORY: Past exams.
    5. REPORT PDF: Downloadable medical report.
    """

    # ✅ INSTRUCTION TRADUITE
    system_instruction = f"""
    You are the "Support Guide" for GlaucomaAI.
    
    IMPORTANT: You MUST answer in {lang_name}.
    
    RULES:
    1. Explain HOW to use the app based on the manual below.
    2. NO technical talk (Python, React, etc.).
    3. Be short, polite, helpful.

    {app_manual}
    """

    try:
        messages_history = json.loads(history)
    except:
        messages_history = []

    gpt_messages = [{"role": "system", "content": system_instruction}]
    for msg in messages_history[-3:]:
        gpt_messages.append(msg)
    gpt_messages.append({"role": "user", "content": message})

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
            yield f"Error: {str(e)}"

    return StreamingResponse(generate_response(), media_type="text/plain")