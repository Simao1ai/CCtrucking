import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Bell, Check, CheckCheck, MessageCircle, Receipt, PenLine, Ticket, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";
import type { Notification } from "@shared/schema";

const typeIcons: Record<string, typeof Info> = {
  chat: MessageCircle,
  invoice: Receipt,
  signature: PenLine,
  ticket: Ticket,
  info: Info,
};

export function NotificationBell({ basePath }: { basePath: "/admin" | "/portal" }) {
  const [open, setOpen] = useState(false);
  const [, navigate] = useLocation();

  const { data: notifs = [] } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
    refetchInterval: 15000,
  });

  const { data: countData } = useQuery<{ count: number }>({
    queryKey: ["/api/notifications/unread-count"],
    refetchInterval: 15000,
  });

  const unreadCount = countData?.count ?? 0;

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("PATCH", `/api/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/notifications/mark-all-read");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
  });

  const handleClick = (notif: Notification) => {
    if (notif.read === "false") {
      markReadMutation.mutate(notif.id);
    }
    if (notif.link) {
      setOpen(false);
      const link = notif.link.startsWith("/portal") && basePath === "/admin"
        ? notif.link
        : notif.link.startsWith("/admin") && basePath === "/portal"
          ? notif.link
          : notif.link;
      navigate(link);
    }
  };

  const recent = notifs.slice(0, 20);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" data-testid="button-notifications">
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold px-1" data-testid="text-unread-count">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0 max-h-[420px] overflow-hidden flex flex-col" data-testid="popover-notifications">
        <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
          <h3 className="font-semibold text-sm">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7 px-2"
              onClick={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending}
              data-testid="button-mark-all-read"
            >
              <CheckCheck className="w-3 h-3 mr-1" />
              Mark all read
            </Button>
          )}
        </div>
        <div className="overflow-auto flex-1">
          {recent.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              <Bell className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
              No notifications yet
            </div>
          ) : (
            <div>
              {recent.map((notif) => {
                const Icon = typeIcons[notif.type] || Info;
                const isUnread = notif.read === "false";
                return (
                  <button
                    key={notif.id}
                    onClick={() => handleClick(notif)}
                    className={`w-full text-left px-4 py-3 border-b last:border-b-0 hover:bg-muted/50 transition-colors flex gap-3 items-start ${isUnread ? "bg-primary/5" : ""}`}
                    data-testid={`notification-item-${notif.id}`}
                  >
                    <div className={`flex items-center justify-center w-8 h-8 rounded-full shrink-0 mt-0.5 ${isUnread ? "bg-primary/10" : "bg-muted"}`}>
                      <Icon className={`w-4 h-4 ${isUnread ? "text-primary" : "text-muted-foreground"}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className={`text-sm truncate ${isUnread ? "font-semibold" : "font-medium"}`}>{notif.title}</p>
                        {isUnread && <span className="w-2 h-2 rounded-full bg-primary shrink-0" />}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notif.message}</p>
                      <p className="text-[10px] text-muted-foreground/70 mt-1">
                        {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
