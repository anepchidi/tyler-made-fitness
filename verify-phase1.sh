#!/bin/bash
# Verification script for Phase 1 implementation

echo "=== Tyler Made Fitness - Phase 1 Verification ==="
echo ""

# Check backend files exist
echo "✓ Checking backend files..."
if [ -f "backend/models.py" ] && [ -f "backend/schemas.py" ] && [ -f "backend/main.py" ]; then
    echo "  ✓ Backend files present"
else
    echo "  ✗ Missing backend files"
    exit 1
fi

# Check Alembic setup
echo "✓ Checking Alembic migration setup..."
if [ -d "backend/alembic/versions" ] && [ -f "backend/alembic/env.py" ]; then
    echo "  ✓ Alembic configured"
else
    echo "  ✗ Alembic not properly configured"
    exit 1
fi

# Check environment templates
echo "✓ Checking environment templates..."
if [ -f "backend/.env.example" ] && [ -f "frontend/.env.example" ]; then
    echo "  ✓ Environment templates present"
else
    echo "  ✗ Missing environment templates"
    exit 1
fi

# Check Python imports
echo "✓ Testing backend imports..."
cd backend
if python3 -c "import models, schemas" 2>/dev/null; then
    echo "  ✓ Backend modules import successfully"
else
    echo "  ✗ Backend import error"
    exit 1
fi
cd ..

# Check frontend
echo "✓ Checking frontend files..."
if [ -f "frontend/src/components/WorkoutLogger.jsx" ]; then
    echo "  ✓ Frontend files present"
else
    echo "  ✗ Missing frontend files"
    exit 1
fi

# Check documentation
echo "✓ Checking documentation..."
if [ -f "MIGRATION_GUIDE.md" ] && [ -f "PHASE_1_COMPLETE.md" ]; then
    echo "  ✓ Documentation complete"
else
    echo "  ✗ Missing documentation"
    exit 1
fi

echo ""
echo "=== ALL CHECKS PASSED ✅ ==="
echo ""
echo "Next steps:"
echo "1. Create .env file: cp backend/.env.example backend/.env"
echo "2. Create frontend env: cp frontend/.env.example frontend/.env.local"
echo "3. Remove old database: rm backend/workout.db (optional, if upgrading)"
echo "4. Start backend: cd backend && python3 main.py"
echo "5. Start frontend: cd frontend && npm run dev"
echo "6. Register and test creating a workout"
echo ""
echo "See PHASE_1_COMPLETE.md for detailed information"
