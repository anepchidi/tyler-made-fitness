from pydantic import BaseModel
from typing import List, Optional
from datetime import date, datetime

# --- EXERCISE LIBRARY SCHEMAS ---
class ExerciseLibraryBase(BaseModel):
    name: str
    muscle_group: str
    image_url: Optional[str] = None

class ExerciseLibraryCreate(ExerciseLibraryBase):
    pass

class ExerciseLibrary(ExerciseLibraryBase):
    id: int
    
    class Config:
        from_attributes = True

# --- SET SCHEMAS ---
class SetBase(BaseModel):
    reps: int
    weight: float

class SetCreate(SetBase):
    set_number: int = 1

class Set(SetBase):
    id: int
    exercise_id: int
    set_number: int

    class Config:
        from_attributes = True

# --- EXERCISE SCHEMAS ---
class ExerciseBase(BaseModel):
    name: str
    muscle_group: Optional[str] = None
    notes: Optional[str] = None

class ExerciseCreate(ExerciseBase):
    """Create an exercise with its sets"""
    sets: List[SetCreate]

class Exercise(ExerciseBase):
    id: int
    workout_id: int
    sets: List[Set] = []

    class Config:
        from_attributes = True

# --- WORKOUT SCHEMAS ---
class WorkoutBase(BaseModel):
    date: date
    notes: Optional[str] = None

class WorkoutCreate(WorkoutBase):
    pass

class Workout(WorkoutBase):
    id: int
    user_id: int
    exercises: List[Exercise] = []

    class Config:
        from_attributes = True

# --- USER SCHEMAS ---
class UserBase(BaseModel):
    email: str
    username: str

class UserCreate(UserBase):
    password: str  # We need a password to create a user

class User(UserBase):
    id: int
    is_active: bool = True
    workouts: List[Workout] = []

    class Config:
        from_attributes = True

# --- USER SETTINGS SCHEMAS ---
class UserSettingsBase(BaseModel):
    weight_unit: str = "kg"
    height_cm: Optional[float] = None
    bodyweight_kg: Optional[float] = None
    age: Optional[int] = None
    fitness_goal: Optional[str] = None

class UserSettingsCreate(UserSettingsBase):
    pass

class UserSettings(UserSettingsBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

# --- NUTRITION ENTRY SCHEMAS ---
class NutritionEntryBase(BaseModel):
    date: date
    meal_type: str  # 'breakfast', 'lunch', 'dinner', 'snack'
    meal_name: str
    calories: int
    protein_g: float
    carbs_g: float
    fat_g: float
    fiber_g: float
    sugar_g: float
    sodium_mg: float
    potassium_mg: Optional[float] = 0.0
    iron_pct: Optional[float] = 0.0
    calcium_pct: Optional[float] = 0.0

class NutritionEntryCreate(NutritionEntryBase):
    pass

class NutritionEntry(NutritionEntryBase):
    id: int
    user_id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

# --- FOOD ITEM SCHEMAS ---
class FoodItemBase(BaseModel):
    name: str
    serving_size: str
    calories: int
    protein_g: float
    carbs_g: float
    fat_g: float
    fiber_g: float
    sugar_g: float
    sodium_mg: float
    potassium_mg: float
    iron_pct: float
    calcium_pct: float

class FoodItemCreate(FoodItemBase):
    pass

class FoodItem(FoodItemBase):
    id: int
    user_id: int
    
    class Config:
        from_attributes = True