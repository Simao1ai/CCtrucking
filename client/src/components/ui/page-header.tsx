import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  badge?: ReactNode;
  actions?: ReactNode;
  icon?: ReactNode;
}

export function PageHeader({ title, description, badge, actions, icon }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4" data-testid="page-header">
      <div className="flex items-start gap-3 min-w-0">
        {icon && <div className="flex-shrink-0 mt-0.5">{icon}</div>}
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <h1 className="text-lg font-semibold tracking-tight leading-tight" data-testid="page-title">{title}</h1>
            {badge}
          </div>
          {description && (
            <p className="text-[13px] text-muted-foreground mt-0.5 leading-snug" data-testid="page-description">{description}</p>
          )}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
    </div>
  );
}

interface SectionHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
}

export function SectionHeader({ title, description, actions }: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <h2 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider">{title}</h2>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      {actions}
    </div>
  );
}
