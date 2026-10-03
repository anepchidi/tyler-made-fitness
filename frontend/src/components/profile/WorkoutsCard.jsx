import { Dumbbell } from 'lucide-react';
import { card, cardTitle, iconTile } from './styles';

export default function WorkoutsCard({ thisMonth = 0, style }) {
  const monthName = new Date().toLocaleDateString('en-US', { month: 'long' });
  return (
    <div style={{ ...card, ...style, display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
        <div style={iconTile}>
          <Dumbbell size={18} color="#059669" />
        </div>
        <h3 style={cardTitle}>Workouts</h3>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ fontSize: '48px', fontWeight: 700, color: '#10b981', lineHeight: 1.1 }}>{thisMonth}</div>
        <div style={{ fontSize: '14px', color: '#666', fontWeight: 500, marginTop: '4px' }}>
          {thisMonth === 1 ? 'workout' : 'workouts'} in {monthName}
        </div>
      </div>
    </div>
  );
}
