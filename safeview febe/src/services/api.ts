// SafeView API Service
// Configure this to connect to your Python backend (Django/Flask)

import type {
  NetworkPacket,
  ThreatDetection,
  CCTVDevice,
  TrafficStats,
  MLModelStatus,
  DashboardStats,
  APIResponse,
  PaginatedResponse,
} from '@/types/network';

// Configure your Python backend URL here
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

class SafeViewAPI {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  // Dashboard Statistics
  async getDashboardStats(): Promise<APIResponse<DashboardStats>> {
    return this.request('/dashboard/stats');
  }

  // Network Packets
  async getPackets(
    page: number = 1,
    perPage: number = 50
  ): Promise<APIResponse<PaginatedResponse<NetworkPacket>>> {
    return this.request(`/packets?page=${page}&per_page=${perPage}`);
  }

  async getRealtimePackets(): Promise<APIResponse<NetworkPacket[]>> {
    return this.request('/packets/realtime');
  }

  // Threat Detection
  async getThreats(
    page: number = 1,
    perPage: number = 20
  ): Promise<APIResponse<PaginatedResponse<ThreatDetection>>> {
    return this.request(`/threats?page=${page}&per_page=${perPage}`);
  }

  async getRealtimeThreats(): Promise<APIResponse<ThreatDetection[]>> {
    return this.request('/threats/realtime');
  }

  async blockThreat(threatId: string): Promise<APIResponse<ThreatDetection>> {
    return this.request(`/threats/${threatId}/block`, { method: 'POST' });
  }

  async dismissThreat(threatId: string): Promise<APIResponse<void>> {
    return this.request(`/threats/${threatId}/dismiss`, { method: 'POST' });
  }

  // CCTV Devices
  async getDevices(): Promise<APIResponse<CCTVDevice[]>> {
    return this.request('/devices');
  }

  async getDevice(deviceId: string): Promise<APIResponse<CCTVDevice>> {
    return this.request(`/devices/${deviceId}`);
  }

  async addDevice(device: Partial<CCTVDevice>): Promise<APIResponse<CCTVDevice>> {
    return this.request('/devices', {
      method: 'POST',
      body: JSON.stringify(device),
    });
  }

  async removeDevice(deviceId: string): Promise<APIResponse<void>> {
    return this.request(`/devices/${deviceId}`, { method: 'DELETE' });
  }

  // Traffic Analytics
  async getTrafficStats(
    period: '1h' | '24h' | '7d' | '30d' = '24h'
  ): Promise<APIResponse<TrafficStats[]>> {
    return this.request(`/analytics/traffic?period=${period}`);
  }

  // ML Model Status
  async getMLStatus(): Promise<APIResponse<MLModelStatus>> {
    return this.request('/ml/status');
  }

  async retrainModel(): Promise<APIResponse<{ job_id: string }>> {
    return this.request('/ml/retrain', { method: 'POST' });
  }

  // Manual Analysis - Send packet data for ML prediction
  async analyzePacket(
    packet: Partial<NetworkPacket>
  ): Promise<APIResponse<ThreatDetection | null>> {
    return this.request('/ml/analyze', {
      method: 'POST',
      body: JSON.stringify(packet),
    });
  }
}

// Export singleton instance
export const safeViewAPI = new SafeViewAPI();

// Export class for custom instances
export { SafeViewAPI };
