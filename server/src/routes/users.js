import { Router } from 'express';
import User from '../models/User.js';
import Post from '../models/Post.js';
import { requireAuth } from '../middleware/auth.js';
import { upload, saveImage } from '../upload.js';
import { userSummary } from '../serialize.js';
import { emitToUser } from '../realtime.js';

const router = Router();
router.use(requireAuth);

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

router.get('/search', async (req, res) => {
  const q = (req.query.q || '').trim();
  const filter = q
    ? { $or: [{ username: new RegExp(escapeRegex(q), 'i') }, { name: new RegExp(escapeRegex(q), 'i') }] }
    : { _id: { $ne: req.userId } };
  const users = await User.find(filter, 'username name avatar').sort({ createdAt: -1 }).limit(20);
  res.json({ users: users.map(userSummary) });
});

router.get('/:username', async (req, res) => {
  const user = await User.findOne({ username: req.params.username.toLowerCase() });
  if (!user) return res.status(404).json({ error: 'User not found' });
  const postsCount = await Post.countDocuments({ author: user._id });
  res.json({
    user: {
      ...user.toPublic(),
      postsCount,
      isMe: user._id.equals(req.userId),
      isFollowing: user.followers.some((id) => id.equals(req.userId)),
    },
  });
});

for (const list of ['followers', 'following']) {
  router.get(`/:username/${list}`, async (req, res) => {
    const user = await User.findOne({ username: req.params.username.toLowerCase() }).populate(list, 'username name avatar');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ users: user[list].map(userSummary) });
  });
}

async function setFollow(req, res, follow) {
  const target = await User.findOne({ username: req.params.username.toLowerCase() }, '_id');
  if (!target) return res.status(404).json({ error: 'User not found' });
  if (target._id.equals(req.userId)) return res.status(400).json({ error: "You can't follow yourself" });
  const op = follow ? '$addToSet' : '$pull';
  await Promise.all([
    User.updateOne({ _id: req.userId }, { [op]: { following: target._id } }),
    User.updateOne({ _id: target._id }, { [op]: { followers: req.userId } }),
  ]);
  const updated = await User.findById(target._id, 'followers');
  emitToUser(target._id, 'followers:changed', { followersCount: updated.followers.length });
  res.json({ isFollowing: follow, followersCount: updated.followers.length, userId: target._id });
}

router.post('/:username/follow', (req, res) => setFollow(req, res, true));
router.delete('/:username/follow', (req, res) => setFollow(req, res, false));

router.patch('/me', upload.single('avatar'), async (req, res) => {
  const update = {};
  if (typeof req.body.name === 'string' && req.body.name.trim()) update.name = req.body.name.trim();
  if (typeof req.body.bio === 'string') update.bio = req.body.bio.slice(0, 150);
  if (req.file) update.avatar = await saveImage(req.file, req.userId);
  const user = await User.findByIdAndUpdate(req.userId, update, { new: true });
  res.json({ user: { ...user.toPublic(), email: user.email, following: user.following } });
});

export default router;
