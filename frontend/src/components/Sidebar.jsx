import { LayoutDashboard, Dumbbell, TrendingUp, History, User, KanbanSquare, Apple, LogOut } from 'lucide-react';

export default function Sidebar({ activePage, setActivePage, username, onLogout }) {
  const menuItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'templates', icon: KanbanSquare, label: 'Routines' },
    { id: 'nutrition', icon: Apple, label: 'Nutrition' },
    { id: 'exercise', icon: Dumbbell, label: 'Exercise' },
    { id: 'progress', icon: TrendingUp, label: 'Progress' },
    { id: 'history', icon: History, label: 'History' },
    { id: 'profile', icon: User, label: 'Profile' },
  ];

  return (
    <div style={styles.sidebar}>
      {/* Logo Section */}
      <div style={styles.logoSection}>
        <div style={styles.logoIcon}>
          <Dumbbell size={24} color="#10b981" strokeWidth={2.5} />
        </div>
        <h2 style={styles.logoText}>TylerMade Fitness.</h2>
      </div>

      {/* User Section */}
      <div style={styles.userSection}>
        <div style={styles.avatar}>
          {username?.[0]?.toUpperCase() || 'U'}
        </div>
        <div style={styles.userInfo}>
          <div style={styles.userName}>{username || 'User'}</div>
          <div style={styles.userStatus}>Active Member</div>
        </div>
      </div>

      {/* Navigation */}
      <nav style={styles.nav}>
        {menuItems.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => setActivePage(id)}
            style={{
              ...styles.navItem,
              ...(activePage === id ? styles.navItemActive : {}),
            }}
            onMouseEnter={e => {
              if (activePage !== id) {
                e.currentTarget.style.background = '#e8f5e9'; // ← EMERALD GREEN tint
                e.currentTarget.style.color = '#059669';
                e.currentTarget.style.transform = 'translateX(4px)';
              }
            }}
            onMouseLeave={e => {
              if (activePage !== id) {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = '#666';
                e.currentTarget.style.transform = 'translateX(0)';
              }
            }}
          >
            <Icon size={20} strokeWidth={2} />
            <span style={styles.navLabel}>{label}</span>
          </button>
        ))}
      </nav>

      {/* Logout Button */}
      <button
        onClick={onLogout}
        style={styles.logoutButton}
        onMouseEnter={e => {
          e.currentTarget.style.background = '#fee2e2';
          e.currentTarget.style.color = '#ef4444';
          e.currentTarget.style.transform = 'translateX(4px)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = '#f5f5f5';
          e.currentTarget.style.color = '#666';
          e.currentTarget.style.transform = 'translateX(0)';
        }}
      >
        <LogOut size={20} strokeWidth={2} />
        <span style={styles.navLabel}>Logout</span>
      </button>
    </div>
  );
}

const styles = {
  sidebar: {
    width: '260px',
    minWidth: '260px',
    background: 'linear-gradient(180deg, #fafafa 0%, #f5f5f5 100%)',
    borderRight: '1px solid #e5e5e5',
    padding: '24px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  logoSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    paddingBottom: '16px',
    borderBottom: '1px solid #e5e5e5',
  },
  logoIcon: {
    width: '40px',
    height: '40px',
    background: '#ecfdf5',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    margin: 0,
    fontSize: '20px',
    fontWeight: '700',
    color: '#111',
    letterSpacing: '-0.5px',
  },
  userSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px',
    background: 'white',
    borderRadius: '12px',
    border: '1px solid #e5e5e5',
  },
  avatar: {
    width: '44px',
    height: '44px',
    borderRadius: '12px',
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    fontWeight: '700',
  },
  userInfo: {
    flex: 1,
    minWidth: 0,
  },
  userName: {
    fontSize: '15px',
    fontWeight: '600',
    color: '#111',
    marginBottom: '2px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  userStatus: {
    fontSize: '12px',
    color: '#10b981',
    fontWeight: '500',
  },
  nav: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    flex: 1,
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 14px',
    background: 'transparent',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    color: '#666',
    transition: 'all 0.2s ease',
    textAlign: 'left',
  },
  navItemActive: {
    background: '#ecfdf5',
    color: '#10b981',
    fontWeight: '600',
  },
  navLabel: {
    flex: 1,
  },
  logoutButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 14px',
    background: '#f5f5f5',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    color: '#666',
    transition: 'all 0.2s ease',
    textAlign: 'left',
    marginTop: 'auto',
  },
};