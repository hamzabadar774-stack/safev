# SafeView Python Backend API Specification

This document describes the API endpoints your Python backend (Django/Flask) should implement to connect with the SafeView React dashboard.

## Base URL Configuration

Set the `VITE_API_URL` environment variable in your React app to point to your Python backend:

```bash
# .env.local
VITE_API_URL=http://localhost:8000/api
```

## API Endpoints

### 1. Dashboard Statistics
```
GET /api/dashboard/stats
```

**Response:**
```json
{
  "success": true,
  "data": {
    "packets_analyzed": 2400000,
    "threats_detected": 147,
    "attacks_blocked": 142,
    "active_devices": 6,
    "block_rate": 96.6,
    "critical_threats": 23
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### 2. Real-time Packets
```
GET /api/packets/realtime
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "pkt-12345",
      "timestamp": "2024-01-15T10:30:00.123Z",
      "source_ip": "203.45.67.89",
      "destination_ip": "192.168.1.101",
      "source_port": 54321,
      "destination_port": 554,
      "protocol": "RTSP",
      "packet_size": 1024,
      "flags": "SYN"
    }
  ],
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### 3. Threat Detections
```
GET /api/threats/realtime
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "threat-abc123",
      "packet_id": "pkt-12345",
      "timestamp": "2024-01-15T10:30:00Z",
      "threat_type": "brute_force",
      "severity": "high",
      "confidence": 0.94,
      "source_ip": "203.45.67.89",
      "target_device": "Front Entrance Cam",
      "description": "Multiple failed authentication attempts detected",
      "ml_model_version": "v2.1.0",
      "is_blocked": true,
      "action_taken": "blocked"
    }
  ],
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### 4. Block Threat
```
POST /api/threats/{threat_id}/block
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "threat-abc123",
    "is_blocked": true,
    "action_taken": "blocked"
  },
  "message": "Threat successfully blocked"
}
```

### 5. CCTV Devices
```
GET /api/devices
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "dev-1",
      "name": "Front Entrance Cam",
      "ip_address": "192.168.1.101",
      "mac_address": "AA:BB:CC:DD:EE:FF",
      "device_type": "IP Camera",
      "manufacturer": "Hikvision",
      "status": "online",
      "last_seen": "2024-01-15T10:30:00Z",
      "location": "Zone 1",
      "firmware_version": "v3.2.1",
      "threat_level": "safe",
      "total_packets": 45000,
      "blocked_attacks": 12
    }
  ],
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### 6. Traffic Analytics
```
GET /api/analytics/traffic?period=24h
```

**Parameters:**
- `period`: `1h`, `24h`, `7d`, `30d`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "timestamp": "2024-01-15T09:00:00Z",
      "total_packets": 45000,
      "safe_packets": 44100,
      "suspicious_packets": 900,
      "blocked_packets": 850,
      "bandwidth_mbps": 125.5
    }
  ],
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### 7. ML Model Status
```
GET /api/ml/status
```

**Response:**
```json
{
  "success": true,
  "data": {
    "is_active": true,
    "model_name": "SafeView-IDPS-CNN",
    "model_version": "v2.1.0",
    "accuracy": 0.967,
    "last_trained": "2024-01-08T00:00:00Z",
    "total_predictions": 2847291,
    "threats_detected": 4127
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### 8. Analyze Packet (ML Prediction)
```
POST /api/ml/analyze
```

**Request Body:**
```json
{
  "source_ip": "203.45.67.89",
  "destination_ip": "192.168.1.101",
  "source_port": 54321,
  "destination_port": 554,
  "protocol": "RTSP",
  "packet_size": 1024,
  "flags": "SYN"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "is_threat": true,
    "threat_type": "unauthorized_access",
    "severity": "high",
    "confidence": 0.89,
    "recommendation": "Block source IP immediately"
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## Threat Types

Your ML model should classify threats into these categories:

| Type | Description |
|------|-------------|
| `ddos_attack` | Distributed Denial of Service attack |
| `port_scan` | Port scanning activity |
| `brute_force` | Brute force authentication attempt |
| `unauthorized_access` | Unauthorized access attempt |
| `stream_hijacking` | RTSP stream hijacking |
| `command_injection` | Command injection attempt |
| `malware_payload` | Malicious payload detected |
| `abnormal_traffic` | Anomalous traffic pattern |
| `rtsp_exploit` | RTSP protocol exploit |
| `onvif_attack` | ONVIF protocol attack |

## Severity Levels

| Level | Description |
|-------|-------------|
| `low` | Minor anomaly, monitor only |
| `medium` | Suspicious activity, investigate |
| `high` | Confirmed threat, take action |
| `critical` | Active attack, immediate response required |

## CORS Configuration

Make sure your Python backend allows CORS from your React app:

### Django Example:
```python
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:3000",
    "https://your-production-domain.com"
]
```

### Flask Example:
```python
from flask_cors import CORS
CORS(app, origins=["http://localhost:5173"])
```

## WebSocket Support (Optional)

For true real-time updates, consider implementing WebSocket endpoints:

```
WS /ws/packets - Real-time packet stream
WS /ws/threats - Real-time threat alerts
WS /ws/devices - Device status updates
```

## Database Schema (SQLite)

Based on your Django models, ensure these tables exist:

```sql
-- Network packets captured
CREATE TABLE network_packets (
    id INTEGER PRIMARY KEY,
    timestamp DATETIME,
    source_ip VARCHAR(45),
    destination_ip VARCHAR(45),
    source_port INTEGER,
    destination_port INTEGER,
    protocol VARCHAR(10),
    packet_size INTEGER,
    flags VARCHAR(20)
);

-- Detected threats
CREATE TABLE threats (
    id INTEGER PRIMARY KEY,
    packet_id INTEGER REFERENCES network_packets(id),
    timestamp DATETIME,
    threat_type VARCHAR(50),
    severity VARCHAR(20),
    confidence FLOAT,
    is_blocked BOOLEAN,
    action_taken VARCHAR(20)
);

-- CCTV devices
CREATE TABLE cctv_devices (
    id INTEGER PRIMARY KEY,
    name VARCHAR(100),
    ip_address VARCHAR(45),
    mac_address VARCHAR(17),
    device_type VARCHAR(50),
    status VARCHAR(20),
    last_seen DATETIME
);
```
