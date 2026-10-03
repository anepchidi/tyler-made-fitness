import { Flame, Pencil } from 'lucide-react';
import { card, primaryButton } from './styles';

function StreakBadge({ streak = 0 }) {
  const active = streak > 0;
  return (
    <div
      style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
      aria-label={`${streak}-day streak`}
      title={`${streak}-day streak`}
    >
      <div style={{ position: 'relative', width: '40px', height: '40px', flexShrink: 0 }}>
        <Flame
          size={40}
          strokeWidth={1.75}
          color={active ? '#f59e0b' : '#d1d5db'}
          fill={active ? '#fef3c7' : '#f3f4f6'}
          aria-hidden="true"
        />
        <span
          style={{
            position: 'absolute',
            inset: 0,
            paddingTop: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: streak > 99 ? '10px' : '13px',
            fontWeight: 800,
            color: active ? '#b45309' : '#9ca3af',
          }}
        >
          {streak}
        </span>
      </div>
      <span style={{ fontSize: '13px', fontWeight: 600, color: active ? '#b45309' : '#999' }}>
        day streak
      </span>
    </div>
  );
}

function Metric({ value = 0, label }) {
  return (
    <div style={{ flex: 1, padding: '12px 8px', background: '#f5f5f5', borderRadius: '10px', textAlign: 'center' }}>
      <div style={{ fontSize: '20px', fontWeight: 700, color: '#111' }}>{value}</div>
      <div style={{ fontSize: '12px', color: '#666', fontWeight: 500 }}>{label}</div>
    </div>
  );
}

export default function IdentityCard({
  username,
  isOwnProfile = true,
  showSocialActions = false,
  socialCounts,
  streak = 0,
  isFollowing = false,
  socialBusy = false,
  socialMessage = '',
  loading = false,
  savedNotice = false,
  onToggleFollow,
  onEditProfile,
}) {
  return (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
        <div
          style={{
            width: '72px',
            height: '72px',
            borderRadius: '18px',
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '32px',
            color: 'white',
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {username?.[0]?.toUpperCase() || 'U'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2
            style={{
              margin: 0,
              fontSize: '22px',
              color: '#111',
              fontWeight: 700,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {username || 'User'}
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#666' }}>
            {/* TODO: use real created_at */}
            Member since {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        <Metric value={socialCounts?.follower_count ?? 0} label="Followers" />
        <Metric value={socialCounts?.following_count ?? 0} label="Following" />
        <Metric value={socialCounts?.workout_count ?? 0} label="Workouts" />
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          flexWrap: 'wrap',
        }}
      >
        <StreakBadge streak={streak} />

        {isOwnProfile ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {savedNotice ? (
              <span role="status" style={{ fontSize: '13px', color: '#059669', fontWeight: 600 }}>
                ✓ Settings Saved!
              </span>
            ) : null}
            <button
              type="button"
              onClick={onEditProfile}
              style={primaryButton}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#059669')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#10b981')}
            >
              <Pencil size={16} />
              Edit profile
            </button>
          </div>
        ) : showSocialActions ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
            <button
              type="button"
              onClick={onToggleFollow}
              disabled={socialBusy || loading}
              style={{
                padding: '10px 14px',
                borderRadius: '999px',
                border: '1px solid #10b981',
                background: isFollowing ? '#ffffff' : '#ecfdf5',
                color: isFollowing ? '#065f46' : '#059669',
                cursor: socialBusy ? 'wait' : 'pointer',
                opacity: socialBusy || loading ? 0.6 : 1,
                fontWeight: 600,
              }}
            >
              {socialBusy ? 'Working...' : isFollowing ? 'Unfollow' : 'Follow'}
            </button>
            {socialMessage ? <span style={{ fontSize: '12px', color: '#666' }}>{socialMessage}</span> : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
