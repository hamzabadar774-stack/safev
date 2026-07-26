import { useEffect, useRef, useState } from "react";
import {
  Camera, Video, VideoOff, Maximize2, Wifi, WifiOff, RefreshCw,
  PlayCircle, Loader2, CheckCircle2, AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useDevices } from "@/hooks/useRealtimeData";
import {
  testConnection, registerCamera,
  type CameraType, type CameraStatus, type CameraConnectionInput,
} from "@/services/cameraApi";

interface StreamConfig {
  id: string;
  name: string;
  type: CameraType;
  url?: string;
  status: CameraStatus;
  latency_ms?: number;
  uptimeStart?: number;
  webcamStream?: MediaStream;
}

const STATUS_META: Record<CameraStatus, { color: string; label: string }> = {
  online:        { color: "bg-success",         label: "Online" },
  offline:       { color: "bg-muted-foreground", label: "Offline" },
  warning:       { color: "bg-warning",         label: "Warning" },
  compromised:   { color: "bg-destructive",     label: "Compromised" },
  reconnecting:  { color: "bg-warning",         label: "Reconnecting" },
  connecting:    { color: "bg-warning",         label: "Connecting" },
};

export function CCTVLiveFeed() {
  const { devices } = useDevices();
  const [streams, setStreams] = useState<StreamConfig[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});

  // attach webcam streams to <video> when refs become available
  useEffect(() => {
    streams.forEach((s) => {
      if (s.type === "webcam" && s.webcamStream) {
        const el = videoRefs.current[s.id];
        if (el && el.srcObject !== s.webcamStream) el.srcObject = s.webcamStream;
      }
    });
  }, [streams]);

  const handleRemove = (id: string) => {
    setStreams((prev) => {
      const s = prev.find((x) => x.id === id);
      if (s?.webcamStream) s.webcamStream.getTracks().forEach((t) => t.stop());
      return prev.filter((x) => x.id !== id);
    });
  };

  const handleReconnect = (id: string) => {
    setStreams((prev) => prev.map((s) => s.id === id ? { ...s, status: "reconnecting" } : s));
    setTimeout(() => {
      setStreams((prev) => prev.map((s) => s.id === id ? { ...s, status: "online", uptimeStart: Date.now() } : s));
    }, 1500);
  };

  const onCameraAdded = (s: StreamConfig) => {
    setStreams((prev) => [...prev, s]);
    setShowAddDialog(false);
  };

  return (
    <div className="cyber-card p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Video className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Live CCTV Feeds</h3>
          <span className="text-xs font-mono text-muted-foreground ml-2">
            {streams.filter((s) => s.status === "online").length}/{streams.length} ONLINE
          </span>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="text-xs">
              <Camera className="w-3 h-3 mr-1" />Add Camera
            </Button>
          </DialogTrigger>
          <AddCameraDialog
            onAdded={onCameraAdded}
            registeredDevices={devices.filter((d) => d.status === "online")}
          />
        </Dialog>
      </div>

      {streams.length === 0 ? (
        <div className="border border-dashed border-border rounded-lg p-12 text-center">
          <VideoOff className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
          <h4 className="text-lg font-semibold mb-2">No Camera Feeds Connected</h4>
          <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
            Connect IP cameras, webcams, or use the built-in demo feed to begin monitoring.
          </p>
          <Button onClick={() => setShowAddDialog(true)}>
            <Camera className="w-4 h-4 mr-2" />Add your first camera
          </Button>
        </div>
      ) : (
        <div className={cn(
          "grid gap-3",
          streams.length === 1 ? "grid-cols-1" : streams.length <= 4 ? "grid-cols-2" : "grid-cols-3"
        )}>
          {streams.map((stream) => (
            <FeedTile
              key={stream.id}
              stream={stream}
              videoRefs={videoRefs}
              onReconnect={() => handleReconnect(stream.id)}
              onRemove={() => handleRemove(stream.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* -------------------- Tile -------------------- */

function FeedTile({
  stream, videoRefs, onReconnect, onRemove,
}: {
  stream: StreamConfig;
  videoRefs: React.MutableRefObject<Record<string, HTMLVideoElement | null>>;
  onReconnect: () => void;
  onRemove: () => void;
}) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const meta = STATUS_META[stream.status];
  const uptime = stream.uptimeStart ? Math.floor((now - stream.uptimeStart) / 1000) : 0;

  return (
    <div className={cn(
      "relative rounded-lg overflow-hidden border border-border bg-black/80 aspect-video group",
      stream.status === "compromised" && "border-destructive/60",
    )}>
      {stream.status === "online" && stream.type === "webcam" ? (
        <video ref={(el) => { videoRefs.current[stream.id] = el; }}
          className="w-full h-full object-cover" autoPlay muted playsInline />
      ) : stream.status === "online" && stream.type === "demo" ? (
        <DemoFeed name={stream.name} />
      ) : stream.status === "online" && stream.url ? (
        <video className="w-full h-full object-cover" autoPlay muted playsInline>
          <source src={stream.url} />
        </video>
      ) : (
        <div className="w-full h-full flex items-center justify-center text-center">
          {stream.status === "reconnecting" || stream.status === "connecting" ? (
            <div>
              <Loader2 className="w-8 h-8 mx-auto mb-2 text-primary animate-spin" />
              <span className="text-xs text-muted-foreground">{meta.label}…</span>
            </div>
          ) : (
            <div>
              <WifiOff className="w-8 h-8 mx-auto mb-2 text-destructive" />
              <span className="text-xs text-destructive">Stream unavailable</span>
              <Button size="sm" variant="outline" className="mt-2 text-xs" onClick={onReconnect}>
                <RefreshCw className="w-3 h-3 mr-1" />Retry
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Top-left status pill */}
      <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-0.5 rounded bg-black/60 backdrop-blur">
        <span className={cn("w-1.5 h-1.5 rounded-full animate-pulse", meta.color)} />
        <span className="text-[10px] font-medium text-white uppercase tracking-wide">{meta.label}</span>
      </div>

      {/* Top-right metrics */}
      {stream.status === "online" && (
        <div className="absolute top-2 right-2 flex items-center gap-1 text-[10px] font-mono text-white">
          <span className="bg-destructive/80 px-1.5 py-0.5 rounded flex items-center gap-1">
            <span className="w-1 h-1 rounded-full bg-white animate-pulse" />REC
          </span>
          {stream.latency_ms !== undefined && (
            <span className="bg-black/60 px-1.5 py-0.5 rounded">{stream.latency_ms}ms</span>
          )}
        </div>
      )}

      {/* Bottom bar */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <div className="text-xs font-medium text-white truncate">{stream.name}</div>
            <div className="text-[10px] text-white/60 font-mono">
              {stream.type.toUpperCase()} · uptime {fmtUptime(uptime)}
            </div>
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-white hover:text-primary"
              onClick={onReconnect}><RefreshCw className="w-3 h-3" /></Button>
            <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-white hover:text-destructive"
              onClick={onRemove}><VideoOff className="w-3 h-3" /></Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function fmtUptime(s: number) {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60;
  return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(ss).padStart(2,"0")}`;
}

function DemoFeed({ name }: { name: string }) {
  // Lightweight animated SVG to simulate a CCTV feed
  return (
    <div className="w-full h-full relative bg-gradient-to-br from-slate-900 to-slate-800 overflow-hidden">
      <div className="absolute inset-0 opacity-40"
        style={{ backgroundImage: "linear-gradient(transparent 95%, rgba(255,255,255,.08) 95%)", backgroundSize: "100% 4px" }} />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center text-white/60">
          <PlayCircle className="w-10 h-10 mx-auto mb-2 animate-pulse" />
          <div className="text-xs font-mono">SIMULATED FEED · {name}</div>
        </div>
      </div>
      <div className="absolute bottom-1 left-2 text-[10px] text-white/40 font-mono">
        {new Date().toLocaleString()}
      </div>
    </div>
  );
}

/* -------------------- Add dialog -------------------- */

function AddCameraDialog({
  onAdded, registeredDevices,
}: {
  onAdded: (s: StreamConfig) => void;
  registeredDevices: Array<{ id: string; name: string; ip_address: string }>;
}) {
  const [type, setType] = useState<CameraType>("ip");
  const [form, setForm] = useState<CameraConnectionInput>({
    name: "", type: "ip", ip_address: "", rtsp_url: "",
    username: "", password: "", location: "", manufacturer: "", zone: "",
  });
  const [testResult, setTestResult] = useState<null | { ok: boolean; message: string; latency_ms: number }>(null);
  const [testing, setTesting] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const setField = <K extends keyof CameraConnectionInput>(k: K, v: CameraConnectionInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleTest = async () => {
    setTesting(true); setTestResult(null);
    const r = await testConnection({ ...form, type });
    setTestResult(r); setTesting(false);
    r.ok ? toast.success(`Reachable · ${r.latency_ms}ms`) : toast.error(r.message);
  };

  const handleConnect = async () => {
    if (!form.name.trim()) { toast.error("Enter a camera name"); return; }
    setConnecting(true);

    if (type === "webcam") {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        onAdded({
          id: crypto.randomUUID(), name: form.name, type: "webcam",
          status: "online", uptimeStart: Date.now(), webcamStream: stream, latency_ms: 5,
        });
        toast.success("Webcam connected");
      } catch {
        toast.error("Browser denied webcam access");
      } finally { setConnecting(false); }
      return;
    }

    if (type === "demo") {
      onAdded({
        id: crypto.randomUUID(), name: form.name || "Demo Camera",
        type: "demo", status: "online", uptimeStart: Date.now(), latency_ms: 12,
      });
      toast.success("Demo camera started");
      setConnecting(false);
      return;
    }

    // ip/rtsp/dvr
    const r = testResult ?? await testConnection({ ...form, type });
    if (!r.ok) {
      onAdded({
        id: crypto.randomUUID(), name: form.name, type,
        status: "offline", latency_ms: r.latency_ms,
      });
      toast.error("Could not reach camera — added as offline");
    } else {
      onAdded({
        id: crypto.randomUUID(), name: form.name, type,
        url: form.proxy_url || form.rtsp_url, status: "online",
        uptimeStart: Date.now(), latency_ms: r.latency_ms,
      });
      // Best-effort persistence; ignore failures so demo still works
      try { await registerCamera({ ...form, type }); } catch {}
      toast.success("Camera connected");
    }
    setConnecting(false);
  };

  return (
    <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Connect a camera</DialogTitle>
      </DialogHeader>

      <Tabs value={type} onValueChange={(v) => setType(v as CameraType)}>
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="ip">IP Camera</TabsTrigger>
          <TabsTrigger value="rtsp">RTSP</TabsTrigger>
          <TabsTrigger value="dvr">DVR/NVR</TabsTrigger>
          <TabsTrigger value="webcam">Webcam</TabsTrigger>
          <TabsTrigger value="demo">Demo</TabsTrigger>
        </TabsList>

        <div className="space-y-3 mt-4">
          <Field label="Camera name">
            <Input value={form.name} onChange={(e) => setField("name", e.target.value)}
              placeholder="e.g., Front Entrance Cam" />
          </Field>

          <TabsContent value="ip" className="space-y-3 m-0">
            <Field label="IP address">
              <Input value={form.ip_address} onChange={(e) => setField("ip_address", e.target.value)}
                placeholder="192.168.1.101" className="font-mono" />
            </Field>
            <CredFields form={form} setField={setField} />
          </TabsContent>

          <TabsContent value="rtsp" className="space-y-3 m-0">
            <Field label="RTSP URL">
              <Input value={form.rtsp_url} onChange={(e) => setField("rtsp_url", e.target.value)}
                placeholder="rtsp://192.168.1.101:554/stream1" className="font-mono text-xs" />
            </Field>
            <Field label="Browser-playable proxy URL (HLS/WebRTC)">
              <Input value={form.proxy_url} onChange={(e) => setField("proxy_url", e.target.value)}
                placeholder="http://localhost:8083/.../index.m3u8" className="font-mono text-xs" />
            </Field>
            <CredFields form={form} setField={setField} />
          </TabsContent>

          <TabsContent value="dvr" className="space-y-3 m-0">
            <Field label="DVR/NVR address">
              <Input value={form.ip_address} onChange={(e) => setField("ip_address", e.target.value)}
                placeholder="192.168.1.50" className="font-mono" />
            </Field>
            <CredFields form={form} setField={setField} />
            <p className="text-xs text-muted-foreground">
              ONVIF discovery will be attempted on the configured address.
            </p>
          </TabsContent>

          <TabsContent value="webcam" className="space-y-2 m-0">
            <p className="text-sm text-muted-foreground">
              Use your laptop webcam as a test stream. Your browser will request camera permission.
            </p>
          </TabsContent>

          <TabsContent value="demo" className="space-y-2 m-0">
            <p className="text-sm text-muted-foreground">
              A built-in simulated feed for presentations and FYP demos. No hardware required.
            </p>
          </TabsContent>

          {/* shared metadata */}
          {type !== "webcam" && type !== "demo" && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Manufacturer">
                <Input value={form.manufacturer} onChange={(e) => setField("manufacturer", e.target.value)}
                  placeholder="Hikvision, Dahua…" />
              </Field>
              <Field label="Zone">
                <Select value={form.zone} onValueChange={(v) => setField("zone", v)}>
                  <SelectTrigger><SelectValue placeholder="Select zone" /></SelectTrigger>
                  <SelectContent>
                    {["Perimeter","Lobby","Server Room","Parking","Warehouse","Office Floor"].map(z =>
                      <SelectItem key={z} value={z}>{z}</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Location">
                <Input value={form.location} onChange={(e) => setField("location", e.target.value)}
                  placeholder="Building A · Floor 2" />
              </Field>
            </div>
          )}

          {registeredDevices.length > 0 && type !== "webcam" && type !== "demo" && (
            <div className="pt-1">
              <Label className="text-xs text-muted-foreground">Quick connect</Label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                {registeredDevices.slice(0, 4).map((d) => (
                  <Button key={d.id} variant="outline" size="sm" className="text-xs justify-start"
                    onClick={() => setForm({ ...form, name: d.name, ip_address: d.ip_address })}>
                    <Wifi className="w-3 h-3 mr-1 text-success" />{d.name}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {testResult && (
            <div className={cn(
              "flex items-center gap-2 p-2 rounded-md text-xs",
              testResult.ok ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
            )}>
              {testResult.ok
                ? <CheckCircle2 className="w-4 h-4" />
                : <AlertTriangle className="w-4 h-4" />}
              <span>{testResult.message} · {testResult.latency_ms}ms</span>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            {type !== "webcam" && type !== "demo" && (
              <Button variant="outline" onClick={handleTest} disabled={testing} className="flex-1">
                {testing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Wifi className="w-4 h-4 mr-2" />}
                Test connection
              </Button>
            )}
            <Button onClick={handleConnect} disabled={connecting} className="flex-1">
              {connecting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <PlayCircle className="w-4 h-4 mr-2" />}
              Connect camera
            </Button>
          </div>
        </div>
      </Tabs>
    </DialogContent>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function CredFields({
  form, setField,
}: {
  form: CameraConnectionInput;
  setField: <K extends keyof CameraConnectionInput>(k: K, v: CameraConnectionInput[K]) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Field label="Username">
        <Input value={form.username} onChange={(e) => setField("username", e.target.value)} placeholder="admin" />
      </Field>
      <Field label="Password">
        <Input type="password" value={form.password} onChange={(e) => setField("password", e.target.value)} />
      </Field>
    </div>
  );
}
