import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

try:
    import models
    from database import SessionLocal, engine
    from seed_exercises import seed_exercise_library
    from config import ALLOWED_ORIGINS, UPLOAD_DIR
    from routers.auth import router as auth_router
    from routers.library import router as library_router
    from routers.nutrition import router as nutrition_router
    from routers.settings import router as settings_router
    from routers.social import router as social_router
    from routers.templates import router as templates_router
    from routers.workouts import router as workouts_router
except ModuleNotFoundError:
    from . import models
    from .database import SessionLocal, engine
    from .seed_exercises import seed_exercise_library
    from .config import ALLOWED_ORIGINS, UPLOAD_DIR
    from .routers.auth import router as auth_router
    from .routers.library import router as library_router
    from .routers.nutrition import router as nutrition_router
    from .routers.settings import router as settings_router
    from .routers.social import router as social_router
    from .routers.templates import router as templates_router
    from .routers.workouts import router as workouts_router

# Create tables in the database
models.Base.metadata.create_all(bind=engine)

app = FastAPI()

os.makedirs(UPLOAD_DIR, exist_ok=True)

app.mount("/static", StaticFiles(directory="static"), name="static")

# --- CORS SETUP ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(library_router)
app.include_router(workouts_router)
app.include_router(settings_router)
app.include_router(templates_router)
app.include_router(nutrition_router)
app.include_router(social_router)


@app.on_event("startup")
def on_startup():
    db = SessionLocal()
    seed_exercise_library(db)
    db.close()