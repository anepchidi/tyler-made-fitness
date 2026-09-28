import { useState, useEffect, useCallback } from 'react';
import client from './api/client';
import AuthPage from './components/AuthPage';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import WorkoutLogger from './components/WorkoutLogger';
import History from './components/History';
import ExerciseAnalytics from './components/ExerciseAnalytics';
import Templates from './components/Templates';
import Nutrition from './components/Nutrition';
import Profile from './components/Profile';
import SocialFeed from './components/SocialFeed';

function readTokenClaims(token) {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const claims = JSON.parse(atob(payload));
    const id = Number(claims?.id);
    return {
      id: Number.isFinite(id) && id > 0 ? id : null,
      username: typeof claims?.sub === 'string' ? claims.sub : '',
    };
  } catch {
    return { id: null, username: '' };
  }
}

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('workoutToken'));
  const [userId, setUserId] = useState(() => {
    const stored = parseInt(localStorage.getItem('userId'), 10);
      if (Number.isFinite(stored) && stored > 0) return stored;
      const storedToken = localStorage.getItem('workoutToken');
      const fromToken = storedToken ? readTokenClaims(storedToken).id : null;
      if (fromToken) localStorage.setItem('userId', String(fromToken));
      return fromToken;
  });
  const [username, setUsername] = useState(() => {
    const storedToken = localStorage.getItem('workoutToken');
    return localStorage.getItem('username') || (storedToken ? readTokenClaims(storedToken).username : '');
  });  
  const [activePage, setActivePage] = useState('dashboard');
  const [exercises, setExercises] = useState([]);
  const [isLoadingExercises, setIsLoadingExercises] = useState(true);
  const [workoutHistory, setWorkoutHistory] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  useEffect(() => {
    const loadExercises = async () => {
      setIsLoadingExercises(true);
      try {
        const data = await client.get('/exercises/library');
        if (Array.isArray(data)) {
          setExercises(data);
        }
      } catch (err) {
        console.error('Failed to load exercise library', err);
      } finally {
        setIsLoadingExercises(false);
      }
    };

    loadExercises();
  }, []);

  const handleLogout = useCallback(() => {
    localStorage.clear();
    setToken(null);
    setUserId(null);
    setUsername('');
    setWorkoutHistory([]);
    setActivePage('dashboard');
  }, []);

   const handleLogin = (access_token, user_id, uname) => {
    const parsedId = parseInt(user_id, 10);
    localStorage.setItem('workoutToken', access_token);
    if (Number.isFinite(parsedId) && parsedId > 0) {
      localStorage.setItem('userId', String(parsedId));
    } else {
      localStorage.removeItem('userId');
    }
    if (uname) {
      localStorage.setItem('username', uname);
    }
    setToken(access_token);
    setUserId(Number.isFinite(parsedId) && parsedId > 0 ? parsedId : null);
    setUsername(uname || '');
    setActivePage('dashboard');
  };

  const fetchHistory = useCallback(async () => {
    if (!userId) return;
    try {
      const data = await client.get('/users/me/workouts/');
      if (Array.isArray(data)) {
        setWorkoutHistory([...data].sort((a, b) => new Date(b.date) - new Date(a.date)));
      }
    } catch (err) {
      console.error('Unable to fetch workout history', err);
    }
  }, [userId]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  useEffect(() => {
    window.addEventListener('auth:unauthorized', handleLogout);
    return () => window.removeEventListener('auth:unauthorized', handleLogout);
  }, [handleLogout]);

  useEffect(() => {
    if (token && !userId) handleLogout();
  }, [token, userId, handleLogout]);

  const handleLoadTemplate = (template) => {
    setSelectedTemplate(template);
    setActivePage('workout');
  };

  if (!token) return <AuthPage onLogin={handleLogin} />;

  const pages = {
    dashboard: <Dashboard workoutHistory={workoutHistory} username={username} />,
    exercise: (
      <ExerciseAnalytics
        exercises={exercises}
        setExercises={setExercises}
        isLoadingExercises={isLoadingExercises}
      />
    ),
    workout: <WorkoutLogger userId={userId} template={selectedTemplate} onWorkoutSaved={() => { fetchHistory(); setSelectedTemplate(null); setActivePage('history'); }} />,
    history: <History workoutHistory={workoutHistory} onDelete={fetchHistory} />,
    templates: <Templates exercises={exercises} onLoadTemplate={handleLoadTemplate} />,
    nutrition: <Nutrition userId={userId} />,
    social: <SocialFeed currentUserId={userId} />,
    profile: <Profile username={username} userId={userId} workoutHistory={workoutHistory} showSocialActions={true} />,
  };

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        width: '100vw',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
        background: '#fafafa',
        overflow: 'hidden',
      }}
    >
      <Sidebar activePage={activePage} setActivePage={setActivePage} username={username} onLogout={handleLogout} />
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>{pages[activePage]}</div>
    </div>
  );
}
