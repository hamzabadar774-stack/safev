require("dotenv").config();
const path = require("path");

module.exports = {
  port: parseInt(process.env.PORT || "4000", 10),
  jwtSecret: process.env.JWT_SECRET || "dev-secret-change-me",
  dbPath: process.env.DB_PATH || path.join(__dirname, "..", "database", "safeview.db"),
  corsOrigin: process.env.CORS_ORIGIN || "*",
  enableAutoReplay: process.env.ENABLE_AUTO_REPLAY === "true",
};

