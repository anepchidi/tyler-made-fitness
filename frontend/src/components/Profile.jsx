import { useState, useEffect } from 'react';
import { User, Award, Scale, Ruler, Calendar, Target, TrendingUp, Flame, Zap, Users } from 'lucide-react';
import client from '../api/client';

export default function Profile({ username, userId, workoutHistory = [], showSocialActions = false, viewUserId = null }) {
  const [unit, setUnit] = useState("kg");
  const [bodyweight, setBodyweight] = useState("");
  const [height, setHeight] = useState("");
  const [age, setAge] = useState("");
  const [goal, setGoal] = useState("muscle");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [socialCounts, setSocialCounts] = useState({ follower_count: 0, following_count: 0, workout_count: 0 });
  const [socialBusy, setSocialBusy] = useState(false);
  const [socialMessage, setSocialMessage] = useState("");
  const [isFollowing, setIsFollowing] = useState(false);

  // Fetch settings from API on component mount
  useEffect(() => {
    if (!userId) return;

    const loadProfileData = async () => {
      try {
        const settingsData = await client.get('/users/me/settings');
        setUnit(settingsData.weight_unit || "kg");
        setHeight(settingsData.height_cm ? String(settingsData.height_cm) : "");
        setBodyweight(settingsData.bodyweight_kg ? String(settingsData.bodyweight_kg) : "");
        setAge(settingsData.age ? String(settingsData.age) : "");
        setGoal(settingsData.fitness_goal || "muscle");

        try {
          const profileData = await client.get(`/users/${userId}/profile/public`);
          setSocialCounts({
            follower_count: profileData.follower_count || 0,
            following_count: profileData.following_count || 0,
            workout_count: profileData.workout_count || 0,
        });
       } catch (_) { /* public stats are non-critical */ }
      } catch (err) {
        console.error("Failed to load settings:", err);
      } finally {
        setLoading(false);
      }
    };

    loadProfileData();
  }, [userId]);

  const save = async () => {
    try {
      setError("");
      await client.put('/users/me/settings', {
        weight_unit: unit,
        height_cm: height ? parseFloat(height) : null,
        bodyweight_kg: bodyweight ? parseFloat(bodyweight) : null,
        age: age ? parseInt(age) : null,
        fitness_goal: goal,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err.message || "Failed to save settings");
    }
  };

  // Calculate stats from workout history
  const totalWorkouts = socialCounts.workout_count || workoutHistory.length;
  const thisMonth = workoutHistory.filter(w => {
    const workoutDate = new Date(w.date);
    const now = new Date();
    return workoutDate.getMonth() === now.getMonth() && workoutDate.getFullYear() === now.getFullYear();
  }).length;

  // Calculate streak (simplified)
  const today = new Date().toISOString().split('T')[0];
  const hasWorkoutToday = workoutHistory.some(w => w.date === today);
  const currentStreak = hasWorkoutToday ? 1 : 0; // Simplified - you can enhance this

  const handleSocialToggle = async () => {
    if (!userId) return;
    const targetId = viewUserId ?? userId;
    if (targetId === userId) {
      setSocialMessage("You can’t follow yourself here.");
      return;
    }

    setSocialBusy(true);
    setSocialMessage("");
    try {
      const path = `/users/${userId}/follow/${targetId}`;
      isFollowing ? await client.delete(path) : await client.post(path);
      setIsFollowing((prev) => !prev);
      setSocialMessage(isFollowing ? 'Unfollowed successfully' : 'Following now');
    } catch (err) {
      setSocialMessage(err.message || 'Unable to update follow state');
    } finally {
      setSocialBusy(false);
    }
  };

  const achievements = [
    { icon: <Zap size={24} color="#10b981" />, label: "First Workout", unlocked: totalWorkouts >= 1, bg: "#ecfdf5" },
    { icon: <Flame size={24} color="#f59e0b" />, label: "7-Day Streak", unlocked: currentStreak >= 7, bg: "#fef3c7" },
    { icon: <TrendingUp size={24} color="#3b82f6" />, label: "10 Workouts", unlocked: totalWorkouts >= 10, bg: "#dbeafe" },
    { icon: <Award size={24} color="#8b5cf6" />, label: "30 Workouts", unlocked: totalWorkouts >= 30, bg: "#ede9fe" }
  ];

  const card = { 
    background:"white", 
    padding:"24px", 
    borderRadius:"12px", 
    boxShadow:"0 1px 3px rgba(0,0,0,0.06)", 
    marginBottom:"16px",
    border: "1px solid #e5e5e5"
  };

  const inp = { 
    width:"100%", 
    padding:"11px 14px", 
    borderRadius:"10px", 
    border:"1px solid #e5e5e5", 
    fontSize:"14px", 
    boxSizing:"border-box",
    outline: "none",
    transition: "border-color 0.2s",
    background: "#fafafa"
  };

  return (
    <div style={{ flex:1, padding:"32px", overflowY:"auto", background: "#fafafa" }}>
      <div style={{ maxWidth:"900px", margin:"0 auto" }}>
        
        {/* Header with Stats */}
        <div style={card}>
          <div style={{ display: "flex", alignItems: "center", gap: "20px", marginBottom: "24px" }}>
            <div style={{
              width: "80px",
              height: "80px",
              borderRadius: "20px",
              background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "36px",
              color: "white",
              fontWeight: 700
            }}>
              {username?.[0]?.toUpperCase() || "U"}
            </div>
            <div style={{ flex: 1 }}>
              <h2 style={{ margin: 0, fontSize: "24px", color: "#111", fontWeight: 700 }}>
                {username || "User"}
              </h2>
              <p style={{ margin: "4px 0 0", fontSize: "14px", color: "#666" }}>
                Member since {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </p>
            </div>
            {showSocialActions ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                <button
                  onClick={handleSocialToggle}
                  disabled={socialBusy}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '999px',
                    border: '1px solid #10b981',
                    background: '#ecfdf5',
                    color: '#059669',
                    cursor: socialBusy ? 'wait' : 'pointer',
                    fontWeight: 600,
                  }}
                >
                  {socialBusy ? 'Working...' : (isFollowing ? 'Unfollow' : 'Follow')}
                </button>
                {socialMessage ? <span style={{ fontSize: '12px', color: '#666' }}>{socialMessage}</span> : null}
              </div>
            ) : null}
          </div>

          {/* Quick Stats Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px" }}>
            <div style={{ 
              padding: "16px", 
              background: "#f5f5f5", 
              borderRadius: "12px",
              textAlign: "center" 
            }}>
              <div style={{ fontSize: "28px", fontWeight: 700, color: "#111", marginBottom: "4px" }}>
                {totalWorkouts}
              </div>
              <div style={{ fontSize: "12px", color: "#666", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Total Workouts
              </div>
            </div>

            <div style={{ 
              padding: "16px", 
              background: "#ecfdf5", 
              borderRadius: "12px",
              textAlign: "center" 
            }}>
              <div style={{ fontSize: "28px", fontWeight: 700, color: "#10b981", marginBottom: "4px" }}>
                {socialCounts.follower_count}
              </div>
              <div style={{ fontSize: "12px", color: "#059669", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Followers
              </div>
            </div>

            <div style={{ 
              padding: "16px", 
              background: "#fef3c7", 
              borderRadius: "12px",
              textAlign: "center" 
            }}>
              <div style={{ fontSize: "28px", fontWeight: 700, color: "#f59e0b", marginBottom: "4px" }}>
                {socialCounts.following_count}
              </div>
              <div style={{ fontSize: "12px", color: "#d97706", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Following
              </div>
            </div>

            <div style={{ 
              padding: "16px", 
              background: "#dbeafe", 
              borderRadius: "12px",
              textAlign: "center" 
            }}>
              <div style={{ fontSize: "28px", fontWeight: 700, color: "#3b82f6", marginBottom: "4px" }}>
                {thisMonth}
              </div>
              <div style={{ fontSize: "12px", color: "#2563eb", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                This Month
              </div>
            </div>
          </div>
        </div>

        {/* Achievements */}
        <div style={card}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
            <Award size={20} color="#111" strokeWidth={2} />
            <h3 style={{ margin: 0, fontSize: "17px", color: "#111", fontWeight: 700 }}>
              Achievements
            </h3>
          </div>
          
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: "12px" }}>
            {achievements.map((ach, i) => (
              <div key={i} style={{
                padding: "16px",
                borderRadius: "12px",
                background: ach.unlocked ? ach.bg : "#fafafa",
                border: `2px solid ${ach.unlocked ? "#10b981" : "#e5e5e5"}`,
                textAlign: "center",
                opacity: ach.unlocked ? 1 : 0.4,
                transition: "all 0.2s",
                cursor: ach.unlocked ? "pointer" : "default"
              }}
              onMouseEnter={e => {
                if (ach.unlocked) {
                  e.currentTarget.style.transform = "translateY(-4px)";
                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)";
                }
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }}>
                <div style={{ marginBottom: "8px", display: "flex", justifyContent: "center" }}>
                  {ach.icon}
                </div>
                <div style={{ fontSize: "12px", fontWeight: 600, color: "#111" }}>{ach.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Body Stats */}
        <div style={card}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
            <TrendingUp size={20} color="#111" strokeWidth={2} />
            <h3 style={{ margin: 0, fontSize: "17px", color: "#111", fontWeight: 700 }}>
              Body Stats
            </h3>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
            <div>
              <label style={{ 
                fontSize: "13px", 
                fontWeight: 600, 
                color: "#666",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                marginBottom: "8px"
              }}>
                <Scale size={16} />
                Bodyweight ({unit})
              </label>
              <input 
                style={inp} 
                type="number" 
                placeholder={unit === "kg" ? "e.g. 75" : "e.g. 165"} 
                value={bodyweight}
                onChange={e => setBodyweight(e.target.value)} 
                onFocus={e => e.target.style.borderColor = "#10b981"}
                onBlur={e => e.target.style.borderColor = "#e5e5e5"}
              />
            </div>

            <div>
              <label style={{ 
                fontSize: "13px", 
                fontWeight: 600, 
                color: "#666",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                marginBottom: "8px"
              }}>
                <Ruler size={16} />
                Height (cm)
              </label>
              <input 
                style={inp} 
                type="number" 
                placeholder="e.g. 175" 
                value={height}
                onChange={e => setHeight(e.target.value)}
                onFocus={e => e.target.style.borderColor = "#10b981"}
                onBlur={e => e.target.style.borderColor = "#e5e5e5"}
              />
            </div>

            <div>
              <label style={{ 
                fontSize: "13px", 
                fontWeight: 600, 
                color: "#666",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                marginBottom: "8px"
              }}>
                <Calendar size={16} />
                Age
              </label>
              <input 
                style={inp} 
                type="number" 
                placeholder="e.g. 25" 
                value={age}
                onChange={e => setAge(e.target.value)}
                onFocus={e => e.target.style.borderColor = "#10b981"}
                onBlur={e => e.target.style.borderColor = "#e5e5e5"}
              />
            </div>

            <div>
              <label style={{ 
                fontSize: "13px", 
                fontWeight: 600, 
                color: "#666",
                marginBottom: "8px",
                display: "block"
              }}>
                Weight Unit
              </label>
              <div style={{ display: "flex", gap: "8px" }}>
                {["kg", "lbs"].map(u => (
                  <button 
                    key={u} 
                    onClick={() => setUnit(u)} 
                    style={{
                      flex: 1,
                      padding: "11px",
                      borderRadius: "10px",
                      border: "2px solid",
                      cursor: "pointer",
                      fontWeight: 600,
                      fontSize: "14px",
                      borderColor: unit === u ? "#10b981" : "#e5e5e5",
                      background: unit === u ? "#ecfdf5" : "#fafafa",
                      color: unit === u ? "#10b981" : "#666",
                      transition: "all 0.2s"
                    }}
                  >
                    {u}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label style={{ 
              fontSize: "13px", 
              fontWeight: 600, 
              color: "#666",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              marginBottom: "8px"
            }}>
              <Target size={16} />
              Fitness Goal
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
              {[
                { id: "muscle", label: "Build Muscle", icon: <TrendingUp size={20} /> },
                { id: "lose", label: "Lose Weight", icon: <Scale size={20} /> },
                { id: "maintain", label: "Maintain", icon: <Target size={20} /> }
              ].map(g => (
                <button 
                  key={g.id} 
                  onClick={() => setGoal(g.id)} 
                  style={{
                    padding: "12px 10px",
                    borderRadius: "10px",
                    border: "2px solid",
                    cursor: "pointer",
                    fontWeight: 600,
                    fontSize: "13px",
                    borderColor: goal === g.id ? "#10b981" : "#e5e5e5",
                    background: goal === g.id ? "#ecfdf5" : "#fafafa",
                    color: goal === g.id ? "#10b981" : "#666",
                    transition: "all 0.2s",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "6px"
                  }}
                >
                  {g.icon}
                  <span>{g.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Save Button */}
        <button 
          onClick={save} 
          style={{
            width: "100%",
            padding: "14px",
            background: saved ? "#10b981" : "#10b981",
            color: "white",
            border: "none",
            borderRadius: "12px",
            cursor: "pointer",
            fontWeight: 600,
            fontSize: "15px",
            transition: "all 0.2s",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px"
          }}
          onMouseEnter={e => !saved && (e.currentTarget.style.background = "#059669")}
          onMouseLeave={e => !saved && (e.currentTarget.style.background = "#10b981")}
        >
          {saved ? "✓ Settings Saved!" : "Save Settings"}
        </button>
      </div>
    </div>
  );
}