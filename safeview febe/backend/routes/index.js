const express = require("express");
const auth = require("../controllers/authController");
const dbCtrl = require("../controllers/dbController");
const fns = require("../controllers/functionsController");
const dash = require("../controllers/dashboardController");
const system = require("../controllers/systemController");
const { requireAuth, optionalAuth } = require("../middleware/auth");

const router = express.Router();

router.get("/health", (_req, res) => res.json({ ok: true, service: "safeview-backend" }));

// Auth
router.post("/auth/register", auth.register);
router.post("/auth/login", auth.login);
router.get("/auth/me", requireAuth, auth.me);
router.patch("/auth/update", requireAuth, auth.update);

// Generic table access (used by the frontend shim).
router.post("/db/:table", optionalAuth, dbCtrl.query);

// Edge-function equivalents
router.post("/functions/analyze-packet", optionalAuth, fns.analyzePacket);
router.post("/functions/simulate-traffic", optionalAuth, fns.simulateTraffic);
router.post("/functions/block-threat", optionalAuth, fns.blockThreat);

// System status + mode toggle (Demo / Live)
router.get("/system/status", system.status);
router.get("/system/mode", system.getMode);
router.post("/system/mode", optionalAuth, system.setMode);

// Explicit REST surface
router.get("/dashboard/stats", dash.stats);

// Packet capture bridge — Python capture script POSTs here.
router.post("/capture/packet", async (req, res) => {
  const detection = require("../services/detectionService");
  try {
    const result = await detection.analyze(req.body || {});
    res.json({ ok: true, threat: result.threat, analysis: result.analysis });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

module.exports = router;
