# backend/uploads/main.py
import os
import shutil
from datetime import datetime, timedelta
from typing import Optional

import httpx
from fastapi import FastAPI, File, UploadFile, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr
from sqlalchemy import Column, Integer, String, DateTime, create_engine, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import declarative_base, sessionmaker

# --- Configuration ---
SECRET_KEY = os.getenv("JWT_SECRET", "CHANGE_THIS_TO_A_STRONG_SECRET")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

DATABASE_URL = "sqlite:///./auth.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# --- Models ---
class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)  
    created_at = Column(DateTime, default=datetime.utcnow)

Base.metadata.create_all(bind=engine)

# --- Pydantic schemas ---
class UserCreate(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

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

def get_user_by_email(
        db, email: str):
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

# --- App & CORS (À PLACER AVANT LES ROUTES) ---
app = FastAPI()

# CORS MIDDLEWARE DOIT ÊTRE AJOUTÉ EN PREMIER
origins = ["http://localhost:5173", "http://localhost:3000"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- File storage & DL ---
UPLOAD_DIRECTORY = "uploaded_images"
DL_SERVICE_URL = "http://localhost:8001/analyze/"
os.makedirs(UPLOAD_DIRECTORY, exist_ok=True)

# --- Auth endpoints (routes après CORS) ---
@app.post("/signup", status_code=201)
def signup(user_in: UserCreate):
    db = SessionLocal()
    try:
        # Vérifier si l'email existe déjà
        existing_user = get_user_by_email(db, user_in.email)
        if existing_user:
            raise HTTPException(status_code=400, detail="Email déjà utilisé")
        
        # Créer et sauvegarder l'utilisateur
        hashed_password = get_password_hash(user_in.password)
        new_user = User(email=user_in.email, hashed_password=hashed_password)
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        
        return {"msg": "Utilisateur créé", "email": new_user.email}
    
    except HTTPException:
        raise
    except IntegrityError as e:
        db.rollback()
        raise HTTPException(status_code=400, detail="Erreur intégrité BD: email déjà utilisé")
    except Exception as e:
        db.rollback()
        print(f"Erreur signup: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erreur serveur: {str(e)}")
    finally:
        db.close()

@app.post("/token", response_model=Token)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    db = SessionLocal()
    user = authenticate_user(db, form_data.username, form_data.password)
    db.close()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou mot de passe invalide",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}

# --- Protected upload endpoint ---
@app.post("/uploadfile/")
async def create_upload_file(file: UploadFile = File(...), current_user: User = Depends(get_current_user)):
    if not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="Fichier invalide.")

    file_location = os.path.join(UPLOAD_DIRECTORY, file.filename)
    try:
        with open(file_location, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur de sauvegarde: {e}")
    finally:
        await file.close()

    analysis_result = {}
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            with open(file_location, "rb") as f:
                files = {'file': (file.filename, f, file.content_type)}
                response = await client.post(DL_SERVICE_URL, files=files)

            if response.status_code == 200:
                analysis_result = response.json()
            else:
                analysis_result = {"error": "Le service DL a renvoyé une erreur", "details": response.text}
    except httpx.RequestError:
        analysis_result = {"error": "Le service DL est injoignable (est-il lancé ?)"}

    return {
        "filename": file.filename,
        "message": "Image stockée et analysée (utilisateur: {})".format(current_user.email),
        "analysis": analysis_result
    }