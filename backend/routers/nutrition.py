import os
import time
from datetime import date
from typing import List, Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

try:
    import models, schemas
    from dependencies import get_current_user, get_db
except ModuleNotFoundError:
    from .. import models, schemas
    from ..dependencies import get_current_user, get_db

router = APIRouter()

FS_CLIENT_ID = os.getenv("FS_CLIENT_ID")
FS_CLIENT_SECRET = os.getenv("FS_CLIENT_SECRET")
fs_access_token = {"token": None, "expires": 0}


async def get_fs_token():
    if fs_access_token["token"] and time.time() < fs_access_token["expires"] - 60:
        return fs_access_token["token"]

    async with httpx.AsyncClient() as client:
        res = await client.post(
            "https://oauth.fatsecret.com/connect/token",
            auth=(FS_CLIENT_ID, FS_CLIENT_SECRET),
            data={"grant_type": "client_credentials", "scope": "basic"},
        )
        data = res.json()
        fs_access_token["token"] = time.time() + data.get("expires_in", 86400)
        return data["access_token"]


@router.post("/users/me/nutrition/", response_model=schemas.NutritionEntry)
def create_nutrition_entry(
    entry: schemas.NutritionEntryCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    entry_data = entry.model_dump()

    db_entry = models.NutritionEntry(
        user_id=current_user.id,
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


@router.get("/users/me/nutrition/", response_model=List[schemas.NutritionEntry])
def get_nutrition_entries(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    query = db.query(models.NutritionEntry).filter(models.NutritionEntry.user_id == current_user.id)

    if start_date:
        query = query.filter(models.NutritionEntry.date >= start_date)
    if end_date:
        query = query.filter(models.NutritionEntry.date <= end_date)

    return query.order_by(models.NutritionEntry.date.desc()).all()


@router.delete("/users/me/nutrition/{entry_id}")
def delete_nutrition_entry(
    entry_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    entry = db.query(models.NutritionEntry).filter(models.NutritionEntry.id == entry_id).first()

    if not entry or entry.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Entry not found")

    db.delete(entry)
    db.commit()
    return {"message": "Entry deleted"}


@router.get("/nutrition/search")
async def search_foods(query: str, current_user: models.User = Depends(get_current_user)):
    token = await get_fs_token()

    async with httpx.AsyncClient() as client:
        res = await client.get(
            "https://platform.fatsecret.com/rest/server.api",
            params={
                "method": "foods.search",
                "search_expression": query,
                "format": "json",
                "max_results": 10,
            },
            headers={"Authorization": f"Bearer {token}"},
        )

        if res.status_code != 200:
            raise HTTPException(status_code=500, detail="Failed to search database")

        return res.json()


@router.get("/nutrition/food/{food_id}")
async def get_food_details(food_id: str, current_user: models.User = Depends(get_current_user)):
    token = await get_fs_token()

    try:
        async with httpx.AsyncClient() as client:
            res = await client.get(
                "https://platform.fatsecret.com/rest/server.api",
                params={
                    "method": "food.get.v2",
                    "food_id": food_id,
                    "format": "json",
                },
                headers={"Authorization": f"Bearer {token}"},
                timeout=10.0,
            )

            if res.status_code != 200:
                raise HTTPException(status_code=502, detail="FatSecret API unavailable")

            data = res.json()

            if "food" not in data:
                raise HTTPException(status_code=404, detail="Food not found")

            food = data["food"]
            servings_data = food.get("servings", {})
            if not servings:
                raise HTTPException(status_code=400, detail="No serving information available")

            serving = servings[0] if isinstance(servings, list) else servings

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
                            "serving_description": serving.get("serving_description", "1 serving"),
                        }
                    },
                }
            }

    except HTTPException:
        raise
    except Exception as e:
        print(f"FatSecret food details error: {str(e)}")
        raise HTTPException(status_code=500, detail="Error retrieving food details")


@router.get("/users/me/foods", response_model=List[schemas.FoodItem])
def get_food_items(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return (
        db.query(models.FoodItem)
        .filter(models.FoodItem.user_id == current_user.id)
        .order_by(models.FoodItem.created_at.desc())
        .all()
    )


@router.post("/users/me/foods", response_model=schemas.FoodItem)
def create_food_item(
    food: schemas.FoodItemCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    db_food = models.FoodItem(**food.model_dump(), user_id=current_user.id)
    db.add(db_food)
    db.commit()
    db.refresh(db_food)
    return db_food


@router.delete("/users/me/foods/{food_id}")
def delete_food_item(
    food_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    food = db.query(models.FoodItem).filter(models.FoodItem.id == food_id).first()

    if not food or food.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Food item not found")

    db.delete(food)
    db.commit()
    return {"message": "Food item deleted"}
