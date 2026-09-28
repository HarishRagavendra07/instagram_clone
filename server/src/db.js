import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Uses MONGO_URI when set; otherwise starts an embedded MongoDB that persists to server/.data
export async function connectDb() {
  let uri = process.env.MONGO_URI;
  if (!uri) {
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    const dbPath = path.join(__dirname, '..', '.data');
    fs.mkdirSync(dbPath, { recursive: true });
    const server = await MongoMemoryServer.create({
      instance: { dbPath, storageEngine: 'wiredTiger', port: 27018 },
    });
    uri = server.getUri('instagram');
    const stop = async () => {
      await mongoose.disconnect();
      await server.stop({ doCleanup: false });
      process.exit(0);
    };
    process.once('SIGINT', stop);
    process.once('SIGTERM', stop);
    console.log('Using embedded MongoDB (data in server/.data)');
  }
  await mongoose.connect(uri);
}
