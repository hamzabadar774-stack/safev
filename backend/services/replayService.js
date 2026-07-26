// Demo-mode replay service.
//
// Instead of generating random packets, we replay a small chronological
// dataset (backend/data/replay-dataset.json) through the same detection
// pipeline used by live capture. This means:
//   - Every packet is stored in `network_packets`.
//   - Detections go through `ruleEngine` and produce real, deduplicated
//     threat records with confidence scores and reasons.
//   - The dashboard reflects real backend state — nothing is faked.
//
// A single global "player" is exposed. Start/stop is controlled by the
// system controller (mode toggle) or the /functions/simulate-traffic
// endpoint for one-shot batches.
//
// To swap datasets, replace `data/replay-dataset.json` with any file that
// contains: [{ offset_ms, source_ip, destination_ip, source_port,
// destination_port, protocol, packet_size, flags }, ...].

const fs = require("fs");
const path = require("path");
const { v4: uuid } = require("uuid");
const detection = require("./detectionService");
const logger = require("../utils/logger");

const DATASET_PATH = path.join(__dirname, "..", "data", "replay-dataset.json");

function loadDataset() {
  try {
    return JSON.parse(fs.readFileSync(DATASET_PATH, "utf8"));
  } catch (e) {
    logger.warn("Replay dataset missing, using empty set:", e.message);
    return [];
  }
}

// Play the dataset once, timed by offset_ms. Returns a summary.
async function replayOnce({ speed = 1, loop = false } = {}) {
  const dataset = loadDataset();
  if (!dataset.length) return { packets: 0, threats: 0 };

  let threats = 0;
  const t0 = Date.now();
  do {
    const startedAt = Date.now();
    for (const row of dataset) {
      const wait = Math.max(0, row.offset_ms / speed - (Date.now() - startedAt));
      if (wait) await new Promise((r) => setTimeout(r, wait));
      const pkt = {
        id: uuid(),
        timestamp: new Date().toISOString(),
        source_ip: row.source_ip,
        destination_ip: row.destination_ip,
        source_port: row.source_port,
        destination_port: row.destination_port,
        protocol: row.protocol,
        packet_size: row.packet_size,
        flags: row.flags,
      };
      const r = await detection.analyze(pkt);
      if (r.threat) threats++;
    }
  } while (loop && (Date.now() - t0) < 24 * 60 * 60 * 1000);

  return { packets: dataset.length, threats };
}

// Long-running player used by Demo Mode.
let running = false;
let currentTask = null;

function isRunning() { return running; }

async function start({ speed = 2 } = {}) {
  if (running) return;
  running = true;
  logger.info("Demo replay started");
  currentTask = (async () => {
    while (running) {
      try {
        await replayOnce({ speed, loop: false });
      } catch (e) {
        logger.warn("Replay iteration failed:", e.message);
      }
      // small pause between loops so the dashboard shows steady state
      await new Promise((r) => setTimeout(r, 2000));
    }
    logger.info("Demo replay stopped");
  })();
}

async function stop() {
  running = false;
  if (currentTask) {
    try { await currentTask; } catch {}
    currentTask = null;
  }
}

// Fast synchronous replay of the first N rows — used by
// /functions/simulate-traffic so the existing UI button still works.
async function replayBatch(count = 10) {
  const dataset = loadDataset();
  const rows = dataset.slice(0, Math.min(dataset.length, Math.max(1, count)));
  let threats = 0;
  const results = [];
  for (const row of rows) {
    const pkt = {
      id: uuid(),
      timestamp: new Date().toISOString(),
      source_ip: row.source_ip,
      destination_ip: row.destination_ip,
      source_port: row.source_port,
      destination_port: row.destination_port,
      protocol: row.protocol,
      packet_size: row.packet_size,
      flags: row.flags,
    };
    const r = await detection.analyze(pkt);
    results.push(r);
    if (r.threat) threats++;
  }
  return { packets_generated: rows.length, threats_detected: threats, results };
}

module.exports = { start, stop, isRunning, replayBatch, replayOnce };
