// Mock Data Generator for SafeView IDPS
// This simulates what your Python backend would return
// Replace with real API calls when your backend is ready

import type {
  NetworkPacket,
  ThreatDetection,
  CCTVDevice,
  TrafficStats,
  MLModelStatus,
  DashboardStats,
  ThreatType,
} from '@/types/network';

const protocols = ['TCP', 'UDP', 'HTTP', 'HTTPS', 'RTSP', 'ONVIF', 'ICMP', 'SSH'] as const;

const threatTypes: ThreatType[] = [
  'ddos_attack',
  'port_scan',
  'brute_force',
  'unauthorized_access',
  'stream_hijacking',
  'command_injection',
  'malware_payload',
  'abnormal_traffic',
  'rtsp_exploit',
  'onvif_attack',
];

const threatDescriptions: Record<ThreatType, string> = {
  ddos_attack: 'Distributed Denial of Service attack detected - High volume of requests from multiple sources',
  port_scan: 'Suspicious port scanning activity detected from external IP',
  brute_force: 'Multiple failed authentication attempts detected - Possible brute force attack',
  unauthorized_access: 'Unauthorized access attempt to camera feed detected',
  stream_hijacking: 'Potential RTSP stream hijacking attempt detected',
  command_injection: 'Malicious command injection attempt in ONVIF request',
  malware_payload: 'Malicious payload signature detected in network traffic',
  abnormal_traffic: 'Unusual traffic pattern deviation from baseline behavior',
  rtsp_exploit: 'RTSP protocol exploit attempt detected',
  onvif_attack: 'ONVIF device management attack detected',
};

const deviceNames = [
  'Front Entrance Cam',
  'Parking Lot PTZ',
  'Lobby Camera',
  'Server Room Monitor',
  'Back Exit Camera',
  'Warehouse NVR',
  'Office Floor 1',
  'Reception Cam',
];

const manufacturers = ['Hikvision', 'Dahua', 'Axis', 'Bosch', 'Samsung', 'Hanwha'];

