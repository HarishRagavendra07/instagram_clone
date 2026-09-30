import { Router } from 'express';
import Story, { STORY_LIFETIME_MS } from '../models/Story.js';
import User from '../models/User.js';
import { requireAuth } from '../middleware/auth.js';
import { upload, saveImage, imageUrl } from '../upload.js';
import { userSummary } from '../serialize.js';
import { emitToUser } from '../realtime.js';

const router = Router();
router.use(requireAuth);

// Active stories from me and the people I follow, grouped by author (mine first)
router.get('/', async (req, res) => {
  const me = await User.findById(req.userId, 'following');
  const stories = await Story.find({ author: { $in: [me._id, ...me.following] }, expiresAt: { $gt: new Date() } })
    .sort({ createdAt: 1 })
    .populate('author', 'username name avatar');

  const groups = new Map();
  for (const s of stories) {
    const key = s.author._id.toString();
    if (!groups.has(key)) groups.set(key, { user: userSummary(s.author), stories: [] });
    groups.get(key).stories.push({ id: s._id, image: imageUrl(s.image), createdAt: s.createdAt });
  }
  const result = [...groups.values()].sort((a, b) => {
    if (a.user.id.equals(me._id)) return -1;
    if (b.user.id.equals(me._id)) return 1;
    return b.stories.at(-1).createdAt - a.stories.at(-1).createdAt;
  });
  res.json({ groups: result });
});

router.post('/', upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'An image is required' });
  // The story and its image expire together, so the TTL indexes remove both
  const expiresAt = new Date(Date.now() + STORY_LIFETIME_MS);
  const image = await saveImage(req.file, req.userId, { expiresAt });
  const story = await Story.create({ author: req.userId, image, expiresAt });
  const me = await User.findById(req.userId, 'followers');
  for (const id of [me._id, ...me.followers]) emitToUser(id, 'story:new', { id: story._id });
  res.status(201).json({ story: { id: story._id, image: imageUrl(story.image), createdAt: story.createdAt } });
});

export default router;
