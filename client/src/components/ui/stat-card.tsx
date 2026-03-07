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
}

export function StatCard({ title, value, subtitle, icon: Icon, iconColor = "text-primary", iconBg = "bg-primary/10", trend }: StatCardProps) {
  return (
    <div className="bg-card border border-card-border rounded-xl p-5 shadow-sm" data-testid={`stat-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
          <p className="text-2xl font-bold mt-1.5 tracking-tight">{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
          {trend && <div className="mt-1.5">{trend}</div>}
        </div>
        <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${iconBg}`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
      </div>
    </div>
  );
}
