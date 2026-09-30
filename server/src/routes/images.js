import { Router } from 'express';
import mongoose from 'mongoose';
import Image from '../models/Image.js';

const router = Router();

router.get('/:id', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.sendStatus(404);
  const image = await Image.findById(req.params.id);
  if (!image) return res.sendStatus(404);
  res.set('Content-Type', image.contentType);
  res.set('Cache-Control', 'public, max-age=31536000, immutable');
  // Never let the browser sniff or run stored bytes as anything but an image
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('Content-Security-Policy', "default-src 'none'; sandbox");
  res.send(image.data);
});

export default router;
