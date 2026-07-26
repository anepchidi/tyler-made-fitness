import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from schemas import (
    PublicUserProfile,
    UserFollowCreate,
    UserFollowResponse,
    WorkoutCommentCreate,
    WorkoutCommentResponse,
    WorkoutShareCreate,
    WorkoutShareResponse,
)


class SocialSchemasTests(unittest.TestCase):
    def test_follow_schema_accepts_target_user_id(self):
        payload = {"target_user_id": 2}
        follow = UserFollowCreate(**payload)
        self.assertEqual(follow.target_user_id, 2)

    def test_follow_response_schema_includes_usernames(self):
        payload = {
            "id": 1,
            "follower_id": 1,
            "following_id": 2,
            "created_at": "2026-07-26T12:00:00",
            "follower_username": "tyler",
            "following_username": "alex",
        }
        response = UserFollowResponse(**payload)
        self.assertEqual(response.following_username, "alex")

    def test_workout_share_schema_validates_visibility(self):
        payload = {"visibility": "friends"}
        share = WorkoutShareCreate(**payload)
        self.assertEqual(share.visibility, "friends")

    def test_workout_share_response_schema_serializes_fields(self):
        payload = {"id": 4, "workout_id": 8, "visibility": "public", "created_at": "2026-07-26T12:00:00"}
        response = WorkoutShareResponse(**payload)
        self.assertEqual(response.visibility, "public")

    def test_comment_schema_requires_content(self):
        payload = {"content": "Great session today"}
        comment = WorkoutCommentCreate(**payload)
        self.assertEqual(comment.content, "Great session today")

    def test_comment_response_includes_author_username(self):
        payload = {
            "id": 3,
            "workout_id": 11,
            "user_id": 4,
            "content": "Loved this routine",
            "created_at": "2026-07-26T12:00:00",
            "author_username": "riley",
        }
        response = WorkoutCommentResponse(**payload)
        self.assertEqual(response.author_username, "riley")

    def test_public_profile_schema_exposes_counts(self):
        payload = {"username": "casey", "workout_count": 5, "follower_count": 2, "following_count": 3}
        profile = PublicUserProfile(**payload)
        self.assertEqual(profile.workout_count, 5)


if __name__ == "__main__":
    unittest.main()
