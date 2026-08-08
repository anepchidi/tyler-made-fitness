import { useState, useEffect } from 'react';
import { API, authFetch } from '../api/client';
import { Zap, FileText, Plus } from 'lucide-react';

export default function WorkoutLogger({ userId, onWorkoutSaved }) {
  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem('activeCart');
      const parsed = saved ? JSON.parse(saved) : [];
      return parsed.every((item) => Array.isArray(item.sets)) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [isActive, setIsActive] = useState(() => localStorage.getItem('isWorkoutActive') === 'true');
  const [seconds, setSeconds] = useState(() => parseInt(localStorage.getItem('activeSeconds'), 10) || 0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fmt = (s) => `${Math.floor(s / 60)
    .toString()
    .padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  useEffect(() => {
    let interval = null;
    if (isActive) {
      interval = setInterval(() => setSeconds((s) => s + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isActive]);

  useEffect(() => {
    localStorage.setItem('activeCart', JSON.stringify(cart));
    localStorage.setItem('activeSeconds', seconds.toString());
    localStorage.setItem('isWorkoutActive', isActive.toString());
  }, [cart, seconds, isActive]);

  const addSet = (name) =>
    setCart((prev) =>
      prev.map((ex) =>
        ex.name !== name
          ? ex
          : {
              ...ex,
              sets: [...ex.sets, { ...ex.sets[ex.sets.length - 1], id: Date.now() }],
            },
      ),
    );

  const updateSet = (name, setId, field, val) =>
    setCart((prev) =>
      prev.map((ex) =>
        ex.name !== name
          ? ex
          : {
              ...ex,
              sets: ex.sets.map((s) => (s.id !== setId ? s : { ...s, [field]: parseInt(val, 10) || 0 })),
            },
      ),
    );

  const removeExercise = (name) => setCart((prev) => prev.filter((ex) => ex.name !== name));

  const removeSet = (name, setId) =>
    setCart((prev) =>
      prev
        .map((ex) =>
          ex.name !== name
            ? ex
            : { ...ex, sets: ex.sets.filter((s) => s.id !== setId) },
        )
        .filter((ex) => ex.sets.length > 0),
    );

  const saveWorkout = async () => {
    if (cart.length === 0) {
      setError('Add at least one exercise first.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const workoutRes = await authFetch(`${API}/users/me/workouts/`, {
        method: 'POST',
        body: JSON.stringify({
          date: new Date().toISOString().split('T')[0],
          notes: `Duration: ${fmt(seconds)}`,
        }),
      });

      if (!workoutRes.ok) {
        const errorData = await workoutRes.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to create workout');
      }

      const workoutData = await workoutRes.json();
      const workoutId = workoutData.id;

      for (const ex of cart) {
        const exerciseRes = await authFetch(`${API}/workouts/${workoutId}/exercises/`, {
          method: 'POST',
          body: JSON.stringify({
            name: ex.name,
            muscle_group: ex.muscle_group,
            notes: null,
            sets: ex.sets.map((set, idx) => ({
              reps: set.reps,
              weight: set.weight,
              set_number: idx + 1,
            })),
          }),
        });

        if (!exerciseRes.ok) {
          const errorData = await exerciseRes.json().catch(() => ({}));
          throw new Error(errorData.detail || 'Failed to add exercise');
        }
      }

      setCart([]);
      setIsActive(false);
      setSeconds(0);
      localStorage.removeItem('activeCart');
      localStorage.removeItem('activeSeconds');
      localStorage.removeItem('isWorkoutActive');

      onWorkoutSaved();
    } catch (err) {
      setError(err.message || 'Failed to save workout. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    width: '80px',
    padding: '11px',
    borderRadius: '8px',
    border: '1px solid #e5e5e5',
    fontSize: '15px',
    background: '#fafafa',
    outline: 'none',
    transition: 'border-color 0.2s',
  };

  return (
    <div style={{ flex: 1, display: 'flex', overflow: 'hidden', background: '#fafafa' }}>
      <div style={{ flex: 1, padding: '32px', overflowY: 'auto', display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: '920px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '8px',
              background: 'white',
              padding: '22px 26px',
              borderRadius: '16px',
              boxShadow: '0 12px 30px rgba(15, 23, 42, 0.05)',
              border: '1px solid #e5e5e5',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div
                style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '16px',
                  background: isActive ? '#ecfdf5' : '#f3f4f6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Zap size={26} color={isActive ? '#10b981' : '#6b7280'} />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: '24px', color: '#111827' }}>{isActive ? 'Live Workout' : 'Workout Logger'}</h2>
                <p style={{ margin: '6px 0 0', color: '#6b7280', fontSize: '14px' }}>
                  Complete your routine sets or return to Routines to start a new workout.
                </p>
              </div>
            </div>
            {isActive && (
              <div style={{ fontSize: '28px', fontWeight: 700, color: '#10b981', fontFamily: 'monospace' }}>{fmt(seconds)}</div>
            )}
          </div>

          {error && (
            <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '14px 16px', borderRadius: '14px', border: '1px solid #fecaca' }}>
              {error}
            </div>
          )}

          {cart.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#6b7280', padding: '80px 24px', borderRadius: '16px', background: 'white', border: '1px dashed #e5e7eb' }}>
              <div style={{ marginBottom: '18px', display: 'inline-flex', width: '72px', height: '72px', borderRadius: '18px', background: '#ecfdf5', alignItems: 'center', justifyContent: 'center' }}>
                <Plus size={36} color="#10b981" />
              </div>
              <h3 style={{ margin: '0 0 10px', fontSize: '20px', color: '#111827' }}>No active workout loaded.</h3>
              <p style={{ margin: 0, fontSize: '15px', lineHeight: 1.7 }}>
                Build a routine in Routines and use Start Workout to open the logger.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {cart.map((ex) => (
                <div key={ex.name} style={{ background: 'white', borderRadius: '16px', border: '1px solid #e5e5e5', overflow: 'hidden', boxShadow: '0 8px 20px rgba(15, 23, 42, 0.04)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 22px', borderBottom: '1px solid #f3f4f6' }}>
                    <div>
                      <div style={{ fontSize: '18px', fontWeight: 700, color: '#111827' }}>{ex.name}</div>
                      <div style={{ marginTop: '8px', color: '#6b7280', fontSize: '13px' }}>
                        {ex.muscle_group || 'General'}
                      </div>
                    </div>
                    <button
                      onClick={() => removeExercise(ex.name)}
                      style={{
                        background: '#fee2e2',
                        color: '#dc2626',
                        border: 'none',
                        borderRadius: '12px',
                        width: '36px',
                        height: '36px',
                        cursor: 'pointer',
                        fontWeight: 700,
                      }}
                    >
                      ✕
                    </button>
                  </div>
                  <div style={{ padding: '18px 22px' }}>
                    <div style={{ display: 'grid', gap: '12px', marginBottom: '10px', color: '#6b7280', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      <div style={{ display: 'flex', gap: '24px' }}>
                        <span style={{ width: '64px' }}>Weight</span>
                        <span style={{ width: '64px' }}>Reps</span>
                      </div>
                    </div>
                    {ex.sets.map((set, idx) => (
                      <div key={set.id} style={{ display: 'flex', alignItems: 'center', gap: '18px', padding: '10px 0' }}>
                        <span style={{ width: '20px', color: '#9ca3af', fontWeight: 700 }}>{idx + 1}</span>
                        <input
                          type="number"
                          style={inputStyle}
                          value={set.weight}
                          onChange={(event) => updateSet(ex.name, set.id, 'weight', event.target.value)}
                        />
                        <input
                          type="number"
                          style={inputStyle}
                          value={set.reps}
                          onChange={(event) => updateSet(ex.name, set.id, 'reps', event.target.value)}
                        />
                        <button
                          type="button"
                          onClick={() => removeSet(ex.name, set.id)}
                          style={{
                            marginLeft: 'auto',
                            background: 'none',
                            border: 'none',
                            color: '#dc2626',
                            fontSize: '18px',
                            cursor: 'pointer',
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => addSet(ex.name)}
                      style={{
                        width: '100%',
                        marginTop: '14px',
                        padding: '12px',
                        borderRadius: '14px',
                        border: '1px dashed #d1d5db',
                        background: '#f8fafc',
                        color: '#111827',
                        cursor: 'pointer',
                        fontWeight: 700,
                      }}
                    >
                      + Add Set
                    </button>
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={isActive ? saveWorkout : () => setIsActive(true)}
                disabled={saving}
                style={{
                  background: saving ? '#d1d5db' : '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '16px',
                  padding: '16px 20px',
                  fontSize: '16px',
                  fontWeight: 700,
                  cursor: saving ? 'not-allowed' : 'pointer',
                  transition: 'background 0.2s ease',
                }}
              >
                {saving ? 'Saving…' : isActive ? 'Finish & Save Workout' : 'Start Workout'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
