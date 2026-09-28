import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../AuthContext';
import Avatar from '../components/Avatar';

export default function EditProfile() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState(user.name);
  const [bio, setBio] = useState(user.bio);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const submit = async (e) => {
    e.preventDefault();
    const form = new FormData();
    form.append('name', name);
    form.append('bio', bio);
    if (file) form.append('avatar', file);
    setBusy(true);
    try {
      const { user: updated } = await api('/users/me', { method: 'PATCH', body: form });
      setUser(updated);
      navigate(`/${updated.username}`);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <form className="card edit-profile" onSubmit={submit}>
      <h2>Edit profile</h2>
      <label className="avatar-picker">
        <Avatar user={{ ...user, avatar: preview || user.avatar }} size={72} />
        <span className="link">Change profile photo</span>
        <input type="file" accept="image/*" hidden onChange={(e) => setFile(e.target.files[0] || null)} />
      </label>
      <label>
        Name
        <input value={name} onChange={(e) => setName(e.target.value)} required />
      </label>
      <label>
        Bio
        <textarea value={bio} maxLength={150} rows={3} onChange={(e) => setBio(e.target.value)} />
      </label>
      {error && <p className="error">{error}</p>}
      <button className="btn btn-primary" disabled={busy}>
        {busy ? 'Saving…' : 'Save'}
      </button>
    </form>
  );
}
