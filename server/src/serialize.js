import { imageUrl } from './upload.js';

export function userSummary(user) {
  return { id: user._id, username: user.username, name: user.name, avatar: imageUrl(user.avatar) };
}

export function serializePost(post, viewerId) {
  return {
    id: post._id,
    author: userSummary(post.author),
    image: imageUrl(post.image),
    caption: post.caption,
    likesCount: post.likes.length,
    liked: viewerId ? post.likes.some((id) => id.equals(viewerId)) : false,
    createdAt: post.createdAt,
  };
}
