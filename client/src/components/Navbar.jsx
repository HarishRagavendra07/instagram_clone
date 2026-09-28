import { NavLink } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import Avatar from './Avatar';
import { ChatIcon, HomeIcon, LogoutIcon, PlusIcon, SearchIcon } from './Icons';

export default function Navbar() {
  const { user, logout, unread } = useAuth();
  const link = (to, icon, label, extra) => (
    <NavLink to={to} end className="nav-link" title={label}>
      <span className="nav-icon">
        {icon}
        {extra}
      </span>
      <span className="nav-label">{label}</span>
    </NavLink>
  );

  return (
    <nav className="navbar">
      <div className="brand">Instaclone</div>
      {link('/', <HomeIcon />, 'Home')}
      {link('/explore', <SearchIcon />, 'Explore')}
      {link('/new', <PlusIcon />, 'Create')}
      {link('/messages', <ChatIcon />, 'Messages', unread > 0 && <span className="badge">{unread}</span>)}
      {link(`/${user.username}`, <Avatar user={user} size={24} />, 'Profile')}
      <button className="nav-link nav-logout" onClick={logout} title="Log out">
        <span className="nav-icon"><LogoutIcon /></span>
        <span className="nav-label">Log out</span>
      </button>
    </nav>
  );
}
