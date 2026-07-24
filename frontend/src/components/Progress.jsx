import { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { TrendingUp, Dumbbell, Target, Award } from 'lucide-react';

export default function Progress({ workoutHistory }) {
  const uniqueExercises = [...new Set(workoutHistory.flatMap(w => (w.exercises || []).map(e => e.name)))];
  const [graphExercise, setGraphExercise] = useState(uniqueExercises[0] || 'Bench Press');
  const [chartType, setChartType] = useState('weight'); // weight or volume

  const chartData = useMemo(() => {
    return [...workoutHistory]
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .map(w => {
        const matches = (w.exercises || []).filter(e => e.name === graphExercise);
        if (!matches.length) return null;
        
        const maxWeight = Math.max(...matches.map(e => e.weight));
        const totalVolume = matches.reduce((sum, e) => sum + (e.weight * e.reps), 0);
        
        return { 
          date: new Date(w.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          weight: maxWeight,
          volume: totalVolume
        };
      }).filter(Boolean);
  }, [workoutHistory, graphExercise]);

  // Calculate personal records
  const getPR = (exerciseName) => {
    const exercises = workoutHistory
      .flatMap(w => (w.exercises || []))
      .filter(e => e.name === exerciseName);
    
    if (exercises.length === 0) return null;
    
    const maxWeight = Math.max(...exercises.map(e => e.weight));
    const maxVolume = Math.max(...exercises.map(e => e.weight * e.reps));
    
    return { maxWeight, maxVolume };
  };

  const currentPR = getPR(graphExercise);
  
  // Get improvement percentage
  const getImprovement = () => {
    if (chartData.length < 2) return null;
    const first = chartData[0].weight;
    const last = chartData[chartData.length - 1].weight;
    return (((last - first) / first) * 100).toFixed(1);
  };

  const improvement = getImprovement();

  const card = {
    background: "white",
    padding: "28px",
    borderRadius: "12px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
    border: "1px solid #f0f0f0"
  };

  return (
    <div style={{ flex: 1, padding: "32px", overflowY: "auto", background: "#fafafa" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: "32px" }}>
          <h1 style={{ margin: 0, fontSize: "28px", color: "#111", fontWeight: 800 }}>
            Progress Tracker 
          </h1>
          <p style={{ color: "#666", margin: "8px 0 0", fontSize: "16px" }}>
            Track your strength gains and personal records
          </p>
        </div>

        {/* Stats Cards */}
        {currentPR && (
          <div style={{ 
            display: "grid", 
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", 
            gap: "16px", 
            marginBottom: "24px" 
          }}>
            {[
              {
                label: "Personal Record",
                value: `${currentPR.maxWeight}kg`,
                icon: Award,
                color: "#059669",
                bg: "#eff6ff"
              },
              {
                label: "Max Volume",
                value: `${currentPR.maxVolume}kg`,
                icon: TrendingUp,
                color: "#059669",
                bg: "#f0fdf4"
              },
              {
                label: "Total Sessions",
                value: chartData.length,
                icon: Dumbbell,
                color: "#059669",
                bg: "#fffbeb"
              },
              improvement && {
                label: "Improvement",
                value: `${improvement > 0 ? '+' : ''}${improvement}%`,
                icon: Target,
                color: improvement > 0 ? "#10b981" : "#ef4444",
                bg: improvement > 0 ? "#f0fdf4" : "#fee2e2"
              }
            ].filter(Boolean).map((stat, i) => {
              const Icon = stat.icon;
              return (
                <div key={i} style={{
                  ...card,
                  padding: "20px",
                  transition: "all 0.2s",
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
        )}

        {/* Chart Card */}
        <div style={{ ...card, padding: "32px" }}>
          {/* Controls */}
          <div style={{ 
            display: "flex", 
            justifyContent: "space-between", 
            alignItems: "center",
            marginBottom: "28px",
            flexWrap: "wrap",
            gap: "16px"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "14px", flex: 1 }}>
              <div style={{
                width: "40px",
                height: "40px",
                borderRadius: "10px",
                background: "#f3f4f6",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}>
                <TrendingUp size={20} color="#111" />
              </div>
              <select 
                value={graphExercise} 
                onChange={e => setGraphExercise(e.target.value)}
                style={{
                  padding: "12px 18px",
                  borderRadius: "10px",
                  border: "1px solid #e5e7eb",
                  fontSize: "15px",
                  fontWeight: 600,
                  background: "white",
                  cursor: "pointer",
                  minWidth: "240px",
                  outline: "none"
                }}
              >
                {uniqueExercises.map(ex => <option key={ex}>{ex}</option>)}
              </select>
            </div>

            {/* Chart Type Toggle */}
            <div style={{ display: "flex", gap: "8px" }}>
              {[
                { id: 'weight', label: 'Max Weight' },
                { id: 'volume', label: 'Total Volume' }
              ].map(type => (
                <button
                  key={type.id}
                  onClick={() => setChartType(type.id)}
                  style={{
                    padding: "10px 20px",
                    borderRadius: "10px",
                    border: "none",
                    cursor: "pointer",
                    fontWeight: 600,
                    fontSize: "14px",
                    background: chartType === type.id ? "#3b82f6" : "#f3f4f6",
                    color: chartType === type.id ? "white" : "#666",
                    transition: "all 0.2s"
                  }}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          {/* Chart */}
          {chartData.length === 0 ? (
            <div style={{ 
              textAlign: "center", 
              color: "#999", 
              padding: "80px 20px",
              fontSize: "16px"
            }}>
              <Dumbbell size={48} color="#ddd" style={{ marginBottom: "16px" }} />
              <div>No data available for this exercise yet.</div>
              <div style={{ fontSize: "14px", marginTop: "8px" }}>
                Start logging workouts to see your progress!
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={400}>
              {chartType === 'weight' ? (
                <LineChart data={chartData} margin={{ top: 16, right: 24, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fill: '#999', fontSize: 13 }} 
                    tickMargin={12}
                    stroke="#e5e7eb"
                  />
                  <YAxis 
                    tick={{ fill: '#999', fontSize: 13 }} 
                    tickMargin={8} 
                    domain={['auto', 'auto']}
                    stroke="#e5e7eb"
                    label={{ value: 'Weight (kg)', angle: -90, position: 'insideLeft', style: { fill: '#999' } }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      borderRadius: "12px", 
                      border: "none", 
                      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                      padding: "12px"
                    }}
                    labelStyle={{ fontWeight: 700, marginBottom: "4px" }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="weight" 
                    stroke="#3b82f6" 
                    strokeWidth={3} 
                    dot={{ fill: "#3b82f6", strokeWidth: 0, r: 5 }}
                    activeDot={{ r: 8, strokeWidth: 0, fill: "#2563eb" }} 
                  />
                </LineChart>
              ) : (
                <BarChart data={chartData} margin={{ top: 16, right: 24, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fill: '#999', fontSize: 13 }} 
                    tickMargin={12}
                    stroke="#e5e7eb"
                  />
                  <YAxis 
                    tick={{ fill: '#999', fontSize: 13 }} 
                    tickMargin={8}
                    stroke="#e5e7eb"
                    label={{ value: 'Volume (kg)', angle: -90, position: 'insideLeft', style: { fill: '#999' } }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      borderRadius: "12px", 
                      border: "none", 
                      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                      padding: "12px"
                    }}
                    labelStyle={{ fontWeight: 700, marginBottom: "4px" }}
                  />
                  <Bar dataKey="volume" fill="#10b981" radius={[8, 8, 0, 0]} />
                </BarChart>
              )}
            </ResponsiveContainer>
          )}
        </div>

        {/* Exercise PRs List */}
        <div style={{ ...card, marginTop: "24px" }}>
          <h3 style={{ margin: "0 0 20px", fontSize: "18px", color: "#111", fontWeight: 700 }}>
            Personal Records
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: "12px" }}>
            {uniqueExercises.slice(0, 6).map(ex => {
              const pr = getPR(ex);
              if (!pr) return null;
              
              return (
                <div
                  key={ex}
                  style={{
                    padding: "16px",
                    background: "#f9fafb",
                    borderRadius: "12px",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    border: "1px solid #f0f0f0"
                  }}
                  onClick={() => setGraphExercise(ex)}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = "#f3f4f6";
                    e.currentTarget.style.borderColor = "#3b82f6";
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = "#f9fafb";
                    e.currentTarget.style.borderColor = "#f0f0f0";
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: "14px", color: "#111", marginBottom: "8px" }}>
                    {ex}
                  </div>
                  <div style={{ fontSize: "24px", fontWeight: 900, color: "#3b82f6" }}>
                    {pr.maxWeight}kg
                  </div>
                  <div style={{ fontSize: "12px", color: "#666", marginTop: "4px" }}>
                    Max weight
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}