# SafeView IDPS

AI-assisted **Intrusion Detection & Prevention System** for CCTV networks.
Built as a university Final Year Project. Modular, defendable, no fake ML.

- **Frontend** — React 18 + Vite + Tailwind + shadcn/ui
- **Backend** — Node.js + Express + Socket.IO + SQLite (via `sql.js`, no native build)
- **Detection** — rule engine with confidence scoring + reasons, extensible to real ML
- **Packet capture** — Python + PyShark script that POSTs live packets to the backend

---

## 1. Architecture

```text
 ┌──────────────────┐   REST + Socket.IO   ┌──────────────────────────┐
 │  React frontend  │  ◄─────────────────► │  Express backend         │
 │  (Vite, :8080)   │                      │  (Node, :4000)           │
 └──────────────────┘                      │   ├─ Auth (JWT)          │
                                           │   ├─ Generic /db/:table  │
 ┌──────────────────┐   HTTP POST          │   ├─ Detection service   │
 │  Python capture  │  ──────────────────► │   │   └─ rule engine     │
 │  (PyShark)       │   /capture/packet    │   ├─ Replay service      │
 └──────────────────┘                      │   ├─ System (mode/status)│
                                           │   └─ SQLite (sql.js)     │
                                           └──────────────────────────┘
```

The frontend never talks to Supabase. `src/integrations/supabase/client.ts`
is a compatibility shim that translates the small Supabase surface used by
the UI into REST + Socket.IO calls against the backend.

---

## 2. Running the project

### Prerequisites
- Node.js ≥ 18
- (Optional) Python 3.10+ for live packet capture

### Install
```bash
# Frontend
npm install          # or: bun install

# Backend
cd backend
npm install
cd ..
```

### Start
```bash
# Terminal 1 — backend
cd backend
npm start            # -> http://localhost:4000

# Terminal 2 — frontend
npm run dev          # -> http://localhost:8080
```

The frontend expects the backend at `http://localhost:4000`.
Override with `VITE_API_URL` in `.env` if needed.

---

## 3. Demo Mode vs Live Mode

Toggle from the **Backend Status** panel on the Dashboard, or via API:

```bash
curl -X POST http://localhost:4000/system/mode \
  -H "Content-Type: application/json" -d '{"mode":"demo"}'
```

| Mode  | Source of packets                              | Simulation button |
|-------|------------------------------------------------|-------------------|
| Demo  | Replay of `backend/data/replay-dataset.json`   | Enabled           |
| Live  | Only Python capture / real POSTs to `/capture/packet` | Disabled (409) |

In Live Mode with no captured traffic, widgets show
"Waiting for network traffic…" — nothing is fabricated.

The mode is persisted in the `settings` table and survives restarts.

---

## 4. Detection engine

`backend/services/ruleEngine.js` inspects each packet against these rules:

| Rule              | Trigger                                                    | Severity |
|-------------------|------------------------------------------------------------|----------|
| Suspicious port   | Destination port ∈ {23, 2323, 4444, 5555, 31337}           | high     |
| Port scan         | >15 unique destination ports from same source in 5s        | medium   |
| DDoS              | >200 packets to same destination in 3s                     | critical |
| Brute force       | >30 attempts to SSH/Telnet/FTP/RDP from same source in 15s | high     |
| RTSP exploit      | Oversized packet (>1400B) to port 554                      | high     |

