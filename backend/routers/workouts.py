from collections import OrderedDict
from datetime import date as date_type, timedelta
from typing import Annotated, Dict, List, Tuple

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
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

def _bucket_bounds(
    day: date_type,
    granularity: schemas.ProgressGranularity,
) -> Tuple[date_type, date_type]:
    """Inclusive [start, end] bounds of the bucket `day` falls into."""
    if granularity == schemas.ProgressGranularity.DAY:
        return day, day
    if granularity == schemas.ProgressGranularity.WEEK:
        start = day - timedelta(days=day.weekday())          
        return start, start + timedelta(days=6)
    start = day.replace(day=1)                               
    nxt = (
        start.replace(year=start.year + 1, month=1)
        if start.month == 12
        else start.replace(month=start.month + 1)
    )
    return start, nxt - timedelta(days=1)


@router.get("/users/me/progress/volume", response_model=schemas.VolumeProgressResponse)
def get_volume_progress(
    params: Annotated[schemas.VolumeProgressQuery, Query()],
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    q = (
        db.query(
            models.Workout.date.label("day"),
            models.Workout.id.label("workout_id"),
            models.Set.reps.label("reps"),
            models.Set.weight.label("weight"),
        )
        .select_from(models.Set)
        .join(models.Exercise, models.Exercise.id == models.Set.exercise_id)
        .join(models.Workout, models.Workout.id == models.Exercise.workout_id)
        .filter(models.Workout.user_id == current_user.id)  
        .filter(models.Workout.date.isnot(None))           
    )

    if params.exercise:
        q = q.filter(func.lower(models.Exercise.name) == params.exercise.lower())
    if params.start_date:
        q = q.filter(models.Workout.date >= params.start_date)
    if params.end_date:
        q = q.filter(models.Workout.date <= params.end_date)

    buckets: "OrderedDict[date_type, Dict]" = OrderedDict()
    for row in q.order_by(models.Workout.date.asc()).all():
        # NULL-safe coercion: legacy rows may carry NULL reps/weight.
        reps = int(row.reps or 0)
        weight = float(row.weight or 0.0)
        if reps <= 0:
            continue  

        start, end = _bucket_bounds(row.day, params.granularity)
        bucket = buckets.get(start)
        if bucket is None:
            bucket = {
                "period_start": start,
                "period_end": end,
                "volume": 0.0,
                "sets": 0,
                "reps": 0,
                "workout_ids": set(),
            }
            buckets[start] = bucket

        bucket["volume"] += weight * reps
        bucket["sets"] += 1
        bucket["reps"] += reps
        bucket["workout_ids"].add(row.workout_id)

    data: List[Dict] = []
    running = 0.0
    for start in sorted(buckets):
        bucket = buckets[start]
        running += bucket["volume"]
        data.append(
            {
                "period_start": bucket["period_start"],
                "period_end": bucket["period_end"],
                "volume": round(running if params.cumulative else bucket["volume"], 2),
                "sets": bucket["sets"],
                "reps": bucket["reps"],
                "workouts": len(bucket["workout_ids"]),
            }
        )

    return {
        "exercise": params.exercise,
        "granularity": params.granularity,
        "cumulative": params.cumulative,
        "start_date": params.start_date,
        "end_date": params.end_date,
        "total_volume": round(running, 2),
        "data": data,
    }