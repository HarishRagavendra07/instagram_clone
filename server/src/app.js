import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import express from 'express';
import multer from 'multer';
import { UploadError } from './upload.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import postRoutes from './routes/posts.js';
import storyRoutes from './routes/stories.js';
import messageRoutes from './routes/messages.js';
import imageRoutes from './routes/images.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Builds the Express app without starting a server or connecting to a database,
// so tests can run it against their own in-memory MongoDB
export function createApp() {
  const app = express();
  app.use(express.json());

  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/posts', postRoutes);
  app.use('/api/stories', storyRoutes);
  app.use('/api/messages', messageRoutes);
  app.use('/api/images', imageRoutes);
  app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

  // In production, serve the built React app
  const clientDist = path.join(__dirname, '..', '..', 'client', 'dist');
  if (fs.existsSync(clientDist)) {
    app.use(express.static(clientDist));
    app.get('/{*splat}', (req, res) => res.sendFile(path.join(clientDist, 'index.html')));
  }

  app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError || err instanceof UploadError) {
      return res.status(400).json({ error: err.code === 'LIMIT_FILE_SIZE' ? 'Image must be 8 MB or smaller' : err.message });
    }
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  });

  return app;
}
