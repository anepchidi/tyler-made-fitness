import { useEffect, useRef } from 'react';
import { Scale, Ruler, Calendar, Target, TrendingUp, X } from 'lucide-react';
import { primaryButton, secondaryButton } from './styles';

const GOALS = [
  { id: 'muscle', label: 'Build Muscle', Icon: TrendingUp },
  { id: 'lose', label: 'Lose Weight', Icon: Scale },
  { id: 'maintain', label: 'Maintain', Icon: Target },
];

const label = {
  fontSize: '13px',
  fontWeight: 600,
  color: '#666',
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  marginBottom: '8px',
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
  background: '#fafafa',
};

const focusHandlers = {
  onFocus: (e) => (e.target.style.borderColor = '#10b981'),
  onBlur: (e) => (e.target.style.borderColor = '#e5e5e5'),
};

function toggleStyle(selected) {
  return {
    borderRadius: '10px',
    border: '2px solid',
    cursor: 'pointer',
    fontWeight: 600,
    borderColor: selected ? '#10b981' : '#e5e5e5',
    background: selected ? '#ecfdf5' : '#fafafa',
    color: selected ? '#10b981' : '#666',
    transition: 'all 0.2s',
  };
}

export default function EditProfileModal({
  values,
  onChange,
  onSave,
  onCancel,
  saving = false,
  canSave = true,
  error = '',
}) {
  const unit = values?.unit || 'kg';
  const firstInputRef = useRef(null);

  useEffect(() => {
    firstInputRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape' && !saving) onCancel?.();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onCancel, saving]);

  const set = (field) => (e) => onChange?.(field, e.target.value);

  return (
    <div
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !saving) onCancel?.();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(17, 17, 17, 0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        zIndex: 1000,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-profile-title"
        style={{
          background: 'white',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '520px',
          maxHeight: 'calc(100vh - 32px)',
          overflowY: 'auto',
          padding: '24px',
          boxShadow: '0 20px 48px rgba(15, 23, 42, 0.18)',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h3 id="edit-profile-title" style={{ margin: 0, fontSize: '18px', color: '#111', fontWeight: 700 }}>
            Edit profile
          </h3>
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            aria-label="Close"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999', padding: '4px', display: 'flex' }}
          >
            <X size={20} />
          </button>
        </div>

        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            if (canSave && !saving) onSave?.();
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '16px' }}>
            <div>
              <label htmlFor="profile-bodyweight" style={label}>
                <Scale size={16} />
                Bodyweight ({unit})
              </label>
              <input
                id="profile-bodyweight"
                ref={firstInputRef}
                style={inp}
                type="number"
                min="0"
                step="any"
                placeholder={unit === 'kg' ? 'e.g. 75' : 'e.g. 165'}
                value={values?.bodyweight ?? ''}
                onChange={set('bodyweight')}
                {...focusHandlers}
              />
            </div>

            <div>
              <label htmlFor="profile-height" style={label}>
                <Ruler size={16} />
                Height (cm)
              </label>
              <input
                id="profile-height"
                style={inp}
                type="number"
                min="0"
                step="any"
                placeholder="e.g. 175"
                value={values?.height ?? ''}
                onChange={set('height')}
                {...focusHandlers}
              />
            </div>

            <div>
              <label htmlFor="profile-age" style={label}>
                <Calendar size={16} />
                Age
              </label>
              <input
                id="profile-age"
                style={inp}
                type="number"
                min="1"
                step="1"
                placeholder="e.g. 25"
                value={values?.age ?? ''}
                onChange={set('age')}
                {...focusHandlers}
              />
            </div>

            <div>
              <span style={label}>Weight Unit</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                {['kg', 'lbs'].map((u) => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => onChange?.('unit', u)}
                    aria-pressed={unit === u}
                    style={{ ...toggleStyle(unit === u), flex: 1, padding: '11px', fontSize: '14px' }}
                  >
                    {u}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <span style={label}>
              <Target size={16} />
              Fitness Goal
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {GOALS.map((g) => {
                const GoalIcon = g.Icon;
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => onChange?.('goal', g.id)}
                    aria-pressed={values?.goal === g.id}
                    style={{
                      ...toggleStyle(values?.goal === g.id),
                      padding: '12px 10px',
                      fontSize: '13px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <GoalIcon size={20} />
                    <span>{g.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {error ? (
            <div role="alert" style={{ marginBottom: '16px', color: '#b91c1c', fontSize: '14px' }}>
              {error}
            </div>
          ) : null}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button type="button" onClick={onCancel} disabled={saving} style={secondaryButton}>
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !canSave}
              style={{
                ...primaryButton,
                opacity: saving || !canSave ? 0.6 : 1,
                cursor: saving ? 'wait' : canSave ? 'pointer' : 'not-allowed',
              }}
              onMouseEnter={(e) => canSave && !saving && (e.currentTarget.style.background = '#059669')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#10b981')}
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
