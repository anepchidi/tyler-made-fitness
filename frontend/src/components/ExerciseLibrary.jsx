import { useState, useMemo } from 'react';
import { API, authFetch } from '../api/client';

export default function ExerciseLibrary({ exercises = [], setExercises, onFetchLibrary, onAdd }) {
  const [selectedMuscle, setSelectedMuscle] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newEx, setNewEx] = useState({ name: '', muscle_group: 'Chest', image_url: '' });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const safeExercises = Array.isArray(exercises) ? exercises : [];
  
  const staticMuscleGroups = [
    'Abdominals', 'Biceps', 'Calves', 'Chest', 'Forearms', 
    'Glutes', 'Hamstrings', 'Lats', 'Lower_Back', 
    'Middle_Back', 'Neck', 'Quadriceps', 'Traps', 'Triceps'
  ];

  const handleMuscleChange = (e) => {
    const value = e.target.value;
    setSelectedMuscle(value);
    
    if (onFetchLibrary) {
      onFetchLibrary(value);
    }
  };

  const filtered = useMemo(() => {
    return safeExercises.filter((ex) => {
      const matchesMuscle = selectedMuscle === 'All' || 
        ex.muscle_group.toLowerCase() === selectedMuscle.toLowerCase().replace('_', ' ');
      const matchesSearch = ex.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesMuscle && matchesSearch;
    });
  }, [safeExercises, selectedMuscle, searchQuery]);

  const [imageFile, setImageFile] = useState(null);

  const handleAddCustom = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    const formData = new FormData();
    formData.append('name', newEx.name);
    formData.append('muscle_group', newEx.muscle_group);
    if (imageFile) {
      formData.append('image', imageFile);
    }

    try {
      const res = await authFetch(`${API}/exercises/library/upload`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (res.ok) {
        setExercises([...safeExercises, data]);
        setShowAddForm(false);
        setNewEx({ name: '', muscle_group: 'Chest', image_url: '' });
        setImageFile(null);
      } else {
        setError(data.detail || "Failed to add exercise");
      }
    } catch (err) {
      setError("Connection error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h3 style={styles.title}>Exercise Library</h3>
        <button onClick={() => setShowAddForm(!showAddForm)} style={styles.toggleBtn}>
          {showAddForm ? "Close" : "+ Custom"}
        </button>
      </div>

      {/* Add Custom Exercise Form */}
      {showAddForm && (
        <form onSubmit={handleAddCustom} style={styles.form}>
          {error && <div style={styles.error}>{error}</div>}
          <input 
            style={styles.input} 
            type="text" 
            placeholder="Exercise name" 
            required 
            value={newEx.name}
            onChange={(e) => setNewEx({ ...newEx, name: e.target.value })} 
          />
          <input 
            type="file" 
            accept="image/*"
            onChange={(e) => setImageFile(e.target.files[0])}
            style={styles.searchInput} 
          />
          <select 
            style={{ ...styles.input, marginBottom: "12px" }} 
            value={newEx.muscle_group}
            onChange={(e) => setNewEx({ ...newEx, muscle_group: e.target.value })}
          >
            {['Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core'].map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <button type="submit" disabled={isSubmitting} style={styles.submitBtn}>
            {isSubmitting ? "Saving..." : "Save to Library"}
          </button>
        </form>
      )}

      {/* Filters */}
      <select 
        value={selectedMuscle} 
        onChange={handleMuscleChange}
        style={styles.filterSelect}
      >
        <option value="All">All muscles</option>
        {staticMuscleGroups.map(m => <option key={m} value={m}>{m}</option>)}
      </select>

      <input 
        type="text" 
        placeholder="Search exercises..." 
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        style={styles.searchInput} 
      />

      {/* Exercise List */}
      <div style={styles.listContainer}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#999', padding: '40px 20px', fontSize: '14px' }}>
            No exercises found. Try adjusting your filters or add a custom exercise.
          </div>
        ) : (
          filtered.map((ex) => (
            <div key={ex.id} style={styles.listItem}>
              <div style={styles.itemContent}>
                <img 
                  src={ex.image_url && ex.image_url.startsWith('http') ? ex.image_url : `${API}${ex.image_url}`} 
                  alt={ex.name} 
                  style={styles.itemImage}
                  onError={(e) => { e.target.src = 'https://via.placeholder.com/100?text=No+Img'; }} 
                />
                <div>
                  <div style={styles.itemName}>{ex.name}</div>
                  <div style={styles.itemMuscle}>{ex.muscle_group}</div>
                </div>
              </div>
              <button onClick={() => onAdd(ex)} style={styles.addButton}>+</button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// Extracted styles object to keep the JSX clean
const styles = {
  container: { width: "380px", minWidth: "340px", background: "white", borderLeft: "1px solid #eaeaea", padding: "30px 22px", display: "flex", flexDirection: "column" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" },
  title: { margin: 0, fontSize: "18px", color: "#222" },
  toggleBtn: { background: "#f0f7ff", color: "#007bff", border: "none", borderRadius: "8px", padding: "7px 14px", cursor: "pointer", fontSize: "13px", fontWeight: "bold" },
  form: { background: "#f8f9fa", padding: "18px", borderRadius: "12px", marginBottom: "20px", border: "2px solid #007bff" },
  error: { color: "#cc0000", fontSize: "13px", marginBottom: "10px" },
  input: { width: "100%", padding: "11px", marginBottom: "12px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "14px", boxSizing: "border-box" },
  submitBtn: { width: "100%", padding: "11px", background: "#28a745", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" },
  filterSelect: { width: "100%", padding: "12px", borderRadius: "10px", marginBottom: "12px", border: "1px solid #eaeaea", background: "#f8f9fa", fontSize: "14px", fontWeight: "bold", cursor: "pointer" },
  searchInput: { width: "100%", padding: "12px", borderRadius: "10px", marginBottom: "20px", border: "1px solid #eaeaea", background: "#f8f9fa", fontSize: "14px", boxSizing: "border-box" },
  listContainer: { overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: "10px" },
  listItem: { padding: "12px", background: "#fff", border: "1px solid #eaeaea", borderRadius: "12px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" },
  itemContent: { display: "flex", alignItems: "center", gap: "12px", minWidth: 0 },
  itemImage: { width: "56px", height: "56px", borderRadius: "12px", objectFit: "cover", background: "#f3f4f6", flexShrink: 0 },
  itemName: { fontWeight: "700", fontSize: "14px", color: "#333" },
  itemMuscle: { fontSize: "11px", color: "#999", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px", marginTop: "3px" },
  addButton: { background: "#007bff", color: "white", border: "none", borderRadius: "50%", width: "36px", height: "36px", cursor: "pointer", fontSize: "20px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }
};