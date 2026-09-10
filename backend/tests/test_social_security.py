from datetime import date

import pytest
from pydantic import ValidationError

import models
import schemas


def _make_workout(db, user, visibility="private"):
    workout = models.Workout(user_id=user.id, date=date.today(), notes="test")
    db.add(workout)
    db.commit()
    db.refresh(workout)
    db.add(models.WorkoutShare(workout_id=workout.id, visibility=visibility))
    db.commit()
    return workout


def test_comment_on_private_workout_is_forbidden(client, db, make_user):
    owner, _ = make_user("owner")
    _, outsider_headers = make_user("outsider")
    workout = _make_workout(db, owner, visibility="private")

    response = client.post(
        f"/workouts/{workout.id}/comments",
        json={"content": "let me in"},
        headers=outsider_headers,
    )
    assert response.status_code == 403


def test_comment_on_followers_workout_requires_following(client, db, make_user):
    owner, _ = make_user("coach")
    fan, fan_headers = make_user("fan")
    workout = _make_workout(db, owner, visibility="followers")

    assert (
        client.post(
            f"/workouts/{workout.id}/comments",
            json={"content": "nice session"},
            headers=fan_headers,
        ).status_code
        == 403
    )

    db.add(models.UserFollow(follower_id=fan.id, following_id=owner.id))
    db.commit()

    assert (
        client.post(
            f"/workouts/{workout.id}/comments",
            json={"content": "nice session"},
            headers=fan_headers,
        ).status_code
        == 200
    )


def test_invalid_visibility_is_rejected(client, db, make_user):
    owner, headers = make_user("lifter")
    workout = _make_workout(db, owner)

    response = client.post(
        f"/workouts/{workout.id}/share",
        json={"visibility": "everyone"},
        headers=headers,
    )
    assert response.status_code == 422


def test_share_schema_rejects_unknown_visibility_and_extra_fields():
    with pytest.raises(ValidationError):
        schemas.WorkoutShareCreate(visibility="everyone")
    with pytest.raises(ValidationError):
        schemas.WorkoutShareCreate(visibility="public", promoted=True)


def test_share_defaults_to_private():
    assert schemas.WorkoutShareCreate().visibility is schemas.WorkoutVisibility.PRIVATE


def test_cannot_share_another_users_workout(client, db, make_user):
    owner, _ = make_user("owner2")
    _, outsider_headers = make_user("outsider2")
    workout = _make_workout(db, owner)

    response = client.post(
        f"/workouts/{workout.id}/share",
        json={"visibility": "public"},
        headers=outsider_headers,
    )
    assert response.status_code == 403


def test_cannot_follow_self(client, db, make_user):
    user, headers = make_user("solo")
    response = client.post(f"/users/{user.id}/follow/{user.id}", headers=headers)
    assert response.status_code == 400


def test_blank_comment_is_rejected():
    with pytest.raises(ValidationError):
        schemas.WorkoutCommentCreate(content="   ")


def test_public_profile_reports_follow_state(client, db, make_user):
    target, _ = make_user("target")
    follower, headers = make_user("follower")
    db.add(models.UserFollow(follower_id=follower.id, following_id=target.id))
    db.commit()

    body = client.get(f"/users/{target.id}/profile/public", headers=headers).json()
    assert body["is_following"] is True
    assert body["is_self"] is False