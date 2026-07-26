// Endpoints matching the original Supabase Edge Functions.
//
// `simulate-traffic` replays N packets from the shipped dataset through the real
// detection pipeline when triggered manually from the Control Panel or API.
const { v4: uuid } = require("uuid");
const db = require("../database/init");
const detection = require("../services/detectionService");
const replay = require("../services/replayService");
const system = require("./systemController");
const { getIO } = require("../sockets");

exports.analyzePacket = async (req, res) => {
  const { packet } = req.body || {};
  if (!packet) return res.status(400).json({ success: false, error: "Missing packet" });
  const result = await detection.analyze(packet);
  return res.json({ success: true, data: result });
};

exports.simulateTraffic = async (req, res) => {
  const { count = 10 } = req.body || {};
  const n = Math.min(Math.max(parseInt(count, 10) || 10, 1), 500);
  const result = await replay.replayBatch(n);
  res.json({
    success: true,
    data: { ...result, blocked: 0 },
  });
};

exports.blockThreat = (req, res) => {
  const { threat_id } = req.body || {};
  if (!threat_id) return res.status(400).json({ success: false, error: "Missing threat_id" });
  const now = new Date().toISOString();
  db.prepare(
    "UPDATE threats SET is_blocked = 1, status = 'blocked', action_taken = 'blocked', updated_at = ? WHERE id = ?"
  ).run(now, threat_id);
  db.prepare(
    "INSERT INTO alert_logs (id, threat_id, action, actor, notes) VALUES (?,?,?,?,?)"
  ).run(uuid(), threat_id, "block", "analyst", "Threat blocked via API");
  const row = db.prepare("SELECT * FROM threats WHERE id = ?").get(threat_id);
  if (row && row.target_device) {
    db.prepare(
      "UPDATE cctv_devices SET blocked_attacks = COALESCE(blocked_attacks,0) + 1 WHERE id = ? OR ip_address = ?"
    ).run(row.target_device, row.target_device);
  }
  const io = getIO();
  if (io && row) {
    io.emit("db:threats", { eventType: "UPDATE", new: row, table: "threats" });
    io.emit("db:alert_logs", {
      eventType: "INSERT",
      new: { threat_id, action: "block", actor: "analyst", created_at: now },
      table: "alert_logs",
    });
  }
  res.json({ success: true, data: row });
};
