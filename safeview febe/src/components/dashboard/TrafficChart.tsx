import { useEffect, useState } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface DataPoint {
  time: string;
  incoming: number;
  outgoing: number;
  threats: number;
}

const generateInitialData = (): DataPoint[] => {
  const data: DataPoint[] = [];
  const now = new Date();
  
  for (let i = 29; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 2000);
    data.push({
      time: time.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      incoming: Math.floor(Math.random() * 500) + 200,
      outgoing: Math.floor(Math.random() * 400) + 150,
      threats: Math.random() > 0.85 ? Math.floor(Math.random() * 30) + 5 : 0,
    });
  }
  return data;
};

export function TrafficChart() {
  const [data, setData] = useState<DataPoint[]>(generateInitialData);

  useEffect(() => {
    const interval = setInterval(() => {
      setData(prev => {
        const newPoint: DataPoint = {
          time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          incoming: Math.floor(Math.random() * 500) + 200,
          outgoing: Math.floor(Math.random() * 400) + 150,
          threats: Math.random() > 0.85 ? Math.floor(Math.random() * 30) + 5 : 0,
        };
        return [...prev.slice(1), newPoint];
      });
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="cyber-card p-6 cyber-glow">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold">Network Traffic Flow</h3>
          <p className="text-sm text-muted-foreground">Real-time packet analysis</p>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-primary" />
            <span className="text-muted-foreground">Incoming</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-success" />
            <span className="text-muted-foreground">Outgoing</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-destructive" />
            <span className="text-muted-foreground">Threats</span>
          </div>
        </div>
      </div>
      
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="incomingGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(174, 72%, 50%)" stopOpacity={0.4} />
                <stop offset="95%" stopColor="hsl(174, 72%, 50%)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="outgoingGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(142, 72%, 45%)" stopOpacity={0.4} />
                <stop offset="95%" stopColor="hsl(142, 72%, 45%)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="threatGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(0, 72%, 51%)" stopOpacity={0.6} />
                <stop offset="95%" stopColor="hsl(0, 72%, 51%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 47%, 16%)" />
            <XAxis 
              dataKey="time" 
              stroke="hsl(215, 20%, 55%)"
              fontSize={10}
              fontFamily="JetBrains Mono"
              tickLine={false}
            />
            <YAxis 
              stroke="hsl(215, 20%, 55%)"
              fontSize={10}
              fontFamily="JetBrains Mono"
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(222, 47%, 8%)',
                border: '1px solid hsl(222, 47%, 16%)',
                borderRadius: '8px',
                fontFamily: 'JetBrains Mono',
                fontSize: '12px',
              }}
              labelStyle={{ color: 'hsl(210, 40%, 98%)' }}
            />
            <Area
              type="monotone"
              dataKey="incoming"
              stroke="hsl(174, 72%, 50%)"
              strokeWidth={2}
              fill="url(#incomingGradient)"
            />
            <Area
              type="monotone"
              dataKey="outgoing"
              stroke="hsl(142, 72%, 45%)"
              strokeWidth={2}
              fill="url(#outgoingGradient)"
            />
            <Area
              type="monotone"
              dataKey="threats"
              stroke="hsl(0, 72%, 51%)"
              strokeWidth={2}
              fill="url(#threatGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
