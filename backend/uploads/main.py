# backend/uploads/main.py
import base64
import os
import shutil
import asyncio
import json
from contextlib import asynccontextmanager
from datetime import datetime, timedelta
from typing import Optional, List

import httpx
from starlette.middleware.base import BaseHTTPMiddleware
from fastapi import FastAPI, File, UploadFile, HTTPException, Depends, status, Form, Header, Request
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

def get_messages(accept_language: str = Header("fr")):
    lang_code = accept_language.split(",")[0].split("-")[0]
    return MESSAGES.get(lang_code, MESSAGES["fr"])

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
    gradcam_filename = Column(String, nullable=True) # ✅ Colonne ajoutée pour stocker le nom du fichier GradCAM
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
    gradcam_url: Optional[str] = None # ✅ Ajouté pour le frontend
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
DL_SERVICE_URL = os.getenv("DL_SERVICE_URL", "http://localhost:8001/analyze/")
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

# Middleware pour CORS
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
        accept_language: str = Header("fr")
):
    msgs = get_messages(accept_language)
    try:
        existing_user = get_user_by_email(db, user_in.email)
        if existing_user:
            raise HTTPException(status_code=400, detail=msgs["email_taken"])

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
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=msgs["login_fail"])
    access_token = create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}


# --- Route Chat ---
@app.post("/chat")
async def chat_with_doctor(
        message: str = Form(...),
        file: UploadFile = File(None),
        history: str = Form("[]"),
        analysis_context: str = Form(None),
        accept_language: str = Header("fr")
):
    msgs = get_messages(accept_language)
    lang_name = get_language_name(accept_language)

    system_instruction = f"""
    You are an AI Clinical Assistant specialized in Ophthalmology.
    IMPORTANT: You MUST answer in {lang_name}.
    YOUR ROLE:
    1. Assist the doctor in interpreting fundus images.
    2. Suggest medical reports using technical terminology appropriate for {lang_name}.
    3. Propose differential diagnoses.
    TONE: Professional, concise, technical, factual. No "I am an AI", go straight to the medical point.
    """

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
                status_txt = msgs["glaucoma_high"] if result['prediction_class'] == 1 else msgs["glaucoma_low"]
                confiance = f"{result['probability']*100:.1f}%"
                current_image_context = f"[IMAGE CONTEXT]\nStatus: {status_txt}\nConfidence: {confiance}\n"
        except Exception as e:
            current_image_context = f"[ERROR] Image analysis failed: {str(e)}"

    final_context_str = current_image_context if current_image_context else (analysis_context or "")

    try:
        messages_history = json.loads(history)
    except:
        messages_history = []

    gpt_messages = [{"role": "system", "content": system_instruction}]
    for msg in messages_history[-5:]:
        gpt_messages.append(msg)

    final_user_content = f"{final_context_str}\n\nQuestion: {message}" if final_context_str else message
    gpt_messages.append({"role": "user", "content": final_user_content})

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
        request: Request,
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
        raise HTTPException(status_code=404, detail=msgs["patient_404"])

    analyses_formatted = []
    sorted_analyses = sorted(patient.analyses, key=lambda x: x.timestamp, reverse=True)

    for ana in sorted_analyses:
        file_path = os.path.join(UPLOAD_DIRECTORY, ana.filename)
        exists = os.path.exists(file_path)
        
        # URL de base pour les images
        base_url = str(request.base_url).rstrip("/")
        image_url = f"{base_url}/images/{ana.filename}" if exists else None
        
        # ✅ Construction URL GradCAM
        gradcam_url = None
        if ana.gradcam_filename:
             gradcam_path = os.path.join(UPLOAD_DIRECTORY, ana.gradcam_filename)
             if os.path.exists(gradcam_path):
                gradcam_url = f"{base_url}/images/{ana.gradcam_filename}"

        analyses_formatted.append({
            "id": ana.id,
            "filename": ana.filename,
            "has_glaucoma": ana.has_glaucoma,
            "confidence": ana.confidence,
            "timestamp": ana.timestamp,
            "image_url": image_url,
            "gradcam_url": gradcam_url, # ✅ Ajouté
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
    return {"message": msgs["patient_created"], "patient": new_patient}


# --- Routes Upload & History ---

@app.post("/uploadfile/")
async def create_upload_file(
        request: Request, # <--- 1. AJOUT IMPORTANT ICI
        file: UploadFile = File(...),
        patient_id: int = Form(...),
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db),
        accept_language: str = Header("fr")
):
    msgs = get_messages(accept_language)

    # --- MODIFICATION DICOM ---
    import pydicom
    from PIL import Image
    import numpy as np
    import io

    is_dicom = file.filename.lower().endswith('.dcm') or file.content_type == 'application/dicom'
    
    if not is_dicom and not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail=msgs["file_invalid"])

    timestamp_str = datetime.now().strftime("%Y%m%d_%H%M%S")
    # Si c'est un DICOM, on le convertira en PNG
    extension = ".png" if is_dicom else os.path.splitext(file.filename)[1]
    clean_filename = f"{timestamp_str}_{os.path.splitext(file.filename)[0]}{extension}"
    file_location = os.path.join(UPLOAD_DIRECTORY, clean_filename)

    # Vérification patient
    patient = db.query(Patient).filter(Patient.id == patient_id, Patient.doctor_id == current_user.id).first()
    if not patient:
        raise HTTPException(status_code=404, detail=msgs["patient_404"])

    try:
        content = await file.read()
        if is_dicom:
            try:
                # Lecture DICOM
                ds = pydicom.dcmread(io.BytesIO(content))
                pixel_array = ds.pixel_array
                
                # Normalisation si nécessaire (ex: convertir en uint8)
                if 'RescaleSlope' in ds and 'RescaleIntercept' in ds:
                     pixel_array = pixel_array * ds.RescaleSlope + ds.RescaleIntercept

                # Normalisation 0-255 pour l'image
                pixel_array = pixel_array.astype(float)
                pixel_array = (np.maximum(pixel_array, 0) / pixel_array.max()) * 255.0
                pixel_array = np.uint8(pixel_array)

                # Conversion en Image PIL
                image = Image.fromarray(pixel_array)
                image.save(file_location)
            except Exception as e:
                 raise HTTPException(status_code=400, detail=f"Invalid DICOM: {e}")
        else:
            # Sauvegarde directe pour les images
            with open(file_location, "wb") as buffer:
                buffer.write(content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"{msgs['save_error']}: {e}")
    finally:
        await file.close()

    analysis_result = {}
    gradcam_url = None # Variable pour stocker l'URL

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            with open(file_location, "rb") as f:
                files = {'file': (clean_filename, f, file.content_type)}
                response = await client.post(DL_SERVICE_URL, files=files)

            if response.status_code == 200:
                analysis_result = response.json()
                
                # 1. Gestion du GradCAM (Extraction & Sauvegarde)
                gradcam_fname = None
                if analysis_result.get("gradcam_image"):
                    try:
                        img_b64 = analysis_result["gradcam_image"]
                        if "," in img_b64:
                            img_b64 = img_b64.split(",", 1)[1]
                        
                        gradcam_fname = f"gradcam_{clean_filename}"
                        gradcam_path = os.path.join(UPLOAD_DIRECTORY, gradcam_fname)
                        
                        with open(gradcam_path, "wb") as gf:
                            gf.write(base64.b64decode(img_b64))
                        
                        # 2. CONSTRUCTION DE L'URL IMMÉDIATE
                        base_url = str(request.base_url).rstrip("/")
                        gradcam_url = f"{base_url}/images/{gradcam_fname}"

                    except Exception as e:
                        print(f"Erreur sauvegarde GradCAM: {e}")

                # 3. Enregistrement Base de Données
                new_analysis = Analysis(
                    filename=clean_filename,
                    gradcam_filename=gradcam_fname, 
                    has_glaucoma=bool(analysis_result.get("prediction_class") == 1),
                    confidence=float(analysis_result.get("probability", 0)),
                    user_id=current_user.id,
                    patient_id=patient.id,
                    timestamp=datetime.utcnow()
                )
                db.add(new_analysis)
                db.commit()
                db.refresh(new_analysis)

            else:
                analysis_result = {"error": "Erreur DL", "details": response.text}
    except httpx.RequestError:
        analysis_result = {"error": msgs["dl_error"]}

    return {
        "filename": clean_filename,
        "message": msgs["analysis_done"],
        "analysis": {
            **analysis_result,
            "gradcam_image": None, # On n'envoie pas le base64 (trop lourd)
            "gradcam_url": gradcam_url, # <--- 3. ON ENVOIE L'URL ICI POUR L'AFFICHAGE IMMÉDIAT
            "patient_name": patient.full_name
        }
    }

