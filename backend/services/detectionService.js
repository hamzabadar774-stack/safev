// Detection pipeline.
//
// A captured packet arrives here from either the Python packet-capture bridge
// or the /functions/simulate-traffic endpoint. Behaviour:
//   1. Persist the packet.
//   2. Run rule-based detection (+ optional ML).
//   3. If a detection fires:
//        - Deduplicate: look for an ACTIVE threat with the same
//          (source_ip, threat_type, target_device). If found, bump
//          occurrence_count / last_seen / confidence rather than inserting a
//          duplicate row.
//        - Otherwise insert a new threat, open an incident, write an alert.
//   4. Update the target CCTV device stats in-place (never create devices).
//   5. Update ML counters used by the dashboard.
//   6. Broadcast changes over Socket.IO.

const { v4: uuid } = require("uuid");
const db = require("../database/init");
const rules = require("./ruleEngine");
const ml = require("../ml/mlPlaceholder");
const { getIO } = require("../sockets");
const logger = require("../utils/logger");

// Threat lifecycle states used across the app.
const STATE = {
  DETECTED: "detected",
  INVESTIGATING: "investigating",
  BLOCKED: "blocked",
  RESOLVED: "resolved",
};
const ACTIVE_STATES = [STATE.DETECTED, STATE.INVESTIGATING];

function emit(event, payload) {
  const io = getIO();
  if (io) io.emit(event, payload);
}

function updateDeviceActivity(ipOrId, { isThreat, isBlocked }) {
  // Devices are registered once elsewhere; here we only update activity.
  // Match by id first (target_device may be a device id), then by ip.
  const device =
    db.prepare("SELECT * FROM cctv_devices WHERE id = ? OR ip_address = ? LIMIT 1")
      .get(ipOrId, ipOrId);
  if (!device) return;

  const now = new Date().toISOString();
  const threatLevel = isThreat
    ? (device.threat_level === "at_risk" ? "at_risk" : "suspicious")
    : device.threat_level || "safe";

  db.prepare(
    `UPDATE cctv_devices
       SET total_packets = COALESCE(total_packets, 0) + 1,
           blocked_attacks = COALESCE(blocked_attacks, 0) + ?,
           last_seen = ?,
           status = CASE WHEN status = 'offline' THEN 'online' ELSE status END,
           threat_level = ?
     WHERE id = ?`
  ).run(isBlocked ? 1 : 0, now, threatLevel, device.id);

  emit("db:cctv_devices", {
    eventType: "UPDATE",
    new: { ...device, last_seen: now, threat_level: threatLevel },
    table: "cctv_devices",
  });
}

