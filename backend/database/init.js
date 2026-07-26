// SQLite bootstrap using sql.js (pure WebAssembly — no native compilation).
// Exposes a tiny synchronous wrapper that mimics the subset of the
// better-sqlite3 API used across the backend:
//   db.prepare(sql).run(...params) -> { changes, lastInsertRowid }
//   db.prepare(sql).get(...params) -> row | undefined
//   db.prepare(sql).all(...params) -> row[]
//   db.exec(sql)
//   db.pragma(str)   // no-op (sql.js ignores most pragmas)
//
// The database is loaded from `config.dbPath` at startup (if present) and
// persisted back to disk after every write, debounced by 200ms.
//
// Because sql.js must be initialized asynchronously, this module exports a
// `ready` promise. `server.js` awaits it before starting the HTTP listener.
// All controllers only touch the db inside request handlers, so they see a
// fully-initialized wrapper by the time requests arrive.

const fs = require("fs");
const path = require("path");
const initSqlJs = require("sql.js");
const config = require("../config");

fs.mkdirSync(path.dirname(config.dbPath), { recursive: true });

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  role TEXT DEFAULT 'analyst',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cctv_devices (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  ip_address TEXT,
  mac_address TEXT,
  device_type TEXT DEFAULT 'IP Camera',
  manufacturer TEXT,
  status TEXT DEFAULT 'offline',
  last_seen TEXT,
  location TEXT,
  firmware_version TEXT,
  threat_level TEXT DEFAULT 'safe',
  total_packets INTEGER DEFAULT 0,
  blocked_attacks INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS network_packets (
  id TEXT PRIMARY KEY,
  timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
  source_ip TEXT,
  destination_ip TEXT,
  source_port INTEGER,
  destination_port INTEGER,
  protocol TEXT,
  packet_size INTEGER,
  flags TEXT,
  payload_preview TEXT
);

CREATE TABLE IF NOT EXISTS threats (
  id TEXT PRIMARY KEY,
  packet_id TEXT,
  timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
  threat_type TEXT,
  severity TEXT DEFAULT 'low',
  confidence REAL DEFAULT 0,
  source_ip TEXT,
  target_device TEXT,
  description TEXT,
  ml_model_version TEXT DEFAULT 'rule-v1',
  is_blocked INTEGER DEFAULT 0,
  action_taken TEXT DEFAULT 'alerted',
  status TEXT DEFAULT 'new',
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS incidents (
  id TEXT PRIMARY KEY,
  threat_id TEXT,
  title TEXT,
  description TEXT,
  severity TEXT DEFAULT 'low',
  status TEXT DEFAULT 'open',
  assigned_to TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS alert_logs (
  id TEXT PRIMARY KEY,
  threat_id TEXT,
  action TEXT,
  actor TEXT,
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS traffic_stats (
  id TEXT PRIMARY KEY,
  timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
  total_packets INTEGER DEFAULT 0,
  safe_packets INTEGER DEFAULT 0,
  suspicious_packets INTEGER DEFAULT 0,
  blocked_packets INTEGER DEFAULT 0,
  bandwidth_mbps REAL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS ml_model_status (
  id TEXT PRIMARY KEY,
  is_active INTEGER DEFAULT 1,
  model_name TEXT DEFAULT 'safeview-rules',
  model_version TEXT DEFAULT 'rule-v1',
  accuracy REAL DEFAULT 0.85,
  last_trained TEXT,
  total_predictions INTEGER DEFAULT 0,
  threats_detected INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

CREATE INDEX IF NOT EXISTS idx_packets_ts ON network_packets(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_threats_ts ON threats(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_ts ON alert_logs(created_at DESC);
`;

// Internal handle; populated once sql.js resolves.
let rawDb = null;

// Debounced persistence to disk.
let saveTimer = null;
function scheduleSave() {
  if (!rawDb) return;
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    try {
      const data = Buffer.from(rawDb.export());
      fs.writeFileSync(config.dbPath, data);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("Failed to persist DB:", e.message);
    }
  }, 200);
}

function isWrite(sql) {
  return /^\s*(INSERT|UPDATE|DELETE|REPLACE|CREATE|DROP|ALTER)\b/i.test(sql);
}

// better-sqlite3-compatible facade around sql.js.
const db = {
  prepare(sql) {
    if (!rawDb) throw new Error("Database not initialized yet");
    return {
      run: (...params) => {
        const stmt = rawDb.prepare(sql);
        try {
          stmt.run(params);
        } finally {
          stmt.free();
        }
        const changes = rawDb.getRowsModified();
        if (isWrite(sql)) scheduleSave();
        return { changes, lastInsertRowid: undefined };
      },
      get: (...params) => {
        const stmt = rawDb.prepare(sql);
        try {
          stmt.bind(params);
          if (stmt.step()) return stmt.getAsObject();
          return undefined;
        } finally {
          stmt.free();
        }
      },
      all: (...params) => {
        const stmt = rawDb.prepare(sql);
        const rows = [];
        try {
          stmt.bind(params);
          while (stmt.step()) rows.push(stmt.getAsObject());
        } finally {
          stmt.free();
        }
        return rows;
      },
    };
  },
  exec(sql) {
    if (!rawDb) throw new Error("Database not initialized yet");
    rawDb.exec(sql);
    if (isWrite(sql)) scheduleSave();
  },
  pragma() {
    // sql.js ignores most pragmas (no WAL, no filesystem). No-op.
  },
};

const ready = (async () => {
  const SQL = await initSqlJs({
    // Resolve the .wasm from the installed package so nothing is downloaded.
    locateFile: (file) => path.join(path.dirname(require.resolve("sql.js")), file),
  });

  const buffer = fs.existsSync(config.dbPath) ? fs.readFileSync(config.dbPath) : null;
  rawDb = buffer ? new SQL.Database(buffer) : new SQL.Database();

  rawDb.exec(SCHEMA);

  // Additive migrations — safe to run repeatedly. sql.js has no
  // "ADD COLUMN IF NOT EXISTS", so we swallow the duplicate-column error.
  const addColumn = (sql) => {
    try { rawDb.exec(sql); } catch (e) { /* column already exists */ }
  };
  addColumn("ALTER TABLE threats ADD COLUMN occurrence_count INTEGER DEFAULT 1");
  addColumn("ALTER TABLE threats ADD COLUMN last_seen TEXT");
  addColumn("ALTER TABLE threats ADD COLUMN first_seen TEXT");
  addColumn("ALTER TABLE threats ADD COLUMN reason TEXT");

  // Seed a single ML status row if missing so the frontend always has data.
  const mlRow = db.prepare("SELECT id FROM ml_model_status LIMIT 1").get();
  if (!mlRow) {
    db.prepare(
      "INSERT INTO ml_model_status (id, is_active, model_name, model_version, accuracy, last_trained, total_predictions, threats_detected) VALUES (?, 1, ?, ?, ?, ?, 0, 0)"
    ).run(
      require("uuid").v4(),
      "safeview-rules",
      "rule-v1",
      0.87,
      new Date().toISOString()
    );
  }

  // Flush any pending writes on shutdown.
  const flush = () => {
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
    try {
      fs.writeFileSync(config.dbPath, Buffer.from(rawDb.export()));
    } catch {}
  };
  process.on("exit", flush);
  process.on("SIGINT", () => { flush(); process.exit(0); });
  process.on("SIGTERM", () => { flush(); process.exit(0); });

  return db;
})();

module.exports = db;
module.exports.ready = ready;
