import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Users, Shield, Building2, UserCog } from "lucide-react";
import { format } from "date-fns";
import type { User } from "@shared/models/auth";
import type { Client } from "@shared/schema";

export default function AdminUsers() {
  const { toast } = useToast();
  const [assignDialog, setAssignDialog] = useState<{ open: boolean; userId: string; userName: string }>({ open: false, userId: "", userName: "" });
  const [selectedClientId, setSelectedClientId] = useState<string>("");

  const { data: userList = [], isLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
  });

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const setAdminMutation = useMutation({
    mutationFn: async (userId: string) => {
      await apiRequest("PATCH", "/api/auth/set-admin", { userId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "Success", description: "User promoted to admin" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update role", variant: "destructive" });
    },
  });

  const assignClientMutation = useMutation({
    mutationFn: async ({ userId, clientId }: { userId: string; clientId: string }) => {
      await apiRequest("PATCH", "/api/auth/assign-client", { userId, clientId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setAssignDialog({ open: false, userId: "", userName: "" });
      setSelectedClientId("");
      toast({ title: "Success", description: "User assigned to client account" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to assign client", variant: "destructive" });
    },
  });

  return (
    <div className="p-6 space-y-6" data-testid="page-admin-users">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <UserCog className="w-6 h-6" />
            User Management
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Manage user roles and client account assignments</p>
        </div>
        <Badge variant="outline" className="text-sm">{userList.length} users</Badge>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      ) : userList.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">No users have signed up yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {userList.map(user => {
            const linkedClient = clients.find(c => c.id === user.clientId);
            return (
              <Card key={user.id} data-testid={`user-card-${user.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                        {user.role === "admin" ? (
                          <Shield className="w-5 h-5 text-primary" />
                        ) : (
                          <Users className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-sm">
                          {user.firstName} {user.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground">{user.email || "No email"}</p>
                        {linkedClient && (
                          <p className="text-xs text-primary flex items-center gap-1 mt-0.5">
                            <Building2 className="w-3 h-3" />
                            {linkedClient.companyName}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                        {user.role}
                      </Badge>
                      {user.role !== "admin" && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setAssignDialog({
                                open: true,
                                userId: user.id,
                                userName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
                              });
                            }}
                            data-testid={`button-assign-client-${user.id}`}
                          >
                            <Building2 className="w-3 h-3 mr-1" />
                            Assign Client
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setAdminMutation.mutate(user.id)}
                            disabled={setAdminMutation.isPending}
                            data-testid={`button-make-admin-${user.id}`}
                          >
                            <Shield className="w-3 h-3 mr-1" />
                            Make Admin
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                  {user.createdAt && (
                    <p className="text-[10px] text-muted-foreground mt-2">
                      Joined {format(new Date(user.createdAt), "MMM d, yyyy")}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={assignDialog.open} onOpenChange={(open) => setAssignDialog(prev => ({ ...prev, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Client Account</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Link <strong>{assignDialog.userName}</strong> to a client company account. This will give them access to the client portal for that company.
          </p>
          <Select value={selectedClientId} onValueChange={setSelectedClientId}>
            <SelectTrigger data-testid="select-client-for-assign">
              <SelectValue placeholder="Select a client company" />
            </SelectTrigger>
            <SelectContent>
              {clients.map(client => (
                <SelectItem key={client.id} value={client.id}>
                  {client.companyName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setAssignDialog({ open: false, userId: "", userName: "" })} data-testid="button-cancel-assign">
              Cancel
            </Button>
            <Button
              onClick={() => assignClientMutation.mutate({ userId: assignDialog.userId, clientId: selectedClientId })}
              disabled={!selectedClientId || assignClientMutation.isPending}
              data-testid="button-confirm-assign"
            >
              Assign
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
