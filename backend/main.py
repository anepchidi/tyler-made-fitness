import httpx
import bcrypt
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from datetime import datetime, timedelta, date
from jose import JWTError, jwt
import models, schemas
from database import SessionLocal, engine
from seed_exercises import seed_exercise_library
import os
from dotenv import load_dotenv
import shutil
from fastapi import UploadFile, File, Form
from fastapi.staticfiles import StaticFiles

load_dotenv()

NINJAS_API_KEY = os.getenv("NINJAS_API_KEY")

# --- FATSECRET CONFIG ---
FS_CLIENT_ID = os.getenv("FS_CLIENT_ID")
FS_CLIENT_SECRET = os.getenv("FS_CLIENT_SECRET")

fs_access_token = {"token": None, "expires": 0}

async def get_fs_token():
    # Check if token is still valid (simplified)
    if fs_access_token["token"]:
        return fs_access_token["token"]

    async with httpx.AsyncClient() as client:
        res = await client.post(
            "https://oauth.fatsecret.com/connect/token",
            auth=(FS_CLIENT_ID, FS_CLIENT_SECRET),
            data={"grant_type": "client_credentials", "scope": "basic"}
        )
        data = res.json()
        fs_access_token["token"] = data["access_token"]
        return data["access_token"]

        
# --- CONFIGURATION ---
load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY", "fallback-dev-key")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 30))

# --- SECURITY SETUP ---
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# Create tables in the database
models.Base.metadata.create_all(bind=engine)

app = FastAPI()

UPLOAD_DIR = "static/exercises"
os.makedirs(UPLOAD_DIR, exist_ok=True)

app.mount("/static", StaticFiles(directory="static"), name="static")

# --- CORS SETUP ---
# Default to allowing both localhost and 127.0.0.1 on the Vite dev port
raw_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
# This ensures no hidden spaces or empty strings break the middleware
origins = [o.strip() for o in raw_origins.split(",") if o.strip()]
print(f"DEBUG: Allowed origins are: {origins}") # Add this to verify in terminal
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- NEW DIRECT BCRYPT FUNCTIONS ---
def get_password_hash(password: str) -> str:
    pwd_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(pwd_bytes, salt)
    return hashed.decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(
        plain_password.encode('utf-8'), 
        hashed_password.encode('utf-8')
    )

# --- DEPENDENCIES ---
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        user_id: int = payload.get("id")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = db.query(models.User).filter(models.User.username == username).first()
    if user is None:
        raise credentials_exception
    return user

@app.on_event("startup")
def on_startup():
    db = SessionLocal()
    seed_exercise_library(db)
    db.close()

# --- AUTH & USER ROUTES ---

@app.post("/register")
def register(user: schemas.UserCreate, db: Session = Depends(get_db)):
    # Check if username or email already exists
    if db.query(models.User).filter(models.User.username == user.username).first():
        raise HTTPException(status_code=400, detail="Username already registered")
    if db.query(models.User).filter(models.User.email == user.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Use REAL hashing
    hashed_pw = get_password_hash(user.password)
    new_user = models.User(username=user.username, email=user.email, hashed_password=hashed_pw)
    db.add(new_user)
    db.commit()
    return {"message": "User created successfully"}

@app.post("/token")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == form_data.username).first()
    
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect username or password")
    
    access_token = create_access_token(data={"sub": user.username, "id": user.id})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user_id": user.id,
        "username": user.username
    }

# --- APP ROUTES ---

@app.get("/")
def read_root():
    return {"message": "Welcome to FitTrack Pro API"}

