import type { ReactNode } from "react";
import { type LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
  compact?: boolean;
}

export function EmptyState({ icon: Icon, title, description, action, compact }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center ${compact ? "py-8" : "py-12"} px-4`} data-testid="empty-state">
      <div className={`${compact ? "w-10 h-10 rounded-xl" : "w-12 h-12 rounded-xl"} bg-muted/80 flex items-center justify-center mb-3`}>
        <Icon className={`${compact ? "w-5 h-5" : "w-6 h-6"} text-muted-foreground/40`} />
      </div>
      <h3 className="text-sm font-medium text-foreground mb-0.5">{title}</h3>
      <p className="text-xs text-muted-foreground text-center max-w-xs">{description}</p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
