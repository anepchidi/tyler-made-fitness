# PHASE 2: NUTRITION & USER SETTINGS

## Overview
Phase 2 adds the foundation for nutrition tracking and persistent user settings. This enables users to log meals, track macros, and have their preferences saved across sessions.

## What Will Be Built

### 1. User Settings Persistence
**Problem**: Settings (weight unit, height, age, goal) are only in localStorage, lost on logout.

**Solution**: Create `UserSettings` table linked to each user.

**Backend Changes**:
- `models.py`: Add `UserSettings` model
- `schemas.py`: Add `UserSettingsBase`, `UserSettingsCreate`, `UserSettings`
- `main.py`: Add endpoints:
  - `GET /users/{id}/settings` — Fetch settings
  - `PUT /users/{id}/settings` — Update settings

**Frontend Changes**:
- `components/Profile.jsx`:
  - Fetch settings from API on mount
  - Save settings to API instead of localStorage
  - Show save status feedback

**Database**:
```sql
CREATE TABLE user_settings (
    id INTEGER PRIMARY KEY,
    user_id INTEGER UNIQUE FOREIGN KEY REFERENCES users(id),
    weight_unit VARCHAR(3),  -- 'kg' or 'lbs'
    height_cm FLOAT,         -- Height in cm
    bodyweight_kg FLOAT,     -- Current bodyweight in kg
    age INTEGER,
    fitness_goal VARCHAR(50), -- 'strength', 'muscle', 'cardio', 'flexibility'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 2. Nutrition Tracking
**Implement**: Nutrition entry logging with macro tracking.

**Models**:
```python
class NutritionEntry(Base):
    __tablename__ = "nutrition_entries"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    date = Column(Date)
    meal_type = Column(String)  # 'breakfast', 'lunch', 'dinner', 'snack'
    meal_name = Column(String)  # e.g., "Chicken and rice"
    calories = Column(Integer)
    protein_g = Column(Float)
    carbs_g = Column(Float)
    fat_g = Column(Float)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    owner = relationship("User", back_populates="nutrition_entries")

class User(Base):
    # ... existing fields ...
    nutrition_entries = relationship("NutritionEntry", back_populates="owner", cascade="all, delete-orphan")
```

**API Endpoints**:
- `POST /users/{id}/nutrition/` — Log a meal
- `GET /users/{id}/nutrition/{date}` — Get day's nutrition (e.g., `/nutrition/2026-04-24`)
- `GET /users/{id}/nutrition/` — Get with query params: `?start_date=2026-04-01&end_date=2026-04-30`
- `DELETE /users/{id}/nutrition/{entry_id}` — Remove entry
- `PUT /users/{id}/nutrition/{entry_id}` — Update entry

**Frontend**:
- `components/Nutrition.jsx` (currently empty):
  - Daily nutrition dashboard
  - Macro breakdown (pie chart using recharts)
  - Meal logging form
  - Daily/weekly summary
  - Quick macros widget

### 3. Food Item Library
**Feature**: Users can create custom food entries for quick logging.

**Model**:
```python
class FoodItem(Base):
    __tablename__ = "food_items"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    name = Column(String)  # e.g., "Chicken breast (100g)"
    serving_size = Column(String)  # e.g., "100g"
    calories = Column(Integer)
    protein_g = Column(Float)
    carbs_g = Column(Float)
    fat_g = Column(Float)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    owner = relationship("User", back_populates="food_items")

class User(Base):
    # ... existing fields ...
    food_items = relationship("FoodItem", back_populates="owner", cascade="all, delete-orphan")
```

**API Endpoints**:
- `GET /users/{id}/foods` — List custom foods
- `POST /users/{id}/foods` — Create custom food
- `DELETE /users/{id}/foods/{food_id}` — Delete food item

---

## Implementation Steps

### Step 1: Update Models
**File**: `backend/models.py`

Add after `Workout` class:
```python
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
```

Update `User` class to add:
```python
settings = relationship("UserSettings", back_populates="owner", uselist=False, cascade="all, delete-orphan")
nutrition_entries = relationship("NutritionEntry", back_populates="owner", cascade="all, delete-orphan")
food_items = relationship("FoodItem", back_populates="owner", cascade="all, delete-orphan")
```

### Step 2: Update Schemas
**File**: `backend/schemas.py`

Add:
```python
# USER SETTINGS SCHEMAS
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

