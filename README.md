# Instaclone

[![CI](https://github.com/HarishRagavendra07/instagram_clone/actions/workflows/ci.yml/badge.svg)](https://github.com/HarishRagavendra07/instagram_clone/actions/workflows/ci.yml)

A MERN-stack Instagram clone: register/login, photo posts stored in MongoDB, profiles, follows, a following + global feed that updates live over WebSockets, direct messages, and 24-hour stories.

## Stack

- **Client:** React 19, React Router, Vite, socket.io-client
- **Server:** Node + Express 5, Mongoose, Socket.io, JWT auth, bcrypt, Multer
- **Database:** MongoDB. Images are stored in the database as binary data. With no `MONGO_URI` set, an embedded MongoDB starts automatically and saves to `server/.data`, so you don't need to install MongoDB.

## Getting started

```bash
npm run install:all   # installs root, server and client dependencies
npm run dev           # API on :4000, React app on http://localhost:5173
```

The first start downloads a MongoDB binary (~100 MB), which takes a minute.

Optional: copy `server/.env.example` to `server/.env` to set `JWT_SECRET`, `PORT`, or `MONGO_URI` (to use your own MongoDB / Atlas).

When deploying, set `NODE_ENV=production` and a long random `JWT_SECRET`. In production the server refuses to start without one, because a default secret would let anyone forge login tokens.

### Tests

```bash
npm test --prefix server   # API integration tests against an in-memory MongoDB
```

### Production build

```bash
npm run build   # builds client/dist
npm start       # Express serves the API and the built app on :4000
```

## Features

| User story | Where |
| --- | --- |
| Register with name, username, email, password; log in with username or email | `/register`, `/` |
| Create a post; the image is stored in MongoDB | Create → `POST /api/posts` |
| Profile grid of a user's uploads | `/:username` |
| Follow / unfollow, followers & following lists | Profile page |
| Feed of posts from people you follow | Home → Following |
| **Bonus:** global feed | Home → Global |
| **Bonus:** feed updates live when someone posts (plus likes/deletes) | Socket.io `post:new` |
| **Bonus:** direct messages with live delivery and unread badge | `/messages` |
| **Bonus:** stories that expire after 24 hours (MongoDB TTL index) | Stories bar on Home |

Extras: likes (double-tap works too), deleting your own posts, editing your name/bio/avatar, user search, responsive layout with a mobile bottom bar, and dark mode.

## API overview

All routes except register/login and image fetches need an `Authorization: Bearer <token>` header.

```
POST   /api/auth/register        { name, username, email, password }
POST   /api/auth/login           { login, password }    login = username or email
GET    /api/auth/me

GET    /api/users/search?q=
GET    /api/users/:username
GET    /api/users/:username/followers | /following
POST   /api/users/:username/follow   DELETE to unfollow
PATCH  /api/users/me             multipart: name, bio, avatar

GET    /api/posts/feed?scope=following|global&before=<ISO date>
GET    /api/posts/user/:username
POST   /api/posts                multipart: image, caption
POST   /api/posts/:id/like       toggles
DELETE /api/posts/:id

GET    /api/stories              active stories from you + people you follow
POST   /api/stories              multipart: image

GET    /api/messages/conversations
GET    /api/messages/:username
POST   /api/messages/:username   { text }

GET    /api/images/:id           raw image bytes
```

## Project layout

```
server/src/
  index.js        Express app, error handling, serves client/dist in production
  db.js           MongoDB connection (embedded fallback)
  realtime.js     Socket.io setup (JWT-authenticated, one room per user)
  models/         User, Post, Image, Story, Message
  routes/         auth, users, posts, stories, messages, images
client/src/
  AuthContext.jsx session, socket connection, unread count
  pages/          Login, Register, Home, Profile, EditProfile, NewPost, Explore, Messages
  components/     Navbar, PostCard, StoriesBar, StoryViewer, Modal, Avatar, ...
```
