// Dashboard uses live SQLite aggregates — never hardcoded values.
const db = require("../database/init");

exports.stats = (_req, res) => {
  const packets = db.prepare("SELECT COUNT(*) AS c FROM network_packets").get().c;
  const threats = db.prepare("SELECT COUNT(*) AS c FROM threats").get().c;
  const blocked = db.prepare("SELECT COUNT(*) AS c FROM threats WHERE is_blocked = 1").get().c;
  const critical = db.prepare("SELECT COUNT(*) AS c FROM threats WHERE severity = 'critical'").get().c;
  const active = db.prepare("SELECT COUNT(*) AS c FROM cctv_devices WHERE status = 'online'").get().c;
  const blockRate = threats > 0 ? (blocked / threats) * 100 : 0;
  res.json({
    success: true,
    data: {
      packets_analyzed: packets,
      threats_detected: threats,
      attacks_blocked: blocked,
      active_devices: active,
      block_rate: blockRate,
      critical_threats: critical,
    },
    timestamp: new Date().toISOString(),
  });
};
