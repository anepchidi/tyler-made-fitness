import { API, authFetch } from './client';

export const searchFood = async (query) => {
  const res = await authFetch(`${API}/nutrition/search?query=${encodeURIComponent(query)}`);

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Search failed');
  }

  const data = await res.json();

  const foods = data.foods?.food;
  if (!foods) return [];

  return Array.isArray(foods) ? foods : [foods];
};

export const getFoodDetails = async (foodId) => {
  const res = await authFetch(`${API}/nutrition/food/${foodId}`);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Failed to fetch food details');
  }
  
  const data = await res.json();
  const food = data.food;
  
  // Extract the first serving
  const s = Array.isArray(food.servings.serving) 
    ? food.servings.serving[0] 
    : food.servings.serving;

  return {
    name: food.food_name,
    calories: parseFloat(s.calories || 0),
    protein: parseFloat(s.protein || 0),
    carbs: parseFloat(s.carbohydrate || 0),
    fat: parseFloat(s.fat || 0),
    fiber: parseFloat(s.fiber || 0),
    sugar: parseFloat(s.sugar || 0),
    sodium: parseFloat(s.sodium || 0),
    potassium: parseFloat(s.potassium || 0),
    iron: parseFloat(s.iron || 0),
    calcium: parseFloat(s.calcium || 0),
  };
};