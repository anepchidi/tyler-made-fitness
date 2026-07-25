import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv

try:
    import models
    from database import SessionLocal, engine
    from seed_exercises import seed_exercise_library
    from routers.auth import router as auth_router
    from routers.library import router as library_router
    from routers.nutrition import router as nutrition_router
    from routers.settings import router as settings_router
    from routers.workouts import router as workouts_router
except ModuleNotFoundError:
    from . import models
    from .database import SessionLocal, engine
    from .seed_exercises import seed_exercise_library
    from .routers.auth import router as auth_router
    from .routers.library import router as library_router
    from .routers.nutrition import router as nutrition_router
    from .routers.settings import router as settings_router
    from .routers.workouts import router as workouts_router

load_dotenv()

# Create tables in the database
models.Base.metadata.create_all(bind=engine)

app = FastAPI()

UPLOAD_DIR = "static/exercises"
os.makedirs(UPLOAD_DIR, exist_ok=True)

app.mount("/static", StaticFiles(directory="static"), name="static")

# --- CORS SETUP ---
raw_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
origins = [o.strip() for o in raw_origins.split(",") if o.strip()]
print(f"DEBUG: Allowed origins are: {origins}")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(library_router)
app.include_router(workouts_router)
app.include_router(settings_router)
app.include_router(nutrition_router)


@app.on_event("startup")
def on_startup():
    db = SessionLocal()
    seed_exercise_library(db)
    db.close()
