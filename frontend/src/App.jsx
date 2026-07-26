import { useState, useEffect } from 'react';
import { API, authFetch } from './api/client';
import AuthPage from './components/AuthPage';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import WorkoutLogger from './components/WorkoutLogger';
import History from './components/History';
import Progress from './components/Progress';
import Templates from './components/Templates';
import Nutrition from './components/Nutrition';
import Profile from './components/Profile';
import SocialFeed from './components/SocialFeed';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem("workoutToken"));
  const [userId, setUserId] = useState(() => {
    const id = localStorage.getItem("userId");
    return id ? parseInt(id) : null;
  });
  const [username, setUsername] = useState(localStorage.getItem("username") || "");
  const [activePage, setActivePage] = useState('dashboard');
  const [exercises, setExercises] = useState([]);
  const [workoutHistory, setWorkoutHistory] = useState([]);

  useEffect(() => {
    fetch(`${API}/exercises/library`)
      .then(r => r.json())
      .then(data => Array.isArray(data) && setExercises(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (userId) fetchHistory();
  }, [userId]);

  const fetchHistory = () => {
    if (!userId) return;
    authFetch(`${API}/users/me/workouts/`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data))
          setWorkoutHistory(data.sort((a, b) => new Date(b.date) - new Date(a.date)));
      })
      .catch(() => {});
  };

  const handleLogin = (access_token, user_id, uname) => {
    localStorage.setItem("workoutToken", access_token);
    localStorage.setItem("userId", user_id);
    if (uname) localStorage.setItem("username", uname);
    setToken(access_token);
    setUserId(parseInt(user_id));
    setUsername(uname || "");
    setActivePage('dashboard');
  };

  const handleLogout = () => {
    localStorage.clear();
    setToken(null); 
    setUserId(null); 
    setUsername("");
    setWorkoutHistory([]); 
    setActivePage('dashboard');
  };

  const handleLoadTemplate = (template) => {
    const cartItems = (template.exercises || [])
      .map((exercise) => {
        const name = typeof exercise === 'string' ? exercise : (exercise.exercise_name || exercise.name || '');
        if (!name) return null;
        return {
          name,
          muscle_group: exercise.muscle_group || '',
          lastWeight: 0,
          lastReps: 0,
          sets: [{ weight: 0, reps: 0, id: Date.now() + Math.random() }]
        };
      })
      .filter(Boolean);

    localStorage.setItem("activeCart", JSON.stringify(cartItems));
    setActivePage('exercise');
  };

  if (!token) return <AuthPage onLogin={handleLogin} />;

  const pages = {
    dashboard: <Dashboard workoutHistory={workoutHistory} username={username} />,
    exercise:  <WorkoutLogger userId={userId} exercises={exercises} setExercises={setExercises} onWorkoutSaved={() => { fetchHistory(); setActivePage('history'); }} />,
    history:   <History workoutHistory={workoutHistory} onDelete={fetchHistory} />,
    progress:  <Progress workoutHistory={workoutHistory} />,
    templates: <Templates onLoadTemplate={handleLoadTemplate} />,
    nutrition: <Nutrition userId={userId} />,
    social:    <SocialFeed />,
    profile:   <Profile username={username} userId={userId} workoutHistory={workoutHistory} showSocialActions={true} />,
  };

  return (
    <div style={{ 
      display:"flex", 
      height:"100vh", 
      width:"100vw", 
      fontFamily:"'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif", 
      background:"#fafafa", 
      overflow:"hidden" 
    }}>
      <Sidebar 
        activePage={activePage} 
        setActivePage={setActivePage} 
        username={username}
        onLogout={handleLogout} 
      />
      <div style={{ flex:1, display:"flex", overflow:"hidden" }}>
        {pages[activePage]}
      </div>
    </div>
  );
}