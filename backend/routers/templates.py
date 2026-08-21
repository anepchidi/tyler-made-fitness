from datetime import date, datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

try:
    import models, schemas
    from dependencies import get_current_user, get_db
except ModuleNotFoundError:
    from .. import models, schemas
    from ..dependencies import get_current_user, get_db

router = APIRouter()


def _ensure_user_access(user_id: int, current_user: models.User):
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized")


@router.get("/users/me/templates", response_model=List[schemas.WorkoutTemplate])
def get_my_templates(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    templates = (
        db.query(models.WorkoutTemplate)
        .filter(models.WorkoutTemplate.user_id == current_user.id)
        .options(joinedload(models.WorkoutTemplate.exercises))
        .order_by(models.WorkoutTemplate.created_at.desc())
        .all()
    )
    return templates


@router.get("/users/{user_id}/templates", response_model=List[schemas.WorkoutTemplate])
def get_user_templates(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    _ensure_user_access(user_id, current_user)
    templates = (
        db.query(models.WorkoutTemplate)
        .filter(models.WorkoutTemplate.user_id == user_id)
        .options(joinedload(models.WorkoutTemplate.exercises))
        .order_by(models.WorkoutTemplate.created_at.desc())
        .all()
    )
    return templates


@router.post("/users/me/templates", response_model=schemas.WorkoutTemplate)
def create_my_template(
    template: schemas.WorkoutTemplateCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return create_template_for_user(current_user.id, template, db)


@router.post("/users/{user_id}/templates", response_model=schemas.WorkoutTemplate)
def create_user_template(
    user_id: int,
    template: schemas.WorkoutTemplateCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    _ensure_user_access(user_id, current_user)
    return create_template_for_user(user_id, template, db)


@router.delete("/users/me/templates/{template_id}")
def delete_my_template(
    template_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return delete_template_for_user(current_user.id, template_id, db)


@router.delete("/users/{user_id}/templates/{template_id}")
def delete_user_template(
    user_id: int,
    template_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    _ensure_user_access(user_id, current_user)
    return delete_template_for_user(user_id, template_id, db)


@router.get("/users/me/progress/strength", response_model=schemas.StrengthProgressResponse)
def get_my_strength_progress(
    exercise: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return get_strength_progress(current_user.id, exercise, db)


@router.get("/users/{user_id}/progress/strength", response_model=schemas.StrengthProgressResponse)
def get_user_strength_progress(
    user_id: int,
    exercise: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    _ensure_user_access(user_id, current_user)
    return get_strength_progress(user_id, exercise, db)


@router.get("/users/me/stats", response_model=schemas.StatsResponse)
def get_my_stats(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return get_user_stats(current_user.id, db)


@router.get("/users/{user_id}/stats", response_model=schemas.StatsResponse)
def get_user_stats_endpoint(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    _ensure_user_access(user_id, current_user)
    return get_user_stats(user_id, db)


def create_template_for_user(user_id: int, template: schemas.WorkoutTemplateCreate, db: Session):
    db_template = models.WorkoutTemplate(
        user_id=user_id,
        name=template.name,
        description=template.description,
        created_at=datetime.utcnow(),
    )
    db.add(db_template)
    db.flush()

    for exercise_data in template.exercises or []:
        db_exercise = models.TemplateExercise(
            template_id=db_template.id,
            exercise_name=exercise_data.exercise_name,
            muscle_group=exercise_data.muscle_group,
            target_sets=exercise_data.target_sets,
            target_reps=exercise_data.target_reps,
            target_weight=getattr(exercise_data, "target_weight", 0.0),
        )
        db.add(db_exercise)

    db.commit()
    db.refresh(db_template)
    return (
        db.query(models.WorkoutTemplate)
        .options(joinedload(models.WorkoutTemplate.exercises))
        .filter(models.WorkoutTemplate.id == db_template.id)
        .first()
    )


def delete_template_for_user(user_id: int, template_id: int, db: Session):
    template = db.query(models.WorkoutTemplate).filter(models.WorkoutTemplate.id == template_id).first()
    if not template or template.user_id != user_id:
        raise HTTPException(status_code=404, detail="Template not found")

    db.delete(template)
    db.commit()
    return {"message": "Template deleted"}


def get_strength_progress(user_id: int, exercise: str, db: Session):
    exercise_name = (exercise or "").strip()
    workouts = (
        db.query(models.Workout)
        .filter(models.Workout.user_id == user_id)
        .order_by(models.Workout.date.asc(), models.Workout.id.asc())
        .all()
    )

    points = []
    for workout in workouts:
        matching_exercises = [ex for ex in workout.exercises if ex.name == exercise_name]
        if not matching_exercises:
            continue

        max_weight = 0.0
        total_volume = 0.0
        for exercise_item in matching_exercises:
            if not exercise_item.sets:
                continue
            max_weight = max(max_weight, max((set_data.weight or 0.0) for set_data in exercise_item.sets))
            total_volume += sum((set_data.weight or 0.0) * (set_data.reps or 0) for set_data in exercise_item.sets)

        if max_weight or total_volume:
            points.append(
                {
                    "date": workout.date,
                    "weight": round(max_weight, 1),
                    "volume": round(total_volume, 1),
                }
            )

    return {"exercise": exercise_name, "data": points}


def get_user_stats(user_id: int, db: Session):
    workouts = (
        db.query(models.Workout)
        .filter(models.Workout.user_id == user_id)
        .order_by(models.Workout.date.asc(), models.Workout.id.asc())
        .all()
    )

    total_volume = 0.0
    personal_records = {}

    for workout in workouts:
        for exercise_item in workout.exercises:
            if not exercise_item.name:
                continue
            record = personal_records.setdefault(
                exercise_item.name,
                {
                    "exercise": exercise_item.name,
                    "max_weight": 0.0,
                    "max_volume": 0.0,
                    "last_workout_date": workout.date,
                },
            )
            exercise_sets = exercise_item.sets or []
            if exercise_sets:
                record["max_weight"] = max(record["max_weight"], max((set_data.weight or 0.0) for set_data in exercise_sets))
                record["max_volume"] = max(
                    record["max_volume"],
                    sum((set_data.weight or 0.0) * (set_data.reps or 0) for set_data in exercise_sets),
                )
            record["last_workout_date"] = workout.date
            total_volume += sum((set_data.weight or 0.0) * (set_data.reps or 0) for set_data in exercise_sets)

    workout_dates = sorted({workout.date for workout in workouts if workout.date}, reverse=True)
    current_streak = 0
    if workout_dates:
        expected_day = workout_dates[0]
        for workout_date in workout_dates:
            if workout_date == expected_day:
                current_streak += 1
                expected_day = workout_date - timedelta(days=1)
            else:
                break

    return {
        "total_workouts": len(workouts),
        "total_volume": round(total_volume, 1),
        "personal_records": [
            {
                "exercise": record["exercise"],
                "max_weight": round(record["max_weight"], 1),
                "max_volume": round(record["max_volume"], 1),
                "last_workout_date": record["last_workout_date"],
            }
            for record in personal_records.values()
        ],
        "current_streak": current_streak,
    }
