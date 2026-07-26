import os
from typing import List

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from sqlalchemy.orm import Session, joinedload

try:
    import models
    import schemas
    from database import SessionLocal, engine
    from dependencies import get_current_user, get_db
    from seed_exercises import seed_exercise_library
    from routers.auth import router as auth_router
    from routers.library import router as library_router
    from routers.nutrition import router as nutrition_router
    from routers.settings import router as settings_router
    from routers.templates import router as templates_router
    from routers.workouts import router as workouts_router
except ModuleNotFoundError:
    from . import models, schemas
    from .database import SessionLocal, engine
    from .dependencies import get_current_user, get_db
    from .seed_exercises import seed_exercise_library
    from .routers.auth import router as auth_router
    from .routers.library import router as library_router
    from .routers.nutrition import router as nutrition_router
    from .routers.settings import router as settings_router
    from .routers.templates import router as templates_router
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
app.include_router(templates_router)
app.include_router(nutrition_router)


@app.post("/users/{user_id}/follow/{target_id}", response_model=schemas.UserFollowResponse)
def follow_user(
    user_id: int,
    target_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    if user_id == target_id:
        raise HTTPException(status_code=400, detail="You cannot follow yourself")

    target_user = db.query(models.User).filter(models.User.id == target_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    existing = (
        db.query(models.UserFollow)
        .filter(models.UserFollow.follower_id == user_id, models.UserFollow.following_id == target_id)
        .first()
    )
    if existing:
        return existing

    follow = models.UserFollow(follower_id=user_id, following_id=target_id)
    db.add(follow)
    db.commit()
    db.refresh(follow)
    return follow


@app.delete("/users/{user_id}/follow/{target_id}")
def unfollow_user(
    user_id: int,
    target_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized")

    follow = (
        db.query(models.UserFollow)
        .filter(models.UserFollow.follower_id == user_id, models.UserFollow.following_id == target_id)
        .first()
    )
    if not follow:
        raise HTTPException(status_code=404, detail="Follow relationship not found")

    db.delete(follow)
    db.commit()
    return {"message": "Unfollowed successfully"}


@app.get("/users/{user_id}/followers")
def get_followers(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized")

    follows = (
        db.query(models.UserFollow)
        .options(joinedload(models.UserFollow.follower_user))
        .filter(models.UserFollow.following_id == user_id)
        .all()
    )
    return [
        {
            "id": follow.id,
            "follower_id": follow.follower_id,
            "following_id": follow.following_id,
            "created_at": follow.created_at,
            "username": follow.follower_user.username if follow.follower_user else None,
        }
        for follow in follows
    ]


@app.get("/users/{user_id}/following")
def get_following(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized")

    follows = (
        db.query(models.UserFollow)
        .options(joinedload(models.UserFollow.following_user))
        .filter(models.UserFollow.follower_id == user_id)
        .all()
    )
    return [
        {
            "id": follow.id,
            "follower_id": follow.follower_id,
            "following_id": follow.following_id,
            "created_at": follow.created_at,
            "username": follow.following_user.username if follow.following_user else None,
        }
        for follow in follows
    ]


@app.post("/workouts/{workout_id}/share", response_model=schemas.WorkoutShareResponse)
def set_workout_visibility(
    workout_id: int,
    share_update: schemas.WorkoutShareCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    workout = db.query(models.Workout).filter(models.Workout.id == workout_id).first()
    if not workout:
        raise HTTPException(status_code=404, detail="Workout not found")
    if workout.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    share = db.query(models.WorkoutShare).filter(models.WorkoutShare.workout_id == workout_id).first()
    if share:
        share.visibility = share_update.visibility
    else:
        share = models.WorkoutShare(workout_id=workout_id, visibility=share_update.visibility)
        db.add(share)

    db.commit()
    db.refresh(share)
    return share


@app.get("/workouts/feed/public", response_model=List[schemas.PublicWorkoutFeedItem])
def get_public_workout_feed(db: Session = Depends(get_db)):
    workouts = (
        db.query(models.Workout)
        .join(models.WorkoutShare)
        .filter(models.WorkoutShare.visibility == "public")
        .options(
            joinedload(models.Workout.owner),
            joinedload(models.Workout.exercises).joinedload(models.Exercise.sets),
            joinedload(models.Workout.comments),
            joinedload(models.Workout.share),
        )
        .order_by(models.Workout.date.desc(), models.Workout.id.desc())
        .all()
    )

    feed_items = []
    for workout in workouts:
        feed_items.append(
            {
                "id": workout.id,
                "user_id": workout.user_id,
                "author_username": workout.owner.username if workout.owner else "unknown",
                "date": workout.date,
                "notes": workout.notes,
                "visibility": workout.share.visibility if workout.share else "private",
                "exercises": [
                    {
                        "id": exercise.id,
                        "name": exercise.name,
                        "muscle_group": exercise.muscle_group,
                        "notes": exercise.notes,
                        "sets": [
                            {
                                "id": set_entry.id,
                                "reps": set_entry.reps,
                                "weight": set_entry.weight,
                                "set_number": set_entry.set_number,
                            }
                            for set_entry in exercise.sets
                        ],
                    }
                    for exercise in workout.exercises
                ],
                "comments_count": len(workout.comments),
            }
        )
    return feed_items


@app.post("/workouts/{workout_id}/comments", response_model=schemas.WorkoutCommentResponse)
def create_comment(
    workout_id: int,
    comment_data: schemas.WorkoutCommentCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    workout = db.query(models.Workout).filter(models.Workout.id == workout_id).first()
    if not workout:
        raise HTTPException(status_code=404, detail="Workout not found")

    content = comment_data.content.strip()
    if not content:
        raise HTTPException(status_code=400, detail="Comment content is required")

    comment = models.WorkoutComment(workout_id=workout_id, user_id=current_user.id, content=content)
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return {
        "id": comment.id,
        "workout_id": comment.workout_id,
        "user_id": comment.user_id,
        "content": comment.content,
        "created_at": comment.created_at,
        "author_username": current_user.username,
    }


@app.get("/workouts/{workout_id}/comments", response_model=List[schemas.WorkoutCommentResponse])
def get_workout_comments(workout_id: int, db: Session = Depends(get_db)):
    workout = db.query(models.Workout).filter(models.Workout.id == workout_id).first()
    if not workout:
        raise HTTPException(status_code=404, detail="Workout not found")

    comments = (
        db.query(models.WorkoutComment)
        .options(joinedload(models.WorkoutComment.author))
        .filter(models.WorkoutComment.workout_id == workout_id)
        .order_by(models.WorkoutComment.created_at.asc())
        .all()
    )
    return [
        {
            "id": comment.id,
            "workout_id": comment.workout_id,
            "user_id": comment.user_id,
            "content": comment.content,
            "created_at": comment.created_at,
            "author_username": comment.author.username if comment.author else "unknown",
        }
        for comment in comments
    ]


@app.get("/users/{user_id}/profile/public", response_model=schemas.PublicUserProfile)
def get_public_profile(user_id: int, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    follower_count = db.query(models.UserFollow).filter(models.UserFollow.following_id == user_id).count()
    following_count = db.query(models.UserFollow).filter(models.UserFollow.follower_id == user_id).count()
    workout_count = db.query(models.Workout).filter(models.Workout.user_id == user_id).count()

    return {
        "username": user.username,
        "workout_count": workout_count,
        "follower_count": follower_count,
        "following_count": following_count,
    }


@app.on_event("startup")
def on_startup():
    db = SessionLocal()
    seed_exercise_library(db)
    db.close()
