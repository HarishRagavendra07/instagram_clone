import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, timeAgo } from '../api';
import { useAuth } from '../AuthContext';
import Avatar from './Avatar';
import { HeartIcon, TrashIcon } from './Icons';

export default function PostCard({ post, onChange, onDelete }) {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);

  const toggleLike = async () => {
    if (busy) return;
    setBusy(true);
    // Optimistic update, rolled back if the request fails
    const prev = post;
    onChange({ ...post, liked: !post.liked, likesCount: post.likesCount + (post.liked ? -1 : 1) });
    try {
      const res = await api(`/posts/${post.id}/like`, { method: 'POST' });
      onChange({ ...post, ...res });
    } catch {
      onChange(prev);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!confirm('Delete this post?')) return;
    await api(`/posts/${post.id}`, { method: 'DELETE' });
    onDelete?.(post.id);
  };

  return (
    <article className="post card">
      <header className="post-header">
        <Link to={`/${post.author.username}`} className="user-chip">
          <Avatar user={post.author} size={32} />
          <strong>{post.author.username}</strong>
        </Link>
        <span className="muted">· {timeAgo(post.createdAt)}</span>
        {post.author.id === user.id && (
          <button className="icon-btn post-delete" onClick={remove} title="Delete post">
            <TrashIcon />
          </button>
        )}
      </header>
      <img className="post-image" src={post.image} alt={post.caption || 'Post'} onDoubleClick={() => !post.liked && toggleLike()} />
      <div className="post-body">
        <button className={`icon-btn like-btn ${post.liked ? 'liked' : ''}`} onClick={toggleLike} aria-label="Like">
          <HeartIcon filled={post.liked} />
        </button>
        <div className="likes">
          {post.likesCount} {post.likesCount === 1 ? 'like' : 'likes'}
        </div>
        {post.caption && (
          <p className="caption">
            <Link to={`/${post.author.username}`}>
              <strong>{post.author.username}</strong>
            </Link>{' '}
            {post.caption}
          </p>
        )}
      </div>
    </article>
  );
}
