import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, timeAgo } from '../api';
import { useAuth } from '../AuthContext';
import Avatar from '../components/Avatar';
import { SendIcon } from '../components/Icons';

export default function Messages() {
  const { username } = useParams();
  const { user, socket, activeChat, refreshUnread } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [thread, setThread] = useState(null); // { user, messages }
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const bottomRef = useRef();

  const loadConversations = () =>
    api('/messages/conversations').then(({ conversations }) => setConversations(conversations));

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    activeChat.current = username || null;
    setThread(null);
    setError('');
    if (username) {
      api(`/messages/${username}`)
        .then((data) => {
          setThread(data);
          refreshUnread();
          loadConversations();
        })
        .catch((err) => setError(err.message));
    }
    return () => {
      activeChat.current = null;
    };
  }, [username]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!socket) return;
    const onMessage = async ({ message, user: from }) => {
      if (from.username === username) {
        setThread((t) => t && { ...t, messages: [...t.messages, message] });
        // Mark it read before refreshing, so the open chat doesn't show as unread
        await api(`/messages/${username}/read`, { method: 'POST' }).catch(() => {});
      }
      loadConversations();
    };
    socket.on('message:new', onMessage);
    return () => socket.off('message:new', onMessage);
  }, [socket, username]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [thread?.messages.length]);

  const send = async (e) => {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    setText('');
    try {
      const { message } = await api(`/messages/${username}`, { method: 'POST', body: { text: body } });
      setThread((t) => ({ ...t, messages: [...t.messages, message] }));
      loadConversations();
    } catch (err) {
      setError(err.message);
      setText(body);
    }
  };

  return (
    <div className={`messages card ${username ? 'has-thread' : ''}`}>
      <aside className="conversations">
        <h3 className="pad">{user.username}</h3>
        {conversations.length === 0 && (
          <p className="muted pad">
            No messages yet. Open someone's profile and tap <strong>Message</strong> to start a chat.
          </p>
        )}
        {conversations.map((c) => (
          <button
            key={c.user.id}
            className={`conversation ${c.user.username === username ? 'active' : ''}`}
            onClick={() => navigate(`/messages/${c.user.username}`)}
          >
            <Avatar user={c.user} size={44} />
            <div className="conversation-text">
              <strong>{c.user.username}</strong>
              <span className={c.unread ? 'unread' : 'muted'}>
                {c.last.from === user.id ? 'You: ' : ''}
                {c.last.text} · {timeAgo(c.last.createdAt)}
              </span>
            </div>
            {c.unread > 0 && <span className="dot" />}
          </button>
        ))}
      </aside>

      <section className="thread">
        {!username ? (
          <div className="thread-empty muted">Select a conversation</div>
        ) : error ? (
          <div className="thread-empty error">{error}</div>
        ) : !thread ? (
          <div className="spinner" />
        ) : (
          <>
            <header className="thread-header">
              <button className="icon-btn back" onClick={() => navigate('/messages')} aria-label="Back">
                ←
              </button>
              <Link to={`/${thread.user.username}`} className="user-chip">
                <Avatar user={thread.user} size={32} />
                <strong>{thread.user.username}</strong>
              </Link>
            </header>
            <div className="thread-body">
              {thread.messages.length === 0 && <p className="muted center">Say hi to {thread.user.name}!</p>}
              {thread.messages.map((m) => (
                <div key={m.id} className={`bubble ${m.from === user.id ? 'mine' : ''}`} title={new Date(m.createdAt).toLocaleString()}>
                  {m.text}
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
            <form className="thread-input" onSubmit={send}>
              <input placeholder="Message…" value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} autoFocus />
              <button className="icon-btn" disabled={!text.trim()} aria-label="Send">
                <SendIcon />
              </button>
            </form>
          </>
        )}
      </section>
    </div>
  );
}
