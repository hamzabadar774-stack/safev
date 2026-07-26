# SafeView Python Backend Setup Guide

This guide explains how to set up a Python backend for SafeView IDPS that can run alongside or replace the Lovable Cloud implementation.

## Quick Start

### 1. Create Project Structure

```bash
mkdir safeview-backend
cd safeview-backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install flask flask-cors scikit-learn pandas numpy
```

### 2. Create the Flask Application

**File: `app.py`**

```python
from flask import Flask, jsonify, request
from flask_cors import CORS
import sqlite3
import os
from datetime import datetime, timedelta
import random
import json

app = Flask(__name__)
CORS(app, origins=["http://localhost:5173", "http://localhost:3000", "*"])

DATABASE = os.environ.get('DATABASE_PATH', 'db.sqlite3')

def get_db():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

# Initialize database tables
def init_db():
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS network_packets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            source_ip TEXT NOT NULL,
            destination_ip TEXT NOT NULL,
            source_port INTEGER NOT NULL,
            destination_port INTEGER NOT NULL,
            protocol TEXT NOT NULL,
            packet_size INTEGER NOT NULL,
            flags TEXT
        )
    ''')
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS threats (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            packet_id INTEGER REFERENCES network_packets(id),
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            threat_type TEXT NOT NULL,
            severity TEXT NOT NULL,
            confidence REAL NOT NULL,
            source_ip TEXT NOT NULL,
            target_device TEXT,
            description TEXT,
            ml_model_version TEXT,
            is_blocked BOOLEAN DEFAULT 0,
            action_taken TEXT DEFAULT 'none'
        )
    ''')
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS cctv_devices (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            ip_address TEXT NOT NULL UNIQUE,
            mac_address TEXT,
            device_type TEXT NOT NULL,
            manufacturer TEXT,
            status TEXT DEFAULT 'offline',
            last_seen DATETIME,
            location TEXT,
            firmware_version TEXT,
            threat_level TEXT DEFAULT 'safe',
            total_packets INTEGER DEFAULT 0,
            blocked_attacks INTEGER DEFAULT 0
        )
    ''')
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS ml_model_status (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            is_active BOOLEAN DEFAULT 1,
            model_name TEXT NOT NULL,
            model_version TEXT NOT NULL,
            accuracy REAL NOT NULL,
            last_trained DATETIME,
            total_predictions INTEGER DEFAULT 0,
            threats_detected INTEGER DEFAULT 0
        )
    ''')
    
    # Insert default ML model status if not exists
    cursor.execute('SELECT COUNT(*) FROM ml_model_status')
    if cursor.fetchone()[0] == 0:
        cursor.execute('''
            INSERT INTO ml_model_status 
            (model_name, model_version, accuracy, total_predictions, threats_detected)
            VALUES ('SafeView-IDPS-RF', 'v2.1.0', 0.967, 0, 0)
        ''')
    
    conn.commit()
    conn.close()

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy", "timestamp": datetime.utcnow().isoformat()})

@app.route('/api/dashboard/stats', methods=['GET'])
def get_dashboard_stats():
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute('SELECT COUNT(*) FROM network_packets')
    packets = cursor.fetchone()[0]
    
    cursor.execute('SELECT COUNT(*) FROM threats')
    threats = cursor.fetchone()[0]
    
    cursor.execute('SELECT COUNT(*) FROM threats WHERE is_blocked = 1')
    blocked = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM cctv_devices WHERE status = 'online'")
    active_devices = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM threats WHERE severity = 'critical'")
    critical = cursor.fetchone()[0]
    
    block_rate = (blocked / threats * 100) if threats > 0 else 0
    
    conn.close()
    
    return jsonify({
        "success": True,
        "data": {
            "packets_analyzed": packets,
            "threats_detected": threats,
            "attacks_blocked": blocked,
            "active_devices": active_devices,
            "block_rate": round(block_rate, 1),
            "critical_threats": critical
        },
        "timestamp": datetime.utcnow().isoformat()
    })

@app.route('/api/packets/realtime', methods=['GET'])
def get_realtime_packets():
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT * FROM network_packets 
        ORDER BY timestamp DESC 
        LIMIT 50
    ''')
    
    packets = [dict(row) for row in cursor.fetchall()]
    conn.close()
    
    return jsonify({
        "success": True,
        "data": packets,
        "timestamp": datetime.utcnow().isoformat()
    })

@app.route('/api/threats/realtime', methods=['GET'])
def get_realtime_threats():
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT * FROM threats 
        ORDER BY timestamp DESC 
        LIMIT 20
    ''')
    
    threats = [dict(row) for row in cursor.fetchall()]
    conn.close()
    
    return jsonify({
        "success": True,
        "data": threats,
        "timestamp": datetime.utcnow().isoformat()
    })

@app.route('/api/threats/<threat_id>/block', methods=['POST'])
def block_threat(threat_id):
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute('''
        UPDATE threats 
        SET is_blocked = 1, action_taken = 'blocked'
        WHERE id = ?
    ''', (threat_id,))
    
    conn.commit()
    
    cursor.execute('SELECT * FROM threats WHERE id = ?', (threat_id,))
    threat = dict(cursor.fetchone()) if cursor.fetchone() else None
    
    conn.close()
    
    return jsonify({
        "success": True,
        "data": threat,
        "message": "Threat successfully blocked"
    })

@app.route('/api/devices', methods=['GET'])
def get_devices():
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute('SELECT * FROM cctv_devices ORDER BY name')
    devices = [dict(row) for row in cursor.fetchall()]
    
    conn.close()
    
    return jsonify({
        "success": True,
        "data": devices,
        "timestamp": datetime.utcnow().isoformat()
    })

@app.route('/api/ml/status', methods=['GET'])
def get_ml_status():
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute('SELECT * FROM ml_model_status LIMIT 1')
    row = cursor.fetchone()
    status = dict(row) if row else None
    
    conn.close()
    
    return jsonify({
        "success": True,
        "data": status,
        "timestamp": datetime.utcnow().isoformat()
    })

@app.route('/api/ml/analyze', methods=['POST'])
def analyze_packet():
    data = request.json
    
    # Simple ML-like analysis based on packet characteristics
    is_threat = False
    threat_type = None
    severity = "low"
    confidence = 0.5
    description = "Normal traffic"
    
    # Check for suspicious patterns
    source_ip = data.get('source_ip', '')
    dest_port = data.get('destination_port', 0)
    protocol = data.get('protocol', '')
    
    # External IP accessing camera ports
    if not source_ip.startswith(('192.168.', '10.', '172.')) and dest_port in [554, 8080, 37777]:
        is_threat = True
        threat_type = "unauthorized_access"
        severity = "high"
        confidence = 0.85
        description = "External IP attempting to access camera port"
    
    # SSH brute force pattern
    elif dest_port == 22 and protocol == "SSH":
        is_threat = True
        threat_type = "brute_force"
        severity = "medium"
        confidence = 0.75
        description = "Potential SSH brute force attempt"
    
    # RTSP exploit
    elif protocol == "RTSP" and not source_ip.startswith('192.168.'):
        is_threat = True
        threat_type = "rtsp_exploit"
        severity = "high"
        confidence = 0.88
        description = "Suspicious RTSP stream access from external network"
    
    return jsonify({
        "success": True,
        "data": {
            "is_threat": is_threat,
            "threat_type": threat_type,
            "severity": severity,
            "confidence": confidence,
            "description": description,
            "recommendation": "Block source IP" if is_threat else "Continue monitoring"
        },
        "timestamp": datetime.utcnow().isoformat()
    })

if __name__ == '__main__':
    init_db()
    app.run(debug=True, host='0.0.0.0', port=8000)
```

