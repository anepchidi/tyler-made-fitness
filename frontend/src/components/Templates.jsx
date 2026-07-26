import { useEffect, useState } from 'react';
import { API, authFetch } from '../api/client';

export default function Templates({ onLoadTemplate }) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newExercises, setNewExercises] = useState('');
  const [error, setError] = useState('');

  const loadTemplates = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await authFetch(`${API}/users/me/templates`);
      if (!res.ok) throw new Error('Unable to load templates');
      const data = await res.json();
      setTemplates(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  const save = async () => {
    if (!newName.trim()) {
      setError('Please provide a template name');
      return;
    }

    const exercises = newExercises
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((exerciseName) => ({ exercise_name: exerciseName, target_sets: 3, target_reps: 10 }));

    try {
      const res = await authFetch(`${API}/users/me/templates`, {
        method: 'POST',
        body: JSON.stringify({
          name: newName.trim(),
          description: newDescription.trim(),
          exercises,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || 'Unable to save template');
      }

      const created = await res.json();
      setTemplates((prev) => [created, ...prev]);
      setNewName('');
      setNewDescription('');
      setNewExercises('');
      setCreating(false);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to save template');
    }
  };

  const remove = async (id) => {
    try {
      const res = await authFetch(`${API}/users/me/templates/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Unable to delete template');
      setTemplates((prev) => prev.filter((template) => template.id !== id));
    } catch (err) {
      setError(err.message || 'Failed to delete template');
    }
  };

  const card = {
    background: 'white',
    padding: '20px',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    marginBottom: '16px',
    border: '1px solid #e5e5e5',
    transition: 'all 0.2s',
  };

  const inp = {
    width: '100%',
    padding: '11px 14px',
    borderRadius: '10px',
    border: '1px solid #e5e5e5',
    fontSize: '14px',
    boxSizing: 'border-box',
    outline: 'none',
    transition: 'border-color 0.2s',
  };

  return (
    <div style={{ flex: 1, padding: '32px', overflowY: 'auto', background: '#fafafa' }}>
      <div style={{ maxWidth: '960px', margin: '0 auto' }}>
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ margin: 0, fontSize: '28px', color: '#111', fontWeight: 800 }}>Routines</h1>
          <p style={{ color: '#666', margin: '8px 0 0', fontSize: '16px' }}>Save workout structures and launch them in one click.</p>
        </div>

        {error && (
          <div style={{ ...card, borderColor: '#fecaca', color: '#b91c1c', marginBottom: '16px' }}>
            {error}
          </div>
        )}

        <div style={{ ...card, marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '18px', color: '#111' }}>Create a Routine</h3>
            <button onClick={() => setCreating((prev) => !prev)} style={{ border: 'none', background: '#3b82f6', color: 'white', padding: '10px 14px', borderRadius: '10px', cursor: 'pointer' }}>
              {creating ? 'Cancel' : '+ New Routine'}
            </button>
          </div>

          {creating && (
            <div style={{ display: 'grid', gap: '12px' }}>
              <input style={inp} value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Template name" />
              <input style={inp} value={newDescription} onChange={(e) => setNewDescription(e.target.value)} placeholder="Description (optional)" />
              <textarea style={{ ...inp, minHeight: '120px', resize: 'vertical' }} value={newExercises} onChange={(e) => setNewExercises(e.target.value)} placeholder="Add one exercise per line" />
              <button onClick={save} style={{ padding: '12px 16px', border: 'none', background: '#10b981', color: 'white', borderRadius: '10px', cursor: 'pointer', fontWeight: 700 }}>
                Save Template
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <div style={{ ...card, textAlign: 'center', color: '#666' }}>Loading routines…</div>
        ) : templates.length === 0 ? (
          <div style={{ ...card, textAlign: 'center', color: '#666' }}>No routines yet. Create one to reuse your favorite workouts.</div>
        ) : (
          templates.map((template) => (
            <div key={template.id} style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginBottom: '10px' }}>
                <div>
                  <h3 style={{ margin: 0, color: '#111' }}>{template.name}</h3>
                  {template.description && <p style={{ margin: '6px 0 0', color: '#666', fontSize: '14px' }}>{template.description}</p>}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => onLoadTemplate?.(template)} style={{ border: 'none', background: '#3b82f6', color: 'white', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer' }}>
                    Start Workout
                  </button>
                  <button onClick={() => remove(template.id)} style={{ border: '1px solid #e5e7eb', background: 'white', color: '#dc2626', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer' }}>
                    Delete
                  </button>
                </div>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {(template.exercises || []).map((exercise) => (
                  <span key={`${template.id}-${exercise.exercise_name}`} style={{ background: '#f3f4f6', color: '#111', fontSize: '13px', padding: '6px 10px', borderRadius: '999px' }}>
                    {exercise.exercise_name}
                  </span>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
