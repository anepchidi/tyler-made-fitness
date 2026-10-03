// Shared workout statistics. All day-level comparisons use the user's local
// calendar date, never toISOString() (UTC), so workouts logged near midnight
// land on the day the user actually trained.

const DAY_MS = 24 * 60 * 60 * 1000;
const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

// Parses a workout date into a local Date at midnight. Plain "YYYY-MM-DD"
// strings are read as local dates; `new Date("YYYY-MM-DD")` would treat
// them as UTC midnight and shift them a day back west of Greenwich.
export function parseLocalDate(value) {
  if (!value) return null;
  if (typeof value === 'string') {
    const match = DATE_ONLY.exec(value);
    if (match) {
      return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    }
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
}

export function toLocalDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function startOfToday(now = new Date()) {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

// Whole calendar days between two local midnights. Rounding absorbs the
// 23h/25h days around DST changes.
function daysBetween(later, earlier) {
  return Math.round((later - earlier) / DAY_MS);
}

export function isToday(value, now = new Date()) {
  const day = parseLocalDate(value);
  return Boolean(day) && toLocalDateKey(day) === toLocalDateKey(now);
}

// Consecutive days with at least one workout, ending today. A streak is
// still alive if the last workout was yesterday (today isn't over yet).
export function calculateStreak(workoutHistory = [], now = new Date()) {
  const days = new Set();
  for (const workout of workoutHistory) {
    const day = parseLocalDate(workout?.date);
    if (day) days.add(toLocalDateKey(day));
  }
  if (days.size === 0) return 0;

  let cursor = startOfToday(now);
  if (!days.has(toLocalDateKey(cursor))) {
    cursor = addDays(cursor, -1);
    if (!days.has(toLocalDateKey(cursor))) return 0;
  }

  let streak = 0;
  while (days.has(toLocalDateKey(cursor))) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

// Normalizes an exercise to a list of {weight, reps}, supporting both the
// nested `sets: [{weight, reps}]` shape and legacy flat `weight`/`reps`.
export function getExerciseSets(exercise) {
  if (Array.isArray(exercise?.sets) && exercise.sets.length > 0) {
    return exercise.sets.map((set) => ({
      weight: Number(set?.weight) || 0,
      reps: Number(set?.reps) || 0,
    }));
  }
  if (exercise?.weight != null || exercise?.reps != null) {
    return [{ weight: Number(exercise.weight) || 0, reps: Number(exercise.reps) || 0 }];
  }
  return [];
}

export function calculateExerciseVolume(exercise) {
  return getExerciseSets(exercise).reduce((sum, set) => sum + set.weight * set.reps, 0);
}

export function calculateWorkoutVolume(workout) {
  return (workout?.exercises || []).reduce((sum, e) => sum + calculateExerciseVolume(e), 0);
}

// Sum of weight × reps across every set of every workout.
export function calculateTotalVolume(workoutHistory = []) {
  return workoutHistory.reduce((sum, w) => sum + calculateWorkoutVolume(w), 0);
}

// Rolling 7-day volume windows ending today, oldest first. The last entry
// covers today and the six days before it; each earlier entry is the 7 days
// before that.
export function calculateWeeklyVolume(workoutHistory = [], weeks = 12, now = new Date()) {
  const today = startOfToday(now);
  const buckets = Array.from({ length: weeks }, (_, i) => {
    const weeksAgo = weeks - 1 - i;
    const end = addDays(today, -7 * weeksAgo);
    return { start: addDays(end, -6), end, volume: 0, workouts: 0 };
  });

  for (const workout of workoutHistory) {
    const day = parseLocalDate(workout?.date);
    if (!day) continue;
    const offset = daysBetween(today, day);
    if (offset < 0) continue;
    const weeksAgo = Math.floor(offset / 7);
    if (weeksAgo >= weeks) continue;
    const bucket = buckets[weeks - 1 - weeksAgo];
    bucket.volume += calculateWorkoutVolume(workout);
    bucket.workouts += 1;
  }
  return buckets;
}

// Workouts dated within the last `days` days, today included.
export function countWorkoutsInLastDays(workoutHistory = [], days = 28, now = new Date()) {
  const today = startOfToday(now);
  return workoutHistory.filter((w) => {
    const day = parseLocalDate(w?.date);
    if (!day) return false;
    const offset = daysBetween(today, day);
    return offset >= 0 && offset < days;
  }).length;
}

export function countWorkoutsThisMonth(workoutHistory = [], now = new Date()) {
  return workoutHistory.filter((w) => {
    const day = parseLocalDate(w?.date);
    return Boolean(day) && day.getMonth() === now.getMonth() && day.getFullYear() === now.getFullYear();
  }).length;
}

function byDateDesc(a, b) {
  const da = parseLocalDate(a?.date)?.getTime() ?? 0;
  const db = parseLocalDate(b?.date)?.getTime() ?? 0;
  if (db !== da) return db - da;
  return (Number(b?.id) || 0) - (Number(a?.id) || 0);
}

// Most recent exercises across workouts, newest first, each tagged with its
// workout's date.
export function getRecentExercises(workoutHistory = [], limit = 5) {
  return [...workoutHistory]
    .sort(byDateDesc)
    .flatMap((w) => (w?.exercises || []).map((e) => ({ ...e, date: w?.date })))
    .slice(0, limit);
}

export function formatNumber(value, maximumFractionDigits = 0) {
  return (Number(value) || 0).toLocaleString(undefined, { maximumFractionDigits });
}

// "3 sets · top 80 kg × 5" for nested sets, "60 kg × 8 reps" for a single
// (or legacy flat) set.
export function formatSetSummary(exercise, unit = 'kg') {
  const sets = getExerciseSets(exercise);
  if (sets.length === 0) return 'No sets logged';
  if (sets.length === 1) {
    return `${formatNumber(sets[0].weight, 1)} ${unit} × ${sets[0].reps} reps`;
  }
  const top = sets.reduce((best, s) =>
    s.weight > best.weight || (s.weight === best.weight && s.reps > best.reps) ? s : best,
  );
  return `${sets.length} sets · top ${formatNumber(top.weight, 1)} ${unit} × ${top.reps}`;
}

export function formatShortDate(value) {
  const day = parseLocalDate(value);
  return day ? day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
}
