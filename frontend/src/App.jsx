import { useState, useEffect } from 'react';
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

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('workoutToken'));
  const [userId, setUserId] = useState(() => {
    const id = localStorage.getItem('userId');
    return id ? parseInt(id, 10) : null;
  });
  const [username, setUsername] = useState(localStorage.getItem('username') || '');
  const [activePage, setActivePage] = useState('dashboard');
  const [exercises, setExercises] = useState([]);
  const [isLoadingExercises, setIsLoadingExercises] = useState(true);
  const [workoutHistory, setWorkoutHistory] = useState([]);


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

  useEffect(() => {
    if (userId) {
      fetchHistory();
    }
  }, [userId]);

  const fetchHistory = async () => {
    if (!userId) return;
    try {
      const data = await client.get('/users/me/workouts/');
      if (Array.isArray(data)) {
        setWorkoutHistory(data.sort((a, b) => new Date(b.date) - new Date(a.date)));
      }
    } catch (err) {
      console.error('Unable to fetch workout history', err);
    }
  };

  const handleLogin = (access_token, user_id, uname) => {
    localStorage.setItem('workoutToken', access_token);
    localStorage.setItem('userId', user_id);
    if (uname) {
      localStorage.setItem('username', uname);
    }
    setToken(access_token);
    setUserId(parseInt(user_id, 10));
    setUsername(uname || '');
    setActivePage('dashboard');
  };

  const handleLogout = () => {
    localStorage.clear();
    setToken(null);
    setUserId(null);
    setUsername('');
    setWorkoutHistory([]);
    setActivePage('dashboard');
  };

  useEffect(() => {
    const onUnauthorized = () => handleLogout();
    window.addEventListener('auth:unauthorized', onUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', onUnauthorized);
  }, []);

  const handleLoadTemplate = (template) => {
    setSelectedTemplate(template);
    setActivePage('workout');
    const cartItems = (template.exercises || [])
      .map((exercise, index) => {
        const name = typeof exercise === 'string'
          ? exercise
          : exercise.exercise_name || exercise.name || '';

        if (!name) return null;

        return {
          name,
          muscle_group: exercise.muscle_group || '',
          lastWeight: 0,
          lastReps: exercise.target_reps || 0,
          sets: [{ weight: 0, reps: exercise.target_reps || 0, id: Date.now() + index }],
        };
      })
      .filter(Boolean);

    localStorage.setItem('activeCart', JSON.stringify(cartItems));
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
    workout: <WorkoutLogger userId={userId} onWorkoutSaved={() => { fetchHistory(); setSelectedTemplate(null); setActivePage('history'); }} />,
    history: <History workoutHistory={workoutHistory} onDelete={fetchHistory} />,
    templates: <Templates exercises={exercises} onLoadTemplate={handleLoadTemplate} />,
    nutrition: <Nutrition userId={userId} />,
    social: <SocialFeed />,
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
