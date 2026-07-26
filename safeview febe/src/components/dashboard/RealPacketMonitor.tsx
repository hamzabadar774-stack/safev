import { Network, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRealtimePackets } from "@/hooks/useRealtimeData";

const protocolColors: Record<string, string> = {
  TCP: "text-blue-400",
  UDP: "text-green-400",
  HTTP: "text-yellow-400",
  HTTPS: "text-emerald-400",
  RTSP: "text-purple-400",
  ONVIF: "text-pink-400",
  ICMP: "text-cyan-400",
  SSH: "text-orange-400",
};

export function RealPacketMonitor() {
  const { packets, loading } = useRealtimePackets(30);

  return (
    <div className="cyber-card p-6 h-full">
      <div className="flex items-center gap-2 mb-4">
        <Network className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold">Live Packet Monitor</h3>
        <div className="ml-auto flex items-center gap-2">
          <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
          <span className="text-xs text-muted-foreground font-mono">REALTIME</span>
        </div>
      </div>

      <div className="space-y-1 max-h-[400px] overflow-y-auto font-mono text-xs">
        {loading ? (
          <div className="text-center text-muted-foreground py-8">
            Connecting to database...
          </div>
        ) : packets.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            No packets captured yet. Simulate traffic to see live data.
          </div>
        ) : (
          packets.map((packet, index) => (
            <div
              key={packet.id}
              className={cn(
                "flex items-center gap-2 p-2 rounded transition-all",
                index === 0 && "bg-primary/10 border border-primary/30",
                index !== 0 && "hover:bg-secondary/50"
              )}
            >
              <span className="text-muted-foreground w-20 shrink-0">
                {new Date(packet.timestamp).toLocaleTimeString('en-US', { hour12: false })}
              </span>
              <span className={cn("w-12 shrink-0", protocolColors[packet.protocol] || "text-foreground")}>
                {packet.protocol}
              </span>
              <span className="text-foreground w-36 shrink-0">{packet.source_ip}</span>
              <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />
              <span className="text-foreground w-36 shrink-0">{packet.destination_ip}</span>
              <span className="text-muted-foreground w-16 shrink-0">:{packet.destination_port}</span>
              <span className="text-muted-foreground w-16 shrink-0">{packet.packet_size}B</span>
              {packet.flags && (
                <span className="text-warning text-xs">[{packet.flags}]</span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
