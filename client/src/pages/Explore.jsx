import { useEffect, useState } from 'react';
import { api } from '../api';
import UserList from '../components/UserList';

export default function Explore() {
  const [q, setQ] = useState('');
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const t = setTimeout(() => {
      api(`/users/search?q=${encodeURIComponent(q)}`).then(({ users }) => setUsers(users));
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div className="explore">
      <input className="search" placeholder="Search people" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
      <div className="card">
        <h3 className="pad">{q ? 'Results' : 'Newest members'}</h3>
        <UserList users={users} empty={q ? 'No matching users.' : 'No other users yet.'} />
      </div>
    </div>
  );
}
