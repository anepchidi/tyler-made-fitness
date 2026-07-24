import { Dumbbell, CalendarDays, TrendingUp, Flame, Clock, Award, ChevronRight } from "lucide-react";

export default function Dashboard({ workoutHistory, username }) {
  const totalWorkouts = workoutHistory.length;

  const thisWeek = workoutHistory.filter((w) => {
    const diff = (new Date() - new Date(w.date)) / (1000 * 60 * 60 * 24);
    return diff <= 7;
  }).length;

  const totalVolume = workoutHistory.reduce((sum, w) => {
    const workoutSum = (w.exercises || []).reduce((s, e) => {
      if (e.sets && e.sets.length > 0) {
        const setSum = e.sets.reduce((ss, set) => {
          return ss + (Number(set.weight) || 0) * (Number(set.reps) || 0);
        }, 0);
        return s + setSum;
      }
    
      const oldWeight = Number(e.weight) || 0;
      const oldReps = Number(e.reps) || 0;
      return s + (oldWeight * oldReps);
    }, 0);
  
    return sum + workoutSum;
  }, 0);

  // Calculate streak
  const calculateStreak = () => {
    if (workoutHistory.length === 0) return 0;
    const sortedDates = workoutHistory
      .map(w => new Date(w.date).setHours(0, 0, 0, 0))
      .sort((a, b) => b - a);
    
    let streak = 1;
    const today = new Date().setHours(0, 0, 0, 0);
    
    if (sortedDates[0] !== today && sortedDates[0] !== today - 86400000) return 0;
    
    for (let i = 0; i < sortedDates.length - 1; i++) {
      const diff = (sortedDates[i] - sortedDates[i + 1]) / 86400000;
      if (diff === 1) streak++;
      else break;
    }
    return streak;
  };

  const streak = calculateStreak();

  // Get last 7 days activity
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    const dateStr = date.toISOString().split('T')[0];
    const hasWorkout = workoutHistory.some(w => w.date === dateStr);
    return {
      day: date.toLocaleDateString('en-US', { weekday: 'short' }),
      date: dateStr,
      active: hasWorkout
    };
  });

  const recentExercises = workoutHistory
    .slice(0, 3)
    .flatMap(w => (w.exercises || []).map(e => ({ ...e, date: w.date })))
    .slice(0, 5);

  const card = {
    background: "white",
    padding: "20px",
    borderRadius: "16px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
    border: "1px solid #f0f0f0"
  };

  const stats = [
    {
      label: "Total Workouts",
      value: totalWorkouts,
      icon: Dumbbell,
      color: "#059669",
      bg: "#f3f4f6",
      change: thisWeek > 0 ? `+${thisWeek} this week` : null
    },
    {
      label: "Weekly Activity",
      value: thisWeek,
      icon: CalendarDays,
      color: "#059669",
      bg: "#f3f4f6",
      change: "workouts"
    },
    {
      label: "Total Volume",
      value: totalVolume.toLocaleString(),
      unit: "kilograms",
      icon: TrendingUp,
      color: "#059669",
      bg: "#f3f4f6",
      change: "lifted"
    },
    {
      label: "Current Streak",
      value: streak,
      unit: streak === 1 ? "day" : "days",
      icon: Flame,
      color: "#059669",
      bg: "#f3f4f6",
      change: streak > 0 ? "Keep it up! " : "Start today!"
    }
  ];

  return (
    <div style={{ flex: 1, padding: "32px", overflowY: "auto", background: "#fafafa" }}>
      {/* Header */}
      <div style={{ marginBottom: "32px" }}>
        <h1 style={{ margin: 0, fontSize: "28px", color: "#111", fontWeight: 700 }}>
          Welcome back{username ? `, ${username}` : ""}! 
        </h1>
        <p style={{ color: "#666", margin: "8px 0 0", fontSize: "16px" }}>
          {thisWeek > 0 
            ? `You've crushed ${thisWeek} workout${thisWeek > 1 ? 's' : ''} this week!` 
            : "Ready to start your training?"}
        </p>
      </div>

      {/* Stats Grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
        gap: "20px",
        marginBottom: "32px"
      }}>
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} style={{
              ...card,
              position: "relative",
              overflow: "hidden",
              transition: "transform 0.2s, box-shadow 0.2s",
              cursor: "pointer"
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = "translateY(-4px)";
              e.currentTarget.style.boxShadow = "0 8px 20px rgba(0,0,0,0.08)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.04)";
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
                <div style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "12px",
                  background: stat.bg,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}>
                  <Icon size={24} color={stat.color} />
                </div>
              </div>

              <div style={{ 
                fontSize: "36px", 
                fontWeight: 900, 
                color: "#111", 
                marginBottom: "4px",
                display: "flex",
                alignItems: "baseline",
                gap: "6px"
              }}>
                {stat.value}
                {stat.unit && <span style={{ fontSize: "16px", fontWeight: 600, color: "#999" }}>{stat.unit}</span>}
              </div>

              <div style={{
                fontSize: "13px",
                color: "#666",
                fontWeight: "600",
                marginBottom: "8px"
              }}>
                {stat.label}
              </div>

              {stat.change && (
                <div style={{
                  fontSize: "12px",
                  color: stat.color,
                  fontWeight: "600",
                  background: stat.bg,
                  padding: "4px 10px",
                  borderRadius: "6px",
                  display: "inline-block"
                }}>
                  {stat.change}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "32px" }}>
        {/* Activity Heatmap */}
        <div style={card}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
            <div style={{
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              background: "#f3f4f6",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}>
              <CalendarDays size={18} color="#059669" />
            </div>
            <h3 style={{ margin: 0, fontSize: "18px", color: "#111", fontWeight: 700 }}>
              7-Day Activity
            </h3>
          </div>

          <div style={{ display: "flex", gap: "8px", justifyContent: "space-around" }}>
            {last7Days.map((day, i) => (
              <div key={i} style={{ textAlign: "center", flex: 1 }}>
                <div style={{
                  width: "100%",
                  height: "80px",
                  borderRadius: "12px",
                  background: day.active ? "#10b981" : "#f3f4f6",
                  marginBottom: "8px",
                  transition: "all 0.2s",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = "scale(1.05)";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = "scale(1)";
                }}>
                  {day.active && <Award size={24} color="white" />}
                </div>
                <div style={{ fontSize: "12px", color: "#666", fontWeight: 600 }}>
                  {day.day}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div style={card}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
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
                <Clock size={18} color="#059669" />
              </div>
              <h3 style={{ margin: 0, fontSize: "18px", color: "#111", fontWeight: 700 }}>
                Recent Activity
              </h3>
            </div>
          </div>

          {recentExercises.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {recentExercises.map((ex, i) => (
                <div key={i} style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "12px",
                  background: "#f9fafb",
                  borderRadius: "10px",
                  transition: "background 0.2s",
                  cursor: "pointer"
                }}
                onMouseEnter={e => e.currentTarget.style.background = "#f3f4f6"}
                onMouseLeave={e => e.currentTarget.style.background = "#f9fafb"}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "14px", color: "#111", marginBottom: "2px" }}>
                      {ex.name}
                    </div>
                    <div style={{ fontSize: "12px", color: "#666" }}>
                      {ex.weight}kg × {ex.reps} reps
                    </div>
                  </div>
                  <div style={{ fontSize: "11px", color: "#999", fontWeight: 600 }}>
                    {new Date(ex.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: "center", color: "#999", padding: "40px 20px" }}>
              <Dumbbell size={32} color="#ddd" style={{ marginBottom: "12px" }} />
              <div>No recent activity</div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div style={card}>
        <h3 style={{ margin: "0 0 16px", fontSize: "18px", color: "#111", fontWeight: 700 }}>
          Quick Actions
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
          {[
            { label: "Start New Workout", color: "#3b82f6", icon: Dumbbell },
            { label: "View Progress", color: "#10b981", icon: TrendingUp },
            { label: "Track Nutrition", color: "#f59e0b", icon: CalendarDays }
          ].map((action, i) => {
            const Icon = action.icon;
            return (
              <div key={i} style={{
                padding: "16px",
                background: "#fafafa",
                borderRadius: "12px",
                cursor: "pointer",
                transition: "all 0.2s",
                display: "flex",
                alignItems: "center",
                gap: "12px"
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = action.color + "10";
                e.currentTarget.style.transform = "translateX(4px)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = "#fafafa";
                e.currentTarget.style.transform = "translateX(0)";
              }}>
                <Icon size={20} color={action.color} />
                <span style={{ fontWeight: 600, fontSize: "14px", color: "#111", flex: 1 }}>
                  {action.label}
                </span>
                <ChevronRight size={16} color="#999" />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}