import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../AuthContext';
import Avatar from '../components/Avatar';
import Modal from '../components/Modal';
import PostCard from '../components/PostCard';
import UserList from '../components/UserList';

export default function Profile() {
  const { username } = useParams();
  const { socket, setFollowing } = useAuth();
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [error, setError] = useState('');
  const [openPost, setOpenPost] = useState(null);
  const [list, setList] = useState(null); // { title, users }
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setProfile(null);
    setError('');
    Promise.all([api(`/users/${username}`), api(`/posts/user/${username}`)])
      .then(([{ user }, { posts }]) => {
        setProfile(user);
        setPosts(posts);
      })
      .catch((err) => setError(err.status === 404 ? "Sorry, this page isn't available." : err.message));
  }, [username]);

  // Live: new posts by this user, and my own follower count changing
  useEffect(() => {
    if (!socket || !profile) return;
    const onNew = (post) => {
      if (post.author.id !== profile.id) return;
      setPosts((p) => (p.some((x) => x.id === post.id) ? p : [post, ...p]));
    };
    const onDeleted = ({ id }) => setPosts((p) => p.filter((x) => x.id !== id));
    const onFollowers = ({ followersCount }) => profile.isMe && setProfile((u) => ({ ...u, followersCount }));
    socket.on('post:new', onNew);
    socket.on('post:deleted', onDeleted);
    socket.on('followers:changed', onFollowers);
    return () => {
      socket.off('post:new', onNew);
      socket.off('post:deleted', onDeleted);
      socket.off('followers:changed', onFollowers);
    };
  }, [socket, profile?.id, profile?.isMe]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleFollow = async () => {
    setBusy(true);
    try {
      const res = await api(`/users/${username}/follow`, { method: profile.isFollowing ? 'DELETE' : 'POST' });
      setProfile((u) => ({ ...u, isFollowing: res.isFollowing, followersCount: res.followersCount }));
      setFollowing(res.userId, res.isFollowing);
    } finally {
      setBusy(false);
    }
  };

  const showList = async (kind) => {
    const { users } = await api(`/users/${username}/${kind}`);
    setList({ title: kind === 'followers' ? 'Followers' : 'Following', users });
  };

  if (error) return <div className="card empty">{error}</div>;
  if (!profile) return <div className="spinner" />;

  const updatePost = (post) => {
    setPosts((p) => p.map((x) => (x.id === post.id ? post : x)));
    setOpenPost(post);
  };
  const removePost = (id) => {
    setPosts((p) => p.filter((x) => x.id !== id));
    setOpenPost(null);
  };

  return (
    <div className="profile">
      <header className="profile-header">
        <Avatar user={profile} size={120} />
        <div className="profile-info">
          <div className="profile-row">
            <h2>{profile.username}</h2>
            {profile.isMe ? (
              <Link to="/accounts/edit" className="btn btn-secondary">Edit profile</Link>
            ) : (
              <>
                <button
                  className={`btn ${profile.isFollowing ? 'btn-secondary' : 'btn-primary'}`}
                  onClick={toggleFollow}
                  disabled={busy}
                >
                  {profile.isFollowing ? 'Following' : 'Follow'}
                </button>
                <Link to={`/messages/${profile.username}`} className="btn btn-secondary">Message</Link>
              </>
            )}
          </div>
          <div className="profile-stats">
            <span><strong>{posts.length}</strong> posts</span>
            <button className="link" onClick={() => showList('followers')}>
              <strong>{profile.followersCount}</strong> followers
            </button>
            <button className="link" onClick={() => showList('following')}>
              <strong>{profile.followingCount}</strong> following
            </button>
          </div>
          <div className="profile-bio">
            <strong>{profile.name}</strong>
            {profile.bio && <p>{profile.bio}</p>}
          </div>
        </div>
      </header>

      {posts.length === 0 ? (
        <div className="empty">
          <p>No posts yet.</p>
          {profile.isMe && <Link to="/new">Share your first photo</Link>}
        </div>
      ) : (
        <div className="grid">
          {posts.map((post) => (
            <button key={post.id} className="grid-item" onClick={() => setOpenPost(post)}>
              <img src={post.image} alt={post.caption || 'Post'} loading="lazy" />
              <span className="grid-overlay">♥ {post.likesCount}</span>
            </button>
          ))}
        </div>
      )}

      {openPost && (
        <Modal onClose={() => setOpenPost(null)} className="post-modal">
          <PostCard post={openPost} onChange={updatePost} onDelete={removePost} />
        </Modal>
      )}
      {list && (
        <Modal title={list.title} onClose={() => setList(null)}>
          <UserList users={list.users} onPick={() => setList(null)} />
        </Modal>
      )}
    </div>
  );
}
