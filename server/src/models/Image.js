import mongoose from 'mongoose';

// Uploaded images are stored in MongoDB as binary data
const imageSchema = new mongoose.Schema(
  {
    data: { type: Buffer, required: true },
    contentType: { type: String, required: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    // Set only for images that should disappear on their own (story images)
    expiresAt: { type: Date, default: undefined },
  },
  { timestamps: true }
);

// TTL index: MongoDB deletes an image once expiresAt passes; images without it are kept
imageSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('Image', imageSchema);
