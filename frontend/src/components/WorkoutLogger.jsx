import { useState, useEffect } from 'react';
import { API, authFetch } from '../api/client';
import ExerciseLibrary from './ExerciseLibrary';
import { Zap, FileText, Plus } from 'lucide-react';

export default function WorkoutLogger({ userId, exercises, setExercises, onWorkoutSaved }) {
  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem("activeCart");
      const parsed = saved ? JSON.parse(saved) : [];
      return parsed.every(item => Array.isArray(item.sets)) ? parsed : [];
    } catch { return []; }
  });
  const [isActive, setIsActive] = useState(() => localStorage.getItem("isWorkoutActive") === "true");
  const [seconds, setSeconds] = useState(() => parseInt(localStorage.getItem("activeSeconds")) || 0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fmt = s => `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`;

  const fetchExerciseLibrary = async (muscleGroup = 'All') => {
    try {
      let url = `${API}/exercises/library`;
      
      if (muscleGroup && muscleGroup !== 'All') {
        url += `?muscle=${muscleGroup.toLowerCase()}`;
      }
      
      const res = await authFetch(url);
      if (res.ok) {
        const data = await res.json();
        setExercises(data); 
      }
    } catch (err) {
      console.error("Failed fetching dynamic exercise category:", err);
    }
  };

  useEffect(() => {
    fetchExerciseLibrary('All');
  }, []);

  useEffect(() => {
    let interval = null;
    if (isActive) interval = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(interval);
  }, [isActive]);

  useEffect(() => {
    localStorage.setItem("activeCart", JSON.stringify(cart));
    localStorage.setItem("activeSeconds", seconds.toString());
    localStorage.setItem("isWorkoutActive", isActive.toString());
  }, [cart, seconds, isActive]);

  const addToWorkout = async (ex) => {
    if (cart.find(item => item.name === ex.name)) return;
    let lastStats = { weight: 0, reps: 0 };
    try {
      const res = await authFetch(`${API}/users/${userId}/exercises/${ex.name}/latest`);
      if (res.ok) lastStats = await res.json();
    } catch {}
    setCart(prev => [...prev, {
      name: ex.name, muscle_group: ex.muscle_group,
      lastWeight: lastStats.weight || 0, lastReps: lastStats.reps || 0,
      sets: [{ weight: lastStats.weight || 0, reps: lastStats.reps || 0, id: Date.now() }]
    }]);
  };

  const addSet = (name) => setCart(prev => prev.map(ex => ex.name !== name ? ex : {
    ...ex, sets: [...ex.sets, { ...ex.sets[ex.sets.length-1], id: Date.now() }]
  }));

  const updateSet = (name, setId, field, val) => setCart(prev => prev.map(ex => ex.name !== name ? ex : {
    ...ex, sets: ex.sets.map(s => s.id !== setId ? s : { ...s, [field]: parseInt(val) || 0 })
  }));

  const removeExercise = (name) => setCart(prev => prev.filter(ex => ex.name !== name));

  const removeSet = (name, setId) => setCart(prev =>
    prev.map(ex => ex.name !== name ? ex : { ...ex, sets: ex.sets.filter(s => s.id !== setId) })
       .filter(ex => ex.sets.length > 0)
  );

  const saveWorkout = async () => {
    if (cart.length === 0) { 
      setError("Add at least one exercise first."); 
      return; 
    }
    
    setSaving(true);
    setError('');
    
    try {
      console.log("Creating workout for userId:", userId);
      
      // Step 1: Create the workout
      const workoutRes = await authFetch(`${API}/users/${userId}/workouts/`, {
        method: "POST",
        body: JSON.stringify({ 
          date: new Date().toISOString().split('T')[0], 
          notes: `Duration: ${fmt(seconds)}` 
        }),
      });

      console.log("Workout response status:", workoutRes.status);
      
      if (!workoutRes.ok) {
        const errorData = await workoutRes.json().catch(() => ({}));
        console.error("Workout creation failed:", errorData);
        throw new Error(errorData.detail || "Failed to create workout");
      }
      
      const workoutData = await workoutRes.json();
      console.log("Workout created:", workoutData);
      const workoutId = workoutData.id;

      // Step 2: Add exercises to the workout (with all their sets in one request)
      for (const ex of cart) {
        console.log(`Adding exercise ${ex.name} with ${ex.sets.length} sets`);
        
        const exerciseRes = await authFetch(`${API}/workouts/${workoutId}/exercises/`, {
          method: "POST",
          body: JSON.stringify({ 
            name: ex.name,
            muscle_group: ex.muscle_group,
            notes: null,
            sets: ex.sets.map((set, idx) => ({
              reps: set.reps,
              weight: set.weight,
              set_number: idx + 1
            }))
          }),
        });
        
        if (!exerciseRes.ok) {
          const errorData = await exerciseRes.json().catch(() => ({}));
          console.error("Exercise add failed:", errorData);
          throw new Error(errorData.detail || "Failed to add exercise");
        }
      }

      console.log("Workout saved successfully!");
      
      // Clear state
      setCart([]);
      setIsActive(false);
      setSeconds(0);
      localStorage.removeItem("activeCart");
      localStorage.removeItem("activeSeconds");
      localStorage.removeItem("isWorkoutActive");
      
      onWorkoutSaved();
      
    } catch (err) {
      console.error("Save workout error:", err);
      setError(err.message || "Failed to save workout. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = { 
    width:"80px", 
    padding:"11px", 
    borderRadius:"8px", 
    border:"1px solid #e5e5e5", 
    fontSize:"15px", 
    background:"#fafafa",
    outline: "none",
    transition: "border-color 0.2s"
  };

  return (
    <div style={{ flex:1, display:"flex", overflow:"hidden" }}>
      {/* Center workbench */}
      <div style={{ flex:1, padding:"32px", overflowY:"auto", display:"flex", justifyContent:"center", background:"#fafafa" }}>
        <div style={{ width:"100%", maxWidth:"900px", display:"flex", flexDirection:"column" }}>

          {/* Header bar */}
          <div style={{ 
            display:"flex", 
            justifyContent:"space-between", 
            alignItems:"center", 
            marginBottom:"24px", 
            background:"white", 
            padding:"20px 28px", 
            borderRadius:"12px", 
            boxShadow:"0 1px 3px rgba(0,0,0,0.06)",
            border: "1px solid #e5e5e5"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              {isActive ? (
                <div style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "10px",
                  background: "#ecfdf5",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}>
                  <Zap size={22} color="#10b981" />
                </div>
              ) : (
                <div style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "10px",
                  background: "#f5f5f5",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}>
                  <FileText size={22} color="#666" />
                </div>
              )}
              <h2 style={{ margin:0, color:"#111", fontSize:"20px", fontWeight: 700 }}>
                {isActive ? "Live Workout" : "New Workout"}
              </h2>
            </div>
            {isActive && (
              <div style={{ 
                fontSize:"28px", 
                fontWeight:"700", 
                color:"#10b981", 
                fontFamily:"monospace",
                letterSpacing: "-1px"
              }}>
                {fmt(seconds)}
              </div>
            )}
          </div>

          {error && (
            <div style={{ 
              background:"#fee2e2", 
              color:"#ef4444", 
              padding:"12px 16px", 
              borderRadius:"10px", 
              marginBottom:"16px", 
              fontSize:"14px",
              border: "1px solid #fecaca",
              fontWeight: 500
            }}>
              {error}
            </div>
          )}

          {cart.length === 0 ? (
            <div style={{ textAlign:"center", color:"#999", marginTop:"12vh", fontSize:"15px" }}>
              <div style={{
                width: "72px",
                height: "72px",
                borderRadius: "16px",
                background: "#ecfdf5",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px"
              }}>
                <Plus size={36} color="#10b981" />
              </div>
              Select an exercise from the library to begin.
            </div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:"18px" }}>
              {cart.map(ex => (
                <div key={ex.name} style={{ 
                  background:"white", 
                  borderRadius:"12px", 
                  border:"1px solid #e5e5e5", 
                  overflow:"hidden",
                  transition: "box-shadow 0.2s"
                }}>
                  <div style={{ 
                    background:"#fafafa", 
                    padding:"14px 20px", 
                    display:"flex", 
                    justifyContent:"space-between", 
                    alignItems:"center", 
                    borderBottom:"1px solid #e5e5e5" 
                  }}>
                    <div>
                      <span style={{ fontWeight:"700", fontSize:"16px", color:"#111" }}>{ex.name}</span>
                      {ex.lastWeight > 0 && (
                        <span style={{ 
                          marginLeft:"12px", 
                          fontSize:"11px", 
                          color:"#10b981", 
                          background:"#ecfdf5", 
                          padding:"4px 10px", 
                          borderRadius:"6px", 
                          fontWeight:"600" 
                        }}>
                          Last: {ex.lastWeight}kg × {ex.lastReps}
                        </span>
                      )}
                    </div>
                    <button 
                      onClick={() => removeExercise(ex.name)} 
                      style={{ 
                        background:"#fee2e2", 
                        border:"none", 
                        color:"#ef4444", 
                        cursor:"pointer", 
                        width:"32px", 
                        height:"32px", 
                        borderRadius:"8px", 
                        fontSize:"16px", 
                        display:"flex", 
                        alignItems:"center", 
                        justifyContent:"center",
                        fontWeight: 600
                      }}
                    >
                      ✕
                    </button>
                  </div>

                  <div style={{ padding:"14px 20px" }}>
                    <div style={{ 
                      display:"flex", 
                      gap:"24px", 
                      marginBottom:"10px", 
                      color:"#999", 
                      fontSize:"11px", 
                      fontWeight:"600", 
                      paddingLeft:"40px", 
                      letterSpacing:"0.5px",
                      textTransform: "uppercase"
                    }}>
                      <span style={{width:"80px"}}>Weight</span>
                      <span style={{width:"80px"}}>Reps</span>
                    </div>
                    {ex.sets.map((set, idx) => (
                      <div key={set.id} style={{ 
                        display:"flex", 
                        alignItems:"center", 
                        gap:"24px", 
                        padding:"8px 0" 
                      }}>
                        <span style={{ 
                          width:"20px", 
                          color:"#ccc", 
                          fontWeight:"600", 
                          fontSize:"14px", 
                          textAlign:"right" 
                        }}>
                          {idx+1}
                        </span>
                        <input 
                          type="number" 
                          style={inputStyle} 
                          value={set.weight} 
                          onChange={e => updateSet(ex.name, set.id, 'weight', e.target.value)}
                          onFocus={e => e.target.style.borderColor = "#10b981"}
                          onBlur={e => e.target.style.borderColor = "#e5e5e5"}
                        />
                        <input 
                          type="number" 
                          style={inputStyle} 
                          value={set.reps} 
                          onChange={e => updateSet(ex.name, set.id, 'reps', e.target.value)}
                          onFocus={e => e.target.style.borderColor = "#10b981"}
                          onBlur={e => e.target.style.borderColor = "#e5e5e5"}
                        />
                        <button 
                          onClick={() => removeSet(ex.name, set.id)} 
                          style={{ 
                            color:"#ef4444", 
                            background:"none", 
                            border:"none", 
                            cursor:"pointer", 
                            marginLeft:"auto", 
                            fontSize:"18px",
                            fontWeight: 600
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                    <button 
                      onClick={() => addSet(ex.name)} 
                      style={{ 
                        width:"100%", 
                        marginTop:"10px", 
                        padding:"10px", 
                        background:"#fafafa", 
                        border:"2px dashed #e5e5e5", 
                        borderRadius:"10px", 
                        cursor:"pointer", 
                        color:"#666", 
                        fontSize:"13px", 
                        fontWeight:"600",
                        transition: "all 0.2s"
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.borderColor = "#10b981";
                        e.currentTarget.style.color = "#10b981";
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.borderColor = "#e5e5e5";
                        e.currentTarget.style.color = "#666";
                      }}
                    >
                      + Add Set
                    </button>
                  </div>
                </div>
              ))}

              <button 
                onClick={isActive ? saveWorkout : () => setIsActive(true)} 
                disabled={saving}
                style={{ 
                  padding:"16px", 
                  background: saving ? "#d1d5db" : isActive ? "#10b981" : "#10b981", 
                  color:"white", 
                  border:"none", 
                  borderRadius:"12px", 
                  fontSize:"16px", 
                  fontWeight:"600", 
                  cursor: saving ? "not-allowed" : "pointer", 
                  marginTop:"8px",
                  transition: "all 0.2s",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px"
                }}
                onMouseEnter={e => !saving && (e.currentTarget.style.background = "#059669")}
                onMouseLeave={e => !saving && (e.currentTarget.style.background = "#10b981")}
              >
                {saving ? "Saving..." : isActive ? "✓ Finish & Save Workout" : "▶ Start Workout"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Right panel */}
      <ExerciseLibrary 
        exercises={exercises} 
        setExercises={setExercises} 
        onFetchLibrary={fetchExerciseLibrary} 
        onAdd={addToWorkout} 
      />
    </div>
  );
}