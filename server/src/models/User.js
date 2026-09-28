import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    username: { type: String, required: true, unique: true, lowercase: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    bio: { type: String, default: '' },
    avatar: { type: mongoose.Schema.Types.ObjectId, ref: 'Image', default: null },
    followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

userSchema.methods.toPublic = function () {
  return {
    id: this._id,
    name: this.name,
    username: this.username,
    bio: this.bio,
    avatar: this.avatar ? `/api/images/${this.avatar}` : null,
    followersCount: this.followers.length,
    followingCount: this.following.length,
  };
};

export default mongoose.model('User', userSchema);
