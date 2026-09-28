import { Server } from 'socket.io';
import { verifyToken } from './middleware/auth.js';

let io;

export function initRealtime(httpServer) {
  io = new Server(httpServer, { cors: { origin: true } });
  io.use((socket, next) => {
    try {
      socket.userId = verifyToken(socket.handshake.auth?.token);
      next();
    } catch {
      next(new Error('Not authenticated'));
    }
  });
  io.on('connection', (socket) => {
    socket.join(`user:${socket.userId}`);
  });
}

export function emitAll(event, payload) {
  io?.emit(event, payload);
}

export function emitToUser(userId, event, payload) {
  io?.to(`user:${userId}`).emit(event, payload);
}
