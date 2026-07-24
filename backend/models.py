from sqlalchemy import Column, Integer, String, ForeignKey, Date, Float, DateTime
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    is_active = Column(Integer, default=1)
    
    # Link to workouts (One-to-Many)
    workouts = relationship("Workout", back_populates="owner")
    settings = relationship("UserSettings", back_populates="owner", uselist=False, cascade="all, delete-orphan")
    nutrition_entries = relationship("NutritionEntry", back_populates="owner", cascade="all, delete-orphan")
    food_items = relationship("FoodItem", back_populates="owner", cascade="all, delete-orphan")

class Workout(Base):
    __tablename__ = "workouts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    date = Column(Date)
    notes = Column(String, nullable=True)
    
    # Links
    owner = relationship("User", back_populates="workouts")
    exercises = relationship("Exercise", back_populates="workout", cascade="all, delete-orphan")

class ExerciseLibrary(Base):
    __tablename__ = "exercise_library"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True) # e.g. "Bench Press"
    muscle_group = Column(String)                  # e.g. "Chest"
    image_url = Column(String, nullable=True)

class Exercise(Base):
    """
    Represents an exercise instance within a workout.
    Each exercise can have multiple sets (see Set model).
    """
    __tablename__ = "exercises"

    id = Column(Integer, primary_key=True, index=True)
    workout_id = Column(Integer, ForeignKey("workouts.id"))
    name = Column(String)   # e.g., "Bench Press" - exercise name from library
    muscle_group = Column(String, nullable=True)  # e.g., "Chest"
    notes = Column(String, nullable=True)  # Exercise-specific notes
    
    # Link back to workout and forward to sets
    workout = relationship("Workout", back_populates="exercises")
    sets = relationship("Set", back_populates="exercise", cascade="all, delete-orphan")

class Set(Base):
    """
    Represents a single set within an exercise.
    Multiple sets can belong to one exercise.
    """
    __tablename__ = "sets"

    id = Column(Integer, primary_key=True, index=True)
    exercise_id = Column(Integer, ForeignKey("exercises.id"))
    reps = Column(Integer)  # Number of reps in this set
    weight = Column(Float)  # Weight used (kg or lbs)
    set_number = Column(Integer, default=1)  # Order within the exercise (1st set, 2nd set, etc.)
    
    # Link back to exercise
    exercise = relationship("Exercise", back_populates="sets")

class UserSettings(Base):
    __tablename__ = "user_settings"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True)
    weight_unit = Column(String, default="kg")  # 'kg' or 'lbs'
    height_cm = Column(Float, nullable=True)
    bodyweight_kg = Column(Float, nullable=True)
    age = Column(Integer, nullable=True)
    fitness_goal = Column(String, nullable=True)  # 'strength', 'muscle', 'cardio', 'flexibility'
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    owner = relationship("User", back_populates="settings")

class NutritionEntry(Base):
    __tablename__ = "nutrition_entries"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    date = Column(Date)
    meal_type = Column(String)  # 'breakfast', 'lunch', 'dinner', 'snack'
    meal_name = Column(String)
    calories = Column(Integer)
    protein_g = Column(Float)
    carbs_g = Column(Float)
    fat_g = Column(Float)
    fiber_g = Column(Float)
    sugar_g = Column(Float)
    sodium_mg = Column(Float)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    owner = relationship("User", back_populates="nutrition_entries")

class FoodItem(Base):
    __tablename__ = "food_items"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    name = Column(String)
    serving_size = Column(String)
    calories = Column(Integer)
    protein_g = Column(Float)
    carbs_g = Column(Float)
    fat_g = Column(Float)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    owner = relationship("User", back_populates="food_items")
