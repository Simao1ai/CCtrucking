import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Users, Send, ArrowLeft, UserCircle } from "lucide-react";
import { format } from "date-fns";
import type { StaffMessage } from "@shared/schema";

interface StaffUser {
  id: string;
  username: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
}

export default function AdminStaffChat() {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const { user } = useAuth();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: staffUsers = [], isLoading: loadingStaff } = useQuery<StaffUser[]>({
    queryKey: ["/api/admin/staff"],
  });

  const otherStaff = staffUsers.filter(s => s.id !== user?.id);

  const { data: messages = [], isLoading: loadingMessages } = useQuery<StaffMessage[]>({
    queryKey: ["/api/admin/staff-messages", selectedUserId],
    enabled: !!selectedUserId,
    refetchInterval: 5000,
  });

  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ["/api/admin/staff-messages/unread"],
    refetchInterval: 15000,
  });

  const sendMutation = useMutation({
    mutationFn: async (text: string) => {
      await apiRequest("POST", `/api/admin/staff-messages/${selectedUserId}`, { message: text });
    },
    onSuccess: () => {
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/staff-messages", selectedUserId] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/staff-messages/unread"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to send message", variant: "destructive" });
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!message.trim() || !selectedUserId) return;
    sendMutation.mutate(message.trim());
  };

  const selectedUser = otherStaff.find(s => s.id === selectedUserId);

  const getDisplayName = (u: StaffUser) => {
    const name = `${u.firstName || ''} ${u.lastName || ''}`.trim();
    return name || u.username;
  };

  return (
    <div className="flex h-full" data-testid="page-admin-staff-chat">
      <div className={`w-80 border-r flex flex-col ${selectedUserId ? 'hidden md:flex' : 'flex'} ${!selectedUserId ? 'flex-1 md:flex-none' : ''}`}>
        <div className="p-4 border-b">
          <h2 className="font-semibold text-lg flex items-center gap-2">
            <Users className="w-5 h-5" />
            Staff Messages
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            {otherStaff.length} team member{otherStaff.length !== 1 ? "s" : ""}
            {unreadData && unreadData.count > 0 && (
              <Badge variant="destructive" className="ml-2 text-[10px] px-1.5 py-0" data-testid="badge-unread-staff">
                {unreadData.count} unread
              </Badge>
            )}
          </p>
        </div>
        <ScrollArea className="flex-1">
          {loadingStaff ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : otherStaff.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No other staff members found.</p>
          ) : (
            <div className="p-2 space-y-1">
              {otherStaff.map(staffUser => (
                <button
                  key={staffUser.id}
                  onClick={() => setSelectedUserId(staffUser.id)}
                  className={`w-full text-left p-3 rounded-md transition-colors ${
                    selectedUserId === staffUser.id
                      ? "bg-primary/10 border border-primary/20"
                      : "hover:bg-muted/50"
                  }`}
                  data-testid={`staff-user-${staffUser.id}`}
                >
                  <div className="flex items-center gap-2">
                    <UserCircle className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{getDisplayName(staffUser)}</p>
                      <p className="text-xs text-muted-foreground truncate capitalize">{staffUser.role}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      <div className={`flex-1 flex flex-col ${!selectedUserId ? 'hidden md:flex' : 'flex'}`}>
        {selectedUserId && selectedUser ? (
          <>
            <div className="p-4 border-b flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setSelectedUserId(null)}
                data-testid="button-back-to-staff"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <UserCircle className="w-8 h-8 text-muted-foreground" />
              <div>
                <h3 className="font-semibold" data-testid="text-staff-chat-name">{getDisplayName(selectedUser)}</h3>
                <p className="text-xs text-muted-foreground capitalize">{selectedUser.role}</p>
              </div>
            </div>

            <ScrollArea className="flex-1 p-4">
              {loadingMessages ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-3/4" />)}
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-sm text-muted-foreground">No messages yet. Start the conversation!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {messages.map(msg => {
                    const isMe = msg.senderId === user?.id;
                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[70%] rounded-lg p-3 ${
                            isMe
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted"
                          }`}
                          data-testid={`staff-message-${msg.id}`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium">{msg.senderName}</span>
                          </div>
                          <p className="text-sm">{msg.message}</p>
                          <p className={`text-[10px] mt-1 ${isMe ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                            {format(new Date(msg.createdAt), "MMM d, h:mm a")}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </ScrollArea>

            <div className="p-4 border-t">
              <div className="flex gap-2">
                <Input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type a message..."
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                  data-testid="input-staff-chat-message"
                />
                <Button
                  onClick={handleSend}
                  disabled={!message.trim() || sendMutation.isPending}
                  data-testid="button-staff-send-message"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">Select a team member to message</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
