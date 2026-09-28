export default function Avatar({ user, size = 32, ring = null }) {
  const initial = (user?.name || user?.username || '?')[0].toUpperCase();
  const inner = user?.avatar ? (
    <img className="avatar" src={user.avatar} alt={user.username} style={{ width: size, height: size }} />
  ) : (
    <div className="avatar avatar-fallback" style={{ width: size, height: size, fontSize: size * 0.42 }}>
      {initial}
    </div>
  );
  if (!ring) return inner;
  return <div className={`story-ring ${ring}`}>{inner}</div>;
}
