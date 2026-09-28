import { Router } from 'express';
import mongoose from 'mongoose';
import Message from '../models/Message.js';
import User from '../models/User.js';
import { requireAuth } from '../middleware/auth.js';
import { userSummary } from '../serialize.js';
import { emitToUser } from '../realtime.js';

const router = Router();
router.use(requireAuth);

const serializeMessage = (m) => ({ id: m._id, from: m.from, to: m.to, text: m.text, createdAt: m.createdAt });

// Conversation list: latest message with each other user, plus unread count
router.get('/conversations', async (req, res) => {
  const me = new mongoose.Types.ObjectId(req.userId);
  const rows = await Message.aggregate([
    { $match: { $or: [{ from: me }, { to: me }] } },
    { $sort: { createdAt: -1 } },
    { $addFields: { other: { $cond: [{ $eq: ['$from', me] }, '$to', '$from'] } } },
    {
      $group: {
        _id: '$other',
        last: { $first: '$$ROOT' },
        unread: { $sum: { $cond: [{ $and: [{ $eq: ['$to', me] }, { $eq: ['$read', false] }] }, 1, 0] } },
      },
    },
    { $sort: { 'last.createdAt': -1 } },
  ]);
  const users = await User.find({ _id: { $in: rows.map((r) => r._id) } }, 'username name avatar');
  const byId = new Map(users.map((u) => [u._id.toString(), u]));
  res.json({
    conversations: rows
      .filter((r) => byId.has(r._id.toString()))
      .map((r) => ({ user: userSummary(byId.get(r._id.toString())), last: serializeMessage(r.last), unread: r.unread })),
  });
});

router.get('/:username', async (req, res) => {
  const other = await User.findOne({ username: req.params.username.toLowerCase() }, 'username name avatar');
  if (!other) return res.status(404).json({ error: 'User not found' });
  const messages = await Message.find({
    $or: [
      { from: req.userId, to: other._id },
      { from: other._id, to: req.userId },
    ],
  })
    .sort({ createdAt: -1 })
    .limit(200);
  await Message.updateMany({ from: other._id, to: req.userId, read: false }, { read: true });
  res.json({ user: userSummary(other), messages: messages.reverse().map(serializeMessage) });
});

router.post('/:username', async (req, res) => {
  const text = (req.body?.text || '').trim();
  if (!text) return res.status(400).json({ error: 'Message cannot be empty' });
  const other = await User.findOne({ username: req.params.username.toLowerCase() }, '_id');
  if (!other) return res.status(404).json({ error: 'User not found' });
  if (other._id.equals(req.userId)) return res.status(400).json({ error: "You can't message yourself" });
  const message = serializeMessage(await Message.create({ from: req.userId, to: other._id, text }));
  const sender = await User.findById(req.userId, 'username name avatar');
  emitToUser(other._id, 'message:new', { message, user: userSummary(sender) });
  res.status(201).json({ message });
});

router.post('/:username/read', async (req, res) => {
  const other = await User.findOne({ username: req.params.username.toLowerCase() }, '_id');
  if (other) await Message.updateMany({ from: other._id, to: req.userId, read: false }, { read: true });
  res.sendStatus(204);
});

export default router;
