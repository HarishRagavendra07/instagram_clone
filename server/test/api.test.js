// API integration tests: the real Express app against an in-memory MongoDB.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../src/app.js';

// 1x1 PNG
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const SVG = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"/>');

let mongo;
let server;
let base;

before(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri('test'));
  await mongoose.connection.syncIndexes();
  server = createApp().listen(0);
  base = `http://127.0.0.1:${server.address().port}/api`;
});

after(async () => {
  server?.close();
  await mongoose.disconnect();
  await mongo?.stop();
});

async function call(path, { method = 'GET', token, json, form } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (json) headers['Content-Type'] = 'application/json';
  const res = await fetch(base + path, { method, headers, body: json ? JSON.stringify(json) : form });
  const type = res.headers.get('content-type') || '';
  const body = type.includes('json') ? await res.json() : await res.arrayBuffer();
  return { status: res.status, body, headers: res.headers };
}

const imageForm = (field, bytes, type = 'image/png', extra = {}) => {
  const form = new FormData();
  form.append(field, new Blob([bytes], { type }), type === 'image/png' ? 'a.png' : 'a.svg');
  for (const [k, v] of Object.entries(extra)) form.append(k, v);
  return form;
};

let n = 0;
async function newUser() {
  const username = `user${++n}`;
  const { status, body } = await call('/auth/register', {
    method: 'POST',
    json: { name: `User ${n}`, username, email: `${username}@test.com`, password: 'secret1' },
  });
  assert.equal(status, 201);
  return { token: body.token, id: body.user.id, username };
}

const post = (user, caption = '') =>
  call('/posts', { method: 'POST', token: user.token, form: imageForm('image', PNG, 'image/png', { caption }) });

test('register validates input and rejects duplicates and reserved names', async () => {
  const bad = await call('/auth/register', { method: 'POST', json: { name: 'x', username: 'ab', email: 'a@b.c', password: 'secret1' } });
  assert.equal(bad.status, 400);
  const reserved = await call('/auth/register', { method: 'POST', json: { name: 'x', username: 'explore', email: 'e@b.c', password: 'secret1' } });
  assert.equal(reserved.status, 400);
  const u = await newUser();
  const dup = await call('/auth/register', { method: 'POST', json: { name: 'x', username: u.username, email: 'other@b.c', password: 'secret1' } });
  assert.equal(dup.status, 409);
});

test('login works with username or email, case-insensitively', async () => {
  const u = await newUser();
  for (const login of [u.username, `${u.username}@TEST.com`]) {
    const res = await call('/auth/login', { method: 'POST', json: { login, password: 'secret1' } });
    assert.equal(res.status, 200, login);
  }
  const wrong = await call('/auth/login', { method: 'POST', json: { login: u.username, password: 'nope' } });
  assert.equal(wrong.status, 401);
});

test('protected routes require a valid token', async () => {
  assert.equal((await call('/posts/feed')).status, 401);
  assert.equal((await call('/posts/feed', { token: 'garbage' })).status, 401);
});

test('following feed shows only followed users; global feed shows everyone', async () => {
  const [a, b, c] = [await newUser(), await newUser(), await newUser()];
  await post(b, 'from b');
  await post(c, 'from c');
  const captions = async (scope) =>
    (await call(`/posts/feed?scope=${scope}`, { token: a.token })).body.posts.map((p) => p.caption);

  assert.deepEqual(await captions('following'), []);
  await call(`/users/${b.username}/follow`, { method: 'POST', token: a.token });
  assert.deepEqual(await captions('following'), ['from b']);
  assert.ok((await captions('global')).includes('from c'));

  await call(`/users/${b.username}/follow`, { method: 'DELETE', token: a.token });
  assert.deepEqual(await captions('following'), []);
});

test('you cannot follow yourself', async () => {
  const u = await newUser();
  assert.equal((await call(`/users/${u.username}/follow`, { method: 'POST', token: u.token })).status, 400);
});

