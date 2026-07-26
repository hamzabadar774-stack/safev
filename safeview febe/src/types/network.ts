// Network Traffic Types for SafeView IDPS
// These types match what your Python backend should return

export interface NetworkPacket {
  id: string;
  timestamp: string;
  source_ip: string;
  destination_ip: string;
  source_port: number;
  destination_port: number;
  protocol: 'TCP' | 'UDP' | 'HTTP' | 'HTTPS' | 'RTSP' | 'ONVIF' | 'ICMP' | 'SSH' | 'FTP';
  packet_size: number;
  flags?: string;
  payload_preview?: string;
}

export interface ThreatDetection {
  id: string;
  packet_id: string;
  timestamp: string;
  threat_type: ThreatType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number; // ML model confidence score 0-1
  source_ip: string;
  target_device?: string;
  description: string;
  ml_model_version: string;
  is_blocked: boolean;
  action_taken?: 'blocked' | 'quarantined' | 'alerted' | 'none';
}

export type ThreatType = 
  | 'ddos_attack'
  | 'port_scan'
  | 'brute_force'
  | 'unauthorized_access'
  | 'stream_hijacking'
  | 'command_injection'
  | 'malware_payload'
  | 'abnormal_traffic'
  | 'rtsp_exploit'
  | 'onvif_attack';

export interface CCTVDevice {
  id: string;
  name: string;
  ip_address: string;
  mac_address: string;
  device_type: 'IP Camera' | 'NVR' | 'DVR' | 'PTZ Camera';
  manufacturer: string;
  status: 'online' | 'offline' | 'warning' | 'compromised';
  last_seen: string;
  location: string;
  firmware_version?: string;
  threat_level: 'safe' | 'suspicious' | 'at_risk';
  total_packets: number;
  blocked_attacks: number;
}

export interface TrafficStats {
  timestamp: string;
  total_packets: number;
  safe_packets: number;
  suspicious_packets: number;
  blocked_packets: number;
  bandwidth_mbps: number;
}

export interface MLModelStatus {
  is_active: boolean;
  model_name: string;
  model_version: string;
  accuracy: number;
  last_trained: string;
  total_predictions: number;
  threats_detected: number;
}

export interface DashboardStats {
  packets_analyzed: number;
  threats_detected: number;
  attacks_blocked: number;
  active_devices: number;
  block_rate: number;
  critical_threats: number;
}

// API Response Types
export interface APIResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  timestamp: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  per_page: number;
  has_next: boolean;
}
