import { Router } from 'express';
import mongoose from 'mongoose';
import Post from '../models/Post.js';
import User from '../models/User.js';
import Image from '../models/Image.js';
import { requireAuth } from '../middleware/auth.js';
import { upload, saveImage } from '../upload.js';
import { serializePost } from '../serialize.js';
import { emitAll } from '../realtime.js';

const router = Router();
router.use(requireAuth);

const PAGE_SIZE = 12;
const AUTHOR_FIELDS = 'username name avatar';

// GET /api/posts/feed?scope=following|global&before=<ISO date>
router.get('/feed', async (req, res) => {
  const filter = {};
  if (req.query.scope !== 'global') {
    const me = await User.findById(req.userId, 'following');
    filter.author = { $in: [...me.following, me._id] };
  }
  if (req.query.before) {
    const before = new Date(req.query.before);
    if (Number.isNaN(before.getTime())) return res.status(400).json({ error: '`before` must be a valid date' });
    filter.createdAt = { $lt: before };
  }
  const posts = await Post.find(filter).sort({ createdAt: -1 }).limit(PAGE_SIZE).populate('author', AUTHOR_FIELDS);
  res.json({ posts: posts.map((p) => serializePost(p, req.userId)), hasMore: posts.length === PAGE_SIZE });
});

router.get('/user/:username', async (req, res) => {
  const user = await User.findOne({ username: req.params.username.toLowerCase() }, '_id');
  if (!user) return res.status(404).json({ error: 'User not found' });
  const posts = await Post.find({ author: user._id }).sort({ createdAt: -1 }).populate('author', AUTHOR_FIELDS);
  res.json({ posts: posts.map((p) => serializePost(p, req.userId)) });
});

router.post('/', upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'An image is required' });
  const image = await saveImage(req.file, req.userId);
  const post = await Post.create({ author: req.userId, image, caption: (req.body.caption || '').trim() });
  await post.populate('author', AUTHOR_FIELDS);
  const payload = serializePost(post, req.userId);
  emitAll('post:new', { ...payload, liked: false });
  res.status(201).json({ post: payload });
});

router.post('/:id/like', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: 'Post not found' });
  const post = await Post.findById(req.params.id);
  if (!post) return res.status(404).json({ error: 'Post not found' });
  const liked = post.likes.some((id) => id.equals(req.userId));
  await Post.updateOne({ _id: post._id }, liked ? { $pull: { likes: req.userId } } : { $addToSet: { likes: req.userId } });
  const likesCount = post.likes.length + (liked ? -1 : 1);
  emitAll('post:likes', { id: post._id, likesCount });
  res.json({ liked: !liked, likesCount });
});

router.delete('/:id', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: 'Post not found' });
  const post = await Post.findOne({ _id: req.params.id, author: req.userId });
  if (!post) return res.status(404).json({ error: 'Post not found' });
  await Promise.all([post.deleteOne(), Image.deleteOne({ _id: post.image })]);
  emitAll('post:deleted', { id: post._id });
  res.sendStatus(204);
});

export default router;
