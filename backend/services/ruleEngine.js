// Rule-based intrusion detection.
//
// Each rule inspects a packet (and short recent history for stateful rules)
// and returns a detection when it fires. Rules are intentionally small and
// self-contained so an ML model added later in /backend/ml can either replace
// or supplement them.
//
// Detection shape:
//   { threat_type, severity, confidence, description, recommendation }

const RECENT_WINDOW_MS = 10_000;
const recent = []; // rolling packet buffer

function prune(now) {
  while (recent.length && now - recent[0].t > RECENT_WINDOW_MS) recent.shift();
}

const SUSPICIOUS_PORTS = new Set([23, 2323, 5555, 4444, 31337]);
const CAMERA_PORTS = new Set([554, 80, 443, 8000, 8080, 8899]);

function ruleSuspiciousPort(pkt) {
  if (SUSPICIOUS_PORTS.has(pkt.destination_port)) {
    return {
      threat_type: "unauthorized_access",
      severity: "high",
      confidence: 0.9,
      description: `Traffic to suspicious port ${pkt.destination_port} from ${pkt.source_ip}`,
      recommendation: "Block source IP at the perimeter firewall and audit device exposure.",
    };
  }
  return null;
}

function rulePortScan(pkt, now) {
  const from = recent.filter(
    (p) => p.pkt.source_ip === pkt.source_ip && now - p.t < 5_000
  );
  const uniquePorts = new Set(from.map((p) => p.pkt.destination_port));
  uniquePorts.add(pkt.destination_port);
  if (uniquePorts.size > 15) {
    return {
      threat_type: "port_scan",
      severity: "medium",
      confidence: 0.85,
      description: `Port scan: ${uniquePorts.size} distinct ports probed by ${pkt.source_ip} in 5s`,
      recommendation: "Rate-limit or block the source IP and investigate the origin.",
    };
  }
  return null;
}

function ruleDdos(pkt, now) {
  const toTarget = recent.filter(
    (p) => p.pkt.destination_ip === pkt.destination_ip && now - p.t < 3_000
  );
  if (toTarget.length > 200) {
    return {
      threat_type: "ddos_attack",
      severity: "critical",
      confidence: 0.92,
      description: `Volumetric traffic to ${pkt.destination_ip} — ${toTarget.length} pkts / 3s`,
      recommendation: "Enable upstream DDoS scrubbing and drop traffic from top source IPs.",
    };
  }
  return null;
}

function ruleBruteForce(pkt, now) {
  if (![22, 23, 21, 3389].includes(pkt.destination_port)) return null;
  const attempts = recent.filter(
    (p) =>
      p.pkt.source_ip === pkt.source_ip &&
      p.pkt.destination_port === pkt.destination_port &&
      now - p.t < 15_000
  );
  if (attempts.length > 30) {
    return {
      threat_type: "brute_force",
      severity: "high",
      confidence: 0.88,
      description: `Repeated auth attempts from ${pkt.source_ip} on port ${pkt.destination_port}`,
      recommendation: "Enforce account lockout and disable password auth on exposed services.",
    };
  }
  return null;
}

function ruleRtspExploit(pkt) {
  if (pkt.destination_port === 554 && pkt.packet_size > 1400) {
    return {
      threat_type: "rtsp_exploit",
      severity: "high",
      confidence: 0.8,
      description: `Oversized RTSP packet (${pkt.packet_size} bytes) targeting camera port 554`,
      recommendation: "Patch camera firmware and restrict RTSP access to trusted networks.",
    };
  }
  return null;
}

function ruleCameraProbe(pkt) {
  if (CAMERA_PORTS.has(pkt.destination_port) && pkt.protocol === "TCP" && (pkt.flags || "").includes("SYN")) {
    // Not itself a threat, but a signal we track for context.
    return null;
  }
  return null;
}

const RULES = [ruleSuspiciousPort, rulePortScan, ruleDdos, ruleBruteForce, ruleRtspExploit, ruleCameraProbe];

function evaluate(pkt) {
  const now = Date.now();
  prune(now);
  for (const rule of RULES) {
    const hit = rule(pkt, now);
    if (hit) {
      recent.push({ pkt, t: now });
      return hit;
    }
  }
  recent.push({ pkt, t: now });
  return null;
}

module.exports = { evaluate };
