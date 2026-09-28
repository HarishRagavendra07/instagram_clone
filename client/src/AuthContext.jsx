import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { api, getToken, setToken } from './api';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(!!getToken());
  const [socket, setSocket] = useState(null);
  const [unread, setUnread] = useState(0);
  const activeChat = useRef(null); // username of the conversation currently open

  useEffect(() => {
    if (!getToken()) return;
    api('/auth/me')
      .then(({ user }) => setUser(user))
      .catch(() => setToken(null))
      .finally(() => setLoading(false));
  }, []);

  // Open one socket per logged-in session
  useEffect(() => {
    if (!user?.id) return;
    const s = io({ auth: { token: getToken() } });
    setSocket(s);
    return () => s.disconnect();
  }, [user?.id]);

  const refreshUnread = useCallback(() => {
    api('/messages/conversations')
      .then(({ conversations }) => setUnread(conversations.reduce((n, c) => n + c.unread, 0)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!socket) return;
    refreshUnread();
    const onMessage = ({ user: from }) => {
      if (activeChat.current !== from.username) setUnread((n) => n + 1);
    };
    socket.on('message:new', onMessage);
    return () => socket.off('message:new', onMessage);
  }, [socket, refreshUnread]);

  const signIn = (token, user) => {
    setToken(token);
    setUser(user);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setSocket(null);
    setUnread(0);
  };

  // Keep my "following" list in sync after follow/unfollow so the live feed filters correctly
  const setFollowing = (userId, follow) =>
    setUser((u) => ({
      ...u,
      following: follow ? [...u.following, userId] : u.following.filter((id) => id !== userId),
      followingCount: u.followingCount + (follow ? 1 : -1),
    }));

  return (
    <AuthContext.Provider
      value={{ user, setUser, loading, socket, signIn, logout, setFollowing, unread, refreshUnread, activeChat }}
    >
      {children}
    </AuthContext.Provider>
  );
}