async function analyze(packetInput) {
  const packet = {
    id: packetInput.id || uuid(),
    timestamp: packetInput.timestamp || new Date().toISOString(),
    source_ip: packetInput.source_ip || "0.0.0.0",
    destination_ip: packetInput.destination_ip || "0.0.0.0",
    source_port: packetInput.source_port || 0,
    destination_port: packetInput.destination_port || 0,
    protocol: packetInput.protocol || "TCP",
    packet_size: packetInput.packet_size || 0,
    flags: packetInput.flags || null,
    payload_preview: packetInput.payload_preview || null,
  };

  // 1) Persist packet
  db.prepare(
    `INSERT INTO network_packets
     (id,timestamp,source_ip,destination_ip,source_port,destination_port,protocol,packet_size,flags,payload_preview)
     VALUES (?,?,?,?,?,?,?,?,?,?)`
  ).run(
    packet.id, packet.timestamp, packet.source_ip, packet.destination_ip,
    packet.source_port, packet.destination_port, packet.protocol,
    packet.packet_size, packet.flags, packet.payload_preview
  );
  emit("db:network_packets", { eventType: "INSERT", new: packet, table: "network_packets" });

  // 2) Detection (rule engine + optional ML)
  const ruleHit = rules.evaluate(packet);
  let mlHit = null;
  if (ml.enabled) {
    try { mlHit = await ml.predict(packet); } catch (e) { logger.warn("ML predict failed:", e.message); }
  }
  const detection =
    mlHit && (!ruleHit || mlHit.confidence > ruleHit.confidence) ? mlHit : ruleHit;

  db.prepare("UPDATE ml_model_status SET total_predictions = total_predictions + 1").run();

  const analysis = detection
    ? { is_threat: true, ...detection }
    : {
        is_threat: false,
        threat_type: null,
        severity: "low",
        confidence: 0,
        description: "No anomaly detected",
        recommendation: "No action required",
      };

  const targetDevice = packetInput.target_device || packet.destination_ip;

  // Always update device activity so the dashboard reflects live traffic
  // without duplicating device rows.
  updateDeviceActivity(targetDevice, { isThreat: !!detection, isBlocked: false });

  let threat = null;
  if (detection) {
    const now = new Date().toISOString();
    const reason = detection.description;

    // 3a) Deduplicate against an active threat with the same identity.
    const existing = db.prepare(
      `SELECT * FROM threats
        WHERE source_ip = ?
          AND threat_type = ?
          AND target_device = ?
          AND status IN ('detected','investigating','new')
        ORDER BY updated_at DESC
        LIMIT 1`
    ).get(packet.source_ip, detection.threat_type, targetDevice);

    if (existing) {
      const nextCount = (existing.occurrence_count || 1) + 1;
      const nextConfidence = Math.max(existing.confidence || 0, detection.confidence);
      db.prepare(
        `UPDATE threats
            SET occurrence_count = ?,
                last_seen = ?,
                confidence = ?,
                severity = ?,
                description = ?,
                reason = ?,
                updated_at = ?
          WHERE id = ?`
      ).run(
        nextCount, now, nextConfidence, detection.severity,
        detection.description, reason, now, existing.id
      );

      db.prepare(
        `INSERT INTO alert_logs (id,threat_id,action,actor,notes) VALUES (?,?,?,?,?)`
      ).run(uuid(), existing.id, "recurrence", "system", `Recurrence #${nextCount}: ${reason}`);

      threat = { ...existing, occurrence_count: nextCount, last_seen: now, confidence: nextConfidence, updated_at: now };
      emit("db:threats", { eventType: "UPDATE", new: threat, table: "threats" });
      emit("threat:update", threat);
      logger.info(`Threat recurrence (#${nextCount}): ${detection.threat_type} from ${packet.source_ip}`);
    } else {
      // 3b) New threat record.
      threat = {
        id: uuid(),
        packet_id: packet.id,
        timestamp: packet.timestamp,
        threat_type: detection.threat_type,
        severity: detection.severity,
        confidence: detection.confidence,
        source_ip: packet.source_ip,
        target_device: targetDevice,
        description: detection.description,
        reason,
        ml_model_version: mlHit ? ml.version : "rule-v1",
        is_blocked: 0,
        action_taken: "alerted",
        status: STATE.DETECTED,
        occurrence_count: 1,
        first_seen: now,
        last_seen: now,
        updated_at: now,
      };
      db.prepare(
        `INSERT INTO threats
         (id,packet_id,timestamp,threat_type,severity,confidence,source_ip,target_device,description,ml_model_version,is_blocked,action_taken,status,updated_at,occurrence_count,first_seen,last_seen,reason)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
      ).run(
        threat.id, threat.packet_id, threat.timestamp, threat.threat_type,
        threat.severity, threat.confidence, threat.source_ip, threat.target_device,
        threat.description, threat.ml_model_version, threat.is_blocked,
        threat.action_taken, threat.status, threat.updated_at,
        threat.occurrence_count, threat.first_seen, threat.last_seen, threat.reason
      );

      const incidentId = uuid();
      db.prepare(
        `INSERT INTO incidents (id,threat_id,title,description,severity,status)
         VALUES (?,?,?,?,?,?)`
      ).run(
        incidentId, threat.id,
        `${detection.threat_type} from ${threat.source_ip}`,
        detection.description, threat.severity, "open"
      );

      const logId = uuid();
      db.prepare(
        `INSERT INTO alert_logs (id,threat_id,action,actor,notes) VALUES (?,?,?,?,?)`
      ).run(logId, threat.id, "created", "system", detection.recommendation);

      db.prepare("UPDATE ml_model_status SET threats_detected = threats_detected + 1").run();

      emit("db:threats", { eventType: "INSERT", new: threat, table: "threats" });
      emit("db:incidents", { eventType: "INSERT", new: { id: incidentId, threat_id: threat.id }, table: "incidents" });
      emit("db:alert_logs", {
        eventType: "INSERT",
        new: { id: logId, threat_id: threat.id, action: "created", actor: "system", notes: detection.recommendation, created_at: now },
        table: "alert_logs",
      });
      emit("threat:new", threat);
      logger.info(`Threat: ${detection.threat_type} (${detection.severity}) from ${threat.source_ip}`);
    }
  }

  return { packet, analysis, threat };
}

module.exports = { analyze, STATE, ACTIVE_STATES };
