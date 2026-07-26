from pydantic import BaseModel, Field
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
    sets: List[Set] = Field(default_factory=list)

    class Config:
        from_attributes = True

# --- SOCIAL SCHEMAS ---
class UserFollowCreate(BaseModel):
    target_user_id: int

class UserFollowResponse(BaseModel):
    id: int
    follower_id: int
    following_id: int
    created_at: datetime
    follower_username: Optional[str] = None
    following_username: Optional[str] = None

    class Config:
        from_attributes = True

class WorkoutShareCreate(BaseModel):
    visibility: str = "public"

class WorkoutShareResponse(BaseModel):
    id: int
    workout_id: int
    visibility: str
    created_at: datetime

    class Config:
        from_attributes = True

class WorkoutCommentCreate(BaseModel):
    content: str

class WorkoutCommentResponse(BaseModel):
    id: int
    workout_id: int
    user_id: int
    content: str
    created_at: datetime
    author_username: str

    class Config:
        from_attributes = True

class PublicUserProfile(BaseModel):
    username: str
    workout_count: int
    follower_count: int
    following_count: int

class ExerciseSetSummary(BaseModel):
    id: int
    reps: int
    weight: float
    set_number: int

class ExerciseSummary(BaseModel):
    id: int
    name: str
    muscle_group: Optional[str] = None
    notes: Optional[str] = None
    sets: List[ExerciseSetSummary] = Field(default_factory=list)

class PublicWorkoutFeedItem(BaseModel):
    id: int
    user_id: int
    author_username: str
    date: date
    notes: Optional[str] = None
    visibility: str
    exercises: List[ExerciseSummary] = Field(default_factory=list)
    comments_count: int

# --- TEMPLATE SCHEMAS ---
class TemplateExerciseBase(BaseModel):
    exercise_name: str
    muscle_group: Optional[str] = None
    target_sets: int = 3
    target_reps: int = 10

class TemplateExerciseCreate(TemplateExerciseBase):
    pass

class TemplateExercise(TemplateExerciseBase):
    id: int
    template_id: int

    class Config:
        from_attributes = True

class WorkoutTemplateBase(BaseModel):
    name: str
    description: Optional[str] = None

class WorkoutTemplateCreate(WorkoutTemplateBase):
    exercises: List[TemplateExerciseCreate] = Field(default_factory=list)

class WorkoutTemplate(WorkoutTemplateBase):
    id: int
    user_id: int
    created_at: datetime
    exercises: List[TemplateExercise] = Field(default_factory=list)

    class Config:
        from_attributes = True

# --- PROGRESS SCHEMAS ---
class StrengthProgressPoint(BaseModel):
    date: date
    weight: float
    volume: float

class StrengthProgressResponse(BaseModel):
    exercise: str
    data: List[StrengthProgressPoint] = Field(default_factory=list)

class PersonalRecord(BaseModel):
    exercise: str
    max_weight: float
    max_volume: float
    last_workout_date: Optional[date] = None

class StatsResponse(BaseModel):
    total_workouts: int
    total_volume: float
    personal_records: List[PersonalRecord] = Field(default_factory=list)
    current_streak: int

# --- WORKOUT SCHEMAS ---
class WorkoutBase(BaseModel):
    date: date
    notes: Optional[str] = None

class WorkoutCreate(WorkoutBase):
    pass

class Workout(WorkoutBase):
    id: int
    user_id: int
    exercises: List[Exercise] = Field(default_factory=list)

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
    workouts: List[Workout] = Field(default_factory=list)

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