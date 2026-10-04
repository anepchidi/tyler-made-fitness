import { useState, useEffect, useMemo } from 'react';
import client from '../api/client';
import {
  calculateStreak,
  calculateWeeklyVolume,
  countWorkoutsInLastDays,
  countWorkoutsThisMonth,
  getRecentExercises,
  isToday,
} from '../utils/stats';
import IdentityCard from './profile/IdentityCard';
import RecentWorkoutsCard from './profile/RecentWorkoutsCard';
import TodayCard from './profile/TodayCard';
import VolumeChartCard from './profile/VolumeChartCard';
import WorkoutsCard from './profile/WorkoutsCard';
import EditProfileModal from './profile/EditProfileModal';
import { card } from './profile/styles';

const EMPTY_HISTORY = [];
const panel = {
  padding: "28px 24px",
  boxSizing: "border-box",
  borderTop: "1px solid #eee",
  borderLeft: "1px solid #eee",
  margin: "-1px 0 0 -1px",
};
const DEFAULT_SETTINGS = { unit: 'kg', bodyweight: '', height: '', age: '', goal: 'muscle' };

// Mirrors the bounds enforced by UserSettingsCreate on the backend so the
// user gets a readable message instead of a generic 422.
const NUMERIC_FIELDS = [
  { key: 'bodyweight', label: 'Bodyweight', max: 500 },
  { key: 'height', label: 'Height', max: 300 },
  { key: 'age', label: 'Age', max: 120, integer: true },
];

function validateSettings(values) {
  for (const { key, label, max, integer } of NUMERIC_FIELDS) {
    const raw = values?.[key];
    if (raw === '' || raw == null) continue;
    const num = Number(raw);
    if (!Number.isFinite(num) || num <= 0) return `${label} must be a positive number.`;
    if (num > max) return `${label} must be at most ${max}.`;
    if (integer && !Number.isInteger(num)) return `${label} must be a whole number.`;
  }
  return '';
}