@app.get("/exercises/library")
async def get_exercise_library(muscle: Optional[str] = None):
    api_key = os.getenv("NINJAS_API_KEY")

    if not api_key:
        raise HTTPException(status_code=500, detail="Ninjas API key missing from configuration.")

    headers = {"X-Api-Key": NINJAS_API_KEY}
    url = "https://api.api-ninjas.com/v1/exercises?limit=100"

    if muscle and muscle.strip() and muscle.lower() != "all muscles" and muscle.lower() != "all":
        sanitized_muscle = muscle.strip().lower()
        url += f"&muscle={sanitized_muscle}"

    async with httpx.AsyncClient() as client:
        try:
            res = await client.get(url, headers=headers, timeout=10.0)
            if res.status_code != 200:
                print(f"DEBUG ERROR: Status {res.status_code}, Response text: {res.text}")
                raise HTTPException(status_code=502, detail=f"API-Ninjas rejected request (Status {res.status_code}). Check key permissions."
                )

            if "application/json" not in res.headers.get("content-type", "").lower():
                print(f"DEBUG CONTENT TYPE ERROR: Received {res.headers.get('content-type')}, text: {res.text}")
                raise HTTPException(
                    status_code=502,
                    detail="Third-party provider unexpectedly responded with text or HTML data."
                )

            external_data = res.json()

            transformed_exercises = []
            for idx, ex in enumerate(external_data):
                raw_muscle = ex.get("muscle", "Other")
                transformed_exercises.append({
                    "id": idx + 1,
                    "name": ex.get("name", "Unknown Exercise").title(),
                    "muscle_group": raw_muscle.replace("_", " ").title(),
                    "image_url": "https://via.placeholder.com/100?text=Exercise"
                })

            return transformed_exercises
        
        except httpx.RequestError:
            raise HTTPException(status_code=503, detail="Connection to exxercise provider failed.")


@app.post("/exercises/library")
def create_library_exercise(exercise: schemas.ExerciseLibrary, db: Session = Depends(get_db)):
    # Check if it already exists
    existing = db.query(models.ExerciseLibrary).filter(models.ExerciseLibrary.name == exercise.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Exercise already exists in library")
    
    db_exercise = models.ExerciseLibrary(name=exercise.name, muscle_group=exercise.muscle_group, image_url=exercise.image_url)
    db.add(db_exercise)
    db.commit()
    db.refresh(db_exercise)
    return db_exercise

@app.post("/exercises/library/upload")
async def upload_exercise_with_image(
    name: str = Form(...),
    muscle_group: str = Form(...),
    image: UploadFile = File(None),
    db: Session = Depends(get_db)
):
    file_path = None
    if image:
        # Create a unique filename
        file_path = f"{UPLOAD_DIR}/{image.filename}"
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(image.file, buffer)
        # Store the URL path in DB
        file_path = f"/static/exercises/{image.filename}"

    new_ex = models.ExerciseLibrary(
        name=name, 
        muscle_group=muscle_group, 
        image_url=file_path
    )
    db.add(new_ex)
    db.commit()
    db.refresh(new_ex)
    return new_ex

# Add Exercise to Workout
@app.post("/workouts/{workout_id}/exercises/", response_model=schemas.Exercise)
def create_exercise_for_workout(
    workout_id: int,
    exercise: schemas.ExerciseCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Verify workout exists and belongs to current user
    workout = db.query(models.Workout).filter(models.Workout.id == workout_id).first()
    if not workout:
        raise HTTPException(status_code=404, detail="Workout not found")
    if workout.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to add exercises to this workout")
    
    # Create the exercise with its sets
    db_exercise = models.Exercise(
        workout_id=workout_id,
        name=exercise.name,
        muscle_group=exercise.muscle_group,
        notes=exercise.notes
    )
    db.add(db_exercise)
    db.flush()  # Get the exercise ID before adding sets
    
    # Create each set for this exercise
    for set_number, set_data in enumerate(exercise.sets, start=1):
        db_set = models.Set(
            exercise_id=db_exercise.id,
            reps=set_data.reps,
            weight=set_data.weight,
            set_number=set_number
        )
        db.add(db_set)
    
    db.commit()
    db.refresh(db_exercise)
    return db_exercise

# Get Workouts
@app.get("/users/{user_id}/workouts/", response_model=List[schemas.Workout])
def read_workouts(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)  
):
    if current_user.id != user_id:                         
        raise HTTPException(status_code=403, detail="Not authorized")
    workouts = db.query(models.Workout)\
        .options(joinedload(models.Workout.exercises).joinedload(models.Exercise.sets))\
        .filter(models.Workout.user_id == user_id)\
        .all()
    return workouts

@app.post("/users/{user_id}/workouts/", response_model=schemas.Workout)
def create_workout_for_user(
    user_id: int,
    workout: schemas.WorkoutCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)  
):
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    db_workout = models.Workout(**workout.model_dump(), user_id=user_id)
    db.add(db_workout)
    db.commit()
    db.refresh(db_workout)
    return db_workout

