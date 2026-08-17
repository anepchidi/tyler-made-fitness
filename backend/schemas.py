from enum import Enum

from pydantic import BaseModel, Field, field_validator, model_validator
from typing import List, Optional
from datetime import date, datetime

# --- ENUMS ---
class MealType(str, Enum):
    BREAKFAST = "breakfast"
    LUNCH = "lunch"
    DINNER = "dinner"
    SNACK = "snack"
 
class WeightUnit(str, Enum):
    KG = "kg"
    LBS = "lbs"
 
class Visibility(str, Enum):
    PUBLIC = "public"
    PRIVATE = "private"

class ProgressGranularity(str, Enum):
    DAY = "day"
    WEEK = "week"
    MONTH = "month"

# --- EXERCISE LIBRARY SCHEMAS ---
class ExerciseLibraryBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    muscle_group: str = Field(..., min_length=1, max_length=50)
    image_url: Optional[str] = Field(default=None, max_length=500)

class ExerciseLibraryCreate(ExerciseLibraryBase):
    class Config:
        extra = "forbid"

class ExerciseLibrary(ExerciseLibraryBase):
    id: int
    
    class Config:
        from_attributes = True

# --- SET SCHEMAS ---
class SetBase(BaseModel):
    reps: int = Field(..., gt=0, le=1000)
    weight: float = Field(..., ge=0, le=2000)

class SetCreate(SetBase):
    set_number: int = Field(default=1, gt=0, le=100)

    class Config:
        extra = "forbid"
        
class Set(SetBase):
    id: int
    exercise_id: int
    set_number: int

    class Config:
        from_attributes = True

# --- EXERCISE SCHEMAS ---
class ExerciseBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    muscle_group: Optional[str] = Field(default=None, max_length=50)
    notes: Optional[str] = Field(default=None, max_length=1000)

class ExerciseCreate(ExerciseBase):
    """Create an exercise with its sets"""
    sets: List[SetCreate] = Field(default_factory=list)

    class Config:
        extra = "forbid"

class Exercise(ExerciseBase):
    id: int
    workout_id: int
    sets: List[Set] = Field(default_factory=list)

    class Config:
        from_attributes = True

# --- SOCIAL SCHEMAS ---
class UserFollowCreate(BaseModel):
    target_user_id: int = Field(..., gt=0)

    class Config:
        extra = "forbid"

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
    visibility: Visibility = Visibility.PUBLIC
 
    class Config:
        extra = "forbid"

class WorkoutShareResponse(BaseModel):
    id: int
    workout_id: int
    visibility: str
    created_at: datetime

    class Config:
        from_attributes = True

class WorkoutCommentCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=1000)

    class Config:
        extra = "forbid"

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
    exercise_name: str = Field(..., min_length=1, max_length=100)
    muscle_group: Optional[str] = Field(default=None, max_length=50)
    target_sets: int = Field(default=3, gt=0, le=50)
    target_reps: int = Field(default=10, gt=0, le=1000)

class TemplateExerciseCreate(TemplateExerciseBase):
    class Config:
        extra = "forbid"

class TemplateExercise(TemplateExerciseBase):
    id: int
    template_id: int

    class Config:
        from_attributes = True

class WorkoutTemplateBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(default=None, max_length=1000)

class WorkoutTemplateCreate(WorkoutTemplateBase):
    exercises: List[TemplateExerciseCreate] = Field(default_factory=list)

    class Config:
        extra = "forbid"

class WorkoutTemplate(WorkoutTemplateBase):
    id: int
    user_id: int
    created_at: datetime
    exercises: List[TemplateExercise] = Field(default_factory=list)

    class Config:
        from_attributes = True