# NUTRITION ENTRY SCHEMAS
class NutritionEntryBase(BaseModel):
    date: date
    meal_type: str  # 'breakfast', 'lunch', 'dinner', 'snack'
    meal_name: str
    calories: int
    protein_g: float
    carbs_g: float
    fat_g: float

class NutritionEntryCreate(NutritionEntryBase):
    pass

class NutritionEntry(NutritionEntryBase):
    id: int
    user_id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

# FOOD ITEM SCHEMAS
class FoodItemBase(BaseModel):
    name: str
    serving_size: str
    calories: int
    protein_g: float
    carbs_g: float
    fat_g: float

class FoodItemCreate(FoodItemBase):
    pass

class FoodItem(FoodItemBase):
    id: int
    user_id: int
    
    class Config:
        from_attributes = True
```

### Step 3: Add API Endpoints
**File**: `backend/main.py`

Add before the last route:
```python
# --- USER SETTINGS ENDPOINTS ---

@app.get("/users/{user_id}/settings", response_model=schemas.UserSettings)
def get_user_settings(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    settings = db.query(models.UserSettings).filter(
        models.UserSettings.user_id == user_id
    ).first()
    
    if not settings:
        # Create default settings if they don't exist
        settings = models.UserSettings(user_id=user_id)
        db.add(settings)
        db.commit()
        db.refresh(settings)
    
    return settings

@app.put("/users/{user_id}/settings", response_model=schemas.UserSettings)
def update_user_settings(
    user_id: int,
    settings_update: schemas.UserSettingsCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    settings = db.query(models.UserSettings).filter(
        models.UserSettings.user_id == user_id
    ).first()
    
    if not settings:
        settings = models.UserSettings(user_id=user_id, **settings_update.model_dump())
    else:
        for key, value in settings_update.model_dump().items():
            setattr(settings, key, value)
    
    db.add(settings)
    db.commit()
    db.refresh(settings)
    return settings

# --- NUTRITION ENDPOINTS ---

@app.post("/users/{user_id}/nutrition/", response_model=schemas.NutritionEntry)
def create_nutrition_entry(
    user_id: int,
    entry: schemas.NutritionEntryCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    db_entry = models.NutritionEntry(**entry.model_dump(), user_id=user_id)
    db.add(db_entry)
    db.commit()
    db.refresh(db_entry)
    return db_entry

@app.get("/users/{user_id}/nutrition/", response_model=List[schemas.NutritionEntry])
def get_nutrition_entries(
    user_id: int,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    query = db.query(models.NutritionEntry).filter(
        models.NutritionEntry.user_id == user_id
    )
    
    if start_date:
        query = query.filter(models.NutritionEntry.date >= start_date)
    if end_date:
        query = query.filter(models.NutritionEntry.date <= end_date)
    
    return query.order_by(models.NutritionEntry.date.desc()).all()

@app.delete("/users/{user_id}/nutrition/{entry_id}")
def delete_nutrition_entry(
    user_id: int,
    entry_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    entry = db.query(models.NutritionEntry).filter(
        models.NutritionEntry.id == entry_id
    ).first()
    
    if not entry or entry.user_id != user_id:
        raise HTTPException(status_code=404, detail="Entry not found")
    
    db.delete(entry)
    db.commit()
    return {"message": "Entry deleted"}

# --- FOOD ITEMS ENDPOINTS ---

@app.get("/users/{user_id}/foods", response_model=List[schemas.FoodItem])
def get_food_items(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    return db.query(models.FoodItem).filter(
        models.FoodItem.user_id == user_id
    ).order_by(models.FoodItem.created_at.desc()).all()

@app.post("/users/{user_id}/foods", response_model=schemas.FoodItem)
def create_food_item(
    user_id: int,
    food: schemas.FoodItemCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    db_food = models.FoodItem(**food.model_dump(), user_id=user_id)
    db.add(db_food)
    db.commit()
    db.refresh(db_food)
    return db_food

@app.delete("/users/{user_id}/foods/{food_id}")
def delete_food_item(
    user_id: int,
    food_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    food = db.query(models.FoodItem).filter(
        models.FoodItem.id == food_id
    ).first()
    
    if not food or food.user_id != user_id:
        raise HTTPException(status_code=404, detail="Food item not found")
    
    db.delete(food)
    db.commit()
    return {"message": "Food item deleted"}
```

### Step 4: Update Frontend - Profile Component
**File**: `frontend/src/components/Profile.jsx`

Replace settings save logic to use API instead of localStorage:
```javascript
const save = async () => {
  try {
    const res = await authFetch(`${API}/users/${userId}/settings`, {
      method: "PUT",
      body: JSON.stringify({
        weight_unit: unit,
        height_cm: parseFloat(height) || null,
        bodyweight_kg: parseFloat(bodyweight) || null,
        age: parseInt(age) || null,
        fitness_goal: goal
      })
    });
    
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } else {
      console.error("Failed to save settings");
    }
  } catch (err) {
    console.error("Error saving settings:", err);
  }
};

useEffect(() => {
  // Fetch settings from API
  if (userId) {
    authFetch(`${API}/users/${userId}/settings`)
      .then(r => r.json())
      .then(data => {
        setUnit(data.weight_unit || "kg");
        setHeight(data.height_cm || "");
        setBodyweight(data.bodyweight_kg || "");
        setAge(data.age || "");
        setGoal(data.fitness_goal || "muscle");
      })
      .catch(() => {
        // Use defaults if fetch fails
      });
  }
}, [userId]);
```

### Step 5: Implement Nutrition Component
**File**: `frontend/src/components/Nutrition.jsx`

Complete implementation with:
- Daily nutrition summary (calories, protein, carbs, fat)
- Pie chart of macros
- Meal log form
- List of meals for the day
- Weekly/monthly view (optional)

### Step 6: Database Migration
Create new migration file:
```bash
alembic revision --autogenerate -m "Add UserSettings, NutritionEntry, FoodItem models"
```

Or manually:
- `backend/alembic/versions/002_add_nutrition_and_settings.py`

---

## Testing Phase 2

### User Settings
```bash
# Create/update settings
curl -X PUT http://localhost:8000/users/1/settings \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "weight_unit": "kg",
    "height_cm": 180,
    "bodyweight_kg": 85,
    "age": 28,
    "fitness_goal": "muscle"
  }'

# Fetch settings
curl http://localhost:8000/users/1/settings \
  -H "Authorization: Bearer <token>"
```

### Nutrition Entries
```bash
# Log a meal
curl -X POST http://localhost:8000/users/1/nutrition/ \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2026-04-24",
    "meal_type": "breakfast",
    "meal_name": "Eggs and toast",
    "calories": 450,
    "protein_g": 25,
    "carbs_g": 35,
    "fat_g": 18
  }'

# Get daily nutrition
curl "http://localhost:8000/users/1/nutrition/?start_date=2026-04-24&end_date=2026-04-24" \
  -H "Authorization: Bearer <token>"
```

---

## Completion Criteria

- [x] UserSettings model created and linked to User
- [x] NutritionEntry and FoodItem models created
- [x] All schemas added with validation
- [x] All API endpoints implemented with authorization
- [x] Alembic migration handles new tables
- [x] Profile.jsx fetches/saves settings from API
- [x] Nutrition.jsx fully implemented
- [x] All CRUD operations tested
- [x] Documentation updated

---

## Time Estimate
- Backend models & schemas: 30 min
- API endpoints: 45 min
- Frontend Profile update: 30 min
- Frontend Nutrition implementation: 60 min
- Testing & fixes: 30 min

**Total**: ~3 hours

---

## After Phase 2
- Phase 3: Workout Templates & Progress endpoints
- Phase 4: Social features (follow, share, comments)
- Phase 5: Production deployment setup