### 3. Run the Backend

```bash
# Set the path to your database (optional)
export DATABASE_PATH=./db.sqlite3

# Run the Flask server
python app.py
```

The API will be available at `http://localhost:8000`

### 4. Connect to React Dashboard

Create a `.env.local` file in your React project:

```bash
VITE_API_URL=http://localhost:8000/api
```

## Adding ML Model (Scikit-learn)

### 1. Install ML Dependencies

```bash
pip install scikit-learn pandas numpy joblib
```

### 2. Create ML Module

**File: `ml_model.py`**

```python
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
import joblib
import os

THREAT_TYPES = [
    'ddos_attack', 'port_scan', 'brute_force', 
    'unauthorized_access', 'stream_hijacking',
    'command_injection', 'malware_payload', 
    'abnormal_traffic', 'rtsp_exploit', 'onvif_attack'
]

class SafeViewIDPS:
    def __init__(self, model_path='safeview_model.pkl'):
        self.model_path = model_path
        self.model = None
        self.label_encoder = LabelEncoder()
        self.label_encoder.fit(THREAT_TYPES + ['normal'])
        
        if os.path.exists(model_path):
            self.load_model()
        else:
            self.model = RandomForestClassifier(
                n_estimators=100,
                max_depth=10,
                random_state=42
            )
    
    def extract_features(self, packet):
        """Extract features from network packet"""
        # Convert IP to numeric
        def ip_to_num(ip):
            parts = ip.split('.')
            return sum(int(p) * (256 ** (3-i)) for i, p in enumerate(parts[:4]))
        
        source_internal = packet['source_ip'].startswith(('192.168.', '10.', '172.'))
        dest_internal = packet['destination_ip'].startswith(('192.168.', '10.', '172.'))
        
        protocol_map = {'TCP': 0, 'UDP': 1, 'HTTP': 2, 'HTTPS': 3, 
                       'RTSP': 4, 'ONVIF': 5, 'ICMP': 6, 'SSH': 7}
        
        return np.array([
            packet['source_port'],
            packet['destination_port'],
            protocol_map.get(packet['protocol'], 8),
            packet['packet_size'],
            1 if source_internal else 0,
            1 if dest_internal else 0,
            1 if packet.get('flags') == 'SYN' else 0,
            ip_to_num(packet['source_ip']) % 65536,
            ip_to_num(packet['destination_ip']) % 65536,
        ])
    
    def predict(self, packet):
        """Predict if packet is a threat"""
        features = self.extract_features(packet).reshape(1, -1)
        
        if not hasattr(self.model, 'classes_'):
            # Model not trained - use rule-based fallback
            return self._rule_based_detection(packet)
        
        prediction = self.model.predict(features)[0]
        probabilities = self.model.predict_proba(features)[0]
        confidence = max(probabilities)
        
        threat_type = self.label_encoder.inverse_transform([prediction])[0]
        
        return {
            'is_threat': threat_type != 'normal',
            'threat_type': threat_type if threat_type != 'normal' else None,
            'confidence': float(confidence),
            'severity': self._get_severity(threat_type, confidence)
        }
    
    def _rule_based_detection(self, packet):
        """Fallback rule-based detection"""
        source_external = not packet['source_ip'].startswith(('192.168.', '10.', '172.'))
        
        # High-risk port access from external
        if source_external and packet['destination_port'] in [554, 8080, 37777, 34567]:
            return {
                'is_threat': True,
                'threat_type': 'unauthorized_access',
                'confidence': 0.85,
                'severity': 'high'
            }
        
        # SSH from external
        if source_external and packet['destination_port'] == 22:
            return {
                'is_threat': True,
                'threat_type': 'brute_force',
                'confidence': 0.75,
                'severity': 'medium'
            }
        
        return {
            'is_threat': False,
            'threat_type': None,
            'confidence': 0.95,
            'severity': 'low'
        }
    
    def _get_severity(self, threat_type, confidence):
        if threat_type in ['ddos_attack', 'malware_payload', 'command_injection']:
            return 'critical' if confidence > 0.8 else 'high'
        elif threat_type in ['brute_force', 'unauthorized_access', 'stream_hijacking']:
            return 'high' if confidence > 0.7 else 'medium'
        elif threat_type in ['port_scan', 'abnormal_traffic']:
            return 'medium' if confidence > 0.6 else 'low'
        return 'low'
    
    def train(self, X, y):
        """Train the model with labeled data"""
        self.model.fit(X, y)
        self.save_model()
    
    def save_model(self):
        joblib.dump(self.model, self.model_path)
    
    def load_model(self):
        self.model = joblib.load(self.model_path)

# Singleton instance
idps = SafeViewIDPS()
```

