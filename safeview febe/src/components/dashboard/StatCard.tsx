import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: "default" | "threat" | "safe" | "warning";
  subtitle?: string;
}

const variantStyles = {
  default: "text-primary",
  threat: "text-destructive",
  safe: "text-success",
  warning: "text-warning",
};

const variantGlows = {
  default: "cyber-glow",
  threat: "threat-glow",
  safe: "safe-glow",
  warning: "",
};

export function StatCard({ title, value, icon: Icon, trend, variant = "default", subtitle }: StatCardProps) {
  return (
    <div className={cn("cyber-card p-6 relative overflow-hidden group", variantGlows[variant])}>
      <div className="scan-line opacity-0 group-hover:opacity-100 transition-opacity" />
      
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="data-label">{title}</p>
          <p className={cn("stat-value", variantStyles[variant])}>{value}</p>
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
          {trend && (
            <div className={cn(
              "flex items-center gap-1 text-sm font-mono",
              trend.isPositive ? "text-success" : "text-destructive"
            )}>
              <span>{trend.isPositive ? "↑" : "↓"}</span>
              <span>{Math.abs(trend.value)}%</span>
              <span className="text-muted-foreground">vs last hour</span>
            </div>
          )}
        </div>
        <div className={cn(
          "p-3 rounded-lg bg-secondary/50",
          variantStyles[variant]
        )}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}
