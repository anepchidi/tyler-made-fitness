import { useState } from 'react';
import { Plus, X, FolderKanban, Play, Dumbbell, Edit3 } from 'lucide-react';

const DEFAULT_TEMPLATES = [
  { id: 1, name: "Upper", exercises: ["Pull Up", "Incline Dumbbell Press", " Chest Fly", "Lateral Raise", "Tricep Pushdown"] },
  { id: 2, name: "Lower", exercises: ["Stiff Leg Deadlift", "Hamstring Curl", "Hack Squat", "Calf Raise", "Barbell Curl"] },
  { id: 3, name: "Leg Day", exercises: ["Barbell Squat", "Leg Press", "Romanian Deadlift", "Leg Curl", "Calf Raise"] },
];

export default function Templates({ onLoadTemplate }) {
  const [templates, setTemplates] = useState(() => {
    try { 
      const saved = localStorage.getItem("templates");
      return saved ? JSON.parse(saved) : DEFAULT_TEMPLATES; 
    } catch { 
      return DEFAULT_TEMPLATES; 
    }
  });
  
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(null);
  const [newName, setNewName] = useState('');
  const [newExercises, setNewExercises] = useState('');

  const save = () => {
    if (!newName.trim()) return;
    
    const exerciseList = newExercises
      .split(',')
      .map(e => e.trim())
      .filter(Boolean);
    
    if (exerciseList.length === 0) return;

    const template = { 
      id: Date.now(), 
      name: newName.trim(), 
      exercises: exerciseList
    };
    
    const updated = [...templates, template];
    setTemplates(updated);
    localStorage.setItem("templates", JSON.stringify(updated));
    
    setCreating(false);
    setNewName('');
    setNewExercises('');
  };

  const update = () => {
    if (!editing || !newName.trim()) return;
    
    const exerciseList = newExercises
      .split(',')
      .map(e => e.trim())
      .filter(Boolean);
    
    if (exerciseList.length === 0) return;

    const updated = templates.map(t => 
      t.id === editing.id 
        ? { ...t, name: newName.trim(), exercises: exerciseList }
        : t
    );
    
    setTemplates(updated);
    localStorage.setItem("templates", JSON.stringify(updated));
    
    setEditing(null);
    setNewName('');
    setNewExercises('');
  };

  const remove = (id) => {
    if (!window.confirm("Delete this template?")) return;
    
    const updated = templates.filter(t => t.id !== id);
    setTemplates(updated);
    localStorage.setItem("templates", JSON.stringify(updated));
  };

  const startEdit = (template) => {
    setEditing(template);
    setNewName(template.name);
    setNewExercises(template.exercises.join(', '));
    setCreating(false);
  };

  const cancelEdit = () => {
    setEditing(null);
    setCreating(false);
    setNewName('');
    setNewExercises('');
  };

  const card = { 
    background: "white", 
    padding: "20px",  // ← REDUCED from 24px
    borderRadius: "12px",  // ← REDUCED from 16px 
    boxShadow: "0 1px 3px rgba(0,0,0,0.06)", 
    marginBottom: "16px",
    border: "1px solid #e5e5e5",
    transition: "all 0.2s"
  };

  const inp = {
    width: "100%",
    padding: "11px 14px",  // ← REDUCED from 12px
    borderRadius: "10px",
    border: "1px solid #e5e5e5",
    fontSize: "14px",
    boxSizing: "border-box",
    outline: "none",
    transition: "border-color 0.2s"
  };

  return (
    <div style={{ flex: 1, padding: "32px", overflowY: "auto", background: "#fafafa" }}>
      <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
        {/* Header */}
        <div style={{ 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center", 
          marginBottom: "28px",  // ← REDUCED from 32px
          flexWrap: "wrap",
          gap: "16px"
        }}>
          <div>
            <h1 style={{ margin: 0, fontSize: "28px", color: "#111", fontWeight: 700, letterSpacing: "-0.5px" }}>
              Routines 
            </h1>
            <p style={{ color: "#666", margin: "6px 0 0", fontSize: "14px" }}>
              {templates.length} template{templates.length !== 1 ? 's' : ''} saved
            </p>
          </div>
          
          <button 
            onClick={() => {
              setCreating(!creating);
              setEditing(null);
              setNewName('');
              setNewExercises('');
            }}
            style={{
              padding: "11px 20px",  // ← REDUCED
              background: creating ? "#f5f5f5" : "#10b981",
              color: creating ? "#111" : "white",
              border: "none",
              borderRadius: "10px",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: "14px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              transition: "all 0.2s"
            }}
            onMouseEnter={e => !creating && (e.currentTarget.style.background = "#059669")}
            onMouseLeave={e => !creating && (e.currentTarget.style.background = "#10b981")}
          >
            {creating ? (
              <>
                <X size={18} />
                Cancel
              </>
            ) : (
              <>
                <Plus size={18} />
                New Template
              </>
            )}
          </button>
        </div>

        {/* Create/Edit Form */}
        {(creating || editing) && (
          <div style={{ 
            ...card, 
            background: "#f5f5f5",  // ← NEUTRAL GRAY
            borderColor: "#10b981",
            borderWidth: "2px",
            marginBottom: "20px",
            padding: "18px"  // ← REDUCED
          }}>
            <h3 style={{ margin: "0 0 16px", fontSize: "17px", color: "#111", fontWeight: 600 }}>
              {editing ? "Edit Template" : "Create New Template"}
            </h3>
            
            <input 
              placeholder="Template name (e.g., Push Day)" 
              value={newName} 
              onChange={e => setNewName(e.target.value)}
              style={inp}
              onFocus={e => e.target.style.borderColor = "#10b981"}
              onBlur={e => e.target.style.borderColor = "#e5e5e5"}
            />
            
            <textarea
              placeholder="Exercises, separated by commas&#10;e.g., Bench Press, Incline Dumbbell Press, Overhead Press"
              value={newExercises} 
              onChange={e => setNewExercises(e.target.value)}
              style={{
                ...inp,
                marginTop: "10px",  // ← REDUCED from 12px
                minHeight: "90px",  // ← REDUCED from 100px
                fontFamily: "inherit",
                resize: "vertical"
              }}
              onFocus={e => e.target.style.borderColor = "#10b981"}
              onBlur={e => e.target.style.borderColor = "#e5e5e5"}
            />
            
            <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
              <button 
                onClick={editing ? update : save}
                style={{
                  flex: 1,
                  padding: "12px",
                  background: "#10b981",
                  color: "white",
                  border: "none",
                  borderRadius: "10px",
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: "14px"
                }}
              >
                {editing ? "Save Changes" : "Create Template"}
              </button>
              <button 
                onClick={cancelEdit}
                style={{
                  padding: "12px 20px",
                  background: "white",
                  color: "#666",
                  border: "1px solid #e5e5e5",
                  borderRadius: "10px",
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: "14px"
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Templates Grid */}
        {templates.length === 0 ? (
          <div style={{ 
            textAlign: "center", 
            color: "#999", 
            marginTop: "10vh",
            fontSize: "15px"
          }}>
            <div style={{
              width: "72px",
              height: "72px",
              borderRadius: "16px",
              background: "#f5f5f5",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px"
            }}>
              <FolderKanban size={36} color="#ccc" />
            </div>
            <div>No templates yet. Create your first routine!</div>
          </div>
        ) : (
          <div style={{ 
            display: "grid", 
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",  // ← REDUCED from 320px 
            gap: "16px"  // ← REDUCED from 20px
          }}>
            {templates.map(t => (
              <div 
                key={t.id} 
                style={{
                  ...card,
                  borderLeft: "4px solid #10b981",  // ← EMERALD GREEN
                  position: "relative"
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)";
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.06)";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                {/* Template Header */}
                <div style={{ 
                  display: "flex", 
                  justifyContent: "space-between", 
                  alignItems: "flex-start",
                  marginBottom: "14px"  // ← REDUCED from 16px
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                      <div style={{
                        width: "32px",  // ← REDUCED from 36px
                        height: "32px",
                        borderRadius: "10px",
                        background: "#ecfdf5",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}>
                        <FolderKanban size={16} color="#10b981" />
                      </div>
                      <h3 style={{ margin: 0, fontSize: "17px", color: "#111", fontWeight: 700 }}>
                        {t.name}
                      </h3>
                    </div>
                    <div style={{ fontSize: "12px", color: "#666", fontWeight: 500, marginLeft: "42px" }}>
                      {t.exercises.length} exercise{t.exercises.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>

                {/* Exercises List */}
                <div style={{ 
                  display: "flex", 
                  flexWrap: "wrap", 
                  gap: "6px",  // ← REDUCED from 8px
                  marginBottom: "14px"  // ← REDUCED from 16px
                }}>
                  {t.exercises.map((ex, i) => (
                    <span 
                      key={i}
                      style={{
                        background: "#f5f5f5",  // ← NEUTRAL GRAY
                        color: "#333",  // ← DARK TEXT
                        padding: "5px 10px",  // ← REDUCED
                        borderRadius: "8px",
                        fontSize: "12px",  // ← REDUCED from 13px
                        fontWeight: 500,
                        display: "flex",
                        alignItems: "center",
                        gap: "5px"
                      }}
                    >
                      <Dumbbell size={11} />
                      {ex}
                    </span>
                  ))}
                </div>

                {/* Actions */}
                <div style={{ display: "flex", gap: "8px" }}>
                  <button 
                    onClick={() => onLoadTemplate(t)}
                    style={{
                      flex: 1,
                      padding: "10px 14px",  // ← REDUCED
                      background: "#10b981",
                      color: "white",
                      border: "none",
                      borderRadius: "10px",
                      cursor: "pointer",
                      fontWeight: 600,
                      fontSize: "14px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                      transition: "all 0.2s"
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = "#059669"}
                    onMouseLeave={e => e.currentTarget.style.background = "#10b981"}
                  >
                    <Play size={15} />
                    Load
                  </button>
                  
                  <button 
                    onClick={() => startEdit(t)}
                    style={{
                      padding: "10px 12px",
                      background: "#f5f5f5",
                      color: "#666",
                      border: "none",
                      borderRadius: "10px",
                      cursor: "pointer",
                      transition: "all 0.2s"
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = "#e5e5e5"}
                    onMouseLeave={e => e.currentTarget.style.background = "#f5f5f5"}
                  >
                    <Edit3 size={15} />
                  </button>
                  
                  <button 
                    onClick={() => remove(t.id)}
                    style={{
                      padding: "10px 12px",
                      background: "#fee2e2",
                      color: "#ef4444",
                      border: "none",
                      borderRadius: "10px",
                      cursor: "pointer",
                      transition: "all 0.2s"
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = "#fecaca"}
                    onMouseLeave={e => e.currentTarget.style.background = "#fee2e2"}
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}