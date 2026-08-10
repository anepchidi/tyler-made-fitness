import { useEffect, useMemo, useState } from 'react';
import { MessageCircle, Send, Users, Dumbbell, ChevronDown, ChevronUp } from 'lucide-react';
import client from '../api/client';

export default function SocialFeed() {
  const [activeTab, setActiveTab] = useState('feed');
  const [feed, setFeed] = useState([]);
  const [commentsByWorkout, setCommentsByWorkout] = useState({});
  const [expandedWorkouts, setExpandedWorkouts] = useState({});
  const [drafts, setDrafts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadFeed();
  }, []);

  const loadFeed = async () => {
    try {
      setLoading(true);
      const data = await client.get('/workouts/feed/public');
      setFeed(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Unable to load public feed');
    } finally {
      setLoading(false);
    }
  };

  const loadComments = async (workoutId) => {
    try {
      const data = await client.get(`/workouts/${workoutId}/comments`);
      setCommentsByWorkout((prev) => ({ ...prev, [workoutId]: data }));
    } catch (err) {
      console.error(err);
    }
  };

  const toggleExpanded = async (workoutId) => {
    const expanded = !!expandedWorkouts[workoutId];
    setExpandedWorkouts((prev) => ({ ...prev, [workoutId]: !expanded }));
    if (!expanded && !commentsByWorkout[workoutId]) {
      await loadComments(workoutId);
    }
  };

  const submitComment = async (workoutId) => {
    const content = (drafts[workoutId] || '').trim();
    if (!content) return;

    try {
      const comment = await client.post(`/workouts/${workoutId}/comments`, { content });
      setCommentsByWorkout((prev) => ({
        ...prev,
        [workoutId]: [...(prev[workoutId] || []), comment],
      }));
      setDrafts((prev) => ({ ...prev, [workoutId]: '' }));
    } catch (err) {
      setError(err.message || 'Unable to post comment');
    }
  };

  const tabStyle = (id) => ({
    padding: '8px 12px',
    borderRadius: '999px',
    border: '1px solid #e5e5e5',
    background: activeTab === id ? '#ecfdf5' : 'white',
    color: activeTab === id ? '#059669' : '#666',
    fontWeight: 600,
    cursor: 'pointer',
  });

  const cards = useMemo(() => feed, [feed]);

  return (
    <div style={{ flex: 1, padding: '32px', overflowY: 'auto', background: '#fafafa' }}>
      <div style={{ maxWidth: '920px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: '#111' }}>Social feed</h2>
            <p style={{ margin: '4px 0 0', color: '#666' }}>See public workouts from the community and join the conversation.</p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button style={tabStyle('feed')} onClick={() => setActiveTab('feed')}>Feed</button>
            <button style={tabStyle('discover')} onClick={() => setActiveTab('discover')}>Discover</button>
          </div>
        </div>

        {error ? <div style={{ marginBottom: '16px', color: '#b91c1c' }}>{error}</div> : null}

        {activeTab === 'discover' ? (
          <div style={{ background: 'white', border: '1px solid #e5e5e5', borderRadius: '16px', padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <Users size={20} color="#10b981" />
              <h3 style={{ margin: 0, fontSize: '18px' }}>Discover friends and public routines</h3>
            </div>
            <p style={{ color: '#666', margin: 0 }}>Use the public feed to follow workouts that inspire your next session, then leave a comment to share your thoughts.</p>
          </div>
        ) : (
          <div>
            {loading ? (
              <div style={{ background: 'white', border: '1px solid #e5e5e5', borderRadius: '16px', padding: '24px', color: '#666' }}>Loading public workouts…</div>
            ) : cards.length === 0 ? (
              <div style={{ background: 'white', border: '1px solid #e5e5e5', borderRadius: '16px', padding: '24px', color: '#666' }}>No public workouts yet.</div>
            ) : (
              cards.map((workout) => {
                const expanded = !!expandedWorkouts[workout.id];
                const comments = commentsByWorkout[workout.id] || [];
                return (
                  <div key={workout.id} style={{ background: 'white', border: '1px solid #e5e5e5', borderRadius: '16px', padding: '20px', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                          <Users size={16} color="#10b981" />
                          <strong>{workout.author_username}</strong>
                        </div>
                        <div style={{ fontSize: '13px', color: '#666' }}>
                          {new Date(workout.date).toLocaleDateString()} • {workout.notes || 'Shared workout'}
                        </div>
                      </div>
                      <div style={{ fontSize: '12px', color: '#10b981', fontWeight: 600, background: '#ecfdf5', padding: '6px 10px', borderRadius: '999px' }}>
                        {workout.visibility}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', color: '#666' }}>
                      <Dumbbell size={16} />
                      <span>{workout.exercises?.length || 0} exercises • {workout.comments_count || 0} comments</span>
                    </div>

                    <button onClick={() => toggleExpanded(workout.id)} style={{ border: 'none', background: 'transparent', color: '#059669', padding: 0, cursor: 'pointer', fontWeight: 600 }}>
                      {expanded ? 'Hide details' : 'Show details'}
                      {expanded ? <ChevronUp size={16} style={{ marginLeft: '4px' }} /> : <ChevronDown size={16} style={{ marginLeft: '4px' }} />}
                    </button>

                    {expanded ? (
                      <div style={{ marginTop: '14px' }}>
                        {workout.exercises?.map((exercise) => (
                          <div key={exercise.id} style={{ padding: '12px', background: '#f9fafb', borderRadius: '12px', marginBottom: '8px' }}>
                            <div style={{ fontWeight: 700, marginBottom: '6px' }}>{exercise.name}</div>
                            <div style={{ fontSize: '13px', color: '#666', marginBottom: '8px' }}>{exercise.muscle_group || 'General'}</div>
                            {exercise.sets?.length ? (
                              <ul style={{ margin: 0, paddingLeft: '18px', color: '#444' }}>
                                {exercise.sets.map((setItem) => (
                                  <li key={setItem.id}>Set {setItem.set_number}: {setItem.weight} kg × {setItem.reps} reps</li>
                                ))}
                              </ul>
                            ) : <div style={{ color: '#777', fontSize: '13px' }}>No sets logged.</div>}
                          </div>
                        ))}

                        <div style={{ marginTop: '16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                            <MessageCircle size={16} color="#10b981" />
                            <strong>Comments</strong>
                          </div>
                          <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                            <input
                              value={drafts[workout.id] || ''}
                              onChange={(event) => setDrafts((prev) => ({ ...prev, [workout.id]: event.target.value }))}
                              placeholder="Write a comment..."
                              style={{ flex: 1, padding: '10px 12px', borderRadius: '10px', border: '1px solid #e5e5e5' }}
                            />
                            <button onClick={() => submitComment(workout.id)} style={{ background: '#10b981', color: 'white', border: 'none', borderRadius: '10px', padding: '0 12px', cursor: 'pointer' }}>
                              <Send size={16} />
                            </button>
                          </div>
                          {comments.length ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              {comments.map((comment) => (
                                <div key={comment.id} style={{ background: '#f8faf8', borderRadius: '10px', padding: '10px 12px' }}>
                                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#111' }}>{comment.author_username}</div>
                                  <div style={{ fontSize: '14px', color: '#444', marginTop: '4px' }}>{comment.content}</div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div style={{ color: '#666', fontSize: '14px' }}>No comments yet. Start the conversation.</div>
                          )}
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
