from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import and_, func, or_
from sqlalchemy.orm import Session, joinedload, selectinload

try:
    import models
    import schemas
    from dependencies import get_current_user, get_current_user_optional, get_db
except ModuleNotFoundError:
    from .. import models, schemas
    from ..dependencies import get_current_user, get_current_user_optional, get_db

router = APIRouter(tags=["social"])

PUBLIC = schemas.WorkoutVisibility.PUBLIC.value
PRIVATE = schemas.WorkoutVisibility.PRIVATE.value
FOLLOWERS = schemas.WorkoutVisibility.FOLLOWERS.value

def _following_ids(db: Session, user_id: int) -> set[int]:
    rows = (
        db.query(models.UserFollow.following_id)
        .filter(models.UserFollow.follower_id == user_id)
        .all()
    )
    return {row[0] for row in rows}


def _is_following(db: Session, follower_id: int, following_id: int) -> bool:
    return (
        db.query(models.UserFollow.id)
        .filter(
            models.UserFollow.follower_id == follower_id,
            models.UserFollow.following_id == following_id,
        )
        .first()
        is not None
    )


def _can_view_workout(db: Session, workout: models.Workout, user: Optional[models.User]) -> bool:
    if user is not None and workout.user_id == user.id:
        return True
    share = workout.share 
    if share is None:
        return False
    if share.visibility == PUBLIC:
        return True
    if share.visibility == FOLLOWERS and user is not None:
        return _is_following(db, user.id, workout.user_id)
    return False

@router.post("/users/{user_id}/follow/{target_id}", response_model=schemas.UserFollowResponse)
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


@router.delete("/users/{user_id}/follow/{target_id}")
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


@router.get("/users/{user_id}/followers")
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


@router.get("/users/{user_id}/following")
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


@router.post("/workouts/{workout_id}/share", response_model=schemas.WorkoutShareResponse)
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


