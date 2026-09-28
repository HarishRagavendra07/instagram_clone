import { useEffect, useState } from 'react';
import { timeAgo } from '../api';
import Avatar from './Avatar';
import { CloseIcon } from './Icons';

const DURATION = 5000;

export default function StoryViewer({ groups, startGroup, onSeen, onClose }) {
  const [g, setG] = useState(startGroup);
  const [i, setI] = useState(0);
  const group = groups[g];
  const story = group?.stories[i];

  const next = () => {
    if (i < group.stories.length - 1) setI(i + 1);
    else if (g < groups.length - 1) {
      setG(g + 1);
      setI(0);
    } else onClose();
  };
  const prev = () => {
    if (i > 0) setI(i - 1);
    else if (g > 0) {
      setG(g - 1);
      setI(groups[g - 1].stories.length - 1);
    }
  };

  useEffect(() => {
    if (!story) return onClose();
    onSeen(story.id);
    const t = setTimeout(next, DURATION);
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') next();
      if (e.key === 'ArrowLeft') prev();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener('keydown', onKey);
    };
    // Restart the timer only when the visible story changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [g, i, story?.id]);

  if (!story) return null;

  return (
    <div className="story-viewer" onClick={onClose}>
      <div className="story-frame" onClick={(e) => e.stopPropagation()}>
        <div className="story-progress">
          {group.stories.map((s, idx) => (
            <div key={s.id} className="story-bar">
              <div
                key={`${g}-${i}`}
                className={`story-bar-fill ${idx < i ? 'done' : idx === i ? 'active' : ''}`}
                style={{ animationDuration: `${DURATION}ms` }}
              />
            </div>
          ))}
        </div>
        <div className="story-top">
          <Avatar user={group.user} size={32} />
          <strong>{group.user.username}</strong>
          <span>{timeAgo(story.createdAt)}</span>
          <button className="icon-btn story-close" onClick={onClose} aria-label="Close">
            <CloseIcon />
          </button>
        </div>
        <img src={story.image} alt="" />
        <button className="story-nav left" onClick={prev} aria-label="Previous" />
        <button className="story-nav right" onClick={next} aria-label="Next" />
      </div>
    </div>
  );
}
