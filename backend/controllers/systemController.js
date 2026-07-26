// System-level endpoints: mode toggle (demo/live) and status panel.
//
// Mode is persisted in the `settings` table so a page refresh doesn't lose it.
// Live Mode disables the replay player and refuses simulate-traffic calls so
// the dashboard reflects only real network activity.

const db = require("../database/init");
const replay = require("../services/replayService");
const config = require("../config");

const MODE_KEY = "system.mode";
const DEFAULT_MODE = "live";

function readMode() {
  const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(MODE_KEY);
  return row?.value ? row.value : DEFAULT_MODE;
}

function writeMode(mode) {
  const value = mode === "demo" ? "demo" : "live";
  const existing = db.prepare("SELECT key FROM settings WHERE key = ?").get(MODE_KEY);
  if (existing) {
    db.prepare("UPDATE settings SET value = ? WHERE key = ?").run(value, MODE_KEY);
  } else {
    db.prepare("INSERT INTO settings (key, value) VALUES (?, ?)").run(MODE_KEY, value);
  }
  return value;
}

exports.currentMode = readMode;

exports.getMode = (_req, res) => {
  res.json({ mode: readMode(), replay_running: replay.isRunning() });
};

exports.setMode = async (req, res) => {
  const mode = writeMode(req.body?.mode);
  if (mode === "demo") {
    await replay.start({ speed: 2 });
  } else {
    await replay.stop();
  }
  res.json({ mode, replay_running: replay.isRunning() });
};

exports.status = (_req, res) => {
  const packets = db.prepare("SELECT COUNT(*) AS c FROM network_packets").get().c;
  const threatsActive = db
    .prepare("SELECT COUNT(*) AS c FROM threats WHERE status IN ('detected','investigating','new')")
    .get().c;
  const devicesTotal = db.prepare("SELECT COUNT(*) AS c FROM cctv_devices").get().c;
  const devicesOnline = db
    .prepare("SELECT COUNT(*) AS c FROM cctv_devices WHERE status = 'online'")
    .get().c;

  res.json({
    backend_connected: true,
    database_connected: true,
    detection_engine_running: true,
    replay_running: replay.isRunning(),
    mode: readMode(),
    cameras_total: devicesTotal,
    cameras_online: devicesOnline,
    packets_total: packets,
    threats_active: threatsActive,
    port: config.port,
    uptime_seconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
};

// Called from server.js after DB is ready — automatic replay is disabled by default (LIVE/IDLE mode).
// Set ENABLE_AUTO_REPLAY=true in environment to enable automatic replay on startup.
exports.bootstrap = async () => {
  if (config.enableAutoReplay && readMode() === "demo") {
    await replay.start({ speed: 2 });
  } else if (!config.enableAutoReplay && replay.isRunning()) {
    await replay.stop();
  }
};
