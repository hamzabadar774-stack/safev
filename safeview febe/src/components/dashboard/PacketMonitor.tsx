import { useEffect, useState, useRef } from "react";
import { cn } from "@/lib/utils";

interface Packet {
  id: string;
  timestamp: string;
  source: string;
  destination: string;
  protocol: string;
  size: number;
  status: "safe" | "suspicious" | "blocked";
}

const protocols = ["TCP", "UDP", "HTTP", "HTTPS", "ICMP", "SSH", "FTP"];

const generatePacket = (): Packet => {
  const status = Math.random() > 0.92 ? "blocked" : Math.random() > 0.85 ? "suspicious" : "safe";
  return {
    id: Math.random().toString(36).substr(2, 9),
    timestamp: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }) + '.' + String(new Date().getMilliseconds()).padStart(3, '0'),
    source: `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
    destination: `192.168.1.${Math.floor(Math.random() * 255)}`,
    protocol: protocols[Math.floor(Math.random() * protocols.length)],
    size: Math.floor(Math.random() * 1500) + 64,
    status,
  };
};

const statusStyles = {
  safe: "text-success",
  suspicious: "text-warning",
  blocked: "text-destructive",
};

export function PacketMonitor() {
  const [packets, setPackets] = useState<Packet[]>(() =>
    Array.from({ length: 15 }, generatePacket)
  );
  const [isScrolled, setIsScrolled] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setPackets(prev => {
        const newPackets = [generatePacket(), ...prev.slice(0, 49)];
        return newPackets;
      });
    }, 150);

    return () => clearInterval(interval);
  }, []);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setIsScrolled(e.currentTarget.scrollTop > 10);
  };

  return (
    <div className="cyber-card p-6 cyber-glow">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold">Live Packet Monitor</h3>
          <p className="text-sm text-muted-foreground">Real-time network traffic inspection</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="pulse-dot bg-primary" />
          <span className="text-sm text-primary font-mono">CAPTURING</span>
        </div>
      </div>

      <div className={cn(
        "relative border border-border rounded-lg overflow-hidden",
        "before:absolute before:inset-x-0 before:top-0 before:h-8 before:bg-gradient-to-b before:from-card before:to-transparent before:z-10 before:pointer-events-none",
        isScrolled && "before:opacity-100"
      )}>
        <div className="bg-secondary/30 px-4 py-2 border-b border-border font-mono text-xs text-muted-foreground grid grid-cols-[100px_140px_140px_60px_70px_80px] gap-2">
          <span>TIME</span>
          <span>SOURCE</span>
          <span>DESTINATION</span>
          <span>PROTO</span>
          <span>SIZE</span>
          <span>STATUS</span>
        </div>
        
        <div
          ref={containerRef}
          onScroll={handleScroll}
          className="h-[280px] overflow-y-auto"
        >
          {packets.map((packet, index) => (
            <div
              key={packet.id}
              className={cn(
                "px-4 py-2 font-mono text-xs grid grid-cols-[100px_140px_140px_60px_70px_80px] gap-2",
                "border-b border-border/30 hover:bg-secondary/30 transition-colors",
                index === 0 && "animate-slide-in bg-primary/5"
              )}
            >
              <span className="text-muted-foreground">{packet.timestamp}</span>
              <span>{packet.source}</span>
              <span>{packet.destination}</span>
              <span className="text-primary">{packet.protocol}</span>
              <span className="text-muted-foreground">{packet.size}B</span>
              <span className={cn("uppercase", statusStyles[packet.status])}>
                {packet.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
