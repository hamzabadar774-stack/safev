
-- 1. Add status workflow to threats
ALTER TABLE public.threats 
  ADD COLUMN IF NOT EXISTS status varchar NOT NULL DEFAULT 'new',
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_threats_updated_at ON public.threats;
CREATE TRIGGER update_threats_updated_at
BEFORE UPDATE ON public.threats
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Allow authenticated users to update threat status
DROP POLICY IF EXISTS "Authenticated users can update threats" ON public.threats;
CREATE POLICY "Authenticated users can update threats"
ON public.threats FOR UPDATE TO authenticated
USING (true) WITH CHECK (true);

-- 2. Alert logs / incident timeline
CREATE TABLE IF NOT EXISTS public.alert_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  threat_id uuid REFERENCES public.threats(id) ON DELETE CASCADE,
  action varchar NOT NULL,
  actor varchar,
  notes text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_alert_logs_threat_id ON public.alert_logs(threat_id);
CREATE INDEX IF NOT EXISTS idx_alert_logs_created_at ON public.alert_logs(created_at DESC);

ALTER TABLE public.alert_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access to alert_logs"
ON public.alert_logs FOR SELECT USING (true);

CREATE POLICY "Authenticated can insert alert_logs"
ON public.alert_logs FOR INSERT TO authenticated WITH CHECK (true);

-- 3. Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.alert_logs;
ALTER TABLE public.threats REPLICA IDENTITY FULL;
ALTER TABLE public.alert_logs REPLICA IDENTITY FULL;
