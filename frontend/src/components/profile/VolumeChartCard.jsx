import { useMemo } from 'react';
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { card, cardTitle, iconTile, mutedLabel } from './styles';
import { formatNumber, formatShortDate } from '../../utils/stats';

const compact = new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 });

function describeChange(current, previous) {
  if (previous <= 0) {
    return current > 0
      ? { text: 'No volume the week before', tone: 'neutral' }
      : { text: 'No volume in the last two weeks', tone: 'neutral' };
  }
  const pct = Math.round(((current - previous) / previous) * 100);
  if (pct === 0) return { text: 'Same as previous week', tone: 'neutral' };
  return {
    text: `${pct > 0 ? '+' : ''}${pct}% vs previous week`,
    tone: pct > 0 ? 'up' : 'down',
  };
}

// `weeklyVolume` comes from calculateWeeklyVolume(): rolling 7-day windows,
// oldest first, the last one ending today.
export default function VolumeChartCard({ weeklyVolume = [], unit = 'kg', style }) {
  const data = useMemo(
    () =>
      weeklyVolume.map((w) => ({
        label: formatShortDate(w?.start),
        range: `${formatShortDate(w?.start)} – ${formatShortDate(w?.end)}`,
        volume: Math.round(Number(w?.volume) || 0),
      })),
    [weeklyVolume],
  );

  const current = data[data.length - 1]?.volume ?? 0;
  const previous = data[data.length - 2]?.volume ?? 0;
  const change = describeChange(current, previous);
  const hasData = data.some((d) => d.volume > 0);
  const toneColor = change.tone === 'up' ? '#059669' : change.tone === 'down' ? '#ef4444' : '#666';
  const ToneIcon = change.tone === 'down' ? TrendingDown : TrendingUp;

  return (
    <div style={{ ...card, ...style }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
        <div style={iconTile}>
          <TrendingUp size={18} color="#059669" />
        </div>
        <h3 style={cardTitle}>Total volume</h3>
        <span style={{ ...mutedLabel, marginLeft: 'auto', textTransform: 'none', letterSpacing: 0 }}>
          Last {data.length} weeks
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
        <span style={{ fontSize: '30px', fontWeight: 700, color: '#111' }}>{formatNumber(current)}</span>
        <span style={{ fontSize: '15px', fontWeight: 600, color: '#999' }}>{unit}</span>
        <span style={{ fontSize: '13px', color: '#666' }}>last 7 days</span>
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '13px',
          fontWeight: 600,
          color: toneColor,
          marginBottom: '16px',
        }}
      >
        {change.tone !== 'neutral' ? <ToneIcon size={16} /> : null}
        {change.text}
      </div>

      {hasData ? (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
            <XAxis
              dataKey="label"
              tick={{ fill: '#6b7280', fontSize: 11 }}
              stroke="#e5e7eb"
              interval="preserveStartEnd"
              minTickGap={12}
            />
            <YAxis
              tick={{ fill: '#6b7280', fontSize: 11 }}
              stroke="#e5e7eb"
              tickFormatter={(v) => compact.format(v)}
              width={48}
            />
            <Tooltip
              cursor={{ fill: '#f3f4f6' }}
              labelFormatter={(_, payload) => payload?.[0]?.payload?.range ?? ''}
              formatter={(value) => [`${formatNumber(value)} ${unit}`, 'Volume']}
              contentStyle={{
                backgroundColor: '#ffffff',
                borderRadius: '12px',
                border: '1px solid #e5e7eb',
                boxShadow: '0 10px 24px rgba(15, 23, 42, 0.08)',
                fontSize: '13px',
              }}
            />
            <Bar dataKey="volume" radius={[4, 4, 0, 0]} maxBarSize={36}>
              {data.map((d, i) => (
                <Cell key={d.range} fill={i === data.length - 1 ? '#059669' : '#10b981'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div
          style={{
            height: '220px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#999',
            fontSize: '14px',
            background: '#fafafa',
            borderRadius: '10px',
          }}
        >
          No volume logged in the last {data.length} weeks
        </div>
      )}
    </div>
  );
}