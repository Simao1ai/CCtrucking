import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Send, MessageCircle } from "lucide-react";
import { useTenant } from "@/context/tenant-context";
import { format } from "date-fns";
import type { ChatMessage } from "@shared/schema";

export default function PortalChat() {
  const branding = useTenant();
  const [message, setMessage] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: messages = [], isLoading } = useQuery<ChatMessage[]>({
    queryKey: ["/api/portal/chat"],
    refetchInterval: 5000,
  });

  const sendMutation = useMutation({
    mutationFn: async (msg: string) => {
      const res = await apiRequest("POST", "/api/portal/chat", { message: msg });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/portal/chat"] });
      setMessage("");
    },
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    sendMutation.mutate(message.trim());
  };

  return (
    <div className="p-6 h-full flex flex-col" data-testid="page-portal-chat">
      <div className="mb-4">
        <PageHeader
          title="Messages"
          description={`Chat with your ${branding.companyName} team`}
        />
      </div>

      <Card className="flex-1 flex flex-col min-h-0">
        <CardHeader className="border-b py-3">
          <CardTitle className="text-sm flex items-center gap-2 flex-wrap">
            <MessageCircle className="w-4 h-4" />
            Support Chat
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-auto p-4 space-y-4">
          {isLoading ? (
            <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-3/4" />)}</div>
          ) : messages.length === 0 ? (
            <EmptyState
              icon={MessageCircle}
              title="No messages yet"
              description="Start a conversation! Our team typically responds within 24 hours."
            />
          ) : (
            messages.map(msg => (
              <div
                key={msg.id}
                className={`flex ${msg.senderRole === "client" ? "justify-end" : "justify-start"}`}
                data-testid={`chat-msg-${msg.id}`}
              >
                <div className={`max-w-[75%] rounded-lg px-4 py-2 ${
                  msg.senderRole === "client"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}>
                  <div className="text-xs opacity-70 mb-1">{msg.senderName}</div>
                  <div className="text-sm">{msg.message}</div>
                  <div className="text-xs opacity-50 mt-1">
                    {format(new Date(msg.createdAt), "MMM d, h:mm a")}
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </CardContent>
        <div className="border-t p-4">
          <form onSubmit={handleSend} className="flex gap-2" data-testid="form-chat">
            <Input
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Type a message..."
              disabled={sendMutation.isPending}
              data-testid="input-chat-message"
            />
            <Button type="submit" disabled={sendMutation.isPending || !message.trim()} data-testid="button-send-chat">
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}
