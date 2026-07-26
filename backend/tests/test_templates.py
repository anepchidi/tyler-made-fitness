import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from schemas import WorkoutTemplateCreate, StrengthProgressResponse, StatsResponse


class TemplateAndProgressSchemasTests(unittest.TestCase):
    def test_template_create_schema_accepts_nested_exercises(self):
        payload = {
            "name": "Upper Body",
            "description": "Push and pull routine",
            "exercises": [
                {"exercise_name": "Bench Press", "muscle_group": "Chest", "target_sets": 4, "target_reps": 8}
            ],
        }
        template = WorkoutTemplateCreate(**payload)
        self.assertEqual(template.name, "Upper Body")
        self.assertEqual(template.exercises[0].exercise_name, "Bench Press")

    def test_progress_response_schema_allows_points(self):
        payload = {
            "exercise": "Bench Press",
            "data": [
                {"date": "2026-07-01", "weight": 100.0, "volume": 2400.0}
            ],
        }
        response = StrengthProgressResponse(**payload)
        self.assertEqual(response.exercise, "Bench Press")
        self.assertEqual(response.data[0].weight, 100.0)

    def test_stats_response_schema_accepts_personal_records(self):
        payload = {
            "total_workouts": 3,
            "total_volume": 12000.0,
            "personal_records": [
                {"exercise": "Bench Press", "max_weight": 100.0, "max_volume": 2400.0}
            ],
            "current_streak": 2,
        }
        response = StatsResponse(**payload)
        self.assertEqual(response.total_workouts, 3)
        self.assertEqual(response.personal_records[0].exercise, "Bench Press")


if __name__ == "__main__":
    unittest.main()