// Generate random IP
function randomIP(internal = true): string {
  if (internal) {
    return `192.168.1.${Math.floor(Math.random() * 254) + 1}`;
  }
  return `${Math.floor(Math.random() * 223) + 1}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
}

// Generate random MAC
function randomMAC(): string {
  return 'XX:XX:XX:XX:XX:XX'.replace(/X/g, () => 
    '0123456789ABCDEF'.charAt(Math.floor(Math.random() * 16))
  );
}

// Generate packet
export function generatePacket(): NetworkPacket {
  const isInternal = Math.random() > 0.3;
  return {
    id: Math.random().toString(36).substr(2, 9),
    timestamp: new Date().toISOString(),
    source_ip: isInternal ? randomIP(true) : randomIP(false),
    destination_ip: randomIP(true),
    source_port: Math.floor(Math.random() * 65535),
    destination_port: [80, 443, 554, 8080, 8000, 22, 21][Math.floor(Math.random() * 7)],
    protocol: protocols[Math.floor(Math.random() * protocols.length)],
    packet_size: Math.floor(Math.random() * 1500) + 64,
    flags: Math.random() > 0.5 ? 'SYN' : 'ACK',
  };
}

// Generate threat detection
export function generateThreat(sourceIP?: string): ThreatDetection {
  const threatType = threatTypes[Math.floor(Math.random() * threatTypes.length)];
  const severity = (['low', 'medium', 'high', 'critical'] as const)[Math.floor(Math.random() * 4)];
  const isBlocked = severity === 'critical' ? Math.random() > 0.2 : Math.random() > 0.5;
  
  return {
    id: Math.random().toString(36).substr(2, 9),
    packet_id: Math.random().toString(36).substr(2, 9),
    timestamp: new Date().toISOString(),
    threat_type: threatType,
    severity,
    confidence: 0.75 + Math.random() * 0.24, // 75-99% confidence
    source_ip: sourceIP || randomIP(false),
    target_device: deviceNames[Math.floor(Math.random() * deviceNames.length)],
    description: threatDescriptions[threatType],
    ml_model_version: 'v2.1.0',
    is_blocked: isBlocked,
    action_taken: isBlocked ? 'blocked' : severity === 'critical' ? 'alerted' : 'none',
  };
}

// Generate device
export function generateDevice(index: number): CCTVDevice {
  const statusOptions = ['online', 'online', 'online', 'offline', 'warning'] as const;
  const status = statusOptions[Math.floor(Math.random() * statusOptions.length)];
  
  return {
    id: `dev-${index + 1}`,
    name: deviceNames[index % deviceNames.length],
    ip_address: `192.168.1.${100 + index}`,
    mac_address: randomMAC(),
    device_type: (['IP Camera', 'NVR', 'PTZ Camera'] as const)[Math.floor(Math.random() * 3)],
    manufacturer: manufacturers[Math.floor(Math.random() * manufacturers.length)],
    status,
    last_seen: new Date(Date.now() - Math.random() * 3600000).toISOString(),
    location: `Zone ${Math.floor(index / 2) + 1}`,
    firmware_version: `v${Math.floor(Math.random() * 5) + 1}.${Math.floor(Math.random() * 10)}.${Math.floor(Math.random() * 20)}`,
    threat_level: status === 'warning' ? 'suspicious' : status === 'offline' ? 'at_risk' : 'safe',
    total_packets: Math.floor(Math.random() * 100000) + 10000,
    blocked_attacks: Math.floor(Math.random() * 50),
  };
}

// Generate traffic stats for chart
export function generateTrafficStats(hours: number = 24): TrafficStats[] {
  const stats: TrafficStats[] = [];
  const now = new Date();
  
  for (let i = hours - 1; i >= 0; i--) {
    const timestamp = new Date(now.getTime() - i * 3600000);
    const total = Math.floor(Math.random() * 50000) + 30000;
    const suspicious = Math.floor(total * (0.02 + Math.random() * 0.03));
    const blocked = Math.floor(suspicious * (0.8 + Math.random() * 0.15));
    
    stats.push({
      timestamp: timestamp.toISOString(),
      total_packets: total,
      safe_packets: total - suspicious,
      suspicious_packets: suspicious,
      blocked_packets: blocked,
      bandwidth_mbps: 50 + Math.random() * 150,
    });
  }
  
  return stats;
}

// Generate ML model status
export function generateMLStatus(): MLModelStatus {
  return {
    is_active: true,
    model_name: 'SafeView-IDPS-CNN',
    model_version: 'v2.1.0',
    accuracy: 0.967,
    last_trained: new Date(Date.now() - 7 * 24 * 3600000).toISOString(),
    total_predictions: 2847291,
    threats_detected: 4127,
  };
}

// Generate dashboard stats
export function generateDashboardStats(): DashboardStats {
  return {
    packets_analyzed: 2400000 + Math.floor(Math.random() * 100000),
    threats_detected: 140 + Math.floor(Math.random() * 20),
    attacks_blocked: 135 + Math.floor(Math.random() * 15),
    active_devices: 6 + Math.floor(Math.random() * 3),
    block_rate: 95 + Math.random() * 4,
    critical_threats: 20 + Math.floor(Math.random() * 10),
  };
}

// Initial mock data
export const mockDevices: CCTVDevice[] = Array.from({ length: 8 }, (_, i) => generateDevice(i));
export const mockPackets: NetworkPacket[] = Array.from({ length: 50 }, generatePacket);
export const mockThreats: ThreatDetection[] = Array.from({ length: 10 }, () => generateThreat());
export const mockTrafficStats = generateTrafficStats(24);
export const mockMLStatus = generateMLStatus();
export const mockDashboardStats = generateDashboardStats();