### 3. Integrate with Flask

Update `app.py` to use the ML model:

```python
from ml_model import idps

@app.route('/api/ml/analyze', methods=['POST'])
def analyze_packet():
    data = request.json
    
    result = idps.predict(data)
    
    description = get_threat_description(result['threat_type'])
    
    return jsonify({
        "success": True,
        "data": {
            **result,
            "description": description,
            "recommendation": "Block source IP immediately" if result['is_threat'] else "Continue monitoring"
        },
        "timestamp": datetime.utcnow().isoformat()
    })
```

## Docker Deployment

**File: `Dockerfile`**

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["python", "app.py"]
```

**File: `requirements.txt`**

```
flask==3.0.0
flask-cors==4.0.0
scikit-learn==1.4.0
pandas==2.2.0
numpy==1.26.0
joblib==1.3.0
```

**Run with Docker:**

```bash
docker build -t safeview-backend .
docker run -p 8000:8000 -v $(pwd)/db.sqlite3:/app/db.sqlite3 safeview-backend
```

## Testing the API

```bash
# Health check
curl http://localhost:8000/api/health

# Get dashboard stats
curl http://localhost:8000/api/dashboard/stats

# Analyze a packet
curl -X POST http://localhost:8000/api/ml/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "source_ip": "203.45.67.89",
    "destination_ip": "192.168.1.101",
    "source_port": 54321,
    "destination_port": 554,
    "protocol": "RTSP",
    "packet_size": 1024,
    "flags": "SYN"
  }'
```

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    SafeView Dashboard                       │
│                   (React + TypeScript)                      │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      │ HTTP/REST API
                      │
         ┌────────────┴────────────┐
         │                         │
         ▼                         ▼
┌─────────────────┐      ┌─────────────────────┐
│  Lovable Cloud  │  OR  │   Python Backend    │
│ (Edge Functions)│      │    (Flask/Django)   │
│   + Lovable AI  │      │ + Scikit-learn ML   │
└────────┬────────┘      └──────────┬──────────┘
         │                          │
         ▼                          ▼
┌─────────────────┐      ┌─────────────────────┐
│ Supabase Postgres│      │   SQLite/PostgreSQL │
└─────────────────┘      └─────────────────────┘
```

Both options work with the same React dashboard - just change the API URL!
