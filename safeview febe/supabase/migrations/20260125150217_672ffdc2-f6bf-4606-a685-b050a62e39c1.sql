-- SafeView IDPS Database Schema
-- Network packets captured from CCTV network
CREATE TABLE public.network_packets (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
    source_ip VARCHAR(45) NOT NULL,
    destination_ip VARCHAR(45) NOT NULL,
    source_port INTEGER NOT NULL,
    destination_port INTEGER NOT NULL,
    protocol VARCHAR(20) NOT NULL,
    packet_size INTEGER NOT NULL,
    flags VARCHAR(50),
    payload_preview TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Detected threats from ML/AI analysis
CREATE TABLE public.threats (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    packet_id UUID REFERENCES public.network_packets(id),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
    threat_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    confidence DECIMAL(5,4) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
    source_ip VARCHAR(45) NOT NULL,
    target_device VARCHAR(100),
    description TEXT,
    ml_model_version VARCHAR(20),
    is_blocked BOOLEAN DEFAULT false,
    action_taken VARCHAR(50) DEFAULT 'none',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- CCTV devices being monitored
CREATE TABLE public.cctv_devices (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    ip_address VARCHAR(45) NOT NULL UNIQUE,
    mac_address VARCHAR(17),
    device_type VARCHAR(50) NOT NULL,
    manufacturer VARCHAR(100),
    status VARCHAR(20) NOT NULL DEFAULT 'offline' CHECK (status IN ('online', 'offline', 'warning')),
    last_seen TIMESTAMPTZ DEFAULT now(),
    location VARCHAR(100),
    firmware_version VARCHAR(50),
    threat_level VARCHAR(20) DEFAULT 'safe' CHECK (threat_level IN ('safe', 'suspicious', 'at_risk')),
    total_packets BIGINT DEFAULT 0,
    blocked_attacks INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Traffic statistics for analytics
CREATE TABLE public.traffic_stats (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
    total_packets BIGINT NOT NULL DEFAULT 0,
    safe_packets BIGINT NOT NULL DEFAULT 0,
    suspicious_packets BIGINT NOT NULL DEFAULT 0,
    blocked_packets BIGINT NOT NULL DEFAULT 0,
    bandwidth_mbps DECIMAL(10,2) DEFAULT 0
);

-- ML model status tracking
CREATE TABLE public.ml_model_status (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    is_active BOOLEAN NOT NULL DEFAULT true,
    model_name VARCHAR(100) NOT NULL,
    model_version VARCHAR(20) NOT NULL,
    accuracy DECIMAL(5,4) NOT NULL,
    last_trained TIMESTAMPTZ,
    total_predictions BIGINT DEFAULT 0,
    threats_detected BIGINT DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS for all tables (public read for dashboard demo)
ALTER TABLE public.network_packets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.threats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cctv_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.traffic_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ml_model_status ENABLE ROW LEVEL SECURITY;

-- Public read access for dashboard demo
CREATE POLICY "Allow public read access" ON public.network_packets FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON public.threats FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON public.cctv_devices FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON public.traffic_stats FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON public.ml_model_status FOR SELECT USING (true);

-- Allow insert/update for edge functions (service role)
CREATE POLICY "Allow service role insert" ON public.network_packets FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow service role insert" ON public.threats FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow service role update" ON public.threats FOR UPDATE USING (true);
CREATE POLICY "Allow service role insert" ON public.cctv_devices FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow service role update" ON public.cctv_devices FOR UPDATE USING (true);
CREATE POLICY "Allow service role insert" ON public.traffic_stats FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow service role insert" ON public.ml_model_status FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow service role update" ON public.ml_model_status FOR UPDATE USING (true);

-- Enable realtime for live dashboard updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.network_packets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.threats;
ALTER PUBLICATION supabase_realtime ADD TABLE public.cctv_devices;

-- Insert initial ML model status
INSERT INTO public.ml_model_status (model_name, model_version, accuracy, total_predictions, threats_detected)
VALUES ('SafeView-IDPS-AI', 'v3.0.0', 0.967, 0, 0);

-- Insert sample CCTV devices
INSERT INTO public.cctv_devices (name, ip_address, mac_address, device_type, manufacturer, status, location, firmware_version, threat_level)
VALUES 
  ('Front Entrance Cam', '192.168.1.101', 'AA:BB:CC:DD:EE:01', 'IP Camera', 'Hikvision', 'online', 'Zone 1', 'v3.2.1', 'safe'),
  ('Parking Lot PTZ', '192.168.1.102', 'AA:BB:CC:DD:EE:02', 'PTZ Camera', 'Dahua', 'online', 'Zone 2', 'v4.1.0', 'safe'),
  ('Lobby Camera', '192.168.1.103', 'AA:BB:CC:DD:EE:03', 'IP Camera', 'Axis', 'online', 'Zone 1', 'v2.8.5', 'safe'),
  ('Server Room Monitor', '192.168.1.104', 'AA:BB:CC:DD:EE:04', 'IP Camera', 'Bosch', 'online', 'Zone 3', 'v5.0.2', 'safe'),
  ('Back Exit Camera', '192.168.1.105', 'AA:BB:CC:DD:EE:05', 'IP Camera', 'Samsung', 'warning', 'Zone 2', 'v3.5.1', 'suspicious'),
  ('Warehouse NVR', '192.168.1.106', 'AA:BB:CC:DD:EE:06', 'NVR', 'Hikvision', 'online', 'Zone 4', 'v6.2.0', 'safe');

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Apply trigger to tables with updated_at
CREATE TRIGGER update_cctv_devices_updated_at
    BEFORE UPDATE ON public.cctv_devices
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ml_model_status_updated_at
    BEFORE UPDATE ON public.ml_model_status
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();