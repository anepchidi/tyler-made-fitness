import { useEffect, useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import {
  Dumbbell,
  Search,
  Plus,
  ImageIcon,
  ChevronDown,
} from 'lucide-react';
import client, { API } from '../api/client';

const MUSCLE_GROUPS = [
  'All Muscles',
  'Chest',
  'Back',
  'Legs',
  'Shoulders',
  'Arms',
  'Core',
  'Glutes',
  'Calves',
  'Full Body',
];

const normalizeGroup = (value) =>
  (value || '')
    .toString()
    .toLowerCase()
    .replace(/[_\s]+/g, ' ')
    .trim();

const matchesMuscle = (filter, group) => {
  if (!filter || filter === 'All Muscles') return true;
  if (!group) return false;
  const normalizedFilter = normalizeGroup(filter);
  const normalizedGroup = normalizeGroup(group);
  return normalizedGroup.includes(normalizedFilter);
};

const getImageSrc = (exercise) => {
  if (!exercise?.image_url) {
    return null;
  }

  if (exercise.image_url.startsWith('http')) {
    return exercise.image_url;
  }

  return `${API}${exercise.image_url}`;
};

const parseApiDate = (value) => {
  if (!value) return null;
  const [y, m, d] = String(value).split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
};

const formatDay = (value) => {
  const parsed = parseApiDate(value);
  return parsed
    ? parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : '—';
};

const toMessage = (err, fallback) =>
  err instanceof ApiError ? err.message : err?.message || fallback;

export default function ExerciseAnalytics({ exercises = [], setExercises, isLoadingExercises }) {
  const [stats, setStats] = useState(null);
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [strengthData, setStrengthData] = useState([]);
  const [volumeData, setVolumeData] = useState([]);
  const [chartType, setChartType] = useState('weight');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMuscle, setSelectedMuscle] = useState('All Muscles');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newExerciseName, setNewExerciseName] = useState('');
  const [newExerciseMuscle, setNewExerciseMuscle] = useState('Chest');
  const [imageFile, setImageFile] = useState(null);
  const [loadingProgress, setLoadingProgress] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [statsError, setStatsError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const loadStats = async () => {
      try {
        const payload = await client.get(`/users/me/stats`);
        if (cancelled) return;
        setStats(payload || null);
        setStatsError('');
      } catch (err) {
        if (cancelled) return;
        setStats(null);
        setStatsError(toMessage(err, 'Unable to load analytics stats'));
      }
    };

    loadStats();
    return () => {
      cancelled = true;
    };
    }, []);

  useEffect(() => {
    if (!selectedExercise?.name) {
      setStrengthData([]);
      setVolumeData([]);
      setError('');
      return undefined;
    }

    let cancelled = false;
    const exerciseName = selectedExercise.name;

    const loadExerciseDetails = async () => {
      setLoadingProgress(true);
      setError('');

      const qs = new URLSearchParams({ exercise: exerciseName });
      const volumeQs = new URLSearchParams({
        exercise: exerciseName,
        granularity: 'week',
        cumulative: 'false',
      });

      const [strengthRes, volumeRes] = await Promise.allSettled([
        client.get(`/users/me/progress/strength?${qs}`),
        client.get(`/users/me/progress/volume?${volumeQs}`),
      ]);

      if (cancelled) return;

      const failures = [];

      if (strengthRes.status === 'fulfilled') {
        setStrengthData(
          Array.isArray(strengthRes.value?.data) ? strengthRes.value.data : [],
        );
      } else {
        setStrengthData([]);
        failures.push(toMessage(strengthRes.reason, 'strength history'));
      }

      if (volumeRes.status === 'fulfilled') {
        setVolumeData(
          Array.isArray(volumeRes.value?.data) ? volumeRes.value.data : [],
        );
      } else {
        setVolumeData([]);
        failures.push(toMessage(volumeRes.reason, 'volume history'));
      }

    // One panel failing must not blank the other.
      setError(failures.length ? failures.join(' · ') : '');
      setLoadingProgress(false);
    };

    loadExerciseDetails();
    return () => {
      cancelled = true;
    };
  }, [selectedExercise?.name]);

  const filteredExercises = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return exercises.filter((exercise) => {
      const matchesText = !query || exercise.name?.toLowerCase().includes(query);
      const matchesGroup = matchesMuscle(selectedMuscle, exercise.muscle_group);
      return matchesText && matchesGroup;
    });
  }, [exercises, searchQuery, selectedMuscle]);

  const strengthChartData = useMemo(
    () =>
      (strengthData || [])
        .filter((point) => point?.date)
        .map((point) => ({
          date: formatDay(point.date),
          weight: Number(point.weight) || 0,
          volume: Number(point.volume) || 0,
        })),
    [strengthData],
  );

  const volumeChartData = useMemo(
    () =>
      (volumeData || [])
        .filter((point) => point?.period_start)
        .map((point) => ({
          date: formatDay(point.period_start),
          volume: Number(point.volume) || 0,
          sets: Number(point.sets) || 0,
          reps: Number(point.reps) || 0,
        })),
  [ volumeData],
  );

  const activeChartData =
    chartType === 'weight' ? strengthChartData : volumeChartData;

  const totalVolume = useMemo(
    () => volumeChartData.reduce((sum, point) => sum + point.volume, 0),
    [volumeChartData],
  );

  const currentPR = stats?.personal_records?.find(
    (record) => record.exercise === selectedExercise?.name,
  );

  const improvement = useMemo(() => {
    if (strengthChartData.length < 2) return null;
    const first = strengthChartData[0].weight;
    const last = strengthChartData[strengthChartData.length - 1].weight;
    if (!Number.isFinite(first) || first <= 0) return null;
    return (((last - first) / first) * 100).toFixed(1);
  }, [strengthChartData]);

  const handleUploadExercise = async (event) => {
    event.preventDefault();
    setError('');

    if (!newExerciseName.trim()) {
      setError('Please enter a movement name.');
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('name', newExerciseName.trim());
      formData.append('muscle_group', newExerciseMuscle);
      if (imageFile) {
        formData.append('image', imageFile);
      }

      const created = await client.post('/exercises/library/upload', formData);
      setExercises((prev) => [...prev, created]);
      setSelectedExercise(created);
      setNewExerciseName('');
      setNewExerciseMuscle('Chest');
      setImageFile(null);
      setShowAddForm(false);
    } catch (err) {
      setError(toMessage(err, 'Unable to save custom exercise'));
    } finally {
      setUploading(false);
    }
  };

  const styles = {
    page: {
      flex: 1,
      padding: '24px 32px',
      overflowY: 'auto',
      background: '#fafafa',
      minHeight: '100vh',
      boxSizing: 'border-box',
    },
    pageHeader: {
      marginBottom: '20px',
    },
    pageTitle: {
      margin: 0,
      fontSize: '28px',
      fontWeight: 800,
      color: '#111827',
    },
    shell: {
      maxWidth: '1600px',
      margin: '0 auto',
      display: 'grid',
      gridTemplateColumns: 'minmax(0, 1fr) 340px',
      gap: '24px',
      alignItems: 'start',
    },
    leftPanel: {
      display: 'flex',
      flexDirection: 'column',
      gap: '24px',
      minWidth: 0,
    },
    emptyCard: {
      background: 'white',
      borderRadius: '16px',
      border: '1px solid #e5e7eb',
      height: '380px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      padding: '24px',
      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.02)',
    },
    emptyIconContainer: {
      color: '#9ca3af',
      marginBottom: '16px',
    },
    emptyTitle: {
      fontSize: '20px',
      fontWeight: 800,
      color: '#111827',
      margin: '0 0 8px 0',
    },
    emptySubtitle: {
      fontSize: '14px',
      color: '#6b7280',
      margin: 0,
    },
    card: {
      background: 'white',
      borderRadius: '16px',
      border: '1px solid #e5e5e5',
      padding: '24px',
      boxShadow: '0 8px 24px rgba(15, 23, 42, 0.04)',
    },
    header: {
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: '18px',
    },
    titleGroup: {
      flex: 1,
      minWidth: 0,
    },
    title: {
      margin: 0,
      fontSize: '26px',
      fontWeight: 800,
      color: '#111827',
    },
    pill: {
      display: 'inline-flex',
      alignItems: 'center',
      padding: '6px 12px',
      borderRadius: '999px',
      background: '#ecfdf5',
      color: '#065f46',
      fontWeight: 700,
      fontSize: '13px',
      marginTop: '8px',
    },
    imageFrame: {
      width: '90px',
      height: '90px',
      borderRadius: '14px',
      overflow: 'hidden',
      border: '1px solid #e5e5e5',
      background: '#f3f4f6',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    image: {
      width: '100%',
      height: '100%',
      objectFit: 'cover',
    },
    statGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
      gap: '16px',
      marginTop: '24px',
    },
    statCard: {
      background: '#f8fffb',
      borderRadius: '14px',
      border: '1px solid #d9f7e4',
      padding: '18px',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
    },
    statLabel: {
      fontSize: '12px',
      color: '#4b5563',
      fontWeight: 600,
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
    },
    statValue: {
      fontSize: '24px',
      fontWeight: 800,
      color: '#111827',
    },
    chartCard: {
      background: 'white',
      borderRadius: '16px',
      border: '1px solid #e5e5e5',
      padding: '24px',
      display: 'flex',
      flexDirection: 'column',
      gap: '20px',
      boxShadow: '0 8px 24px rgba(15, 23, 42, 0.04)',
    },
    chartHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    chartTitle: {
      margin: 0,
      fontSize: '18px',
      fontWeight: 700,
      color: '#111827',
    },
    chartActionGroup: {
      display: 'flex',
      gap: '8px',
    },
    chartButton: {
      padding: '8px 14px',
      borderRadius: '10px',
      border: '1px solid #e5e7eb',
      background: 'white',
      color: '#374151',
      cursor: 'pointer',
      fontSize: '13px',
      fontWeight: 600,
    },
    chartButtonActive: {
      background: '#10b981',
      color: 'white',
      borderColor: '#10b981',
    },
    rightPanel: {
      background: 'white',
      borderRadius: '16px',
      border: '1px solid #e5e5e5',
      padding: '20px',
      boxShadow: '0 8px 24px rgba(15, 23, 42, 0.04)',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      minHeight: 'calc(100vh - 96px)',
      position: 'sticky',
      top: '24px',
    },
    panelHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    panelTitle: {
      margin: 0,
      fontSize: '18px',
      fontWeight: 800,
      color: '#111827',
    },
    customBtn: {
      background: 'none',
      border: 'none',
      color: '#10b981',
      cursor: 'pointer',
      fontWeight: 700,
      fontSize: '13px',
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      padding: 0,
    },
    controlStack: {
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
    },
    selectWrapper: {
      position: 'relative',
      width: '100%',
    },
    select: {
      width: '100%',
      padding: '10px 14px',
      borderRadius: '10px',
      border: '1px solid #e5e7eb',
      background: '#f8fafc',
      color: '#111827',
      fontSize: '14px',
      outline: 'none',
      appearance: 'none',
      cursor: 'pointer',
      fontWeight: 500,
    },
    selectIcon: {
      position: 'absolute',
      right: '12px',
      top: '50%',
      transform: 'translateY(-50%)',
      color: '#6b7280',
      pointerEvents: 'none',
    },
    searchWrapper: {
      position: 'relative',
      width: '100%',
    },
    searchInput: {
      width: '100%',
      padding: '10px 14px 10px 38px',
      borderRadius: '10px',
      border: '1px solid #e5e7eb',
      background: '#f8fafc',
      color: '#111827',
      fontSize: '14px',
      outline: 'none',
      boxSizing: 'border-box',
    },
    searchIcon: {
      position: 'absolute',
      left: '12px',
      top: '50%',
      transform: 'translateY(-50%)',
      color: '#9ca3af',
    },
    popularHeader: {
      fontSize: '12px',
      fontWeight: 700,
      color: '#6b7280',
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      marginTop: '4px',
    },
    listContainer: {
      flex: 1,
      overflowY: 'auto',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      paddingRight: '4px',
    },
    exerciseCard: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '10px 12px',
      background: 'white',
      borderRadius: '12px',
      border: '1px solid #f0f0f0',
      cursor: 'pointer',
      textAlign: 'left',
      width: '100%',
      transition: 'all 0.15s ease',
    },
    exerciseCardActive: {
      background: '#ecfdf5',
      borderColor: '#a7f3d0',
    },
    exerciseAvatar: {
      width: '42px',
      height: '42px',
      borderRadius: '50%',
      background: '#f3f4f6',
      border: '1px solid #e5e7eb',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      flexShrink: 0,
    },
    exerciseName: {
      margin: 0,
      fontSize: '14px',
      fontWeight: 700,
      color: '#111827',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    },
    exerciseMeta: {
      margin: '2px 0 0',
      color: '#6b7280',
      fontSize: '12px',
    },
    input: {
      width: '100%',
      padding: '10px 12px',
      borderRadius: '10px',
      border: '1px solid #e5e7eb',
      background: '#f8fafc',
      color: '#111827',
      fontSize: '13px',
      outline: 'none',
      boxSizing: 'border-box',
    },
    actionButton: {
      border: 'none',
      borderRadius: '10px',
      background: '#10b981',
      color: 'white',
      padding: '10px 14px',
      cursor: 'pointer',
      fontWeight: 700,
      fontSize: '13px',
    },
    error: {
      color: '#b91c1c',
      background: '#fef2f2',
      padding: '12px 16px',
      borderRadius: '12px',
      border: '1px solid #fecaca',
      fontSize: '13px',
    },
    placeholder: {
      borderRadius: '12px',
      border: '1px dashed #d1d5db',
      padding: '24px',
      textAlign: 'center',
      color: '#6b7280',
      fontSize: '14px',
    },
  };

  return (
    <div style={styles.page}>
      <div style={styles.pageHeader}>
        <h1 style={styles.pageTitle}>Exercise</h1>
      </div>

      <div style={styles.shell}>
        <section style={styles.leftPanel}>
          {statsError && <div style={styles.error}>{statsError}</div>}
          {error && <div style={styles.error}>{error}</div>}

          {!selectedExercise ? (
            <div style={styles.emptyCard}>
              <div style={styles.emptyIconContainer}>
                <Dumbbell size={40} strokeWidth={1.5} />
              </div>
              <h2 style={styles.emptyTitle}>Select Exercise</h2>
              <p style={styles.emptySubtitle}>
                Click on an exercise to see statistics about it.
              </p>
            </div>
          ) : (
            <>
              <div style={styles.card}>
                <div style={styles.header}>
                  <div style={styles.titleGroup}>
                    <h2 style={styles.title}>{selectedExercise.name}</h2>
                    <span style={styles.pill}>
                      {selectedExercise.muscle_group || 'General'}
                    </span>
                  </div>
                  <div style={styles.imageFrame}>
                    {getImageSrc(selectedExercise) ? (
                      <img
                        alt={selectedExercise.name}
                        src={getImageSrc(selectedExercise)}
                        style={styles.image}
                      />
                    ) : (
                      <ImageIcon size={32} color="#9ca3af" />
                    )}
                  </div>
                </div>

                <div style={styles.statGrid}>
                  <div style={styles.statCard}>
                    <span style={styles.statLabel}>Personal Record</span>
                    <span style={styles.statValue}>
                      {currentPR ? `${currentPR.max_weight} kg` : '—'}
                    </span>
                  </div>
                  <div style={styles.statCard}>
                    <span style={styles.statLabel}>Max Volume</span>
                    <span style={styles.statValue}>
                      {currentPR ? `${currentPR.max_volume} kg` : '—'}
                    </span>
                  </div>
                  <div style={styles.statCard}>
                    <span style={styles.statLabel}>Logged Sessions</span>
                    <span style={styles.statValue}>{strengthChartData.length}</span>
                  </div>
                  <div style={styles.statCard}>
                    <span style={styles.statLabel}>Total Volume</span> 
                    <span style={styles.statValue}>
                        {volumeChartData.length ? `${Math.round(totalVolume)} kg` : '—'}
                    </span>
                  </div>
                  <div style={styles.statCard}>
                    <span style={styles.statLabel}>Improvement</span>
                    <span style={styles.statValue}>
                      {improvement === null
                        ? '—'
                        : `${Number(improvement) > 0 ? '+' : ''}${improvement}%`}
                    </span>
                  </div>
                </div>
              </div>

              <div style={styles.chartCard}>
                <div style={styles.chartHeader}>
                  <h3 style={styles.chartTitle}>
                    {chartType === 'weight'
                    ? 'Max Weight Trend'
                     : 'Weekly Volume'}
                  </h3>
                  <div style={styles.chartActionGroup}>
                    {[
                      { id: 'weight', label: 'Max Weight' },
                      { id: 'volume', label: 'Total Volume' },
                    ].map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setChartType(option.id)}
                        style={{
                          ...styles.chartButton,
                          ...(chartType === option.id ? styles.chartButtonActive : {}),
                        }}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                {loadingProgress ? (
                  <div style={styles.placeholder}>Loading progress history...</div>
                ) : activeChartData.length === 0 ? (
                  <div style={styles.placeholder}>
                    {chartType === 'weight'
                      ? `No sets logged for ${selectedExercise.name} yet — log a workout to start tracking strength.`
                      : `No volume recorded for ${selectedExercise.name} yet — volume appears once you log weight and reps.`}
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={320}>
                    {chartType === 'weight' ? (
                      <LineChart
                        data={strengthChartData}
                        margin={{ top: 12, right: 16, left: -10, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                        <XAxis
                          dataKey="date"
                          tick={{ fill: '#6b7280', fontSize: 12 }}
                          stroke="#e5e7eb"
                        />
                        <YAxis
                          tick={{ fill: '#6b7280', fontSize: 12 }}
                          stroke="#e5e7eb"
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#ffffff',
                            borderRadius: '12px',
                            border: '1px solid #e5e7eb',
                            boxShadow: '0 10px 24px rgba(15, 23, 42, 0.08)',
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="weight"
                          stroke="#10b981"
                          strokeWidth={3}
                          dot={{ fill: '#10b981' }}
                        />
                      </LineChart>
                    ) : (
                      <BarChart
                        data={volumeChartData}
                        margin={{ top: 12, right: 16, left: -10, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                        <XAxis
                          dataKey="date"
                          tick={{ fill: '#6b7280', fontSize: 12 }}
                          stroke="#e5e7eb"
                        />
                        <YAxis
                          tick={{ fill: '#6b7280', fontSize: 12 }}
                          stroke="#e5e7eb"
                        />
                        <Tooltip
                          labelFormatter={(label) => `Week of ${label}`}
                          formatter={(value, name) =>
                            name === 'volume' ? [`${Math.round(value)} kg`, 'Volume'] : [value, name]
                          }
                          contentStyle={{
                            backgroundColor: '#ffffff',
                            borderRadius: '12px',
                            border: '1px solid #e5e7eb',
                            boxShadow: '0 10px 24px rgba(15, 23, 42, 0.08)',
                          }}
                        />
                        <Bar dataKey="volume" fill="#10b981" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    )}
                  </ResponsiveContainer>
                )}
              </div>
            </>
          )}
        </section>

        <aside style={styles.rightPanel}>
          <div style={styles.panelHeader}>
            <h2 style={styles.panelTitle}>Library</h2>
            <button
              type="button"
              onClick={() => setShowAddForm((prev) => !prev)}
              style={styles.customBtn}
            >
              <Plus size={16} />
              {showAddForm ? 'Cancel' : 'Custom Exercise'}
            </button>
          </div>

          {showAddForm && (
            <form onSubmit={handleUploadExercise} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <input
                style={styles.input}
                value={newExerciseName}
                onChange={(event) => setNewExerciseName(event.target.value)}
                placeholder="Exercise name"
              />
              <select
                style={styles.input}
                value={newExerciseMuscle}
                onChange={(event) => setNewExerciseMuscle(event.target.value)}
              >
                {MUSCLE_GROUPS.filter((group) => group !== 'All Muscles').map((group) => (
                  <option key={group} value={group}>{group}</option>
                ))}
              </select>
              <input
                type="file"
                accept="image/*"
                onChange={(event) => setImageFile(event.target.files?.[0] || null)}
                style={{ fontSize: '12px', color: '#6b7280' }}
              />
              <button
                type="submit"
                style={{
                  ...styles.actionButton,
                  opacity: uploading ? 0.6 : 1,
                  cursor: uploading ? 'not-allowed' : 'pointer',
                }}
                disabled={uploading}
              >
                {uploading ? 'Saving...' : 'Save Exercise'}
              </button>
            </form>
          )}

          <div style={styles.controlStack}>
            <div style={styles.selectWrapper}>
              <select style={styles.select} defaultValue="All Equipment">
                <option value="All Equipment">All Equipment</option>
              </select>
              <ChevronDown size={16} style={styles.selectIcon} />
            </div>

            <div style={styles.selectWrapper}>
              <select
                style={styles.select}
                value={selectedMuscle}
                onChange={(event) => setSelectedMuscle(event.target.value)}
              >
                {MUSCLE_GROUPS.map((group) => (
                  <option key={group} value={group}>{group}</option>
                ))}
              </select>
              <ChevronDown size={16} style={styles.selectIcon} />
            </div>

            <div style={styles.searchWrapper}>
              <Search size={16} style={styles.searchIcon} />
              <input
                style={styles.searchInput}
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search Exercises"
              />
            </div>
          </div>

          <div style={styles.popularHeader}>Popular Exercises</div>

          <div style={styles.listContainer}>
            {isLoadingExercises ? (
              Array.from({ length: 5 }).map((_, index) => (
                <div key={index} style={{ ...styles.placeholder, padding: '16px' }}>Loading...</div>
              ))
            ) : filteredExercises.length === 0 ? (
              <div style={styles.placeholder}>No exercises found.</div>
            ) : (
              filteredExercises.map((exercise) => {
                const active = selectedExercise?.name === exercise.name;
                const imgSrc = getImageSrc(exercise);
                return (
                  <button
                    type="button"
                    key={exercise.name}
                    onClick={() => setSelectedExercise(exercise)}
                    style={{
                      ...styles.exerciseCard,
                      ...(active ? styles.exerciseCardActive : {}),
                    }}
                  >
                    <div style={styles.exerciseAvatar}>
                      {imgSrc ? (
                        <img
                          src={imgSrc}
                          alt={exercise.name}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        <Dumbbell size={18} color="#10b981" />
                      )}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <p style={styles.exerciseName}>{exercise.name}</p>
                      <p style={styles.exerciseMeta}>{exercise.muscle_group || 'General'}</p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}