@router.get("/workouts/feed/public", response_model=schemas.WorkoutFeedPage)
def get_public_workout_feed(
    limit: int = Query(20, ge=1, le=50),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(get_current_user_optional),
):
    clauses = [models.WorkoutShare.visibility == PUBLIC]

    if current_user is not None:
        clauses.append(
            and_(
                models.Workout.user_id == current_user.id,
                models.WorkoutShare.visibility != PRIVATE,
            )
        )
        following = _following_ids(db, current_user.id)
        if following:
            clauses.append(
                and_(
                    models.WorkoutShare.visibility == FOLLOWERS,
                    models.Workout.user_id.in_(following),
                )
            )

    base = db.query(models.Workout).join(models.WorkoutShare).filter(or_(*clauses))
    total = base.count()

    workouts = (
        base.options(
            joinedload(models.Workout.owner),
            joinedload(models.Workout.share),
            selectinload(models.Workout.exercises).selectinload(models.Exercise.sets),
            selectinload(models.Workout.comments),
        )
        .order_by(models.Workout.date.desc(), models.Workout.id.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    items = [
        {
            "id": workout.id,
            "user_id": workout.user_id,
            "author_username": workout.owner.username if workout.owner else "unknown",
            "date": workout.date,
            "notes": workout.notes,
            "visibility": workout.share.visibility if workout.share else PRIVATE,
            "exercises": [
                {
                    "id": exercise.id,
                    "name": exercise.name,
                    "muscle_group": exercise.muscle_group,
                    "notes": exercise.notes,
                    "sets": [
                        {
                            "id": s.id,
                            "reps": s.reps,
                            "weight": s.weight,
                            "set_number": s.set_number,
                        }
                        for s in exercise.sets
                    ],
                }
                for exercise in workout.exercises
            ],
            "comments_count": len(workout.comments),
        }
        for workout in workouts
    ]

    return {
        "items": items,
        "total": total,
        "limit": limit,
        "offset": offset,
        "has_more": offset + len(items) < total,
    }


@router.post("/workouts/{workout_id}/comments", response_model=schemas.WorkoutCommentResponse)
def create_comment(
    workout_id: int,
    comment_data: schemas.WorkoutCommentCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    workout = (
        db.query(models.Workout)
        .options(joinedload(models.Workout.share))
        .filter(models.Workout.id == workout_id)
        .first()
    )
    if not workout:
        raise HTTPException(status_code=404, detail="Workout not found")
    if not _can_view_workout(db, workout, current_user):
        raise HTTPException(status_code=403, detail="This workout is not shared with you")

    comment = models.WorkoutComment(
        workout_id=workout_id,
        user_id=current_user.id,
        content=comment_data.content,
    )
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


@router.get("/workouts/{workout_id}/comments", response_model=List[schemas.WorkoutCommentResponse])
def get_workout_comments(
    workout_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(get_current_user_optional),
):
    workout = (
        db.query(models.Workout)
        .options(joinedload(models.Workout.share))
        .filter(models.Workout.id == workout_id)
        .first()
    )
    if not workout:
        raise HTTPException(status_code=404, detail="Workout not found")
    if not _can_view_workout(db, workout, current_user):
        raise HTTPException(status_code=403, detail="This workout is not shared with you")

    comments = (
        db.query(models.WorkoutComment)
        .options(joinedload(models.WorkoutComment.author))
        .filter(models.WorkoutComment.workout_id == workout_id)
        .order_by(models.WorkoutComment.created_at.asc())
        .all()
    )
    return [
        {
            "id": c.id,
            "workout_id": c.workout_id,
            "user_id": c.user_id,
            "content": c.content,
            "created_at": c.created_at,
            "author_username": c.author.username if c.author else "unknown",
        }
        for c in comments
    ]

@router.delete("/workouts/{workout_id}/comments/{comment_id}")
def delete_comment(
    workout_id: int,
    comment_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Comment author or workout owner may remove a comment."""
    comment = (
        db.query(models.WorkoutComment)
        .filter(
            models.WorkoutComment.id == comment_id,
            models.WorkoutComment.workout_id == workout_id,
        )
        .first()
    )
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")

    workout = db.query(models.Workout).filter(models.Workout.id == workout_id).first()
    owner_id = workout.user_id if workout else None
    if current_user.id not in {comment.user_id, owner_id}:
        raise HTTPException(status_code=403, detail="Not authorized")

    db.delete(comment)
    db.commit()
    return {"message": "Comment deleted"}    


@router.get("/users/discover", response_model=List[schemas.DiscoverUser])
def discover_users(
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(get_current_user_optional),
):
    """Suggest active users the caller isn't already following."""
    query = db.query(models.User).filter(models.User.is_active == 1)
    if current_user is not None:
        exclude = _following_ids(db, current_user.id) | {current_user.id}
        query = query.filter(~models.User.id.in_(exclude))

    users = query.limit(limit * 3).all() 
    if not users:
        return []

    ids = [u.id for u in users]
    workout_counts = dict(
        db.query(models.Workout.user_id, func.count(models.Workout.id))
        .filter(models.Workout.user_id.in_(ids))
        .group_by(models.Workout.user_id)
        .all()
    )
    follower_counts = dict(
        db.query(models.UserFollow.following_id, func.count(models.UserFollow.id))
        .filter(models.UserFollow.following_id.in_(ids))
        .group_by(models.UserFollow.following_id)
        .all()
    )

    ranked = sorted(
        users,
        key=lambda u: (workout_counts.get(u.id, 0), follower_counts.get(u.id, 0)),
        reverse=True,
    )[:limit]

    return [
        {
            "id": u.id,
            "username": u.username,
            "workout_count": workout_counts.get(u.id, 0),
            "follower_count": follower_counts.get(u.id, 0),
            "is_following": False,
        }
        for u in ranked
    ]


@router.get("/users/{user_id}/profile/public", response_model=schemas.PublicUserProfile)
def get_public_profile(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(get_current_user_optional),
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    follower_count = db.query(models.UserFollow).filter(models.UserFollow.following_id == user_id).count()
    following_count = db.query(models.UserFollow).filter(models.UserFollow.follower_id == user_id).count()
    workout_count = db.query(models.Workout).filter(models.Workout.user_id == user_id).count()

    is_self = current_user is not None and current_user.id == user_id
    is_following = (
        _is_following(db, current_user.id, user_id)
        if current_user is not None and not is_self
        else False
    )

    return {
        "id": user.id,
        "username": user.username,
        "workout_count": workout_count,
        "follower_count": follower_count,
        "following_count": following_count,
        "is_following": is_following,
        "is_self": is_self,
    }