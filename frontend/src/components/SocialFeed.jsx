import { useEffect, useMemo, useState } from 'react';
import { MessageCircle, Send, Users, Dumbbell, ChevronDown, ChevronUp } from 'lucide-react';
import client from '../api/client';

const PAGE_SIZE = 10;

export default function SocialFeed({ currentUserId }) {
  const [activeTab, setActiveTab] = useState('feed');
  const [feed, setFeed] = useState([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const [discover, setDiscover] = useState([]);
  const [discoverLoading, setDiscoverLoading] = useState(false);
  const [discoverError, setDiscoverError] = useState('');
  const [followBusy, setFollowBusy] = useState({});

  const [commentsByWorkout, setCommentsByWorkout] = useState({});
  const [expandedWorkouts, setExpandedWorkouts] = useState({});
  const [drafts, setDrafts] = useState({});
  const [pendingComment, setPendingComment] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadFeed(0);
  }, []);

  useEffect(() => {
    if (activeTab === 'discover' && discover.length === 0 && !discoverLoading) {
      loadDiscover();
    }
  }, [activeTab]);

  const loadFeed = async (offset = 0) => {
    const append = offset > 0;
    try {
      append ? setLoadingMore(true) : setLoading(true);
      setError('');
      const data = await client.get(`/workouts/feed/public?limit=${PAGE_SIZE}&offset=${offset}`);
      const items = Array.isArray(data?.items) ? data.items : [];
      setFeed((prev) => (append ? [...prev, ...items] : items));
      setTotal(data?.total || 0);
      setHasMore(Boolean(data?.has_more));
    } catch (err) {
      setError(err.message || 'Unable to load public feed');
    } finally {
      append ? setLoadingMore(false) : setLoading(false);
    }
  };

  const loadDiscover = async () => {
    try {
      setDiscoverLoading(true);
      setDiscoverError('');
      const data = await client.get('/users/discover?limit=10');
      setDiscover(Array.isArray(data) ? data : []);
    } catch (err) {
      setDiscoverError(err.message || 'Unable to load suggestions');
    } finally {
      setDiscoverLoading(false);
    }
  };

  const toggleFollow = async (target) => {
    if (!currentUserId || followBusy[target.id]) return;
    setFollowBusy((prev) => ({ ...prev, [target.id]: true }));
    const wasFollowing = Boolean(target.is_following);

    try {
      const path = `/users/${currentUserId}/follow/${target.id}`;
      wasFollowing ? await client.delete(path) : await client.post(path);
      setDiscover((prev) =>
        prev.map((u) => (u.id === target.id ? { ...u, is_following: !wasFollowing } : u)),
      );
    } catch (err) {
      setDiscoverError(err.message || 'Unable to update follow state');
    } finally {
      setFollowBusy((prev) => ({ ...prev, [target.id]: false }));
    }
  };

  const loadComments = async (workoutId) => {
    try {
      const data = await client.get(`/workouts/${workoutId}/comments`);
      setCommentsByWorkout((prev) => ({ ...prev, [workoutId]: Array.isArray(data) ? data : [] }));
    } catch (err) {
      setCommentsByWorkout((prev) => ({ ...prev, [workoutId]: [] }));
      setError(err.message || 'Unable to load comments');
    }
  };

  const submitComment = async (workoutId) => {
    const content = (drafts[workoutId] || '').trim();
    if (!content || pendingComment[workoutId]) return;

    setPendingComment((prev) => ({ ...prev, [workoutId]: true }));
    try {
      const comment = await client.post(`/workouts/${workoutId}/comments`, { content });
      setCommentsByWorkout((prev) => ({
        ...prev,
        [workoutId]: [...(prev[workoutId] || []), comment],
      }));
      setFeed((prev) =>
        prev.map((w) =>
          w.id === workoutId ? { ...w, comments_count: (w.comments_count || 0) + 1 } : w,
        ),
      );
      setDrafts((prev) => ({ ...prev, [workoutId]: '' }));
      setError('');
    } catch (err) {
      setError(err.message || 'Unable to post comment');
    } finally {
      setPendingComment((prev) => ({ ...prev, [workoutId]: false }));
    }
  };

  const toggleExpanded = async (workoutId) => {
    const expanded = !!expandedWorkouts[workoutId];
    setExpandedWorkouts((prev) => ({ ...prev, [workoutId]: !expanded }));
    if (!expanded && !commentsByWorkout[workoutId]) {
      await loadComments(workoutId);
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <Users size={20} color="#10b981" />
              <h3 style={{ margin: 0, fontSize: '18px' }}>Discover lifters to follow</h3>
            </div>

            {discoverError ? (
              <div style={{ color: '#b91c1c', marginBottom: '12px' }}>
                {discoverError}{' '}
                <button onClick={loadDiscover} style={{ border: 'none', background: 'none', color: '#059669', cursor: 'pointer', fontWeight: 600 }}>
                  Retry
                </button>
              </div>
            ) : null}

            {discoverLoading ? (
              <div style={{ color: '#666' }}>Finding people to follow…</div>
            ) : discover.length === 0 ? (
              <div style={{ color: '#666' }}>
                No suggestions right now — you’re following everyone we could find. Check back after more people join.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {discover.map((person) => (
                  <div
                    key={person.id}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: '#f9fafb', borderRadius: '12px' }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, color: '#111' }}>{person.username}</div>
                      <div style={{ fontSize: '13px', color: '#666' }}>
                        {person.workout_count} workouts • {person.follower_count} followers
                      </div>
                    </div>
                    <button
                      onClick={() => toggleFollow(person)}
                      disabled={!currentUserId || followBusy[person.id]}
                      style={{
                        padding: '8px 14px',
                        borderRadius: '999px',
                        border: '1px solid #10b981',
                        background: person.is_following ? 'white' : '#ecfdf5',
                        color: '#059669',
                        fontWeight: 600,
                        cursor: followBusy[person.id] ? 'wait' : 'pointer',
                        opacity: !currentUserId || followBusy[person.id] ? 0.6 : 1,
                      }}
                    >
                      {followBusy[person.id] ? '…' : person.is_following ? 'Following' : 'Follow'}
                    </button>
                  </div>
                ))}
              </div>
            )}
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
                            <button onClick={() => submitComment(workout.id)} disabled={pendingComment[workout.id] || !(drafts[workout.id] || '').trim()} style={{ background: '#10b981', color: 'white', border: 'none', borderRadius: '10px', padding: '0 12px', cursor: pendingComment[workout.id] ? 'wait' : 'pointer', opacity: pendingComment[workout.id] || !(drafts[workout.id] || '').trim() ? 0.5 : 1, }}>
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
              {hasMore ? (
              <button
                onClick={() => loadFeed(feed.length)}
                disabled={loadingMore}
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '14px',
                  border: '1px dashed #d1d5db',
                  background: 'white',
                  color: '#059669',
                  fontWeight: 700,
                  cursor: loadingMore ? 'wait' : 'pointer',
                }}
              >
                {loadingMore ? 'Loading…' : `Load more (${feed.length} of ${total})`}
              </button>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