test('likes toggle and posts can only be deleted by their author', async () => {
  const [a, b] = [await newUser(), await newUser()];
  const { body } = await post(a);
  const id = body.post.id;
  assert.deepEqual((await call(`/posts/${id}/like`, { method: 'POST', token: b.token })).body, { liked: true, likesCount: 1 });
  assert.deepEqual((await call(`/posts/${id}/like`, { method: 'POST', token: b.token })).body, { liked: false, likesCount: 0 });
  assert.equal((await call(`/posts/${id}`, { method: 'DELETE', token: b.token })).status, 404);
  assert.equal((await call(`/posts/${id}`, { method: 'DELETE', token: a.token })).status, 204);
  assert.equal((await call(body.post.image.replace('/api', ''))).status, 404, 'image deleted with the post');
});

test('SVG uploads are rejected (stored XSS) and images are served with safe headers', async () => {
  const u = await newUser();
  const svg = await call('/posts', { method: 'POST', token: u.token, form: imageForm('image', SVG, 'image/svg+xml') });
  assert.equal(svg.status, 400);
  assert.match(svg.body.error, /JPEG, PNG/);

  const { body } = await post(u);
  const img = await call(body.post.image.replace('/api', ''));
  assert.equal(img.status, 200);
  assert.equal(img.headers.get('content-type'), 'image/png');
  assert.equal(img.headers.get('x-content-type-options'), 'nosniff');
  assert.match(img.headers.get('content-security-policy'), /sandbox/);
});

test('replacing your profile photo deletes the old one', async () => {
  const u = await newUser();
  const first = (await call('/users/me', { method: 'PATCH', token: u.token, form: imageForm('avatar', PNG) })).body.user.avatar;
  const second = (await call('/users/me', { method: 'PATCH', token: u.token, form: imageForm('avatar', PNG) })).body.user.avatar;
  assert.notEqual(first, second);
  assert.equal((await call(first.replace('/api', ''))).status, 404);
  assert.equal((await call(second.replace('/api', ''))).status, 200);

  const bioOnly = new FormData();
  bioOnly.append('bio', 'hi');
  const kept = (await call('/users/me', { method: 'PATCH', token: u.token, form: bioOnly })).body.user;
  assert.equal(kept.avatar, second, 'editing only the bio keeps the photo');
});

test('a story and its image expire at the same time', async () => {
  const u = await newUser();
  const { status } = await call('/stories', { method: 'POST', token: u.token, form: imageForm('image', PNG) });
  assert.equal(status, 201);
  const story = await mongoose.connection.db.collection('stories').findOne({ author: new mongoose.Types.ObjectId(u.id) });
  const image = await mongoose.connection.db.collection('images').findOne({ _id: story.image });
  assert.ok(image.expiresAt, 'story image has an expiry');
  assert.equal(image.expiresAt.getTime(), story.expiresAt.getTime());

  const indexes = await mongoose.connection.db.collection('images').indexes();
  assert.ok(indexes.some((i) => i.key.expiresAt === 1 && i.expireAfterSeconds === 0), 'TTL index on images');
});

test('an invalid feed cursor returns 400, not 500', async () => {
  const u = await newUser();
  const res = await call('/posts/feed?scope=global&before=banana', { token: u.token });
  assert.equal(res.status, 400);
  assert.equal((await call(`/posts/feed?scope=global&before=${new Date().toISOString()}`, { token: u.token })).status, 200);
});

test('messages: send, conversation list with unread count, reading clears it', async () => {
  const [a, b] = [await newUser(), await newUser()];
  await call(`/messages/${b.username}`, { method: 'POST', token: a.token, json: { text: 'hello' } });
  await call(`/messages/${b.username}`, { method: 'POST', token: a.token, json: { text: 'you there?' } });

  let convos = (await call('/messages/conversations', { token: b.token })).body.conversations;
  assert.equal(convos.length, 1);
  assert.equal(convos[0].user.username, a.username);
  assert.equal(convos[0].unread, 2);
  assert.equal(convos[0].last.text, 'you there?');

  const thread = (await call(`/messages/${a.username}`, { token: b.token })).body.messages.map((m) => m.text);
  assert.deepEqual(thread, ['hello', 'you there?']);
  convos = (await call('/messages/conversations', { token: b.token })).body.conversations;
  assert.equal(convos[0].unread, 0, 'opening the thread marks it read');

  assert.equal((await call(`/messages/${a.username}`, { method: 'POST', token: a.token, json: { text: 'me' } })).status, 400);
  assert.equal((await call(`/messages/${b.username}`, { method: 'POST', token: a.token, json: { text: '   ' } })).status, 400);
});
