import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../AuthContext';
import PostCard from '../components/PostCard';
import StoriesBar from '../components/StoriesBar';

const SCOPE_KEY = 'instaclone_feed_scope';

export default function Home() {
  const { user, socket } = useAuth();
  const [scope, setScope] = useState(() => localStorage.getItem(SCOPE_KEY) || 'following');
  const [posts, setPosts] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    localStorage.setItem(SCOPE_KEY, scope);
    setLoading(true);
    api(`/posts/feed?scope=${scope}`)
      .then(({ posts, hasMore }) => {
        setPosts(posts);
        setHasMore(hasMore);
      })
      .finally(() => setLoading(false));
  }, [scope]);

  const loadMore = async () => {
    const before = posts.at(-1)?.createdAt;
    const res = await api(`/posts/feed?scope=${scope}&before=${encodeURIComponent(before)}`);
    setPosts((p) => [...p, ...res.posts.filter((n) => !p.some((o) => o.id === n.id))]);
    setHasMore(res.hasMore);
  };

  // Live updates: new posts, like counts, deletions
  const belongsInFeed = useCallback(
    (post) => scope === 'global' || post.author.id === user.id || user.following.includes(post.author.id),
    [scope, user]
  );

  useEffect(() => {
    if (!socket) return;
    const onNew = (post) => {
      if (belongsInFeed(post)) setPosts((p) => (p.some((x) => x.id === post.id) ? p : [post, ...p]));
    };
    const onLikes = ({ id, likesCount }) => setPosts((p) => p.map((x) => (x.id === id ? { ...x, likesCount } : x)));
    const onDeleted = ({ id }) => setPosts((p) => p.filter((x) => x.id !== id));
    socket.on('post:new', onNew);
    socket.on('post:likes', onLikes);
    socket.on('post:deleted', onDeleted);
    return () => {
      socket.off('post:new', onNew);
      socket.off('post:likes', onLikes);
      socket.off('post:deleted', onDeleted);
    };
  }, [socket, belongsInFeed]);

  const update = (post) => setPosts((p) => p.map((x) => (x.id === post.id ? post : x)));
  const remove = (id) => setPosts((p) => p.filter((x) => x.id !== id));

  return (
    <div className="feed">
      <StoriesBar />
      <div className="tabs">
        {['following', 'global'].map((s) => (
          <button key={s} className={`tab ${scope === s ? 'active' : ''}`} onClick={() => setScope(s)}>
            {s === 'following' ? 'Following' : 'Global'}
          </button>
        ))}
      </div>
      {loading ? (
        <div className="spinner" />
      ) : posts.length === 0 ? (
        <div className="card empty">
          {scope === 'following' ? (
            <>
              <p>Your feed is empty.</p>
              <p className="muted">
                <Link to="/explore">Find people to follow</Link>, check the{' '}
                <button className="link" onClick={() => setScope('global')}>global feed</button>, or{' '}
                <Link to="/new">share your first post</Link>.
              </p>
            </>
          ) : (
            <p>
              No posts yet. <Link to="/new">Be the first to post!</Link>
            </p>
          )}
        </div>
      ) : (
        <>
          {posts.map((post) => (
            <PostCard key={post.id} post={post} onChange={update} onDelete={remove} />
          ))}
          {hasMore && (
            <button className="btn btn-secondary load-more" onClick={loadMore}>
              Load more
            </button>
          )}
        </>
      )}
    </div>
  );
}