@app.delete("/workouts/{workout_id}")
def delete_workout(
    workout_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)  
):
    db_workout = db.query(models.Workout).filter(models.Workout.id == workout_id).first()
    if not db_workout:
        raise HTTPException(status_code=404, detail="Workout not found")
    if db_workout.user_id != current_user.id:              
        raise HTTPException(status_code=403, detail="Not authorized")
    db.delete(db_workout)
    db.commit()
    return {"message": "Workout deleted successfully"}

@app.get("/users/{user_id}/exercises/{exercise_name}/latest")
def get_latest_exercise_stats(
    user_id: int,
    exercise_name: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)  
):
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    latest_exercise = db.query(models.Exercise)\
        .join(models.Workout)\
        .filter(models.Workout.user_id == user_id)\
        .filter(models.Exercise.name == exercise_name)\
        .order_by(models.Workout.date.desc(), models.Workout.id.desc())\
        .first()
    if not latest_exercise or not latest_exercise.sets:
        return {"weight": 0, "reps": 0}
    # Return stats from the last set of this exercise
    last_set = latest_exercise.sets[-1]
    return {"weight": last_set.weight, "reps": last_set.reps}

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
    
    entry_data = entry.model_dump()

    db_entry = models.NutritionEntry(
        user_id=user_id,
        date=entry_data.get("date"),
        meal_type=entry_data.get("meal_type"),
        meal_name=entry_data.get("meal_name"),
        calories=entry_data.get("calories"),
        protein_g=entry_data.get("protein_g"),
        carbs_g=entry_data.get("carbs_g"),
        fat_g=entry_data.get("fat_g"),
        fiber_g=entry_data.get("fiber_g", 0.0),   
        sugar_g=entry_data.get("sugar_g", 0.0),
        sodium_mg=entry_data.get("sodium_mg", 0.0),
    )

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

@app.get("/nutrition/search")
async def search_foods(query: str, current_user: models.User = Depends(get_current_user)):
    """Search FatSecret for foods matching the query"""
    token = await get_fs_token()
    
    async with httpx.AsyncClient() as client:
        res = await client.get(
            "https://platform.fatsecret.com/rest/server.api",
            params={
                "method": "foods.search",
                "search_expression": query,
                "format": "json",
                "max_results": 10
            },
            headers={"Authorization": f"Bearer {token}"},
        )
            
        if res.status_code != 200:
            raise HTTPException(
                    status_code=500,
                    detail="Failed to search database"
                )
            
        return res.json()

@app.get("/nutrition/food/{food_id}")
async def get_food_details(food_id: str, current_user: models.User = Depends(get_current_user)):
    """Retrieve detailed macronutrient info for a specific food ID"""
    token = await get_fs_token()
    
    try:
        async with httpx.AsyncClient() as client:
            res = await client.get(
                "https://platform.fatsecret.com/rest/server.api",
                params={
                    "method": "food.get.v2",
                    "food_id": food_id,
                    "format": "json"
                },
                headers={"Authorization": f"Bearer {token}"},
                timeout=10.0
            )
            
            if res.status_code != 200:
                raise HTTPException(
                    status_code=502,
                    detail="FatSecret API unavailable"
                )
            
            data = res.json()
            
            if "food" not in data:
                raise HTTPException(
                    status_code=404,
                    detail="Food not found"
                )
            
            food = data["food"]
            
            servings = food.get("servings", {}).get("serving", [])
            if not servings:
                raise HTTPException(
                    status_code=400,
                    detail="No serving information available"
                )
            
            # Handle both single serving (dict) and multiple servings (list)
            serving = servings[0] if isinstance(servings, list) else servings
            
            # Map FatSecret fields to schema
            return {
                "food": {
                    "food_name": food.get("food_name", ""),
                    "food_id": food.get("food_id", food_id),
                    "servings": {
                        "serving": {
                            "calories": float(serving.get("calories", 0)),
                            "protein": float(serving.get("protein", 0)),
                            "carbohydrate": float(serving.get("carbohydrate", 0)),
                            "fat": float(serving.get("fat", 0)),
                            "fiber": float(serving.get("fiber", 0)),
                            "sugar": float(serving.get("sugar", 0)),
                            "sodium": float(serving.get("sodium", 0)),
                            "potassium": float(serving.get("potassium", 0)),
                            "iron": float(serving.get("iron", 0)),
                            "calcium": float(serving.get("calcium", 0)),
                            "serving_description": serving.get("serving_description", "1 serving")
                        }
                    }
                }
            }
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"FatSecret food details error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Error retrieving food details"
        )

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