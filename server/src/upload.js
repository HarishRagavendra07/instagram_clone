import multer from 'multer';
import Image from './models/Image.js';

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  },
});

export async function saveImage(file, ownerId) {
  const image = await Image.create({ data: file.buffer, contentType: file.mimetype, owner: ownerId });
  return image._id;
}

export const imageUrl = (id) => (id ? `/api/images/${id}` : null);
