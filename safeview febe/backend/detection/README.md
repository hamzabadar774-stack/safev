# Detection Engine

The detection service (`../services/detectionService.js`) receives packets
from either the Python packet-capture bridge (`../packetCapture/capture.py`)
or the `/functions/simulate-traffic` endpoint, and runs two detectors:

1. **Rule engine** (`../services/ruleEngine.js`) — stateless + short-window
   stateful rules for port scans, DDoS, brute force, RTSP exploits, and
   traffic to known-suspicious ports. Add rules by appending to the `RULES`
   array; each rule returns `null` or `{threat_type, severity, confidence,
   description, recommendation}`.

2. **ML model** (`../ml/mlPlaceholder.js`) — a stub you replace with your
   trained intrusion-detection model. See the ML section of the top-level
   `README.md` for the exact hook.

When a detection fires, the service:

- inserts a `threats` row,
- opens an `incidents` row,
- writes an `alert_logs` entry,
- increments the ML/model counters (used by `/dashboard/stats`),
- broadcasts `db:threats` / `db:incidents` / `db:alert_logs` /
  `threat:new` Socket.IO events so the frontend updates instantly.
