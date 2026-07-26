const http = require("http");
const express = require("express");
const cors = require("cors");
const config = require("./config");
const sockets = require("./sockets");
const routes = require("./routes");
const logger = require("./utils/logger");

// Ensure DB is initialized before accepting requests (sql.js loads async).
const { ready: dbReady } = require("./database/init");

const app = express();
app.use(cors({ origin: config.corsOrigin === "*" ? true : config.corsOrigin.split(","), credentials: true }));
app.use(express.json({ limit: "2mb" }));
app.use((req, _res, next) => { logger.info(req.method, req.url); next(); });
app.use("/", routes);

const httpServer = http.createServer(app);
sockets.init(httpServer);

dbReady
  .then(async () => {
    // Start demo replay if system is in Demo Mode (persisted in settings).
    try {
      const system = require("./controllers/systemController");
      await system.bootstrap();
    } catch (e) {
      logger.warn("System bootstrap failed:", e.message);
    }
    httpServer.listen(config.port, () => {
      logger.info(`SafeView backend listening on http://localhost:${config.port}`);
    });
  })
  .catch((err) => {
    logger.error("Failed to initialize database:", err);
    process.exit(1);
  });
