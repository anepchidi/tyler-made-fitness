import { useEffect, useState, useMemo } from 'react';
import client, { API } from '../api/client';
import { Plus, Trash2, Search, ChevronDown, Dumbbell, ImageIcon } from 'lucide-react';

const MUSCLE_GROUPS = [
  'All Muscles', 'Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core', 'Glutes', 'Calves', 'Full Body',
];

const getImageSrc = (exercise) => {
  if (!exercise?.image_url) return null;
  if (exercise.image_url.startsWith('http')) return exercise.image_url;
  return `${API}${exercise.image_url}`;
};

export default function Templates({ exercises = [], onLoadTemplate }) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [pendingExercises, setPendingExercises] = useState([]);
  const [error, setError] = useState('');
  
  const BLOCKED_NUMERIC_KEYS = ['-', '+', 'e', 'E'];
    const blockInvalidNumericKey = (event) => {
    if (BLOCKED_NUMERIC_KEYS.includes(event.key)) event.preventDefault();
  };
  const sanitizeRepsInput = (value) => value.replace(/[^0-9]/g, '');
  const sanitizeWeightInput = (value) => {
    const cleaned = value.replace(/[^0-9.]/g, '');
    const firstDot = cleaned.indexOf('.');
    if (firstDot === -1) return cleaned;
    return cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, '');
  };

  // Library filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMuscle, setSelectedMuscle] = useState('All Muscles');

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await client.get('/users/me/templates');
      setTemplates(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const filteredExercises = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return exercises.filter((exercise) => {
      const matchesText = !query || exercise.name?.toLowerCase().includes(query);
      const matchesGroup = selectedMuscle === 'All Muscles' || 
        (exercise.muscle_group || '').toLowerCase().includes(selectedMuscle.toLowerCase());
      return matchesText && matchesGroup;
    });
  }, [exercises, searchQuery, selectedMuscle]);

  const addExerciseToRoutine = (exercise) => {
    setError('');
    if (pendingExercises.some((item) => item.exercise_name === exercise.name)) {
      setError('This exercise is already in the routine.');
      return;
    }

    setPendingExercises((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        exercise_name: exercise.name,
        muscle_group: exercise.muscle_group || 'General',
        sets: [
          { id: Date.now(), weight: '', reps: '' } // Default first set
        ]
      },
    ]);
  };

  const removePendingExercise = (id) => {
    setPendingExercises((prev) => prev.filter((item) => item.id !== id));
  };

  const addSet = (exerciseId) => {
    setPendingExercises((prev) =>
      prev.map((ex) =>
        ex.id !== exerciseId
          ? ex
          : { ...ex, sets: [...ex.sets, { id: Date.now(), weight: '', reps: '' }] }
      )
    );
  };

  const updateSet = (exerciseId, setId, field, val) => {
    setPendingExercises((prev) =>
      prev.map((ex) =>
        ex.id !== exerciseId
          ? ex
          : {
              ...ex,
              sets: ex.sets.map((s) => (s.id !== setId ? s : { ...s, [field]: val })),
            }
      )
    );
  };

  const removeSet = (exerciseId, setId) => {
    setPendingExercises((prev) =>
      prev.map((ex) =>
        ex.id !== exerciseId
          ? ex
          : { ...ex, sets: ex.sets.filter((s) => s.id !== setId) }
      ).filter((ex) => ex.sets.length > 0)
    );
  };

  const save = async () => {
    if (!newName.trim()) {
      setError('Please provide a routine name.');
      return;
    }
    if (pendingExercises.length === 0) {
      setError('Add at least one exercise to the routine.');
      return;
    }

    setError('');

    // Map the complex inline sets back to the simple backend schema targets
    const formattedExercises = pendingExercises.map(ex => ({
      exercise_name: ex.exercise_name,
      muscle_group: ex.muscle_group,
      target_sets: ex.sets.length,
      target_reps: Number(ex.sets[0]?.reps) || 0,
      target_weight: Number(ex.sets[0]?.weight) || 0.0,
    }));

    try {
      const created = await client.post('/users/me/templates', {
      name: newName.trim(),
      description: newDescription.trim(),
      exercises: formattedExercises,
    });
      setTemplates((prev) => [created, ...prev]);
      setCreating(false);
      setNewName('');
      setNewDescription('');
      setPendingExercises([]);
      setSearchQuery('');
    } catch (err) {
      setError(err.message || 'Failed to save template');
    }
  };

  // Derived summaries for the UI
  const totalExercises = pendingExercises.length;
  const totalSets = pendingExercises.reduce((sum, ex) => sum + ex.sets.length, 0);

  const styles = {
    page: { flex: 1, padding: '24px 32px', overflowY: 'auto', background: '#fafafa', minHeight: '100vh', boxSizing: 'border-box' },
    pageHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' },
    pageTitle: { margin: 0, fontSize: '28px', color: '#111827', fontWeight: 800 },
    actionButton: { display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 16px', borderRadius: '14px', border: 'none', background: '#10b981', color: 'white', cursor: 'pointer', fontWeight: 700 },
    shell: { maxWidth: '1600px', margin: '0 auto', display: 'grid', gridTemplateColumns: creating ? 'minmax(0, 1fr) 340px' : '1fr', gap: '24px', alignItems: 'start' },
    leftPanel: { display: 'flex', flexDirection: 'column', gap: '24px', minWidth: 0 },
    rightPanel: { background: 'white', borderRadius: '16px', border: '1px solid #e5e5e5', padding: '20px', boxShadow: '0 8px 24px rgba(15, 23, 42, 0.04)', display: 'flex', flexDirection: 'column', gap: '16px', height: 'calc(100vh - 96px)', position: 'sticky', top: '24px' },
    card: { background: 'white', padding: '20px', borderRadius: '16px', border: '1px solid #e5e5e5', boxShadow: '0 8px 24px rgba(15, 23, 42, 0.04)' },
    input: { width: '100%', padding: '12px 14px', borderRadius: '12px', border: '1px solid #e5e7eb', background: '#f8fafc', fontSize: '14px', outline: 'none', boxSizing: 'border-box' },
    setInput: { width: '80px', padding: '10px', borderRadius: '8px', border: '1px solid #e5e5e5', fontSize: '14px', background: '#fafafa', outline: 'none' },
    summaryCard: { display: 'flex', justifyContent: 'space-around', background: '#f8fffb', padding: '16px', borderRadius: '12px', border: '1px solid #d9f7e4', marginBottom: '20px' },
    summaryStat: { display: 'flex', flexDirection: 'column', alignItems: 'center' },
    summaryLabel: { fontSize: '12px', color: '#4b5563', fontWeight: 600, textTransform: 'uppercase' },
    summaryValue: { fontSize: '20px', fontWeight: 800, color: '#111827' },
    exerciseCard: { background: 'white', borderRadius: '16px', border: '1px solid #e5e5e5', overflow: 'hidden', boxShadow: '0 4px 12px rgba(15, 23, 42, 0.02)' },
    exerciseHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #f3f4f6' },
    libraryItem: { display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', background: 'white', borderRadius: '12px', border: '1px solid #f0f0f0', textAlign: 'left', width: '100%' },
    addBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '50%', background: '#10b981', color: 'white', border: 'none', cursor: 'pointer', flexShrink: 0 },
    error: { color: '#b91c1c', background: '#fef2f2', padding: '14px', borderRadius: '12px', border: '1px solid #fecaca', marginBottom: '20px' },
    searchWrapper: { position: 'relative', width: '100%' },
    searchIcon: { position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' },
    selectWrapper: { position: 'relative', width: '100%' },
    select: { width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #e5e7eb', background: '#f8fafc', color: '#111827', fontSize: '14px', outline: 'none', appearance: 'none', cursor: 'pointer', fontWeight: 500 },
    selectIcon: { position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#6b7280', pointerEvents: 'none' },
  };

  return (
    <div style={styles.page}>
      <div style={styles.shell}>
        
        {/* LEFT PANEL: Routine Builder & List */}
        <div style={styles.leftPanel}>
          <div style={styles.pageHeader}>
            <div>
              <h1 style={styles.pageTitle}>Routines</h1>
              {!creating && <p style={{ margin: '8px 0 0', color: '#6b7280' }}>Build reusable workout templates and launch them instantly.</p>}
            </div>
            {!creating && (
              <button style={styles.actionButton} onClick={() => setCreating(true)}>
                <Plus size={16} /> New Routine
              </button>
            )}
          </div>

          {error && <div style={styles.error}>{error}</div>}

          {creating ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              <div style={styles.card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800 }}>Create a Routine</h2>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button style={{ ...styles.actionButton, background: '#f3f4f6', color: '#374151' }} onClick={() => setCreating(false)}>Cancel</button>
                    <button style={styles.actionButton} onClick={save} disabled={pendingExercises.length === 0}>Save Routine</button>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                  <input style={styles.input} value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Routine title" />
                  <input style={styles.input} value={newDescription} onChange={(e) => setNewDescription(e.target.value)} placeholder="Notes (optional)" />
                </div>
              </div>

              {pendingExercises.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#6b7280', padding: '80px 24px', borderRadius: '16px', background: 'white', border: '1px dashed #e5e7eb' }}>
                  <Dumbbell size={36} color="#9ca3af" style={{ marginBottom: '12px' }} />
                  <h3 style={{ margin: '0 0 8px', fontSize: '18px', color: '#111827' }}>No Exercises Added</h3>
                  <p style={{ margin: 0, fontSize: '14px' }}>Search and add exercises from the library on the right.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  
                  <div style={styles.summaryCard}>
                    <div style={styles.summaryStat}>
                      <span style={styles.summaryLabel}>Exercises</span>
                      <span style={styles.summaryValue}>{totalExercises}</span>
                    </div>
                    <div style={styles.summaryStat}>
                      <span style={styles.summaryLabel}>Total Sets</span>
                      <span style={styles.summaryValue}>{totalSets}</span>
                    </div>
                  </div>

                  {pendingExercises.map((ex) => (
                    <div key={ex.id} style={styles.exerciseCard}>
                      <div style={styles.exerciseHeader}>
                        <div>
                          <div style={{ fontSize: '18px', fontWeight: 700 }}>{ex.exercise_name}</div>
                          <div style={{ color: '#6b7280', fontSize: '13px', marginTop: '4px' }}>{ex.muscle_group}</div>
                        </div>
                        <button onClick={() => removePendingExercise(ex.id)} style={{ background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '10px', padding: '8px', cursor: 'pointer' }}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <div style={{ padding: '16px 20px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '40px 100px 100px 40px', gap: '12px', marginBottom: '8px', color: '#6b7280', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase' }}>
                          <span>Set</span>
                          <span>Weight</span>
                          <span>Reps</span>
                        </div>
                        {ex.sets.map((set, idx) => (
                          <div key={set.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 0' }}>
                            <span style={{ width: '40px', color: '#9ca3af', fontWeight: 700 }}>{idx + 1}</span>
                            <input type="text" inputMode="decimal" placeholder="kg" style={styles.setInput} value={set.weight}
                              onKeyDown={blockInvalidNumericKey} onChange={(e) => updateSet(ex.id, set.id, 'weight', e.target.value)} />
                            <input type="text" inputMode="numeric" placeholder="reps" style={styles.setInput} value={set.reps}
                              onKeyDown={blockInvalidNumericKey} onChange={(e) => updateSet(ex.id, set.id, 'reps', e.target.value)} />
                            <button type="button" onClick={() => removeSet(ex.id, set.id)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer' }}>✕</button>
                          </div>
                        ))}
                        <button type="button" onClick={() => addSet(ex.id)} style={{ width: '100%', marginTop: '12px', padding: '10px', borderRadius: '10px', border: '1px dashed #d1d5db', background: '#f8fafc', color: '#111827', cursor: 'pointer', fontWeight: 700 }}>
                          + Add Set
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            // Existing Template List Rendering
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {loading ? (
                <div style={{ ...styles.card, textAlign: 'center', color: '#6b7280' }}>Loading routines…</div>
              ) : templates.length === 0 ? (
                <div style={{ ...styles.card, textAlign: 'center', padding: '40px' }}>No routines yet.</div>
              ) : (
                templates.map((template) => (
                  <div key={template.id} style={styles.card}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>{template.name}</h3>
                        {template.description && <p style={{ margin: '8px 0 0', color: '#6b7280', fontSize: '14px' }}>{template.description}</p>}
                      </div>
                      <button style={styles.actionButton} onClick={() => onLoadTemplate?.(template)}>Start Workout</button>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {(template.exercises || []).map((ex, idx) => (
                        <span key={idx} style={{ background: '#ecfdf5', color: '#065f46', padding: '8px 12px', borderRadius: '999px', fontSize: '13px', fontWeight: 700 }}>
                          {ex.exercise_name} • {ex.target_sets}×{ex.target_reps}
                        </span>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* RIGHT PANEL: Exercise Library (Only visible when creating) */}
        {creating && (
          <aside style={styles.rightPanel}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>Library</h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={styles.selectWrapper}>
                <select style={styles.select} value={selectedMuscle} onChange={(e) => setSelectedMuscle(e.target.value)}>
                  {MUSCLE_GROUPS.map((group) => <option key={group} value={group}>{group}</option>)}
                </select>
                <ChevronDown size={16} style={styles.selectIcon} />
              </div>

              <div style={styles.searchWrapper}>
                <Search size={16} style={styles.searchIcon} />
                <input
                  style={{ ...styles.input, paddingLeft: '38px' }}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search Exercises"
                />
              </div>
            </div>

            <div style={{ fontSize: '12px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', marginTop: '4px' }}>
              Results
            </div>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px' }}>
              {filteredExercises.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px', color: '#6b7280', fontSize: '14px' }}>No exercises found.</div>
              ) : (
                filteredExercises.map((exercise) => (
                  <div key={exercise.name} style={styles.libraryItem}>
                    <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: '#f3f4f6', border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                      {getImageSrc(exercise) ? (
                        <img src={getImageSrc(exercise)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <Dumbbell size={18} color="#10b981" />
                      )}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <p style={{ margin: 0, fontSize: '14px', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{exercise.name}</p>
                      <p style={{ margin: '2px 0 0', color: '#6b7280', fontSize: '12px' }}>{exercise.muscle_group || 'General'}</p>
                    </div>
                    <button type="button" onClick={() => addExerciseToRoutine(exercise)} style={styles.addBtn}>
                      <Plus size={18} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </aside>
        )}

      </div>
    </div>
  );
}