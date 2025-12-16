# backend/uploads/main.py
import os
import shutil
import asyncio
import json
from contextlib import asynccontextmanager
from datetime import datetime, timedelta
from typing import Optional, List

import httpx
from fastapi import FastAPI, File, UploadFile, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.staticfiles import StaticFiles # ✅ Pour servir les images
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr
from sqlalchemy import Column, Integer, String, DateTime, Float, Boolean, ForeignKey, create_engine, select, desc
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import declarative_base, sessionmaker, relationship

# ✅ IMPORT DU NETTOYEUR
from cleanup import start_cleanup_loop

# --- Configuration ---
SECRET_KEY = os.getenv("JWT_SECRET", "CHANGE_THIS_TO_A_STRONG_SECRET")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60
TTL_MINUTES = 10

DATABASE_URL = "sqlite:///./auth.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# --- Models Base de Données ---
class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    # Relation avec l'historique
    analyses = relationship("Analysis", back_populates="owner")

class Analysis(Base):
    __tablename__ = "analyses"
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, index=True)
    has_glaucoma = Column(Boolean)
    confidence = Column(Float)
    timestamp = Column(DateTime, default=datetime.utcnow)
    user_id = Column(Integer, ForeignKey("users.id"))

    owner = relationship("User", back_populates="analyses")

Base.metadata.create_all(bind=engine)

# --- Pydantic Schemas ---
class UserCreate(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

# Pour l'affichage de l'historique
class AnalysisResponse(BaseModel):
    id: int
    filename: str
    has_glaucoma: bool
    confidence: float
    timestamp: datetime
    image_url: Optional[str] = None # L'URL pour afficher l'image
    is_expired: bool = False # Pour savoir si le cleanup est passé

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

def get_user_by_email(db, email: str):
    return db.execute(select(User).where(User.email == email)).scalar_one_or_none()

def authenticate_user(db, email: str, password: str):
    user = get_user_by_email(db, email)
    if not user or not verify_password(password, user.hashed_password):
        return None
    return user

async def get_current_user(token: str = Depends(oauth2_scheme)):
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

    db = SessionLocal()
    user = get_user_by_email(db, token_data.email)
    db.close()
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

origins = ["http://localhost:5173", "http://localhost:3000"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ✅ Permet d'accéder aux images via http://localhost:8000/images/nom_image.jpg
app.mount("/images", StaticFiles(directory=UPLOAD_DIRECTORY), name="images")

# --- Routes Auth ---
@app.post("/signup", status_code=201)
def signup(user_in: UserCreate):
    db = SessionLocal()
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
    finally:
        db.close()

@app.post("/token", response_model=Token)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    db = SessionLocal()
    user = authenticate_user(db, form_data.username, form_data.password)
    db.close()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Identifiants invalides")
    access_token = create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}

# --- Routes Upload & History ---

@app.post("/uploadfile/")
async def create_upload_file(file: UploadFile = File(...), current_user: User = Depends(get_current_user)):
    if not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="Fichier invalide.")

    # On ajoute un timestamp au nom de fichier pour éviter les écrasements
    timestamp_str = datetime.now().strftime("%Y%m%d_%H%M%S")
    clean_filename = f"{timestamp_str}_{file.filename}"
    file_location = os.path.join(UPLOAD_DIRECTORY, clean_filename)

    try:
        with open(file_location, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur sauvegarde: {e}")
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

                # ✅ SAUVEGARDE EN BDD
                db = SessionLocal()
                new_analysis = Analysis(
                    filename=clean_filename,
                    has_glaucoma=bool(analysis_result.get("prediction_class") == 1),
                    confidence=float(analysis_result.get("probability", 0)),
                    user_id=current_user.id
                )
                db.add(new_analysis)
                db.commit()
                db.close()

            else:
                analysis_result = {"error": "Erreur DL", "details": response.text}
    except httpx.RequestError:
        analysis_result = {"error": "Service DL injoignable"}

    return {
        "filename": clean_filename,
        "message": "Analyse terminée",
        "analysis": analysis_result
    }

# ✅ NOUVELLE ROUTE HISTORIQUE
@app.get("/history", response_model=List[AnalysisResponse])
def get_user_history(current_user: User = Depends(get_current_user)):
    db = SessionLocal()
    # Récupérer les analyses du user, du plus récent au plus vieux
    analyses = db.execute(
        select(Analysis)
        .where(Analysis.user_id == current_user.id)
        .order_by(desc(Analysis.timestamp))
    ).scalars().all()

    history_data = []
    for ana in analyses:
        file_path = os.path.join(UPLOAD_DIRECTORY, ana.filename)
        exists = os.path.exists(file_path)

        # On construit l'URL seulement si le fichier existe
        image_url = f"http://localhost:8000/images/{ana.filename}" if exists else None

        history_data.append({
            "id": ana.id,
            "filename": ana.filename,
            "has_glaucoma": ana.has_glaucoma,
            "confidence": ana.confidence,
            "timestamp": ana.timestamp,
            "image_url": image_url,
            "is_expired": not exists # Le fichier a été supprimé par le cleaner
        })

    db.close()
    return history_data