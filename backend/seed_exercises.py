from sqlalchemy.orm import Session
import models

def seed_exercise_library(db: Session):
    if db.query(models.ExerciseLibrary).first():
        return
    
    initial_exercises = [
        # === CHEST ===
        {"name": "Barbell Bench Press", "muscle_group": "Chest", "image_url": "/static/exercises/barbell-bench-press.png"},
        {"name": "Incline Barbell Bench Press", "muscle_group": "Chest", "image_url": "/static/exercises/incline-barbell-bench.png"},
        {"name": "Decline Barbell Bench Press", "muscle_group": "Chest", "image_url": "/static/exercises/decline-barbell-bench.png"},
        {"name": "Dumbbell Bench Press", "muscle_group": "Chest", "image_url": "/static/exercises/dumbbell-bench-press.png"},
        {"name": "Incline Dumbbell Press", "muscle_group": "Chest", "image_url": "/static/exercises/incline-dumbbell-press.gif"},
        {"name": "Pec Deck", "muscle_group": "Chest", "image_url": "/static/exercises/pec-deck.gif"},
        {"name": "Dumbbell Flyes", "muscle_group": "Chest", "image_url": "/static/exercises/dumbbell-flyes.png"},
        {"name": "Cable Flyes", "muscle_group": "Chest", "image_url": "/static/exercises/cable-flyes.png"},
        {"name": "Push Ups", "muscle_group": "Chest", "image_url": "/static/exercises/push-ups.png"},
        {"name": "Chest Dips", "muscle_group": "Chest", "image_url": "/static/exercises/chest-dips.png"},
        {"name": "Landmine Press", "muscle_group": "Chest", "image_url": "/static/exercises/landmine-press.png"},
        {"name": "Machine Chest Press", "muscle_group": "Chest", "image_url": "/static/exercises/machine-press.gif"},
     
        # === BACK ===
        {"name": "Barbell Deadlift", "muscle_group": "Back", "image_url": "/static/exercises/barbell-deadlift.png"},
        {"name": "Romanian Deadlift", "muscle_group": "Back", "image_url": "/static/exercises/romanian-deadlift.png"},
        {"name": "Barbell Row", "muscle_group": "Back", "image_url": "/static/exercises/barbell-row.png"},
        {"name": "Pendlay Row", "muscle_group": "Back", "image_url": "/static/exercises/pendlay-row.png"},
        {"name": "T-Bar Row", "muscle_group": "Back", "image_url": "/static/exercises/t-bar-row.png"},
        {"name": "One Arm Dumbbell Row", "muscle_group": "Back", "image_url": "/static/exercises/one-arm-dumbbell-row.png"},
        {"name": "Seated Cable Row", "muscle_group": "Back", "image_url": "/static/exercises/cable-seated-row.gif"},
        {"name": "Pull Up", "muscle_group": "Back", "image_url": "/static/exercises/pull-up.png"},
        {"name": "Chin Up", "muscle_group": "Back", "image_url": "/static/exercises/chin-up.png"},
        {"name": "Lat Pulldown", "muscle_group": "Back", "image_url": "/static/exercises/lat-pulldown.png"},
        {"name": "Close Grip Lat Pulldown", "muscle_group": "Back", "image_url": "/static/exercises/close-grip-lat-pulldown.png"},
        {"name": "Face Pull", "muscle_group": "Back", "image_url": "/static/exercises/face-pull.png"},
        {"name": "Rack Pull", "muscle_group": "Back", "image_url": "/static/exercises/rack-pull.png"},
        {"name": "Hyperextension", "muscle_group": "Back", "image_url": "/static/exercises/hyperextension.png"},
     
        # === LEGS ===
        {"name": "Barbell Squat", "muscle_group": "Legs", "image_url": "/static/exercises/barbell-squat.png"},
        {"name": "Barbell Front Squat", "muscle_group": "Legs", "image_url": "/static/exercises/barbell-front-squat.png"},
        {"name": "Goblet Squat", "muscle_group": "Legs", "image_url": "/static/exercises/goblet-squat.png"},
        {"name": "Bulgarian Split Squat", "muscle_group": "Legs", "image_url": "/static/exercises/bulgarian-split-squat.png"},
        {"name": "Leg Press", "muscle_group": "Legs", "image_url": "/static/exercises/machine-leg-press.gif"},
        {"name": "Hack Squat", "muscle_group": "Legs", "image_url": "/static/exercises/hack-squat.png"},
        {"name": "Leg Extension", "muscle_group": "Legs", "image_url": "/static/exercises/leg-extension.gif"},
        {"name": "Leg Curl", "muscle_group": "Legs", "image_url": "/static/exercises/leg-curl.png"},
        {"name": "Seated Leg Curl", "muscle_group": "Legs", "image_url": "/static/exercises/seated-leg-curl.png"},
        {"name": "Walking Lunge", "muscle_group": "Legs", "image_url": "/static/exercises/walking-lunge.png"},
        {"name": "Smith Machine Squat", "muscle_group": "Legs", "image_url": "/static/exercises/smith-machine-squat.png"},
        {"name": "Glute Ham Raise", "muscle_group": "Legs", "image_url": "/static/exercises/glute-ham-raise.png"},
        {"name": "Hip Thrust", "muscle_group": "Legs", "image_url": "/static/exercises/hip-thrust.png"},
        {"name": "Standing Calf Raise", "muscle_group": "Legs", "image_url": "/static/exercises/standing-calf-raise.png"},
        {"name": "Seated Calf Raise", "muscle_group": "Legs", "image_url": "/static/exercises/seated-calf-raise.png"},
        {"name": "Calf Press on Leg Press", "muscle_group": "Legs", "image_url": "/static/exercises/calf-press-leg-press.png"},
     
        # === SHOULDERS ===
        {"name": "Barbell Overhead Press", "muscle_group": "Shoulders", "image_url": "/static/exercises/barbell-overhead-press.png"},
        {"name": "Seated Dumbbell Press", "muscle_group": "Shoulders", "image_url": "/static/exercises/seated-dumbbell-press.png"},
        {"name": "Arnold Press", "muscle_group": "Shoulders", "image_url": "/static/exercises/arnold-press.png"},
        {"name": "Lateral Raise", "muscle_group": "Shoulders", "image_url": "/static/exercises/lateral-raise.png"},
        {"name": "Front Raise", "muscle_group": "Shoulders", "image_url": "/static/exercises/front-raise.png"},
        {"name": "Rear Delt Flyes", "muscle_group": "Shoulders", "image_url": "/static/exercises/rear-delt-flyes.png"},
        {"name": "Cable Lateral Raise", "muscle_group": "Shoulders", "image_url": "/static/exercises/cable-lateral-raise.png"},
        {"name": "Upright Row", "muscle_group": "Shoulders", "image_url": "/static/exercises/upright-row.png"},
        {"name": "Machine Shoulder Press", "muscle_group": "Shoulders", "image_url": "/static/exercises/machine-shoulder-press.png"},
        {"name": "Reverse Pec Deck", "muscle_group": "Shoulders", "image_url": "/static/exercises/reverse-pec-deck.png"},
        {"name": "Barbell Shrug", "muscle_group": "Shoulders", "image_url": "/static/exercises/barbell-shrug.png"},
     
        # === ARMS ===
        {"name": "Barbell Curl", "muscle_group": "Arms", "image_url": "/static/exercises/barbell-curl.png"},
        {"name": "EZ Bar Curl", "muscle_group": "Arms", "image_url": "/static/exercises/ez-bar-curl.png"},
        {"name": "Dumbbell Curl", "muscle_group": "Arms", "image_url": "/static/exercises/dumbbell-curl.png"},
        {"name": "Hammer Curl", "muscle_group": "Arms", "image_url": "/static/exercises/hammer-curl.png"},
        {"name": "Preacher Curl", "muscle_group": "Arms", "image_url": "/static/exercises/preacher-curl.png"},
        {"name": "Cable Curl", "muscle_group": "Arms", "image_url": "/static/exercises/cable-curl.png"},
        {"name": "Concentration Curl", "muscle_group": "Arms", "image_url": "/static/exercises/concentration-curl.png"},
        {"name": "Close Grip Bench Press", "muscle_group": "Arms", "image_url": "/static/exercises/close-grip-bench-press.png"},
        {"name": "Tricep Dips", "muscle_group": "Arms", "image_url": "/static/exercises/tricep-dips.png"},
        {"name": "Overhead Tricep Extension", "muscle_group": "Arms", "image_url": "/static/exercises/overhead-tricep-extension.png"},
        {"name": "Tricep Pushdown", "muscle_group": "Arms", "image_url": "/static/exercises/tricep-pushdown.png"},
        {"name": "Skull Crusher", "muscle_group": "Arms", "image_url": "/static/exercises/skull-crusher.png"},
        {"name": "Diamond Push Up", "muscle_group": "Arms", "image_url": "/static/exercises/diamond-push-up.png"},
     
        # === CORE ===
        {"name": "Plank", "muscle_group": "Core", "image_url": "/static/exercises/plank.png"},
        {"name": "Side Plank", "muscle_group": "Core", "image_url": "/static/exercises/side-plank.png"},
        {"name": "Crunch", "muscle_group": "Core", "image_url": "/static/exercises/crunch.png"},
        {"name": "Bicycle Crunch", "muscle_group": "Core", "image_url": "/static/exercises/bicycle-crunch.png"},
        {"name": "Hanging Leg Raise", "muscle_group": "Core", "image_url": "/static/exercises/hanging-leg-raise.png"},
        {"name": "Cable Crunch", "muscle_group": "Core", "image_url": "/static/exercises/cable-crunch.png"},
        {"name": "Ab Wheel Rollout", "muscle_group": "Core", "image_url": "/static/exercises/ab-wheel-rollout.png"},
        {"name": "Russian Twist", "muscle_group": "Core", "image_url": "/static/exercises/russian-twist.png"},
        {"name": "Mountain Climber", "muscle_group": "Core", "image_url": "/static/exercises/mountain-climber.png"},
        {"name": "Dead Bug", "muscle_group": "Core", "image_url": "/static/exercises/dead-bug.png"},
    ]

    for ex in initial_exercises:
        db_ex = models.ExerciseLibrary(name=ex["name"], muscle_group=ex["muscle_group"], image_url=ex["image_url"])
        db.add(db_ex)
    db.commit()