Every detection returns:
```
{ threat_type, severity, confidence, description, recommendation }
```
`description` is a human-readable reason (e.g. *"Port scan: 17 distinct ports
probed by 203.0.113.7 in 5s"*) and is persisted to `threats.reason`.

### Threat lifecycle
`detected → investigating → blocked → resolved`.
Repeated matches on the same `(source_ip, threat_type, target_device)` do
**not** create new rows — they bump `occurrence_count`, `last_seen`, and
`confidence`, and append a `recurrence` entry to `alert_logs`.

### Adding your trained ML model later

`backend/ml/mlPlaceholder.js` exports a `predict(packet)` stub. Steps:

1. Convert your model to something Node can call:
   - **Python microservice** (Flask/FastAPI) — easiest; POST the packet, get back `{threat_type, severity, confidence}`.
   - **ONNX** via `onnxruntime-node` — pure Node inference.
   - **TensorFlow.js** — for lightweight models.
2. Set `enabled = true` in `mlPlaceholder.js` and implement `predict()`.
3. `detectionService.js` will merge the ML output with rule output and pick
   whichever has higher confidence — no other code changes needed.

---

## 5. Connecting a real IP camera

1. Register the camera in the UI (**Devices → Add device**) with its real
   `ip_address`. The backend dedupes by IP, so re-adding never duplicates.
2. Point PyShark at the interface the camera lives on:

   ```bash
   cd backend/packetCapture
   pip install -r requirements.txt
   sudo python3 capture.py --interface eth0 \
        --backend http://localhost:4000/capture/packet
   ```

3. Every captured packet flows through the detection pipeline. The
   `target_device` for threats is resolved by destination IP.

For RTSP feeds inside the UI, add the stream URL when creating the device
(e.g. `rtsp://user:pass@192.168.1.101:554/stream1`).

---

## 6. Data flow

1. Packet arrives (replay, PyShark, or manual `/functions/analyze-packet`).
2. `detectionService.analyze()`:
   1. Inserts row in `network_packets`, emits `db:network_packets`.
   2. Runs rule engine (+ ML if enabled).
   3. Updates `cctv_devices` counters in-place (never inserts).
   4. On threat: dedup against active threats → insert / update, open
      `incident`, write `alert_log`, bump `ml_model_status` counters,
      emit `db:threats` / `db:incidents` / `db:alert_logs`.
3. Frontend hooks subscribed via the Socket.IO shim receive live updates.
4. On refresh, every widget re-fetches from the backend — no reset.

---

## 7. API surface

| Method | Path                              | Purpose                                |
|--------|-----------------------------------|----------------------------------------|
| POST   | `/auth/register`                  | Create user, returns JWT               |
| POST   | `/auth/login`                     | Login, returns JWT                     |
| GET    | `/auth/me`                        | Current user                           |
| PATCH  | `/auth/update`                    | Update profile / password              |
| POST   | `/db/:table`                      | Generic query (select/insert/update/delete) |
| POST   | `/functions/analyze-packet`       | Analyze a single packet                |
| POST   | `/functions/simulate-traffic`     | Replay N packets from dataset (demo only) |
| POST   | `/functions/block-threat`         | Mark a threat as blocked               |
| POST   | `/capture/packet`                 | Ingest a live packet from PyShark      |
| GET    | `/dashboard/stats`                | Aggregate KPIs                         |
| GET    | `/system/status`                  | Backend + DB + engine + counters       |
| GET    | `/system/mode`                    | Current mode (demo/live)               |
| POST   | `/system/mode`                    | Switch mode                            |

---

## 8. Project layout

```text
backend/
  config/               # env-driven config
  controllers/          # auth, db, functions, dashboard, system
  services/             # detectionService, ruleEngine, replayService
  ml/                   # ML placeholder — replace with real inference
  packetCapture/        # PyShark capture bridge
  database/             # sql.js init + safeview.db
  data/                 # replay-dataset.json
  routes/, sockets/, middleware/, utils/

src/
  pages/                # Dashboard, Devices, Incidents, Alerts, Reports, ...
  components/dashboard/ # Real* widgets (backend-driven)
  hooks/                # useAuth, useRealtimeData
  services/             # safeviewApi, systemApi, alertsApi, cameraApi
  integrations/supabase/# Backend compatibility shim
```

---

## 9. Where future ML integration goes

- **`backend/ml/mlPlaceholder.js`** — swap for real inference.
- **`backend/services/detectionService.js`** — already fuses rule + ML output;
  no changes needed once the placeholder exports `enabled = true`.
- **Datasets** — CIC-IDS2017, NSL-KDD, or your own PCAP → CSV → JSON
  can be dropped into `backend/data/replay-dataset.json` for Demo Mode.

---

## 10. Notes for viva

- No random data at runtime. Demo Mode replays a deterministic dataset.
- No fake ML. Confidence + reason come from explicit rules; the ML hook
  is stubbed and clearly marked as future work.
- All persistence is in SQLite via `sql.js` — reload the page, everything
  stays. Nothing lives in memory-only stores or localStorage (except JWT).
- Threat dedup, device dedup, and lifecycle states are all enforced
  server-side and can be demonstrated by re-sending the same packet.
