import { useState, useEffect } from 'react';
import client from '../api/client';
import { Zap, Plus, Globe, Lock, Users } from 'lucide-react';

const sanitizeRepsInput = (value) => value.replace(/[^0-9]/g, '');
const sanitizeWeightInput = (value) => {
  const cleaned = value.replace(/[^0-9.]/g, '');
  const firstDot = cleaned.indexOf('.');
  if (firstDot === -1) return cleaned;
  return cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, '');
};

const VISIBILITY_OPTIONS = [
  { id: 'private', label: 'Private', icon: Lock },
  { id: 'followers', label: 'Followers', icon: Users },
  { id: 'public', label: 'Public', icon: Globe },
];

export default function WorkoutLogger({ userId, template, onWorkoutSaved }) {
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
  const [templateLoading, setTemplateLoading] = useState(false);
  const [visibility, setVisibility] = useState(
    () => localStorage.getItem('activeVisibility') || 'private',
  );

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
    localStorage.setItem('activeVisibility', visibility);
  }, [cart, seconds, isActive, visibility]);

  useEffect(() => {
    if (!template) return;
    let cancelled = false;
    const buildCartFromTemplate = async () => {
      setTemplateLoading(true);
      setError('');
      const templateExercises = Array.isArray(template.exercises) ? template.exercises : [];
        try {
          const built = await Promise.all(templateExercises.map(async (te) => {
            let lastWeight = '', lastReps = '';
            try {
              const latest = await client.get(`/users/me/exercises/${encodeURIComponent(te?.exercise_name || '')}/latest`);
              if (latest?.has_history) {
                lastWeight = latest.weight != null ? String(latest.weight) : '';
                lastReps = latest.reps != null ? String(latest.reps) : '';
               }
            } catch { /* no history — leave blank placeholders */ }

            const setsToMap = Array.isArray(te?.sets) && te.sets.length > 0
              ? te.sets
              : [{ target_reps: null, target_weight: null }]; // fallback: one blank set

            return {
              name: te?.exercise_name || 'Exercise',
              muscle_group: te?.muscle_group || 'General',
              sets: setsToMap.map((s) => ({
                id: `${Date.now()}-${Math.random()}`,
                weight: s.target_weight != null ? String(s.target_weight) : lastWeight,
                reps: s.target_reps != null ? String(s.target_reps) : lastReps,
              })),
            };
          }));
          if (!cancelled) { setCart(built); setIsActive(false); setSeconds(0); }
        } catch (err) {
          if (!cancelled) setError(err.message || 'Failed to load routine into the logger.');
        } finally {
          if (!cancelled) setTemplateLoading(false);
        }
    };
    buildCartFromTemplate();
    return () => { cancelled = true; };
  }, [template]);

  const addSet = (name) =>
    setCart((prev) =>
      prev.map((ex) => {
        if (ex.name !== name) return ex;
        const lastSet = ex.sets[ex.sets.length - 1];
        return {
          ...ex,
          sets: [
            ...ex.sets,
            {
              id: `${Date.now()}-${Math.random()}`,
              weight: lastSet ? lastSet.weight : '',
              reps: lastSet ? lastSet.reps : '',
            },
          ],
        };
      })
    );
  
  const updateSet = (name, setId, field, val) =>{
    setCart((prev) =>
      prev.map((ex) =>
        ex.name !== name
          ? ex
          : {
              ...ex,
              sets: ex.sets.map((s) => (s.id !== setId ? s : { ...s, [field]: val })),
            },
      ),
    );
  };
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
      const workoutData = await client.post('/users/me/workouts/', {
      date: new Date().toISOString().split('T')[0],
      notes: `Duration: ${fmt(seconds)}`,
    });
      const workoutId = workoutData.id;

      for (const ex of cart) {
        await client.post(`/workouts/${workoutId}/exercises/`, {
        name: ex.name,
        muscle_group: ex.muscle_group,
        notes: null,
        sets: ex.sets.map((set, idx) => ({
          reps: Math.max(parseInt(set.reps, 10) || 0, 1),
          weight: Math.max(parseFloat(set.weight) || 0, 0),
          set_number: idx + 1,
        })),
      });
      }

      try {
        await client.post(`/workouts/${workoutId}/share`, { visibility });
      } catch (shareErr) {
        console.error('Workout saved but visibility could not be applied', shareErr);
        setError('Workout saved, but the sharing setting could not be applied. You can change it from your history.');
      }

      setCart([]);
      setIsActive(false);
      setSeconds(0);
      localStorage.removeItem('activeCart');
      localStorage.removeItem('activeSeconds');
      localStorage.removeItem('activeVisibility');
      setVisibility('private');

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

          {templateLoading ? (
            <div style={{ textAlign: 'center', color: '#6b7280', padding: '40px 24px', fontSize: '16px' }}>Loading routine…</div>
          ) : cart.length === 0 ? (
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
                          type="text"
                          inputMode="decimal"
                          style={inputStyle}
                          value={set.weight}
                          onChange={(event) => updateSet(ex.name, set.id, 'weight', event.target.value)}
                        />
                        <input
                          type="text"
                          inputMode="numeric"
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
              <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e5e5e5', padding: '18px 22px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>
                  Who can see this workout
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {VISIBILITY_OPTIONS.map(({ id, label, icon: Icon }) => {
                    const selected = visibility === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setVisibility(id)}
                        disabled={saving}
                        style={{
                          flex: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          padding: '12px',
                          borderRadius: '12px',
                          border: `2px solid ${selected ? '#10b981' : '#e5e5e5'}`,
                          background: selected ? '#ecfdf5' : '#fafafa',
                          color: selected ? '#059669' : '#6b7280',
                          fontWeight: 600,
                          fontSize: '14px',
                          cursor: saving ? 'not-allowed' : 'pointer',
                        }}
                      >
                        <Icon size={16} />
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
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
