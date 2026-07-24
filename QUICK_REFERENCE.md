# Quick Reference - Tyler Made Fitness Development

## File Locations

### Backend Core
- `backend/main.py` - FastAPI app, all routes
- `backend/models.py` - SQLAlchemy ORM models
- `backend/schemas.py` - Pydantic validation schemas
- `backend/database.py` - Database connection
- `backend/.env` - Environment variables (create from .env.example)

### Frontend Core
- `frontend/src/App.jsx` - Root component, routing
- `frontend/src/components/` - All page components
- `frontend/src/api/client.js` - API client with auth
- `frontend/.env.local` - Environment variables (create from .env.example)

### Database & Migrations
- `backend/alembic/` - Alembic migration system
- `backend/alembic/versions/` - Individual migration files
- `backend/workout.db` - SQLite database (dev only)
- `backend/alembic.ini` - Migration configuration

### Documentation
- `README.md` - Overview and setup instructions
- `PHASE_1_COMPLETE.md` - Phase 1 implementation details
- `MIGRATION_GUIDE.md` - Database migration instructions
- `PHASE_2_PLAN.md` - Phase 2 implementation guide

---

## Common Commands

### Backend
```bash
# Start server
cd backend && python3 main.py

# Test imports
python3 -c "import models, schemas; print('OK')"

# Run migrations
alembic upgrade head
alembic downgrade -1
alembic revision --autogenerate -m "description"

# Fresh database
rm workout.db
```

### Frontend
```bash
# Start dev server
cd frontend && npm run dev

# Build for production
npm run build

# Lint code
npm run lint

# Preview build
npm run preview
```

### Database (SQLite)
```bash
# Connect
sqlite3 backend/workout.db

# View schema
.schema

# Query examples
SELECT COUNT(*) FROM exercises;
SELECT * FROM sets WHERE exercise_id = 1;
SELECT * FROM workouts WHERE user_id = 1 ORDER BY date DESC;
```

---

## API Quick Reference

### Authentication
```bash
# Register
curl -X POST http://localhost:8000/register \
  -H "Content-Type: application/json" \
  -d '{"username":"user","email":"user@example.com","password":"pass"}'

# Login (get token)
curl -X POST http://localhost:8000/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=user&password=pass"

# Use token in subsequent requests
curl -H "Authorization: Bearer <token>" http://localhost:8000/users/1/workouts/
```

### Workouts
```bash
# Create workout
curl -X POST http://localhost:8000/users/1/workouts/ \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"date":"2026-04-24","notes":"Morning session"}'

# Get workouts
curl http://localhost:8000/users/1/workouts/ \
  -H "Authorization: Bearer <token>"

# Delete workout
curl -X DELETE http://localhost:8000/workouts/1 \
  -H "Authorization: Bearer <token>"
```

### Exercises
```bash
# Add exercise with sets (Phase 1 format)
curl -X POST http://localhost:8000/workouts/1/exercises/ \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name":"Bench Press",
    "muscle_group":"Chest",
    "notes":null,
    "sets":[
      {"weight":100,"reps":8,"set_number":1},
      {"weight":100,"reps":8,"set_number":2},
      {"weight":95,"reps":10,"set_number":3}
    ]
  }'

# Get latest exercise stats
curl http://localhost:8000/users/1/exercises/Bench%20Press/latest \
  -H "Authorization: Bearer <token>"
```

### Exercise Library
```bash
# Get all exercises
curl http://localhost:8000/exercises/library

# Add exercise to library
curl -X POST http://localhost:8000/exercises/library \
  -H "Content-Type: application/json" \
  -d '{"name":"Deadlift","muscle_group":"Back","image_url":null}'

# Upload exercise image
curl -X POST http://localhost:8000/exercises/library/upload \
  -H "Authorization: Bearer <token>" \
  -F "exercise_name=Bench Press" \
  -F "file=@image.jpg"
```

---

## Data Model (Phase 1)

### Tables
```
users
  ├─ id (PK)
  ├─ username (unique)
  ├─ email (unique)
  ├─ hashed_password
  └─ is_active

workouts
  ├─ id (PK)
  ├─ user_id (FK)
  ├─ date
  └─ notes

exercises
  ├─ id (PK)
  ├─ workout_id (FK) [cascade delete]
  ├─ name
  ├─ muscle_group
  └─ notes

sets ← NEW IN PHASE 1
  ├─ id (PK)
  ├─ exercise_id (FK) [cascade delete]
  ├─ reps
  ├─ weight
  └─ set_number

exercise_library
  ├─ id (PK)
  ├─ name (unique)
  ├─ muscle_group
  └─ image_url
```

---

## Component Structure

