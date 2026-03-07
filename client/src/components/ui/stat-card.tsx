import type { ReactNode } from "react";
import { type LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  iconColor?: string;
  iconBg?: string;
  trend?: ReactNode;
  accent?: string;
}

export function StatCard({ title, value, subtitle, icon: Icon, iconColor = "text-primary", iconBg = "bg-primary/10", trend, accent }: StatCardProps) {
  return (
    <div className={`relative bg-card border border-card-border rounded-xl p-4 shadow-sm overflow-hidden group`} data-testid={`stat-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      {accent && <div className={`absolute left-0 top-0 bottom-0 w-1 ${accent}`} />}
      <div className="flex items-center gap-3">
        <div className={`flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${iconBg}`}>
          <Icon className={`w-[18px] h-[18px] ${iconColor}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider leading-none">{title}</p>
          <div className="flex items-baseline gap-2 mt-1">
            <p className="text-xl font-bold tracking-tight leading-none">{value}</p>
            {subtitle && <p className="text-[11px] text-muted-foreground truncate">{subtitle}</p>}
          </div>
          {trend && <div className="mt-1">{trend}</div>}
        </div>
      </div>
    </div>
  );
}

interface MiniStatProps {
  label: string;
  value: string | number;
  color?: string;
}

export function MiniStat({ label, value, color = "text-foreground" }: MiniStatProps) {
  return (
    <div className="flex flex-col">
      <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">{label}</span>
      <span className={`text-lg font-bold tracking-tight ${color}`}>{value}</span>
    </div>
  );
}
