import multer from 'multer';
import Image from './models/Image.js';

// Raster formats only. SVG is deliberately excluded: it can carry scripts, and images are
// served from the app's own origin, so an SVG upload would be a stored XSS vector.
export const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif']);

export class UploadError extends Error {}

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_TYPES.has(file.mimetype)) cb(null, true);
    else cb(new UploadError('Only JPEG, PNG, GIF, WebP or AVIF images are allowed'));
  },
});

export async function saveImage(file, ownerId, { expiresAt } = {}) {
  const image = await Image.create({ data: file.buffer, contentType: file.mimetype, owner: ownerId, expiresAt });
  return image._id;
}

export const imageUrl = (id) => (id ? `/api/images/${id}` : null);
