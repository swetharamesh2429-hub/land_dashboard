let ioInstance = null;

export const initSocket = (io) => {
  ioInstance = io;

  io.on('connection', (socket) => {
    console.log(`🔌 Client connected to Real-Time Gateway: ${socket.id}`);

    // Join specific district room (e.g., 'district:EKH')
    socket.on('join_district', (districtId) => {
      socket.join(`district:${districtId}`);
      console.log(`📍 Socket ${socket.id} joined room district:${districtId}`);
    });

    // Join user specific room
    socket.on('join_user', (userId) => {
      socket.join(`user:${userId}`);
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Client disconnected: ${socket.id}`);
    });
  });
};

export const getIO = () => {
  if (!ioInstance) {
    throw new Error('Socket.io has not been initialized!');
  }
  return ioInstance;
};

export const emitEvent = (eventName, data, districtId = null) => {
  if (!ioInstance) return;
  if (districtId) {
    ioInstance.to(`district:${districtId}`).emit(eventName, data);
  }
  // Also emit to all connected clients for global live feeds
  ioInstance.emit(eventName, data);
};
