import os
import shutil
from typing import Optional

import httpx
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

try:
    import models, schemas
    from dependencies import get_db
except ModuleNotFoundError:
    from .. import models, schemas
    from ..dependencies import get_db

router = APIRouter()

UPLOAD_DIR = "static/exercises"
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.get("/")
def read_root():
    return {"message": "Welcome to Tyler-Made Fitness API"}


@router.get("/exercises/library")
async def get_exercise_library(muscle: Optional[str] = None):
    api_key = os.getenv("NINJAS_API_KEY")

    if not api_key:
        raise HTTPException(status_code=500, detail="Ninjas API key missing from configuration.")

    headers = {"X-Api-Key": api_key}
    url = "https://api.api-ninjas.com/v1/exercises?limit=100"

    if muscle and muscle.strip() and muscle.lower() != "all muscles" and muscle.lower() != "all":
        sanitized_muscle = muscle.strip().lower()
        url += f"&muscle={sanitized_muscle}"

    async with httpx.AsyncClient() as client:
        try:
            res = await client.get(url, headers=headers, timeout=10.0)
            if res.status_code != 200:
                print(f"DEBUG ERROR: Status {res.status_code}, Response text: {res.text}")
                raise HTTPException(
                    status_code=502,
                    detail=f"API-Ninjas rejected request (Status {res.status_code}). Check key permissions.",
                )

            if "application/json" not in res.headers.get("content-type", "").lower():
                print(f"DEBUG CONTENT TYPE ERROR: Received {res.headers.get('content-type')}, text: {res.text}")
                raise HTTPException(
                    status_code=502,
                    detail="Third-party provider unexpectedly responded with text or HTML data.",
                )

            external_data = res.json()
            transformed_exercises = []
            for idx, ex in enumerate(external_data):
                raw_muscle = ex.get("muscle", "Other")
                transformed_exercises.append(
                    {
                        "id": idx + 1,
                        "name": ex.get("name", "Unknown Exercise").title(),
                        "muscle_group": raw_muscle.replace("_", " ").title(),
                        "image_url": "https://via.placeholder.com/100?text=Exercise",
                    }
                )

            return transformed_exercises

        except httpx.RequestError:
            raise HTTPException(status_code=503, detail="Connection to exxercise provider failed.")


@router.post("/exercises/library")
def create_library_exercise(exercise: schemas.ExerciseLibrary, db: Session = Depends(get_db)):
    existing = db.query(models.ExerciseLibrary).filter(models.ExerciseLibrary.name == exercise.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Exercise already exists in library")

    db_exercise = models.ExerciseLibrary(
        name=exercise.name,
        muscle_group=exercise.muscle_group,
        image_url=exercise.image_url,
    )
    db.add(db_exercise)
    db.commit()
    db.refresh(db_exercise)
    return db_exercise


@router.post("/exercises/library/upload")
async def upload_exercise_with_image(
    name: str = Form(...),
    muscle_group: str = Form(...),
    image: UploadFile = File(None),
    db: Session = Depends(get_db),
):
    file_path = None
    if image:
        file_path = f"{UPLOAD_DIR}/{image.filename}"
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(image.file, buffer)
        file_path = f"/static/exercises/{image.filename}"

    new_ex = models.ExerciseLibrary(name=name, muscle_group=muscle_group, image_url=file_path)
    db.add(new_ex)
    db.commit()
    db.refresh(new_ex)
    return new_ex
