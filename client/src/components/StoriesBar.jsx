import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../AuthContext';
import Avatar from './Avatar';
import StoryViewer from './StoryViewer';

const SEEN_KEY = 'instaclone_seen_stories';
const loadSeen = () => new Set(JSON.parse(localStorage.getItem(SEEN_KEY) || '[]'));

export default function StoriesBar() {
  const { user, socket } = useAuth();
  const [groups, setGroups] = useState([]);
  const [seen, setSeen] = useState(loadSeen);
  const [viewing, setViewing] = useState(null); // index into groups
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();

  const load = useCallback(() => api('/stories').then(({ groups }) => setGroups(groups)), []);

  useEffect(() => {
    load();
    socket?.on('story:new', load);
    return () => socket?.off('story:new', load);
  }, [socket, load]);

  const markSeen = (id) =>
    setSeen((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev).add(id);
      localStorage.setItem(SEEN_KEY, JSON.stringify([...next].slice(-500)));
      return next;
    });

  const upload = async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    const form = new FormData();
    form.append('image', file);
    setUploading(true);
    try {
      await api('/stories', { method: 'POST', body: form });
      await load();
    } catch (err) {
      alert(err.message);
    } finally {
      setUploading(false);
    }
  };

  const mine = groups.find((g) => g.user.id === user.id);
  const others = groups.filter((g) => g.user.id !== user.id);
  const allSeen = (g) => g.stories.every((s) => seen.has(s.id));

  return (
    <div className="stories card">
      <div className="story-item">
        <button className="story-btn" onClick={() => (mine ? setViewing(groups.indexOf(mine)) : fileRef.current.click())}>
          <Avatar user={user} size={56} ring={mine ? (allSeen(mine) ? 'seen' : 'unseen') : 'none'} />
        </button>
        <button className="story-add" onClick={() => fileRef.current.click()} title="Add to your story" disabled={uploading}>
          {uploading ? '…' : '+'}
        </button>
        <span className="story-name">Your story</span>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={upload} />
      </div>
      {others.map((g) => (
        <button key={g.user.id} className="story-item story-btn" onClick={() => setViewing(groups.indexOf(g))}>
          <Avatar user={g.user} size={56} ring={allSeen(g) ? 'seen' : 'unseen'} />
          <span className="story-name">{g.user.username}</span>
        </button>
      ))}
      {!others.length && <span className="muted stories-empty">Stories from people you follow appear here.</span>}
      {viewing !== null && (
        <StoryViewer groups={groups} startGroup={viewing} onSeen={markSeen} onClose={() => setViewing(null)} />
      )}
    </div>
  );
}
