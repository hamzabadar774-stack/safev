import { useState } from "react";
import { 
  Play, Square, Zap, Send, Download, Shield, Ban, 
  Search, FileText, RotateCcw, AlertTriangle, Network 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { analyzePacket, simulateTraffic, blockThreat, getDashboardStats } from "@/services/safeviewApi";
import { useRealtimeThreats } from "@/hooks/useRealtimeData";
import { toast } from "sonner";

export function ControlPanel() {
  const { threats } = useRealtimeThreats(50);
  const [isMonitoring, setIsMonitoring] = useState(true);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simCount, setSimCount] = useState("5");
  const [attackType, setAttackType] = useState<string>("normal");
  const [blockIp, setBlockIp] = useState("");
  const [isExporting, setIsExporting] = useState(false);

  // Manual packet analysis state
  const [packetForm, setPacketForm] = useState({
    source_ip: "",
    destination_ip: "",
    source_port: "",
    destination_port: "",
    protocol: "TCP",
    packet_size: "",
    flags: "",
  });
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleSimulate = async () => {
    setIsSimulating(true);
    try {
      const scenario = attackType === "normal" ? undefined : attackType as "ddos" | "port_scan" | "brute_force";
      const result = await simulateTraffic(parseInt(simCount) || 5, scenario);
      if (result.success && result.data) {
        toast.success(
          `Generated ${result.data.packets_generated} packets: ${result.data.threats_detected} threats, ${result.data.blocked} blocked`
        );
      } else {
        toast.error(result.error || "Simulation failed");
      }
    } catch (e) {
      toast.error("Error running simulation");
    } finally {
      setIsSimulating(false);
    }
  };

  const handleAnalyzePacket = async () => {
    if (!packetForm.source_ip || !packetForm.destination_ip) {
      toast.error("Please fill in source and destination IP");
      return;
    }
    setIsAnalyzing(true);
    setAnalysisResult(null);
    try {
      const result = await analyzePacket({
        source_ip: packetForm.source_ip,
        destination_ip: packetForm.destination_ip,
        source_port: parseInt(packetForm.source_port) || 0,
        destination_port: parseInt(packetForm.destination_port) || 80,
        protocol: packetForm.protocol,
        packet_size: parseInt(packetForm.packet_size) || 64,
        flags: packetForm.flags || undefined,
      });
      if (result.success) {
        setAnalysisResult(result.data?.analysis);
        if (result.data?.analysis?.is_threat) {
          toast.warning(`Threat detected: ${result.data.analysis.threat_type}`);
        } else {
          toast.success("Packet analyzed: No threat detected");
        }
      } else {
        toast.error(result.error || "Analysis failed");
      }
    } catch (e) {
      toast.error("Error analyzing packet");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleBlockIp = async () => {
    if (!blockIp) {
      toast.error("Enter an IP address to block");
      return;
    }
    // Find unblocked threats from this IP
    const unblockedThreats = threats.filter(t => t.source_ip === blockIp && !t.is_blocked);
    if (unblockedThreats.length === 0) {
      toast.info(`No active threats from ${blockIp} to block`);
      return;
    }
    let blocked = 0;
    for (const threat of unblockedThreats) {
      const result = await blockThreat(threat.id);
      if (result.success) blocked++;
    }
    toast.success(`Blocked ${blocked} threat(s) from ${blockIp}`);
    setBlockIp("");
  };

  const handleExportReport = async () => {
    setIsExporting(true);
    try {
      const stats = await getDashboardStats();
      const reportData = {
        report_title: "SafeView IDPS Security Report",
        generated_at: new Date().toISOString(),
        summary: stats,
        recent_threats: threats.slice(0, 20).map(t => ({
          type: t.threat_type,
          severity: t.severity,
          source_ip: t.source_ip,
          confidence: t.confidence,
          blocked: t.is_blocked,
          timestamp: t.timestamp,
          description: t.description,
        })),
      };
      
      const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `safeview-report-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Security report exported");
    } catch (e) {
      toast.error("Failed to export report");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="cyber-card p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Control Panel</h3>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={isMonitoring ? "default" : "outline"}
            onClick={() => { setIsMonitoring(!isMonitoring); toast.info(isMonitoring ? "Monitoring paused" : "Monitoring resumed"); }}
            className="text-xs"
          >
            {isMonitoring ? <Square className="w-3 h-3 mr-1" /> : <Play className="w-3 h-3 mr-1" />}
            {isMonitoring ? "Pause" : "Resume"}
          </Button>
          <Button size="sm" variant="outline" onClick={handleExportReport} disabled={isExporting} className="text-xs">
            <Download className="w-3 h-3 mr-1" />
            {isExporting ? "Exporting..." : "Export Report"}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="simulate" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-4">
          <TabsTrigger value="simulate" className="text-xs">
            <Zap className="w-3 h-3 mr-1" />
            Simulate
          </TabsTrigger>
          <TabsTrigger value="analyze" className="text-xs">
            <Search className="w-3 h-3 mr-1" />
            Analyze
          </TabsTrigger>
          <TabsTrigger value="block" className="text-xs">
            <Ban className="w-3 h-3 mr-1" />
            Block
          </TabsTrigger>
        </TabsList>

        {/* Simulate Traffic Tab */}
        <TabsContent value="simulate" className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Packet Count</label>
              <Input
                type="number"
                value={simCount}
                onChange={(e) => setSimCount(e.target.value)}
                min="1"
                max="20"
                className="font-mono text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Scenario</label>
              <Select value={attackType} onValueChange={setAttackType}>
                <SelectTrigger className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal Traffic</SelectItem>
                  <SelectItem value="ddos">DDoS Attack</SelectItem>
                  <SelectItem value="port_scan">Port Scan</SelectItem>
                  <SelectItem value="brute_force">Brute Force</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={handleSimulate} disabled={isSimulating} className="w-full">
            {isSimulating ? (
              <>
                <RotateCcw className="w-4 h-4 mr-2 animate-spin" />
                Simulating...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Run Simulation
              </>
            )}
          </Button>
        </TabsContent>

        {/* Manual Packet Analysis Tab */}
        <TabsContent value="analyze" className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Source IP</label>
              <Input
                placeholder="203.0.113.50"
                value={packetForm.source_ip}
                onChange={(e) => setPacketForm(p => ({ ...p, source_ip: e.target.value }))}
                className="font-mono text-xs"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Destination IP</label>
              <Input
                placeholder="192.168.1.101"
                value={packetForm.destination_ip}
                onChange={(e) => setPacketForm(p => ({ ...p, destination_ip: e.target.value }))}
                className="font-mono text-xs"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Source Port</label>
              <Input
                type="number"
                placeholder="54321"
                value={packetForm.source_port}
                onChange={(e) => setPacketForm(p => ({ ...p, source_port: e.target.value }))}
                className="font-mono text-xs"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Dest Port</label>
              <Input
                type="number"
                placeholder="554"
                value={packetForm.destination_port}
                onChange={(e) => setPacketForm(p => ({ ...p, destination_port: e.target.value }))}
                className="font-mono text-xs"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Protocol</label>
              <Select value={packetForm.protocol} onValueChange={(v) => setPacketForm(p => ({ ...p, protocol: v }))}>
                <SelectTrigger className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TCP">TCP</SelectItem>
                  <SelectItem value="UDP">UDP</SelectItem>
                  <SelectItem value="RTSP">RTSP</SelectItem>
                  <SelectItem value="HTTP">HTTP</SelectItem>
                  <SelectItem value="HTTPS">HTTPS</SelectItem>
                  <SelectItem value="ONVIF">ONVIF</SelectItem>
                  <SelectItem value="ICMP">ICMP</SelectItem>
                  <SelectItem value="SSH">SSH</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Packet Size (B)</label>
              <Input
                type="number"
                placeholder="1500"
                value={packetForm.packet_size}
                onChange={(e) => setPacketForm(p => ({ ...p, packet_size: e.target.value }))}
                className="font-mono text-xs"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Flags (optional)</label>
            <Input
              placeholder="SYN, ACK, FIN, RST..."
              value={packetForm.flags}
              onChange={(e) => setPacketForm(p => ({ ...p, flags: e.target.value }))}
              className="font-mono text-xs"
            />
          </div>
          <Button onClick={handleAnalyzePacket} disabled={isAnalyzing} className="w-full">
            {isAnalyzing ? (
              <>
                <RotateCcw className="w-4 h-4 mr-2 animate-spin" />
                AI Analyzing...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Analyze with AI
              </>
            )}
          </Button>

          {/* Analysis Result */}
          {analysisResult && (
            <div className={cn(
              "p-3 rounded-lg border text-sm",
              analysisResult.is_threat 
                ? "bg-destructive/10 border-destructive/30" 
                : "bg-success/10 border-success/30"
            )}>
              <div className="flex items-center gap-2 mb-2">
                {analysisResult.is_threat ? (
                  <AlertTriangle className="w-4 h-4 text-destructive" />
                ) : (
                  <Shield className="w-4 h-4 text-success" />
                )}
                <span className="font-semibold">
                  {analysisResult.is_threat ? `THREAT: ${analysisResult.threat_type}` : "SAFE"}
                </span>
                <span className={cn(
                  "text-xs font-mono ml-auto px-2 py-0.5 rounded",
                  analysisResult.severity === "critical" && "bg-destructive text-destructive-foreground",
                  analysisResult.severity === "high" && "bg-orange-500 text-white",
                  analysisResult.severity === "medium" && "bg-warning text-warning-foreground",
                  analysisResult.severity === "low" && "bg-muted text-muted-foreground"
                )}>
                  {analysisResult.severity}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mb-1">{analysisResult.description}</p>
              <p className="text-xs text-primary">
                <strong>Recommendation:</strong> {analysisResult.recommendation}
              </p>
              <div className="text-xs text-muted-foreground mt-1">
                Confidence: {(Number(analysisResult.confidence) * 100).toFixed(0)}%
              </div>
            </div>
          )}
        </TabsContent>

        {/* Block IP Tab */}
        <TabsContent value="block" className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Block IP Address</label>
            <div className="flex gap-2">
              <Input
                placeholder="e.g., 203.0.113.50"
                value={blockIp}
                onChange={(e) => setBlockIp(e.target.value)}
                className="font-mono text-sm"
              />
              <Button onClick={handleBlockIp} variant="destructive" size="sm">
                <Ban className="w-4 h-4 mr-1" />
                Block
              </Button>
            </div>
          </div>

          {/* Active unblocked threats */}
          <div>
            <label className="text-xs text-muted-foreground mb-2 block">Active Threats (click to block)</label>
            <div className="space-y-1 max-h-[150px] overflow-y-auto">
              {threats.filter(t => !t.is_blocked).length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">No active threats</p>
              ) : (
                threats.filter(t => !t.is_blocked).slice(0, 10).map(threat => (
                  <div key={threat.id} className="flex items-center justify-between p-2 rounded bg-destructive/5 border border-destructive/20 text-xs">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-3 h-3 text-destructive" />
                      <span className="font-mono">{threat.source_ip}</span>
                      <span className="text-muted-foreground">{threat.threat_type}</span>
                    </div>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-5 text-xs px-2"
                      onClick={async () => {
                        const result = await blockThreat(threat.id);
                        if (result.success) toast.success(`Blocked ${threat.source_ip}`);
                      }}
                    >
                      Block
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
