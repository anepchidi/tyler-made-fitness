from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

try:
    import models, schemas
    from dependencies import get_current_user, get_db
except ModuleNotFoundError:
    from .. import models, schemas
    from ..dependencies import get_current_user, get_db

router = APIRouter()


@router.post("/workouts/{workout_id}/exercises/", response_model=schemas.Exercise)
def create_exercise_for_workout(
    workout_id: int,
    exercise: schemas.ExerciseCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    workout = db.query(models.Workout).filter(models.Workout.id == workout_id).first()
    if not workout:
        raise HTTPException(status_code=404, detail="Workout not found")
    if workout.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to add exercises to this workout")

    db_exercise = models.Exercise(
        workout_id=workout_id,
        name=exercise.name,
        muscle_group=exercise.muscle_group,
        notes=exercise.notes,
    )
    db.add(db_exercise)
    db.flush()

    for set_number, set_data in enumerate(exercise.sets, start=1):
        db_set = models.Set(
            exercise_id=db_exercise.id,
            reps=set_data.reps,
            weight=set_data.weight,
            set_number=set_number,
        )
        db.add(db_set)

    db.commit()
    db.refresh(db_exercise)
    return db_exercise


@router.get("/users/me/workouts/", response_model=List[schemas.Workout])
def read_workouts(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    workouts = (
        db.query(models.Workout)
        .options(joinedload(models.Workout.exercises).joinedload(models.Exercise.sets))
        .filter(models.Workout.user_id == current_user.id)
        .all()
    )
    return workouts


@router.post("/users/me/workouts/", response_model=schemas.Workout)
def create_workout_for_user(
    workout: schemas.WorkoutCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    db_workout = models.Workout(**workout.model_dump(), user_id=current_user.id)
    db.add(db_workout)
    db.commit()
    db.refresh(db_workout)
    return db_workout


@router.delete("/workouts/{workout_id}")
def delete_workout(
    workout_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    db_workout = db.query(models.Workout).filter(models.Workout.id == workout_id).first()
    if not db_workout:
        raise HTTPException(status_code=404, detail="Workout not found")
    if db_workout.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    db.delete(db_workout)
    db.commit()
    return {"message": "Workout deleted successfully"}


@router.get("/users/me/exercises/{exercise_name}/latest")
def get_latest_exercise_stats(
    exercise_name: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    latest_exercise = (
        db.query(models.Exercise)
        .join(models.Workout)
        .filter(models.Workout.user_id == current_user.id)
        .filter(models.Exercise.name == exercise_name)
        .order_by(models.Workout.date.desc(), models.Workout.id.desc())
        .first()
    )
    if not latest_exercise or not latest_exercise.sets:
        return {"weight": 0, "reps": 0}
    last_set = latest_exercise.sets[-1]
    return {"weight": last_set.weight, "reps": last_set.reps}
