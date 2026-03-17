import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Users, Shield, Building2, UserCog, Plus, Trash2, Copy, CheckCircle2, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import type { User } from "@shared/models/auth";
import type { Client } from "@shared/schema";

type SafeUser = Omit<User, "password">;

interface UsageData {
  plan: string;
  planName: string;
  userCount: number;
  userLimit: number;
}

export default function AdminUsers() {
  const { toast } = useToast();
  const [assignDialog, setAssignDialog] = useState<{ open: boolean; userId: string; userName: string }>({ open: false, userId: "", userName: "" });
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [createDialog, setCreateDialog] = useState(false);
  const [credentialsDialog, setCredentialsDialog] = useState<{ open: boolean; username: string; password: string; role: string } | null>(null);
  const [newUser, setNewUser] = useState({ username: "", password: "", firstName: "", lastName: "", email: "", role: "client", clientId: "" });

  const { data: userList = [], isLoading } = useQuery<SafeUser[]>({
    queryKey: ["/api/admin/users"],
  });

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const { data: usage } = useQuery<UsageData>({
    queryKey: ["/api/tenant/usage"],
  });

  const atUserLimit = usage && usage.userLimit !== -1 && usage.userCount >= usage.userLimit;
  const nearUserLimit = usage && usage.userLimit !== -1 && usage.userCount >= usage.userLimit * 0.8;

  const createUserMutation = useMutation({
    mutationFn: async (data: typeof newUser) => {
      await apiRequest("POST", "/api/admin/create-user", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tenant/usage"] });
      setCreateDialog(false);
      setCredentialsDialog({ open: true, username: newUser.username, password: newUser.password, role: newUser.role });
      setNewUser({ username: "", password: "", firstName: "", lastName: "", email: "", role: "client", clientId: "" });
    },
    onError: (error: Error) => {
      const msg = error.message.includes("Username already exists") ? "Username already exists"
        : error.message.includes("PLAN_LIMIT_REACHED") ? "User limit reached for your current plan. Please upgrade."
        : "Failed to create account";
      toast({ title: "Error", description: msg, variant: "destructive" });
    },
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

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      await apiRequest("DELETE", `/api/admin/users/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "Success", description: "User deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message.includes("Cannot delete") ? "Cannot delete your own account" : "Failed to delete user", variant: "destructive" });
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
          <p className="text-muted-foreground text-sm mt-1">Create and manage user accounts</p>
        </div>
        <div className="flex items-center gap-2">
          {usage && usage.userLimit !== -1 && (
            <Badge variant="outline" className={`text-sm ${nearUserLimit ? "border-yellow-500 text-yellow-700" : ""}`} data-testid="badge-user-count">
              {usage.userCount} / {usage.userLimit} users
            </Badge>
          )}
          {!usage?.userLimit && <Badge variant="outline" className="text-sm">{userList.length} users</Badge>}
          <Button onClick={() => setCreateDialog(true)} disabled={!!atUserLimit} data-testid="button-create-user">
            <Plus className="w-4 h-4 mr-1" />
            Create Account
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      ) : userList.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">No users yet. Create the first account above.</p>
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
                        {user.role === "owner" ? (
                          <Shield className="w-5 h-5 text-primary" />
                        ) : user.role === "admin" ? (
                          <Shield className="w-5 h-5 text-blue-500" />
                        ) : (
                          <Users className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-sm">
                          {user.firstName || user.lastName
                            ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
                            : user.username || 'Unknown'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {user.username && <span className="mr-2">@{user.username}</span>}
                          {user.email || ""}
                        </p>
                        {linkedClient && (
                          <p className="text-xs text-primary flex items-center gap-1 mt-0.5">
                            <Building2 className="w-3 h-3" />
                            {linkedClient.companyName}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={user.role === "owner" ? "default" : user.role === "admin" ? "default" : "secondary"}>
                        {user.role === "owner" ? "Admin (Owner)" : user.role === "admin" ? "Staff" : "Client"}
                      </Badge>
                      {user.role !== "owner" && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setAssignDialog({
                                open: true,
                                userId: user.id,
                                userName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || 'User',
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
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (confirm("Are you sure you want to delete this user?")) {
                            deleteUserMutation.mutate(user.id);
                          }
                        }}
                        className="text-destructive hover:text-destructive"
                        data-testid={`button-delete-user-${user.id}`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
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

      <Dialog open={createDialog} onOpenChange={setCreateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Account</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createUserMutation.mutate(newUser);
            }}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="create-firstName">First Name</Label>
                <Input
                  id="create-firstName"
                  value={newUser.firstName}
                  onChange={(e) => setNewUser(prev => ({ ...prev, firstName: e.target.value }))}
                  placeholder="First name"
                  data-testid="input-create-firstname"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="create-lastName">Last Name</Label>
                <Input
                  id="create-lastName"
                  value={newUser.lastName}
                  onChange={(e) => setNewUser(prev => ({ ...prev, lastName: e.target.value }))}
                  placeholder="Last name"
                  data-testid="input-create-lastname"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="create-email">Email</Label>
              <Input
                id="create-email"
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                placeholder="email@example.com"
                data-testid="input-create-email"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="create-username">Username *</Label>
              <Input
                id="create-username"
                value={newUser.username}
                onChange={(e) => setNewUser(prev => ({ ...prev, username: e.target.value }))}
                placeholder="Username for login"
                required
                data-testid="input-create-username"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="create-password">Password *</Label>
              <Input
                id="create-password"
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))}
                placeholder="Initial password"
                required
                data-testid="input-create-password"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="create-role">Role *</Label>
              <Select value={newUser.role} onValueChange={(val) => setNewUser(prev => ({ ...prev, role: val }))}>
                <SelectTrigger data-testid="select-create-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin" data-testid="option-role-admin">Staff</SelectItem>
                  <SelectItem value="owner" data-testid="option-role-owner">Admin (Owner)</SelectItem>
                  <SelectItem value="client" data-testid="option-role-client">Client</SelectItem>
                  <SelectItem value="preparer" data-testid="option-role-preparer">Tax Preparer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {newUser.role === "client" && (
              <div className="space-y-1.5">
                <Label htmlFor="create-client">Client Company</Label>
                <Select value={newUser.clientId} onValueChange={(val) => setNewUser(prev => ({ ...prev, clientId: val }))}>
                  <SelectTrigger data-testid="select-create-client">
                    <SelectValue placeholder="Select a company (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map(client => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.companyName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setCreateDialog(false)} data-testid="button-cancel-create">
                Cancel
              </Button>
              <Button type="submit" disabled={createUserMutation.isPending} data-testid="button-confirm-create">
                {createUserMutation.isPending ? "Creating..." : "Create Account"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {atUserLimit && (
        <Card className="border-yellow-500/50 bg-yellow-500/5">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 shrink-0" />
            <div>
              <p className="text-sm font-medium">User limit reached</p>
              <p className="text-xs text-muted-foreground">Your {usage?.planName} plan allows {usage?.userLimit} users. Contact your platform admin to upgrade.</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!credentialsDialog?.open} onOpenChange={(open) => !open && setCredentialsDialog(null)}>
        <DialogContent className="max-w-sm" data-testid="dialog-credentials">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              Account Created
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Share these credentials with the new user. They can change their password after first login.</p>
          <div className="space-y-3 bg-muted/50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Username</p>
                <p className="font-mono text-sm font-medium" data-testid="text-created-username">{credentialsDialog?.username}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => { navigator.clipboard.writeText(credentialsDialog?.username || ""); toast({ title: "Copied!" }); }} data-testid="button-copy-username">
                <Copy className="w-3.5 h-3.5" />
              </Button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Password</p>
                <p className="font-mono text-sm font-medium" data-testid="text-created-password">{credentialsDialog?.password}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => { navigator.clipboard.writeText(credentialsDialog?.password || ""); toast({ title: "Copied!" }); }} data-testid="button-copy-password">
                <Copy className="w-3.5 h-3.5" />
              </Button>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Role</p>
              <Badge className="mt-0.5" data-testid="badge-created-role">{credentialsDialog?.role}</Badge>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setCredentialsDialog(null)} data-testid="button-close-credentials">Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
