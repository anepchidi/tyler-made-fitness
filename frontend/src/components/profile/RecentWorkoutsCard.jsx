import { CalendarDays } from 'lucide-react';
import { card, cardTitle, iconTile } from './styles';

// Workout count over the trailing 4 weeks (28 days, today included).
export default function RecentWorkoutsCard({ count = 0 }) {
  const perWeek = (count / 4).toLocaleString(undefined, { maximumFractionDigits: 1 });
  return (
    <div style={{ ...card, display: 'flex', alignItems: 'center', gap: '16px' }}>
      <div style={iconTile}>
        <CalendarDays size={18} color="#059669" />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <h3 style={{ ...cardTitle, fontSize: '15px' }}>Last 4 weeks</h3>
        <div style={{ fontSize: '13px', color: '#666', marginTop: '2px' }}>
          ≈ {perWeek} per week
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: '28px', fontWeight: 700, color: '#111', lineHeight: 1.1 }}>{count}</div>
        <div style={{ fontSize: '12px', color: '#666', fontWeight: 500 }}>
          {count === 1 ? 'workout' : 'workouts'}
        </div>
      </div>
    </div>
  );
}