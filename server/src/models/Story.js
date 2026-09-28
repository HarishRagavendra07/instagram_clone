import mongoose from 'mongoose';

const DAY_MS = 24 * 60 * 60 * 1000;

const storySchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    image: { type: mongoose.Schema.Types.ObjectId, ref: 'Image', required: true },
    expiresAt: { type: Date, default: () => new Date(Date.now() + DAY_MS) },
  },
  { timestamps: true }
);

// MongoDB removes stories automatically once they expire
storySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('Story', storySchema);
