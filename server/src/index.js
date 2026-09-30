import http from 'node:http';
import { connectDb } from './db.js';
import { initRealtime } from './realtime.js';
import { createApp } from './app.js';

const PORT = process.env.PORT || 4000;

await connectDb();
const server = http.createServer(createApp());
initRealtime(server);
server.listen(PORT, () => console.log(`API listening on http://localhost:${PORT}`));