@app.get("/history", response_model=List[AnalysisResponse])
def get_user_history(
    request: Request,
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    analyses = db.execute(
        select(Analysis)
        .where(Analysis.user_id == current_user.id)
        .order_by(desc(Analysis.timestamp))
    ).scalars().all()

    history_data = []
    base_url = str(request.base_url).rstrip("/")

    for ana in analyses:
        file_path = os.path.join(UPLOAD_DIRECTORY, ana.filename)
        exists = os.path.exists(file_path)
        image_url = f"{base_url}/images/{ana.filename}" if exists else None
        
        # ✅ Construction URL GradCAM
        gradcam_url = None
        if ana.gradcam_filename:
             gradcam_path = os.path.join(UPLOAD_DIRECTORY, ana.gradcam_filename)
             if os.path.exists(gradcam_path):
                gradcam_url = f"{base_url}/images/{ana.gradcam_filename}"

        pat_name = ana.patient.full_name if ana.patient else "Inconnu"

        history_data.append({
            "id": ana.id,
            "filename": ana.filename,
            "has_glaucoma": ana.has_glaucoma,
            "confidence": ana.confidence,
            "timestamp": ana.timestamp,
            "image_url": image_url,
            "gradcam_url": gradcam_url, # ✅ Ajouté
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

    app_manual = """
    APP MANUAL:
    1. DASHBOARD: Home screen with stats and 'New Patient'.
    2. ANALYSIS: Select patient -> Upload fundus image -> Get Result + 3D View.
    3. 3D VIEW: Visualize retina relief.
    4. HISTORY: Past exams.
    5. REPORT PDF: Downloadable medical report.
    """

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