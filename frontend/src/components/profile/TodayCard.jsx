import { Apple, CircleCheck, Clock, Dumbbell, Plus } from 'lucide-react';
import { card, cardTitle, iconTile, mutedLabel, primaryButton } from './styles';
import {
  calculateWorkoutVolume,
  formatNumber,
  formatSetSummary,
  formatShortDate,
  getExerciseSets,
} from '../../utils/stats';

const MACROS = [
  { key: 'calories', label: 'Calories', unit: 'kcal' },
  { key: 'protein', label: 'Protein', unit: 'g' },
  { key: 'carbs', label: 'Carbs', unit: 'g' },
  { key: 'fat', label: 'Fat', unit: 'g' },
];

const sectionHeading = { ...mutedLabel, marginBottom: '10px' };

function WorkoutStatus({ todaysWorkouts = [], unit, onLogWorkout }) {
  if (todaysWorkouts.length === 0) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          flexWrap: 'wrap',
          padding: '14px',
          background: '#fafafa',
          borderRadius: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Dumbbell size={20} color="#999" />
          <span style={{ fontSize: '14px', fontWeight: 600, color: '#666' }}>No workout yet</span>
        </div>
        <button
          type="button"
          onClick={onLogWorkout}
          disabled={!onLogWorkout}
          style={primaryButton}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#059669')}
          onMouseLeave={(e) => (e.currentTarget.style.background = '#10b981')}
        >
          <Plus size={16} />
          Log workout
        </button>
      </div>
    );
  }

  const exercises = todaysWorkouts.flatMap((w) => w?.exercises || []);
  const setCount = exercises.reduce((sum, e) => sum + getExerciseSets(e).length, 0);
  const volume = todaysWorkouts.reduce((sum, w) => sum + calculateWorkoutVolume(w), 0);
  const names = exercises.map((e) => e?.name).filter(Boolean);

  return (
    <div style={{ display: 'flex', gap: '12px', padding: '14px', background: '#ecfdf5', borderRadius: '10px' }}>
      <CircleCheck size={22} color="#059669" style={{ flexShrink: 0, marginTop: '1px' }} />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: '14px', fontWeight: 700, color: '#065f46' }}>
          {todaysWorkouts.length > 1 ? `${todaysWorkouts.length} workouts completed` : 'Workout completed'}
        </div>
        <div style={{ fontSize: '13px', color: '#059669', marginTop: '2px' }}>
          {exercises.length} {exercises.length === 1 ? 'exercise' : 'exercises'} · {setCount}{' '}
          {setCount === 1 ? 'set' : 'sets'} · {formatNumber(volume)} {unit}
        </div>
        {names.length > 0 ? (
          <div
            style={{
              fontSize: '12px',
              color: '#666',
              marginTop: '4px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {names.join(', ')}
          </div>
        ) : null}
      </div>
    </div>
  );
}

// `nutrition` is optional: { calories: { consumed, target }, protein: {...}, carbs: {...}, fat: {...} }.
// Without it the rows render muted with a setup prompt.
function NutritionSummary({ nutrition = null, onSetupNutrition }) {
  return (
    <div>
      <div style={sectionHeading}>Calories &amp; macros</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {MACROS.map(({ key, label, unit }) => {
          const consumed = Number(nutrition?.[key]?.consumed) || 0;
          const target = Number(nutrition?.[key]?.target) || 0;
          const pct = target > 0 ? Math.min(100, (consumed / target) * 100) : 0;
          return (
            <div key={key}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                <span style={{ color: nutrition ? '#333' : '#999', fontWeight: 600 }}>{label}</span>
                <span style={{ color: '#999' }}>
                  {nutrition && target > 0 ? `${formatNumber(consumed)} / ${formatNumber(target)} ${unit}` : '—'}
                </span>
              </div>
              <div style={{ height: '6px', background: '#f3f4f6', borderRadius: '999px', overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: '#10b981', borderRadius: '999px' }} />
              </div>
            </div>
          );
        })}
      </div>
      {!nutrition ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px', fontSize: '13px', color: '#999' }}>
          <Apple size={16} color="#bbb" />
          {onSetupNutrition ? (
            <button
              type="button"
              onClick={onSetupNutrition}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                color: '#059669',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              Set up nutrition tracking
            </button>
          ) : (
            <span>Set up nutrition tracking</span>
          )}
        </div>
      ) : null}
    </div>
  );
}

function RecentActivity({ recentExercises = [], unit }) {
  return (
    <div>
      <div style={sectionHeading}>Recent activity</div>
      {recentExercises.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {recentExercises.map((ex, i) => (
            <div
              key={`${ex?.id ?? ex?.name ?? 'exercise'}-${i}`}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 12px',
                background: '#f9fafb',
                borderRadius: '10px',
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: '14px',
                    color: '#111',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {ex?.name || 'Exercise'}
                </div>
                <div style={{ fontSize: '12px', color: '#666' }}>{formatSetSummary(ex, unit)}</div>
              </div>
              <div style={{ fontSize: '11px', color: '#999', fontWeight: 600, flexShrink: 0 }}>
                {formatShortDate(ex?.date)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ textAlign: 'center', color: '#999', padding: '20px', fontSize: '14px' }}>
          No recent activity
        </div>
      )}
    </div>
  );
}

export default function TodayCard({
  todaysWorkouts = [],
  recentExercises = [],
  unit = 'kg',
  nutrition = null,
  onLogWorkout,
  onSetupNutrition,
}) {
  return (
    <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={iconTile}>
          <Clock size={18} color="#059669" />
        </div>
        <h3 style={cardTitle}>Today</h3>
      </div>

      <WorkoutStatus todaysWorkouts={todaysWorkouts} unit={unit} onLogWorkout={onLogWorkout} />
      <NutritionSummary nutrition={nutrition} onSetupNutrition={onSetupNutrition} />
      <RecentActivity recentExercises={recentExercises} unit={unit} />
    </div>
  );
}