### App.jsx (Root)
- Handles authentication state
- Routes to page components
- Manages shared state (exercises, workoutHistory)
- Loads exercise library on mount

### Page Components
- **Dashboard.jsx** - Home page, quick stats
- **WorkoutLogger.jsx** - Create/edit workouts (main feature)
- **ExerciseLibrary.jsx** - Browse/add exercises (sidebar)
- **History.jsx** - View past workouts
- **Progress.jsx** - Stats/charts (UI complete, no data yet)
- **Templates.jsx** - Save/load templates (UI complete, no data yet)
- **Nutrition.jsx** - Track meals (empty, Phase 2)
- **Profile.jsx** - User settings (Phase 2: save to DB)
- **AuthPage.jsx** - Login/register

---

## Environment Variables

### Backend (.env)
```
DATABASE_URL=sqlite:///./workout.db
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
ALLOWED_ORIGINS=http://localhost:5173
```

### Frontend (.env.local)
```
VITE_API_URL=http://localhost:8000
```

---

## Key Concepts

### Exercise vs Set
- **Exercise**: "Bench Press" in a specific workout
- **Set**: Single set of Bench Press (e.g., 100kg × 8 reps)

### Cascading Deletes
- Delete workout → All exercises deleted
- Delete exercise → All sets deleted
- Prevents orphaned records

### Authorization Pattern
All endpoints check: `if current_user.id != user_id: raise 403`
- Prevents accessing other users' data
- Implemented on all user-scoped operations

### Workout Data Flow
1. Frontend: User adds exercises to "cart"
2. User clicks "Save Workout"
3. POST to `/users/{id}/workouts/` → Get workout ID
4. For each exercise: POST to `/workouts/{id}/exercises/` with sets array
5. Database stores: 1 Workout + N Exercises + M Sets
6. Frontend fetches history from GET `/users/{id}/workouts/`

---

## Common Patterns

### Fetching User Data
```javascript
const [data, setData] = useState([]);
useEffect(() => {
  if (!userId) return;
  authFetch(`${API}/users/${userId}/resource/`)
    .then(r => r.json())
    .then(data => setData(data))
    .catch(() => {});
}, [userId]);
```

### Saving Data
```javascript
const [saving, setSaving] = useState(false);
const [error, setError] = useState('');

try {
  setSaving(true);
  const res = await authFetch(`${API}/path`, {
    method: "POST",
    body: JSON.stringify(data)
  });
  
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail);
  }
  
  onSuccess?.();
} catch (err) {
  setError(err.message);
} finally {
  setSaving(false);
}
```

### Authorization Check
```python
@app.post("/users/{user_id}/resource/")
def create_resource(
    user_id: int,
    data: schemas.ResourceCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Create and return resource
```

---

## Debugging Tips

### Backend Errors
1. Check terminal output for stack trace
2. Look for `detail` in JSON response
3. Check authorization (403) vs resource not found (404)
4. Enable print statements: `print(f"Debug: {variable}")`

### Frontend Errors
1. Check browser console (F12)
2. Check Network tab to see API requests
3. Verify token is being sent: `localStorage.getItem("workoutToken")`
4. Check .env.local for correct API_URL

### Database Issues
1. `rm workout.db` to reset to fresh state
2. Check SQLite with `sqlite3 workout.db` and `.schema`
3. Verify migrations applied: `SELECT * FROM alembic_version;`

### API Testing
1. Use curl with `-v` flag for verbose output
2. Use Postman GUI for easier testing
3. Check Authorization header: `Bearer <token>`
4. Verify Content-Type header is `application/json`

---

## Phase Progression

### Phase 1 ✅ COMPLETE
- Exercise/Set model redesign
- Authorization fixes
- Frontend API update
- Migration system setup

### Phase 2 ⏳ READY
- User settings persistence
- Nutrition tracking
- Food library
- Implementation guide in PHASE_2_PLAN.md

### Phase 3 ⏳ PLANNED
- Workout templates
- Progress tracking
- Strength/volume stats

### Phase 4 ⏳ PLANNED
- User following
- Workout sharing
- Comments/reactions
- Public feed

### Phase 5 ⏳ PLANNED
- PostgreSQL setup
- Cloud storage (S3)
- Docker containerization
- GitHub Actions CI/CD
- Vercel/Railway deployment

---

## Resources

- FastAPI: https://fastapi.tiangolo.com/
- SQLAlchemy: https://docs.sqlalchemy.org/
- React: https://react.dev/
- Alembic: https://alembic.sqlalchemy.org/
- Pydantic: https://docs.pydantic.dev/

---

**Last Updated**: April 24, 2026
**Status**: Phase 1 Complete, Actively Developing
