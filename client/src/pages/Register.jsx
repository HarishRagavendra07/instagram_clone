import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../AuthContext';

const FIELDS = [
  { name: 'email', type: 'email', placeholder: 'Email', autoComplete: 'email' },
  { name: 'name', type: 'text', placeholder: 'Full name', autoComplete: 'name' },
  { name: 'username', type: 'text', placeholder: 'Username', autoComplete: 'username' },
  { name: 'password', type: 'password', placeholder: 'Password (6+ characters)', autoComplete: 'new-password' },
];

export default function Register() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', name: '', username: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const { token, user } = await api('/auth/register', { method: 'POST', body: form });
      signIn(token, user);
      navigate('/');
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <div className="auth-page">
      <form className="auth-card card" onSubmit={submit}>
        <h1 className="brand brand-lg">Instaclone</h1>
        <p className="muted center">Sign up to see photos from your friends.</p>
        {FIELDS.map((f) => (
          <input
            key={f.name}
            {...f}
            value={form[f.name]}
            onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}
            required
          />
        ))}
        <button className="btn btn-primary" disabled={busy}>
          {busy ? 'Signing up…' : 'Sign up'}
        </button>
        {error && <p className="error">{error}</p>}
      </form>
      <div className="auth-card card auth-switch">
        Have an account? <Link to="/">Log in</Link>
      </div>
    </div>
  );
}
