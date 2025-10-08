import { Server } from 'socket.io';

let io: Server;

export const setIoInstance = (socketIo: Server) => {
  io = socketIo;
};

export const getIoInstance = (): Server => {
  if (!io) {
    throw new Error('Socket.IO instance not initialized');
  }
  return io;
};

export { io };