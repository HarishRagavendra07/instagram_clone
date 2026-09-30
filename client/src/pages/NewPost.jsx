import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, IMAGE_ACCEPT } from '../api';

export default function NewPost() {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [caption, setCaption] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!file) return setPreview(null);
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const submit = async (e) => {
    e.preventDefault();
    if (!file) return setError('Choose an image first');
    const form = new FormData();
    form.append('image', file);
    form.append('caption', caption);
    setBusy(true);
    setError('');
    try {
      await api('/posts', { method: 'POST', body: form });
      navigate('/');
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <form className="card new-post" onSubmit={submit}>
      <h2>Create new post</h2>
      <label className={`drop-zone ${preview ? 'has-image' : ''}`}>
        {preview ? <img src={preview} alt="Preview" /> : <span>Click to choose a photo</span>}
        <input type="file" accept={IMAGE_ACCEPT} hidden onChange={(e) => setFile(e.target.files[0] || null)} />
      </label>
      <textarea
        placeholder="Write a caption…"
        value={caption}
        maxLength={2200}
        rows={3}
        onChange={(e) => setCaption(e.target.value)}
      />
      {error && <p className="error">{error}</p>}
      <button className="btn btn-primary" disabled={busy || !file}>
        {busy ? 'Sharing…' : 'Share'}
      </button>
    </form>
  );
}
