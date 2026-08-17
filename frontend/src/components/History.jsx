import client from '../api/client';
import { Calendar, Trash2, Dumbbell, TrendingUp, Clock } from 'lucide-react';
import { useState } from 'react';

export default function History({ workoutHistory, onDelete }) {
  const [filterMonth, setFilterMonth] = useState('all');

  const groupByName = (list) => (list || []).reduce((acc, ex) => {
    if (!acc[ex.name]) acc[ex.name] = [];
    acc[ex.name].push(ex);
    return acc;
  }, {});

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this workout? This cannot be undone.")) return;
    try {
      await client.delete(`/workouts/${id}`);
      onDelete();
    } catch (error) {
      console.error("Failed to delete workout:", error);
    }
  };

  // Filter by month
  const filtered = filterMonth === 'all' 
    ? workoutHistory 
    : workoutHistory.filter(w => {
        const month = new Date(w.date).getMonth();
        return month === parseInt(filterMonth);
      });

  // Get unique months from workout history
  const months = [...new Set(workoutHistory.map(w => new Date(w.date).getMonth()))];

  const card = {
    background: "white",
    padding: "28px",
    borderRadius: "16px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
    border: "1px solid #f0f0f0",
    marginBottom: "20px",
    transition: "all 0.2s"
  };

  const calculateWorkoutVolume = (exercises = []) => {
    return exercises.reduce((sum, e) => {
     if (e.sets && e.sets.length > 0) {
       return sum + e.sets.reduce((s, set) => {
         const weight = Number(set.weight) || 0; // Fallback to 0 if empty
         const reps = Number(set.reps) || 0;
         return s + (weight * reps);
       }, 0);
      }

    // 2. Fallback for older data structure where weight/reps were direct properties
      const weight = Number(e.weight) || 0;
      const reps = Number(e.reps) || 0;
      return sum + (weight * reps);
    }, 0);
  };

  const totalVolumeKg = workoutHistory.reduce(
  (sum, w) => sum + calculateWorkoutVolume(w.exercises), 
  0
  );

  return (
    <div style={{ flex:1, padding:"32px", overflowY:"auto", background: "#fafafa" }}>
      <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: "32px" }}>
          <h1 style={{ margin: 0, fontSize: "32px", color: "#111", fontWeight: 800 }}>
            History 
          </h1>
          <p style={{ color: "#666", margin: "8px 0 0", fontSize: "16px" }}>
            {workoutHistory.length} workout{workoutHistory.length !== 1 ? 's' : ''} completed
          </p>
        </div>

        {/* Stats Summary */}
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", 
          gap: "16px", 
          marginBottom: "24px" 
        }}>
          {[
            { 
              label: "Total Workouts", 
              value: workoutHistory.length, 
              icon: Dumbbell, 
              color: "#059669",
              bg: "#f3f4f6"
            },
            { 
              label: "Total Volume", 
              value: `${(totalVolumeKg / 1000).toFixed(1)}t`, 
              icon: TrendingUp, 
              color: "#059669",
              bg: "#f3f4f6"
            },
            { 
              label: "This Month", 
              value: workoutHistory.filter(w => 
                new Date(w.date).getMonth() === new Date().getMonth()
              ).length, 
              icon: Calendar, 
              color: "#059669",
              bg: "#f3f4f6"
            }
          ].map((stat, i) => {
            const Icon = stat.icon;
            return (
              <div key={i} style={{
                ...card,
                padding: "20px",
                cursor: "pointer"
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 8px 20px rgba(0,0,0,0.08)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.04)";
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                  <div style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "10px",
                    background: stat.bg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}>
                    <Icon size={20} color={stat.color} />
                  </div>
                  <div style={{ fontSize: "28px", fontWeight: 900, color: "#111" }}>
                    {stat.value}
                  </div>
                </div>
                <div style={{ fontSize: "13px", color: "#666", fontWeight: 600 }}>
                  {stat.label}
                </div>
              </div>
            );
          })}
        </div>

        {/* Filter */}
        {months.length > 1 && (
          <div style={{ marginBottom: "24px" }}>
            <select 
              value={filterMonth} 
              onChange={e => setFilterMonth(e.target.value)}
              style={{
                padding: "12px 18px",
                borderRadius: "10px",
                border: "1px solid #e5e7eb",
                fontSize: "14px",
                fontWeight: 600,
                background: "white",
                cursor: "pointer",
                outline: "none"
              }}
            >
              <option value="all">All Time</option>
              {months.map(m => (
                <option key={m} value={m}>
                  {new Date(2024, m).toLocaleDateString('en-US', { month: 'long' })}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Workouts List */}
        {filtered.length === 0 ? (
          <div style={{ 
            textAlign: "center", 
            color: "#999", 
            marginTop: "10vh", 
            fontSize: "17px" 
          }}>
            <div style={{
              width: "80px",
              height: "80px",
              borderRadius: "20px",
              background: "#f3f4f6",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 20px"
            }}>
              <Dumbbell size={40} color="#ccc" />
            </div>
            <div>No workouts yet. Log your first one!</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {filtered.map(w => {
              const grouped = groupByName(w.exercises);
              const totalVolume = (w.exercises || []).reduce((sum, e) => {
                if (e.sets && e.sets.length > 0) {
                  const setsVolume = e.sets.reduce((ss, set) => {
                    return ss + (Number(set.weight) || 0) * (Number(set.reps) || 0);
                  }, 0);
                  return sum + setsVolume;
                }

                const oldWeight = Number(e.weight) || 0;
                const oldReps = Number(e.reps) || 0;
                return sum + (oldWeight * oldReps);
              }, 0);

              const totalSets = Object.values(grouped).reduce((sum, sets) => sum + sets.length, 0);

              return (
                <div 
                  key={w.id} 
                  style={card}
                  onMouseEnter={e => {
                    e.currentTarget.style.boxShadow = "0 8px 20px rgba(0,0,0,0.08)";
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.04)";
                  }}
                >
                  {/* Workout Header */}
                  <div style={{ 
                    display: "flex", 
                    justifyContent: "space-between", 
                    alignItems: "flex-start",
                    marginBottom: "20px", 
                    paddingBottom: "20px", 
                    borderBottom: "1px solid #f0f0f0" 
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                        <div style={{
                          width: "36px",
                          height: "36px",
                          borderRadius: "10px",
                          background: "#f3f4f6",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center"
                        }}>
                          <Calendar size={18} color="#111" />
                        </div>
                        <h3 style={{ margin: 0, fontSize: "18px", color: "#111", fontWeight: 700 }}>
                          {new Date(w.date).toLocaleDateString('en-US', { 
                            weekday: 'long', 
                            month: 'long', 
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </h3>
                      </div>
                      
                      <div style={{ display: "flex", gap: "16px", marginLeft: "46px", flexWrap: "wrap" }}>
                        <div style={{ fontSize: "13px", color: "#666", display: "flex", alignItems: "center", gap: "6px" }}>
                          <Clock size={14} />
                          {w.notes || "No notes"}
                        </div>
                        <div style={{ fontSize: "13px", color: "#666", fontWeight: 600 }}>
                          {totalSets} sets · {(totalVolume / 1000).toFixed(1)}t volume
                        </div>
                      </div>
                    </div>
                    
                    <button 
                      onClick={() => handleDelete(w.id)} 
                      style={{
                        background: "#fee2e2",
                        border: "none",
                        color: "#ef4444",
                        cursor: "pointer",
                        padding: "10px 16px",
                        borderRadius: "10px",
                        fontWeight: 600,
                        fontSize: "13px",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        transition: "all 0.2s"
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = "#fecaca"}
                      onMouseLeave={e => e.currentTarget.style.background = "#fee2e2"}
                    >
                      <Trash2 size={14} />
                      Delete
                    </button>
                  </div>

                  {/* Exercises Grid */}
                  <div style={{ 
                    display: "grid", 
                    gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", 
                    gap: "16px" 
                  }}>
                    {Object.entries(grouped).map(([name, sets]) => (
                      <div 
                        key={name} 
                        style={{ 
                          background: "#f3f4f6", 
                          padding: "16px", 
                          borderRadius: "12px", 
                          border: "1px solid #f0f0f0",
                          transition: "background 0.2s"
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = "#f3f4f6"}
                        onMouseLeave={e => e.currentTarget.style.background = "#f9fafb"}
                      >
                        <div style={{ 
                          fontWeight: 800, 
                          fontSize: "15px", 
                          color: "#111", 
                          marginBottom: "12px",
                          display: "flex",
                          alignItems: "center",
                          gap: "8px"
                        }}>
                          <Dumbbell size={16} color="#059669" />
                          {name}
                        </div>
                        {sets.map((s, i) => (
                          <div 
                            key={i} 
                            style={{ 
                              display: "flex", 
                              justifyContent: "space-between", 
                              fontSize: "13px", 
                              color: "#666", 
                              padding: "8px 0", 
                              borderBottom: i === sets.length - 1 ? "none" : "1px solid #e5e7eb" 
                            }}
                          >
                            <span style={{ fontWeight: 600 }}>Set {i + 1}</span>
                            <span style={{ fontWeight: 700, color: "#111" }}>
                              {s.weight}kg × {s.reps}
                            </span>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}