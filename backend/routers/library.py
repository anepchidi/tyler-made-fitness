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
async def get_exercise_library(muscle: Optional[str] = None, db: Session = Depends(get_db)):
    """
    Returns a merged list of exercises from both local database (seeded and custom) and API-Ninjas.
    Local database exercises are returned first, followed by API-Ninjas results.
    If API-Ninjas fails, only local exercises are returned (graceful fallback).
    """
    
    # 1. Fetch exercises from local database
    db_query = db.query(models.ExerciseLibrary)
    
    # Apply muscle filter to database if provided
    if muscle and muscle.strip() and muscle.lower() not in ("all muscles", "all"):
        sanitized_muscle = muscle.strip().lower()
        db_query = db_query.filter(models.ExerciseLibrary.muscle_group.ilike(f"%{sanitized_muscle}%"))
    
    db_exercises = db_query.all()
    
    # Transform database exercises to standardized format
    local_exercises = [
        {
            "id": f"db-{ex.id}",
            "name": ex.name,
            "muscle_group": ex.muscle_group,
            "image_url": ex.image_url,
        }
        for ex in db_exercises
    ]
    
    # 2. Try to fetch from API-Ninjas with graceful fallback
    api_exercises = []
    api_key = os.getenv("NINJAS_API_KEY")
    
    if not api_key:
        print("WARNING: Ninjas API key not configured. Returning only local exercises.")
    else:
        try:
            headers = {"X-Api-Key": api_key}
            url = "https://api.api-ninjas.com/v1/exercises?limit=100"
            
            if muscle and muscle.strip() and muscle.lower() not in ("all muscles", "all"):
                sanitized_muscle = muscle.strip().lower()
                url += f"&muscle={sanitized_muscle}"
            
            async with httpx.AsyncClient() as client:
                res = await client.get(url, headers=headers, timeout=10.0)
                
                if res.status_code == 200:
                    if "application/json" in res.headers.get("content-type", "").lower():
                        external_data = res.json()
                        for idx, ex in enumerate(external_data):
                            raw_muscle = ex.get("muscle", "Other")
                            api_exercises.append(
                                {
                                    "id": f"api-{idx + 1}",
                                    "name": ex.get("name", "Unknown Exercise").title(),
                                    "muscle_group": raw_muscle.replace("_", " ").title(),
                                    "image_url": "https://via.placeholder.com/100?text=Exercise",
                                }
                            )
                    else:
                        print(f"WARNING: API-Ninjas returned non-JSON content-type: {res.headers.get('content-type')}")
                else:
                    print(f"WARNING: API-Ninjas returned status {res.status_code}: {res.text}")
        
        except (httpx.RequestError, httpx.TimeoutException) as e:
            print(f"WARNING: Failed to fetch from API-Ninjas: {str(e)}")
        except Exception as e:
            print(f"WARNING: Unexpected error fetching from API-Ninjas: {str(e)}")
    
    # 3. Merge results: local exercises first, then API exercises
    combined_exercises = local_exercises + api_exercises
    return combined_exercises


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
