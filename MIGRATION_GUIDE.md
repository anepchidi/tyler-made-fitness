# PHASE 1: DATABASE & WORKOUT FIXES - MIGRATION GUIDE

## ⚠️ BREAKING CHANGE: Exercise/Set Data Model Redesign

The database schema has been redesigned to properly handle multiple sets per exercise:

### What Changed
- **OLD**: Each set was stored as a separate Exercise record
- **NEW**: Exercise = container, Set = individual set (1:Many relationship)

### Database Migration Steps

#### For SQLite (Development)
Since we changed the schema structure, you'll need to:

1. **Backup your current database** (optional but recommended):
   ```bash
   cp workout.db workout.db.backup
   ```

2. **Delete the old database** (WARNING: Deletes all existing workouts):
   ```bash
   rm workout.db
   ```

3. **Run the migrations to create fresh tables**:
   ```bash
   cd backend
   # Create new database with fresh schema
   python3 -m alembic upgrade head
   # or if running main.py, the tables will auto-create on startup
   ```

4. **Restart the backend**:
   ```bash
   python3 main.py
   ```

#### For PostgreSQL (Production)
If you're already using PostgreSQL:

```bash
cd backend
python3 -m alembic upgrade head
```

Alembic will handle the migration automatically.

### API Changes

#### Frontend Changes
The workout save flow now sends all sets for an exercise in one request:

**Before**:
```javascript
// Post each set separately (BAD - creates bloat)
for (const set of exercise.sets) {
  POST /workouts/{id}/exercises/ { name, reps, weight }
}
```

**After**:
```javascript
// Post exercise with all sets at once (GOOD - clean structure)
POST /workouts/{id}/exercises/ {
  name: "Bench Press",
  muscle_group: "Chest",
  sets: [
    { weight: 100, reps: 8 },
    { weight: 100, reps: 8 },
    { weight: 100, reps: 6 }
  ]
}
```

### What You Need to Do

1. ✅ **Backend Models**: Already updated (`models.py`)
   - New `Set` model added
   - Exercise now has proper fields (name, muscle_group, notes)
   
2. ✅ **API Endpoints**: Already updated (`main.py`)
   - `/workouts/{id}/exercises/` now accepts `sets: [...]` array
   - Added authorization check (can't add exercises to others' workouts)
   - `/users/{id}/workouts/` now loads related Sets

3. ✅ **Frontend**: Already updated (`WorkoutLogger.jsx`)
   - `saveWorkout()` sends proper payload structure

4. ✅ **Validation**: Already updated (`schemas.py`)
   - Set and Exercise schemas added
   - ExerciseCreate now validates `sets: List[SetCreate]`

5. ✅ **Migrations**: Alembic setup complete
   - Initial migration file created: `alembic/versions/001_initial_schema.py`
   - Can run: `alembic upgrade head` to apply

### Testing the New Flow

1. Start the backend with fresh database (see steps above)
2. Log in / register
3. Create a new workout
4. Add 3-4 exercises with 3 sets each
5. Save the workout

**Expected Result**: 
- In database: 3-4 Exercise records (not 9-12)
- Each Exercise has 3 Set child records
- No errors about missing columns

### Reverting (If Needed)

To roll back the migration:
```bash
alembic downgrade -1
```

This will drop the new schema and go back to the previous version (if it existed).

### Next Steps

Once Phase 1 is working:
- Phase 2: Add Nutrition & User Settings
- Phase 3: Complete Templates & Progress
- Phase 4: Add Social Features
- Phase 5: Deploy to production (PostgreSQL + Serverless)

### Troubleshooting

**Error: "Column 'sets' not found"**
- Your database still has the old schema. Delete it and restart (`rm workout.db`)

**Error: "alembic command not found"**
- Install: `pip install alembic`
- Or run migrations through Python: check `main.py` for `models.Base.metadata.create_all()`

**Error: "workout_id is required"**
- Make sure frontend is sending complete Exercise payload with sets array

**Data Loss Concerns**
- If you have important data, export it before deleting the database
- Recommendation: Use this as a fresh start point for clean data