# --- PROGRESS SCHEMAS ---
class VolumeProgressQuery(BaseModel):
    """Query guard for GET /users/me/progress/volume."""
    exercise: Optional[str] = Field(default=None, min_length=1, max_length=100)
    granularity: ProgressGranularity = ProgressGranularity.WEEK
    cumulative: bool = False
    start_date: Optional[date] = None
    end_date: Optional[date] = None

    class Config:
        extra = "forbid"

    @field_validator("exercise")
    @classmethod
    def _normalize_exercise(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
           return None
        v = v.strip()
        if not v:
            raise ValueError("exercise must not be blank")
        return v

    @model_validator(mode="after")
    def _check_range(self):
        if self.start_date and self.end_date and self.start_date > self.end_date:
            raise ValueError("start_date must be on or before end_date")
        return self

class StrengthProgressPoint(BaseModel):
    date: date
    weight: float = Field(default=0.0, ge=0)
    volume: float = Field(default=0.0, ge=0)

class StrengthProgressResponse(BaseModel):
    exercise: str
    data: List[StrengthProgressPoint] = Field(default_factory=list)

class VolumeProgressPoint(BaseModel):
    period_start: date
    period_end: date
    volume: float = Field(default=0.0, ge=0)
    sets: int = Field(default=0, ge=0)
    reps: int = Field(default=0, ge=0)
    workouts: int = Field(default=0, ge=0)

class VolumeProgressResponse(BaseModel):
    exercise: Optional[str] = None          # null == aggregated across all exercises
    granularity: ProgressGranularity
    cumulative: bool = False
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    total_volume: float = Field(default=0.0, ge=0)
    data: List[VolumeProgressPoint] = Field(default_factory=list)

class PersonalRecord(BaseModel):
    exercise: str
    max_weight: float = Field(default=0.0, ge=0)
    max_volume: float = Field(default=0.0, ge=0)
    last_workout_date: Optional[date] = None

class StatsResponse(BaseModel):
    total_workouts: int  = Field(default=0.0, ge=0)
    total_volume: float  = Field(default=0.0, ge=0)
    personal_records: List[PersonalRecord] = Field(default_factory=list)
    current_streak: int = Field(default=0, ge=0)

# --- WORKOUT SCHEMAS ---
class WorkoutBase(BaseModel):
    date: date
    notes: Optional[str] = Field(default=None, max_length=2000)

class WorkoutCreate(WorkoutBase):
    class Config:
        extra = "forbid"

class Workout(WorkoutBase):
    id: int
    user_id: int
    exercises: List[Exercise] = Field(default_factory=list)

    class Config:
        from_attributes = True

# --- USER SCHEMAS ---
class UserBase(BaseModel):
    email: str = Field(
        ...,
        min_length=5,
        max_length=254,
        pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$",
    )
    username: str = Field(
        ...,
        min_length=3,
        max_length=30,
        pattern=r"^[a-zA-Z0-9_]+$",
    )

class UserCreate(UserBase):
    password: str = Field(..., min_length=8, max_length=128)

    class Config:
        extra = "forbid"

class User(UserBase):
    id: int
    is_active: bool = True
    workouts: List[Workout] = Field(default_factory=list)

    class Config:
        from_attributes = True

# --- USER SETTINGS SCHEMAS ---
class UserSettingsBase(BaseModel):
    weight_unit: WeightUnit = WeightUnit.KG
    height_cm: Optional[float] = Field(default=None, gt=0, le=300)
    bodyweight_kg: Optional[float] = Field(default=None, gt=0, le=500)
    age: Optional[int] = Field(default=None, gt=0, le=120)
    fitness_goal: Optional[str] = Field(default=None, max_length=50)

class UserSettingsCreate(UserSettingsBase):
    class Config:
        extra = "forbid"

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
    meal_type: MealType
    meal_name: str = Field(..., min_length=1, max_length=200)
    calories: int = Field(..., ge=0, le=10000)
    protein_g: float = Field(..., ge=0, le=1000)
    carbs_g: float = Field(..., ge=0, le=1000)
    fat_g: float = Field(..., ge=0, le=1000)
    fiber_g: float = Field(..., ge=0, le=500)
    sugar_g: float = Field(..., ge=0, le=1000)
    sodium_mg: float = Field(..., ge=0, le=20000)
    potassium_mg: Optional[float] = Field(default=0.0, ge=0, le=20000)
    iron_pct: Optional[float] = Field(default=0.0, ge=0, le=1000)
    calcium_pct: Optional[float] = Field(default=0.0, ge=0, le=1000)

class NutritionEntryCreate(NutritionEntryBase):
    class Config:
        extra = "forbid"

class NutritionEntry(NutritionEntryBase):
    id: int
    user_id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

# --- FOOD ITEM SCHEMAS ---
class FoodItemBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    serving_size: str = Field(..., min_length=1, max_length=100)
    calories: int = Field(..., ge=0, le=10000)
    protein_g: float = Field(..., ge=0, le=1000)
    carbs_g: float = Field(..., ge=0, le=1000)
    fat_g: float = Field(..., ge=0, le=1000)
    fiber_g: float = Field(..., ge=0, le=500)
    sugar_g: float = Field(..., ge=0, le=1000)
    sodium_mg: float = Field(..., ge=0, le=20000)
    potassium_mg: float = Field(..., ge=0, le=20000)
    iron_pct: float = Field(..., ge=0, le=1000)
    calcium_pct: float = Field(..., ge=0, le=1000)

class FoodItemCreate(FoodItemBase):
    class Config:
        extra = "forbid"

class FoodItem(FoodItemBase):
    id: int
    user_id: int
    
    class Config:
        from_attributes = True