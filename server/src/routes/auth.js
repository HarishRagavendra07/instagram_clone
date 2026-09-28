import { Router } from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { requireAuth, signToken } from '../middleware/auth.js';

const router = Router();

// Usernames that would collide with client routes like /explore or /messages
const RESERVED = new Set(['explore', 'new', 'messages', 'accounts', 'register', 'login', 'api']);

const selfPayload = (user) => ({ ...user.toPublic(), email: user.email, following: user.following });

router.post('/register', async (req, res) => {
  const { name, username, email, password } = req.body || {};
  if (!name || !username || !email || !password) {
    return res.status(400).json({ error: 'Name, username, email and password are required' });
  }
  if (!/^[a-z0-9._]{3,30}$/i.test(username)) {
    return res.status(400).json({ error: 'Username must be 3-30 letters, numbers, dots or underscores' });
  }
  if (RESERVED.has(username.toLowerCase())) return res.status(400).json({ error: 'That username is not available' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

  const exists = await User.findOne({ $or: [{ username: username.toLowerCase() }, { email: email.toLowerCase() }] });
  if (exists) return res.status(409).json({ error: 'Username or email is already taken' });

  const user = await User.create({ name, username, email, passwordHash: await bcrypt.hash(password, 10) });
  res.status(201).json({ token: signToken(user), user: selfPayload(user) });
});

// "login" accepts either a username or an email
router.post('/login', async (req, res) => {
  const { login, password } = req.body || {};
  if (!login || !password) return res.status(400).json({ error: 'Username/email and password are required' });
  const key = login.toLowerCase().trim();
  const user = await User.findOne({ $or: [{ username: key }, { email: key }] });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ error: 'Incorrect username/email or password' });
  }
  res.json({ token: signToken(user), user: selfPayload(user) });
});

router.get('/me', requireAuth, async (req, res) => {
  const user = await User.findById(req.userId);
  if (!user) return res.status(401).json({ error: 'User no longer exists' });
  res.json({ user: selfPayload(user) });
});

export default router;
