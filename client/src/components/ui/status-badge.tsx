import { Badge } from "@/components/ui/badge";

const statusConfig: Record<string, { label: string; dot: string; className: string }> = {
  open: { label: "Open", dot: "bg-blue-500", className: "bg-blue-50 text-blue-700 border-blue-200/60 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800/50" },
  in_progress: { label: "In Progress", dot: "bg-amber-500", className: "bg-amber-50 text-amber-700 border-amber-200/60 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/50" },
  completed: { label: "Completed", dot: "bg-emerald-500", className: "bg-emerald-50 text-emerald-700 border-emerald-200/60 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/50" },
  closed: { label: "Closed", dot: "bg-gray-400", className: "bg-gray-50 text-gray-600 border-gray-200/60 dark:bg-gray-900/60 dark:text-gray-400 dark:border-gray-700/50" },
  blocked: { label: "Blocked", dot: "bg-orange-500", className: "bg-orange-50 text-orange-700 border-orange-200/60 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-800/50" },
  overdue: { label: "Overdue", dot: "bg-red-500", className: "bg-red-50 text-red-700 border-red-200/60 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800/50" },
  pending: { label: "Pending", dot: "bg-yellow-500", className: "bg-yellow-50 text-yellow-700 border-yellow-200/60 dark:bg-yellow-950/60 dark:text-yellow-300 dark:border-yellow-800/50" },
  approved: { label: "Approved", dot: "bg-emerald-500", className: "bg-emerald-50 text-emerald-700 border-emerald-200/60 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/50" },
  rejected: { label: "Rejected", dot: "bg-red-500", className: "bg-red-50 text-red-700 border-red-200/60 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800/50" },
  draft: { label: "Draft", dot: "bg-gray-400", className: "bg-gray-50 text-gray-600 border-gray-200/60 dark:bg-gray-900/60 dark:text-gray-400 dark:border-gray-700/50" },
  sent: { label: "Sent", dot: "bg-blue-500", className: "bg-blue-50 text-blue-700 border-blue-200/60 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800/50" },
  paid: { label: "Paid", dot: "bg-emerald-500", className: "bg-emerald-50 text-emerald-700 border-emerald-200/60 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/50" },
  active: { label: "Active", dot: "bg-emerald-500", className: "bg-emerald-50 text-emerald-700 border-emerald-200/60 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/50" },
  inactive: { label: "Inactive", dot: "bg-gray-400", className: "bg-gray-50 text-gray-600 border-gray-200/60 dark:bg-gray-900/60 dark:text-gray-400 dark:border-gray-700/50" },
  prospect: { label: "Prospect", dot: "bg-purple-500", className: "bg-purple-50 text-purple-700 border-purple-200/60 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800/50" },
  signed: { label: "Signed", dot: "bg-emerald-500", className: "bg-emerald-50 text-emerald-700 border-emerald-200/60 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/50" },
  expired: { label: "Expired", dot: "bg-gray-400", className: "bg-gray-50 text-gray-500 border-gray-200/60 dark:bg-gray-900/60 dark:text-gray-400 dark:border-gray-700/50" },
  viewed: { label: "Viewed", dot: "bg-cyan-500", className: "bg-cyan-50 text-cyan-700 border-cyan-200/60 dark:bg-cyan-950/60 dark:text-cyan-300 dark:border-cyan-800/50" },
  received: { label: "Received", dot: "bg-emerald-500", className: "bg-emerald-50 text-emerald-700 border-emerald-200/60 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/50" },
  waived: { label: "Waived", dot: "bg-gray-400", className: "bg-gray-50 text-gray-500 border-gray-200/60 dark:bg-gray-900/60 dark:text-gray-400 dark:border-gray-700/50" },
  high: { label: "High", dot: "bg-red-500", className: "bg-red-50 text-red-700 border-red-200/60 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800/50" },
  medium: { label: "Medium", dot: "bg-amber-500", className: "bg-amber-50 text-amber-700 border-amber-200/60 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/50" },
  low: { label: "Low", dot: "bg-gray-400", className: "bg-gray-50 text-gray-600 border-gray-200/60 dark:bg-gray-900/60 dark:text-gray-400 dark:border-gray-700/50" },
  urgent: { label: "Urgent", dot: "bg-red-500", className: "bg-red-50 text-red-700 border-red-200/60 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800/50" },
  new: { label: "New", dot: "bg-blue-500", className: "bg-blue-50 text-blue-700 border-blue-200/60 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800/50" },
  contacted: { label: "Contacted", dot: "bg-cyan-500", className: "bg-cyan-50 text-cyan-700 border-cyan-200/60 dark:bg-cyan-950/60 dark:text-cyan-300 dark:border-cyan-800/50" },
  quoted: { label: "Quoted", dot: "bg-purple-500", className: "bg-purple-50 text-purple-700 border-purple-200/60 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800/50" },
  proposal_sent: { label: "Proposal Sent", dot: "bg-indigo-500", className: "bg-indigo-50 text-indigo-700 border-indigo-200/60 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800/50" },
  negotiating: { label: "Negotiating", dot: "bg-amber-500", className: "bg-amber-50 text-amber-700 border-amber-200/60 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/50" },
  won: { label: "Won", dot: "bg-emerald-500", className: "bg-emerald-50 text-emerald-700 border-emerald-200/60 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/50" },
  lost: { label: "Lost", dot: "bg-gray-400", className: "bg-gray-50 text-gray-500 border-gray-200/60 dark:bg-gray-900/60 dark:text-gray-400 dark:border-gray-700/50" },
};

interface StatusBadgeProps {
  status: string;
  label?: string;
  className?: string;
  showDot?: boolean;
}

export function StatusBadge({ status, label, className = "", showDot = true }: StatusBadgeProps) {
  const config = statusConfig[status.toLowerCase()] || statusConfig[status] || {
    label: status.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
    dot: "bg-gray-400",
    className: "bg-gray-50 text-gray-600 border-gray-200/60 dark:bg-gray-900/60 dark:text-gray-400 dark:border-gray-700/50",
  };

  return (
    <Badge
      variant="outline"
      className={`text-[10px] font-semibold border px-1.5 py-0 h-5 gap-1 ${config.className} ${className}`}
      data-testid={`status-badge-${status}`}
    >
      {showDot && <span className={`w-1.5 h-1.5 rounded-full ${config.dot} flex-shrink-0`} />}
      {label || config.label}
    </Badge>
  );
}