// `workoutHistory` must belong to the profile being displayed.
export default function Profile({
  username,
  userId,
  workoutHistory = EMPTY_HISTORY,
  showSocialActions = false,
  viewUserId = null,
  onLogWorkout,
  onSetupNutrition,
}) {
  // Last values loaded from / saved to the server; drives the volume unit.
  const [savedSettings, setSavedSettings] = useState(DEFAULT_SETTINGS);
  // Unsaved edits inside the Edit profile modal.
  const [draft, setDraft] = useState(DEFAULT_SETTINGS);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [socialCounts, setSocialCounts] = useState({ follower_count: 0, following_count: 0, workout_count: 0 });
  const [socialBusy, setSocialBusy] = useState(false);
  const [socialMessage, setSocialMessage] = useState("");
  const [isFollowing, setIsFollowing] = useState(false);
  const targetUserId = viewUserId ?? userId;
  const isOwnProfile = !viewUserId || viewUserId === userId;
  // Fetch settings from API on component mount
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    const loadProfileData = async () => {
      setLoading(true);

      if (isOwnProfile) {
        try {
          const settingsData = await client.get('/users/me/settings');
          if (!cancelled) {
            const loaded = {
              unit: settingsData?.weight_unit || 'kg',
              height: settingsData?.height_cm != null ? String(settingsData.height_cm) : '',
              bodyweight: settingsData?.bodyweight_kg != null ? String(settingsData.bodyweight_kg) : '',
              age: settingsData?.age != null ? String(settingsData.age) : '',
              goal: settingsData?.fitness_goal || 'muscle',
            };
            setSavedSettings(loaded);
            setDraft(loaded);
            setSettingsLoaded(true);
          }
        } catch (err) {
          if (!cancelled) setLoadError(err?.message || 'Failed to load settings');
        }
      }

      try {
        const profileData = await client.get(`/users/${targetUserId}/profile/public`);
        if (cancelled) return;
        setSocialCounts({
          follower_count: profileData?.follower_count || 0,
          following_count: profileData?.following_count || 0,
          workout_count: profileData?.workout_count || 0,
        });
        setIsFollowing(Boolean(profileData?.is_following));
      } catch {
        /* public stats are non-critical */
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadProfileData();
    return () => { cancelled = true; };
  }, [userId, targetUserId, isOwnProfile]);

  const save = async () => {
    const invalid = validateSettings(draft);
    if (invalid) {
      setError(invalid);
      return;
    }
    try {
      setError("");
      setSaving(true);
      await client.put('/users/me/settings', {
        weight_unit: draft.unit,
        height_cm: draft.height ? parseFloat(draft.height) : null,
        bodyweight_kg: draft.bodyweight ? parseFloat(draft.bodyweight) : null,
        age: draft.age ? parseInt(draft.age) : null,
        fitness_goal: draft.goal,
      });
      setSavedSettings(draft);
      setIsEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const openEdit = () => {
    setDraft(savedSettings);
    setIsEditing(true);
  };

  // Discard unsaved edits by re-syncing from the last loaded/saved values.
  const cancelEdit = () => {
    setDraft(savedSettings);
    setError("");
    setIsEditing(false);
  };

  const updateDraft = (field, value) => setDraft((prev) => ({ ...prev, [field]: value }));
 
  const unit = savedSettings.unit;
  const history = Array.isArray(workoutHistory) ? workoutHistory : EMPTY_HISTORY;
  const streak = useMemo(() => calculateStreak(history), [history]);
  const thisMonth = useMemo(() => countWorkoutsThisMonth(history), [history]);
  const lastFourWeeks = useMemo(() => countWorkoutsInLastDays(history, 28), [history]);
  const weeklyVolume = useMemo(() => calculateWeeklyVolume(history, 12), [history]);
  const recentExercises = useMemo(() => getRecentExercises(history, 5), [history]);
  const todaysWorkouts = useMemo(() => history.filter((w) => isToday(w?.date)), [history]);

  const handleSocialToggle = async () => {
    if (!userId || isOwnProfile) {
      setSocialMessage('You can’t follow yourself here.');
      return;
    }

    const wasFollowing = isFollowing;
    setSocialBusy(true);
    setSocialMessage('');

    setIsFollowing(!wasFollowing);
    setSocialCounts((prev) => ({
      ...prev,
      follower_count: Math.max(0, prev.follower_count + (wasFollowing ? -1 : 1)),
    }));

    try {
      const path = `/users/${userId}/follow/${targetUserId}`;
      if (wasFollowing) {
        await client.delete(path);
      } else {
        await client.post(path);
      }
      setSocialMessage(wasFollowing ? 'Unfollowed successfully' : 'Following now');
    } catch (err) {
      setIsFollowing(wasFollowing);
      setSocialCounts((prev) => ({
        ...prev,
        follower_count: Math.max(0, prev.follower_count + (wasFollowing ? 1 : -1)),
      }));
      setSocialMessage(err.message || 'Unable to update follow state');
    } finally {
      setSocialBusy(false);
    }
  }; 

  return (
    <div style={{ flex: 1, padding: "32px", overflowY: "auto", background: "#fafafa" }}>
      <div style={{ maxWidth: "1100px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "16px" }}>
        {/* Identity + today share one card. Each panel draws its divider on its top/left edge
            and is pulled 1px out, so the card's overflow clips whichever divider sits on the
            outer edge: vertical rule side by side, horizontal rule once stacked. */}
        <div style={{ ...card, padding: 0, overflow: "hidden", display: "flex", flexWrap: "wrap" }}>
          <IdentityCard
            embedded
            style={{ ...panel, flex: "1 1 260px" }}
            username={username}
            isOwnProfile={isOwnProfile}
            showSocialActions={showSocialActions}
            socialCounts={socialCounts}
            streak={streak}
            isFollowing={isFollowing}
            socialBusy={socialBusy}
            socialMessage={socialMessage}
            loading={loading}
            savedNotice={saved}
            onToggleFollow={handleSocialToggle}
            onEditProfile={openEdit}
          />

          {/* Calories and macros are private, so visitors never see this panel. */}
          {isOwnProfile ? (
            <TodayCard
              embedded
              style={{ ...panel, flex: "2 1 360px" }}
              todaysWorkouts={todaysWorkouts}
              recentExercises={recentExercises}
              unit={unit}
              onLogWorkout={onLogWorkout}
              onSetupNutrition={onSetupNutrition}
            />
          ) : null}
        </div>

        {/* Stats band */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "16px" }}>
          <VolumeChartCard weeklyVolume={weeklyVolume} unit={unit} style={{ flex: "2 1 420px" }} />
          <div style={{ flex: "1 1 220px", display: "flex", flexDirection: "column", gap: "16px", minWidth: 0 }}>
            <WorkoutsCard thisMonth={thisMonth} style={{ flex: 1 }} />
            <RecentWorkoutsCard count={lastFourWeeks} />
          </div>
        </div>
      </div>

      {isOwnProfile && isEditing ? (
        <EditProfileModal
          values={draft}
          onChange={updateDraft}
          onSave={save}
          onCancel={cancelEdit}
          saving={saving}
          canSave={settingsLoaded}
          error={error || loadError || (settingsLoaded ? "" : "Loading your settings…")}
        />
      ) : null}
    </div>
  );
}