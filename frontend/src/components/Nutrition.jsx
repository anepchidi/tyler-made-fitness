import { useState, useEffect } from 'react';
import { Apple, Search, Plus, X, Target, TrendingUp, Utensils, Coffee, Cookie } from 'lucide-react';

import client from '../api/client';
import { PRESETS } from '../data/presets';
import { searchFood, getFoodDetails } from '../api/fatSecret'; 

export default function Nutrition({ userId }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  const [goals, setGoals] = useState(() => {
    const saved = localStorage.getItem("nutritionGoals");
    return saved ? JSON.parse(saved) : { cal: 2000, protein: 150, carbs: 250, fat: 65 };
  });
  
  const [custom, setCustom] = useState({ name:"", cal:"", protein:"", carbs:"", fat:"", meal:"breakfast" });
  const [view, setView] = useState("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [editingGoals, setEditingGoals] = useState(false);
  const [tempGoals, setTempGoals] = useState(goals);
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [addingId, setAddingId] = useState(null);
  const [searchMealType, setSearchMealType] = useState("breakfast");

  // 1. Fetch entries on load
  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    const today = new Date().toISOString().split('T')[0];
    client.get(`/users/me/nutrition/?start_date=${today}&end_date=${today}`)
      .then(data => {
        if (Array.isArray(data)) setEntries(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to load nutrition entries:", err);
        setLoading(false);
      });
  }, [userId]);

  // 2. Save goals to localStorage
  useEffect(() => {
    localStorage.setItem("nutritionGoals", JSON.stringify(goals));
  }, [goals]);

  // 3. Debounced Search Effect
  useEffect(() => {
    // Clear results if the query is empty
    if (searchQuery.trim() === "") {
      setSearchResults([]);
      return;
    }

    // Set a timeout to delay the search
    const delayDebounceFn = setTimeout(async () => {
      setIsSearching(true);
      setError(""); 
      try {
        const results = await searchFood(searchQuery);
        setSearchResults(results);
      } catch (err) {
        console.error(err);
        setError("Failed to search database.");
      } finally {
        setIsSearching(false);
      }
    }, 400);

    // Cleanup function to clear the timeout if user is still typing
    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  // 4. Remove Entry
  const remove = async (id) => {
    if (!userId) return;
    try {
      await client.delete(`/users/me/nutrition/${id}`);
      setEntries(prev => prev.filter(i => i.id !== id));
    } catch (err) {
      setError(err.message || "Failed to delete entry");
    }
  };
  
  // 5. Add by FatSecret ID
  const handleAddById = async (foodId, mealType) => {
    try {
      setAddingId(foodId);
      setError("");

      const foodData = await getFoodDetails(foodId);
      const serving = foodData?.food?.servings?.serving;

      await add({
        name: foodData.food.food_name,
        calories: serving.calories,
        protein: serving.protein,
        carbs: serving.carbohydrate,
        fat: serving.fat,
        fiber: serving.fiber,
        sugar: serving.sugar,
        sodium: serving.sodium
      }, mealType);

      setView("overview");
    } catch (err) {
      setError("Failed to fetch food details");
    } finally {
      setAddingId(null);
    }
  };

  // 6. Core Add Function (Handles both Presets and FatSecret data)
  const add = async (item, mealType = "breakfast") => {
    if (!userId) {
      setError("Please log in to track nutrition");
      return;
    }

    try {
      const today = new Date().toISOString().split('T')[0];
      const newEntry = await client.post('/users/me/nutrition/', {
        date: today, meal_type: mealType, meal_name: item.name || item.food_name,
        calories: Math.round(item.calories || item.cal || 0),
        protein_g: item.protein || 0, carbs_g: item.carbs || 0, fat_g: item.fat || 0,
        fiber_g: item.fiber || 0, sugar_g: item.sugar || 0, sodium_mg: item.sodium || 0,
        potassium_mg: item.potassium || 0, iron_pct: item.iron || 0, calcium_pct: item.calcium || 0,
      });
      setEntries(prev => [...prev, newEntry]);
    } catch (err) {
      setError(err.message || "Failed to add entry");
    }
  };

  const totals = entries.reduce((acc, i) => ({
    cal: acc.cal + (i.calories || 0), 
    protein: acc.protein + (i.protein_g || 0),
    carbs: acc.carbs + (i.carbs_g || 0), 
    fat: acc.fat + (i.fat_g || 0),
  }), { cal:0, protein:0, carbs:0, fat:0 });

  const remaining = {
    cal: goals.cal - totals.cal,
    protein: goals.protein - totals.protein,
    carbs: goals.carbs - totals.carbs,
    fat: goals.fat - totals.fat
  };

  const addCustom = async () => {
    if (!custom.name || !custom.cal) return;
    
    await add({
      name: custom.name,
      cal: +custom.cal,
      protein: +custom.protein || 0,
      carbs: +custom.carbs || 0,
      fat: +custom.fat || 0
    }, custom.meal);
    
    setCustom({ name:"", cal:"", protein:"", carbs:"", fat:"", meal:"breakfast" });
    setView("overview");
  };

  const saveGoals = () => {
    setGoals(tempGoals);
    setEditingGoals(false);
  };

  const filteredPresets = PRESETS.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const mealGroups = {
    breakfast: entries.filter(i => i.meal_type === "breakfast"),
    lunch: entries.filter(i => i.meal_type === "lunch"),
    dinner: entries.filter(i => i.meal_type === "dinner"),
    snack: entries.filter(i => i.meal_type === "snack")
  };

  const MacroRing = ({ label, current, goal, color }) => {
    const percentage = Math.min((current / goal) * 100, 100);
    const radius = 45;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;

    return (
      <div style={{ textAlign: "center", position: "relative" }}>
        <svg width="120" height="120" style={{ transform: "rotate(-90deg)" }}>
          <circle cx="60" cy="60" r={radius} fill="none" stroke="#f0f0f0" strokeWidth="10" />
          <circle 
            cx="60" 
            cy="60" 
            r={radius} 
            fill="none" 
            stroke={color} 
            strokeWidth="10"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 0.5s ease" }}
          />
        </svg>
        <div style={{ 
          position: "absolute", 
          top: "50%", 
          left: "50%", 
          transform: "translate(-50%, -50%)",
          textAlign: "center"
        }}>
          <div style={{ fontSize: "24px", fontWeight: 900, color: "#111" }}>{current}</div>
          <div style={{ fontSize: "11px", color: "#999", fontWeight: 600 }}>/ {goal}</div>
        </div>
        <div style={{ fontSize: "13px", color: "#666", fontWeight: 600, marginTop: "8px" }}>
          {label}
        </div>
      </div>
    );
  };

  const card = { 
    background:"white", 
    padding:"24px", 
    borderRadius:"16px", 
    boxShadow:"0 2px 8px rgba(0,0,0,0.04)",
    border: "1px solid #f3f4f6"
  };

  const inp = { 
    padding:"12px 14px", 
    borderRadius:"10px", 
    border:"1px solid #f3f4f6", 
    fontSize:"14px",
    outline: "none",
    transition: "border-color 0.2s"
  };

  const mealIcons = {
    breakfast: Coffee,
    lunch: Utensils,
    dinner: Apple,
    snack: Cookie
  };

  return (
    <div style={{ flex:1, padding:"32px", overflowY:"auto", background: "#f3f4f6" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "32px", color: "#111", fontWeight: 800 }}>
            Nutrition Tracker 
          </h1>
          <p style={{ color: "#666", margin: "8px 0 0", fontSize: "16px" }}>
            {remaining.cal > 0 
              ? `${remaining.cal} calories remaining for today`
              : `${Math.abs(remaining.cal)} calories over goal`}
          </p>
        </div>
        
        <button 
          onClick={() => setEditingGoals(!editingGoals)}
          style={{
            padding: "12px 24px",
            background: "#f3f4f6",
            border: "none",
            borderRadius: "10px",
            cursor: "pointer",
            fontWeight: 600,
            fontSize: "14px",
            color: "#111",
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }}
        >
          <Target size={18} />
          {editingGoals ? "Cancel" : "Edit Goals"}
        </button>
      </div>

      {/* Goals Editor */}
      {editingGoals && (
        <div style={{ ...card, marginBottom: "24px", background: "#fef3c7", borderColor: "#fcd34d" }}>
          <h3 style={{ margin: "0 0 16px", fontSize: "18px", color: "#111" }}>Set Daily Goals</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "16px" }}>
            <div>
              <label style={{ fontSize: "13px", fontWeight: 600, color: "#666", display: "block", marginBottom: "6px" }}>
                Calories
              </label>
              <input 
                type="number" 
                value={tempGoals.cal} 
                onChange={e => setTempGoals({...tempGoals, cal: +e.target.value})}
                style={inp}
              />
            </div>
            <div>
              <label style={{ fontSize: "13px", fontWeight: 600, color: "#666", display: "block", marginBottom: "6px" }}>
                Protein (g)
              </label>
              <input 
                type="number" 
                value={tempGoals.protein} 
                onChange={e => setTempGoals({...tempGoals, protein: +e.target.value})}
                style={inp}
              />
            </div>
            <div>
              <label style={{ fontSize: "13px", fontWeight: 600, color: "#666", display: "block", marginBottom: "6px" }}>
                Carbs (g)
              </label>
              <input 
                type="number" 
                value={tempGoals.carbs} 
                onChange={e => setTempGoals({...tempGoals, carbs: +e.target.value})}
                style={inp}
              />
            </div>
            <div>
              <label style={{ fontSize: "13px", fontWeight: 600, color: "#666", display: "block", marginBottom: "6px" }}>
                Fat (g)
              </label>
              <input 
                type="number" 
                value={tempGoals.fat} 
                onChange={e => setTempGoals({...tempGoals, fat: +e.target.value})}
                style={inp}
              />
            </div>
          </div>
          <button 
            onClick={saveGoals}
            style={{
              padding: "12px 24px",
              background: "#10b981",
              color: "white",
              border: "none",
              borderRadius: "10px",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: "14px"
            }}
          >
            Save Goals
          </button>
        </div>
      )}

      {/* Macro Rings */}
      <div style={{ ...card, marginBottom: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-around", alignItems: "center" }}>
          <MacroRing label="Calories" current={totals.cal} goal={goals.cal} color="#3b82f6" />
          <MacroRing label="Protein" current={totals.protein.toFixed(1)} goal={goals.protein} color="#10b981" />
          <MacroRing label="Carbs" current={totals.carbs.toFixed(1)} goal={goals.carbs} color="#f59e0b" />
          <MacroRing label="Fat" current={totals.fat.toFixed(1)} goal={goals.fat} color="#ef4444" />
        </div>
      </div>

      {/* View Tabs */}
      <div style={{ display:"flex", gap:"8px", marginBottom:"20px" }}>
        {[
          ["overview","Overview"], 
          ["add","Add Food"], 
          ["custom","Custom Food"]
        ].map(([id, label]) => (
          <button 
            key={id} 
            onClick={() => setView(id)} 
            style={{
              padding:"12px 24px", 
              borderRadius:"10px", 
              border:"none", 
              cursor:"pointer", 
              fontWeight: 600, 
              fontSize:"14px", 
              background: view === id ? "#059669" : "#f3f4f6", 
              color: view === id ? "white" : "#666",
              transition: "all 0.2s"
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Overview - Meal breakdown */}
      {view === "overview" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {Object.entries(mealGroups).map(([mealName, items]) => {
            const Icon = mealIcons[mealName];
            return (
              <div key={mealName} style={card}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "10px",
                      background: "#f3f4f6",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}>
                      <Icon size={18} color="#111" />
                    </div>
                    <h3 style={{ margin: 0, fontSize: "18px", color: "#111", fontWeight: 700, textTransform: "capitalize" }}>
                      {mealName}
                    </h3>
                  </div>
                  {items.length > 0 && (
                    <div style={{ fontSize: "14px", color: "#666", fontWeight: 600 }}>
                      {items.reduce((sum, item) => sum + item.calories, 0)} cal
                    </div>
                  )}
                </div>

                {items.length === 0 ? (
                  <div style={{ textAlign: "center", color: "#bbb", padding: "20px", fontSize: "14px" }}>
                    No items logged for {mealName}
                  </div>
                ) : (
                  items.map(item => (
                    <div key={item.id} style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "12px",
                      background: "#f9fafb",
                      borderRadius: "10px",
                      marginBottom: "8px"
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: "14px", color: "#111", marginBottom: "4px" }}>
                          {item.meal_name}
                        </div>
                        <div style={{ fontSize: "12px", color: "#666" }}>
                          {item.calories} cal · P: {item.protein_g}g · C: {item.carbs_g}g · F: {item.fat_g}g
                        </div>
                      </div>
                      <button 
                        onClick={() => remove(item.id)} 
                        style={{
                          background: "none",
                          border: "none",
                          color: "#ef4444",
                          cursor: "pointer",
                          padding: "8px",
                          borderRadius: "8px",
                          transition: "background 0.2s"
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = "#fee2e2"}
                        onMouseLeave={e => e.currentTarget.style.background = "none"}
                      >
                        <X size={18} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add Food */}
      {view === "add" && (
        <div style={card}>
          <div style={{ marginBottom: "20px", display: "flex", gap: "12px" }}>
            <div style={{ position: "relative", flex: 1 }}>
              <Search size={18} color="#999" style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)" }} />
              <input 
                type="text"
                placeholder="Search foods..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  ...inp,
                  width: "100%",
                  paddingLeft: "44px",
                  boxSizing: "border-box"
                }}
              />
            </div>

            <select 
              value={searchMealType}
              onChange={e => setSearchMealType(e.target.value)}
              style={{ ...inp, width: "140px", cursor: "pointer"}}
            >
              <option value="breakfast">Breakfast</option>
              <option value="lunch">Lunch</option>
              <option value="dinner">Dinner</option>
              <option value="snack">Snack</option>
            </select>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {searchResults.length > 0 && (
              <div style={{ marginBottom: "24px" }}>
                <h4 style={{ margin: "0 0 12px", color: "#111", fontSize: "16px" }}>Search Results</h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {searchResults.map(food => {
                    const isAddingThis = addingId === food.food_id;
                    
                    return (
                      <div key={food.food_id} style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "16px",
                        background: "#eff6ff", 
                        borderRadius: "12px",
                        border: "1px solid #bfdbfe"
                      }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: "14px", color: "#111", marginBottom: "4px" }}>
                            {food.food_name}
                          </div>
                          <div style={{ fontSize: "12px", color: "#666" }}>
                            {food.food_description} 
                          </div>
                        </div>
                        <button 
                          onClick={() => handleAddById(food.food_id, searchMealType)} 
                          disabled={isAddingThis || isSearching}
                          style={{
                            background: isAddingThis ? "#9ca3af" : "#3b82f6",
                            color: "white",
                            border: "none",
                            borderRadius: "10px",
                            padding: "10px 20px",
                            cursor: (isAddingThis || isSearching) ? "not-allowed" : "pointer",
                            fontWeight: 600,
                            fontSize: "13px",
                            display: "flex",
                            alignItems: "center",
                            gap: "6px"
                          }}
                        >
                          <Plus size={16} />
                          {isAddingThis ? "Adding..." : "Add"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Loading Indicator */}
            {isSearching && !addingId && <div style={{ textAlign: "center", color: "#666", padding: "20px" }}>Searching database...</div>}

            {/* Existing Presets Header */}
            {filteredPresets.length > 0 && (
              <h4 style={{ margin: "0 0 12px", color: "#111", fontSize: "16px" }}>Quick Add</h4>
            )}
            {filteredPresets.map(p => (
              <div key={p.name} style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "16px",
                background: "#f9fafb",
                borderRadius: "12px",
                transition: "background 0.2s",
                cursor: "pointer"
              }}
              onMouseEnter={e => e.currentTarget.style.background = "#f3f4f6"}
              onMouseLeave={e => e.currentTarget.style.background = "#f9fafb"}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: "14px", color: "#111", marginBottom: "4px" }}>
                    {p.name}
                  </div>
                  <div style={{ fontSize: "12px", color: "#666" }}>
                    {p.calories} cal · P: {p.protein}g · C: {p.carbs}g · F: {p.fat}g
                  </div>
                </div>
                <button 
                  onClick={() => add(p, searchMealType)} 
                  style={{
                    background: "#3b82f6",
                    color: "white",
                    border: "none",
                    borderRadius: "10px",
                    padding: "10px 20px",
                    cursor: "pointer",
                    fontWeight: 600,
                    fontSize: "13px",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px"
                  }}
                >
                  <Plus size={16} />
                  Add
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Custom Food */}
      {view === "custom" && (
        <div style={card}>
          <h3 style={{ margin: "0 0 20px", fontSize: "18px", color: "#111" }}>Add Custom Food</h3>
          
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
            <input 
              style={{ ...inp, gridColumn: "1/-1" }} 
              placeholder="Food name" 
              value={custom.name} 
              onChange={e => setCustom({...custom, name: e.target.value})} 
            />
            
            <select 
              style={{ ...inp, gridColumn: "1/-1" }}
              value={custom.meal}
              onChange={e => setCustom({...custom, meal: e.target.value})}
            >
              <option value="breakfast">Breakfast</option>
              <option value="lunch">Lunch</option>
              <option value="dinner">Dinner</option>
              <option value="snack">Snack</option>
            </select>

            <input 
              style={inp} 
              type="number" 
              placeholder="Calories" 
              value={custom.cal} 
              onChange={e => setCustom({...custom, cal: e.target.value})} 
            />
            <input 
              style={inp} 
              type="number" 
              placeholder="Protein (g)" 
              value={custom.protein} 
              onChange={e => setCustom({...custom, protein: e.target.value})} 
            />
            <input 
              style={inp} 
              type="number" 
              placeholder="Carbs (g)" 
              value={custom.carbs} 
              onChange={e => setCustom({...custom, carbs: e.target.value})} 
            />
            <input 
              style={inp} 
              type="number" 
              placeholder="Fat (g)" 
              value={custom.fat} 
              onChange={e => setCustom({...custom, fat: e.target.value})} 
            />
          </div>
          
          <button 
            onClick={addCustom} 
            style={{
              width: "100%",
              padding: "14px",
              background: "#10b981",
              color: "white",
              border: "none",
              borderRadius: "10px",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: "15px"
            }}
          >
            Add to Log
          </button>
        </div>
      )}
    </div>
  );
}