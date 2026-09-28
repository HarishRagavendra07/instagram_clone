import { Link } from 'react-router-dom';
import Avatar from './Avatar';

export default function UserList({ users, onPick, empty = 'No users yet.' }) {
  if (!users.length) return <p className="muted pad">{empty}</p>;
  return (
    <ul className="user-list">
      {users.map((u) => (
        <li key={u.id}>
          <Link to={`/${u.username}`} className="user-chip" onClick={onPick}>
            <Avatar user={u} size={44} />
            <div>
              <strong>{u.username}</strong>
              <div className="muted">{u.name}</div>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
