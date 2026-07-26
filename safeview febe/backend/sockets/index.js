// Socket.IO singleton. Server bootstrap calls `init(server)` once, and any
// module that needs to push events calls `getIO()`.
const { Server } = require("socket.io");
const logger = require("../utils/logger");
const config = require("../config");

let io = null;

function init(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: config.corsOrigin === "*" ? true : config.corsOrigin.split(","), credentials: true },
  });
  io.on("connection", (socket) => {
    logger.info(`socket connected: ${socket.id}`);
    socket.on("disconnect", () => logger.info(`socket disconnected: ${socket.id}`));
  });
  return io;
}

function getIO() { return io; }

module.exports = { init, getIO };
