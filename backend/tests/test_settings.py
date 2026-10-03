import pytest


VALID = {
    "weight_unit": "kg",
    "height_cm": 180,
    "bodyweight_kg": 80.5,
    "age": 30,
    "fitness_goal": "muscle",
}


def test_put_settings_accepts_valid_payload(client, make_user):
    _, headers = make_user("settings_ok")
    res = client.put("/users/me/settings", json=VALID, headers=headers)
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["height_cm"] == 180
    assert body["bodyweight_kg"] == 80.5
    assert body["age"] == 30
    assert body["weight_unit"] == "kg"


def test_put_settings_optional_fields_default_to_none(client, make_user):
    _, headers = make_user("settings_nulls")
    res = client.put("/users/me/settings", json={"weight_unit": "lbs"}, headers=headers)
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["weight_unit"] == "lbs"
    assert body["height_cm"] is None
    assert body["bodyweight_kg"] is None
    assert body["age"] is None
    assert body["fitness_goal"] is None


@pytest.mark.parametrize(
    "field, value",
    [
        ("age", -1),
        ("age", 0),
        ("age", 121),
        ("age", 25.5),
        ("age", "25"),
        ("age", True),
        ("bodyweight_kg", -80),
        ("bodyweight_kg", 0),
        ("bodyweight_kg", 501),
        ("bodyweight_kg", "80"),
        ("height_cm", -175),
        ("height_cm", 0),
        ("height_cm", 301),
        ("height_cm", False),
        ("weight_unit", "stone"),
        ("fitness_goal", ""),
    ],
)
def test_put_settings_rejects_invalid_values(client, make_user, field, value):
    _, headers = make_user("settings_bad")
    res = client.put("/users/me/settings", json={**VALID, field: value}, headers=headers)
    assert res.status_code == 422, res.text


def test_put_settings_rejects_unknown_fields(client, make_user):
    _, headers = make_user("settings_extra")
    res = client.put("/users/me/settings", json={**VALID, "user_id": 999}, headers=headers)
    assert res.status_code == 422, res.text
