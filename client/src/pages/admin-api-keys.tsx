import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Key, Plus, Copy, Check, Trash2, Clock, Shield, BookOpen, Loader2 } from "lucide-react";

export default function AdminApiKeys() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [keyName, setKeyName] = useState("");
  const [newRawKey, setNewRawKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const { data: apiKeys = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/api-keys"],
  });

  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await apiRequest("POST", "/api/admin/api-keys", { name });
      return res.json();
    },
    onSuccess: (data) => {
      setNewRawKey(data.rawKey);
      setKeyName("");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/api-keys"] });
      toast({ title: "API key created", description: "Copy your key now. It won't be shown again." });
    },
    onError: () => {
      toast({ title: "Failed to create API key", variant: "destructive" });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("PATCH", `/api/admin/api-keys/${id}/revoke`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/api-keys"] });
      toast({ title: "API key revoked" });
    },
    onError: () => {
      toast({ title: "Failed to revoke API key", variant: "destructive" });
    },
  });

  const handleCopy = () => {
    if (newRawKey) {
      navigator.clipboard.writeText(newRawKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCreateClose = () => {
    setCreateOpen(false);
    setNewRawKey(null);
    setKeyName("");
    setCopied(false);
  };

  const ownerRoles = ["owner", "tenant_owner", "platform_owner"];
  if (!user || !ownerRoles.includes(user.role)) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Only tenant owners can manage API keys.
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="admin-api-keys-page">
      <PageHeader
        title="API Keys"
        description="Manage programmatic access keys for the external API"
        icon={<Key className="w-5 h-5 text-primary" />}
      />

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          API keys allow external systems to access your data through the REST API.
        </p>
        <div className="flex gap-2">
          <Button variant="outline" asChild data-testid="button-api-docs">
            <a href="/admin/api-docs">
              <BookOpen className="w-4 h-4 mr-2" />
              API Docs
            </a>
          </Button>
          <Dialog open={createOpen} onOpenChange={(open) => { if (!open) handleCreateClose(); else setCreateOpen(true); }}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-api-key">
                <Plus className="w-4 h-4 mr-2" />
                Create API Key
              </Button>
            </DialogTrigger>
            <DialogContent>
              {newRawKey ? (
                <>
                  <DialogHeader>
                    <DialogTitle>API Key Created</DialogTitle>
                    <DialogDescription>
                      Copy this key now. For security, it will not be shown again.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="p-3 bg-muted rounded-md font-mono text-sm break-all" data-testid="text-raw-api-key">
                      {newRawKey}
                    </div>
                    <Button variant="outline" className="w-full" onClick={handleCopy} data-testid="button-copy-api-key">
                      {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                      {copied ? "Copied!" : "Copy to Clipboard"}
                    </Button>
                  </div>
                  <DialogFooter>
                    <Button onClick={handleCreateClose} data-testid="button-close-key-dialog">Done</Button>
                  </DialogFooter>
                </>
              ) : (
                <>
                  <DialogHeader>
                    <DialogTitle>Create API Key</DialogTitle>
                    <DialogDescription>
                      Give your API key a descriptive name so you can identify it later.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="keyName">Key Name</Label>
                      <Input
                        id="keyName"
                        placeholder="e.g., Integration Server, Zapier, etc."
                        value={keyName}
                        onChange={(e) => setKeyName(e.target.value)}
                        data-testid="input-api-key-name"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      onClick={() => createMutation.mutate(keyName)}
                      disabled={!keyName.trim() || createMutation.isPending}
                      data-testid="button-confirm-create-key"
                    >
                      {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Create Key
                    </Button>
                  </DialogFooter>
                </>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Active Keys</CardTitle>
          <CardDescription>Keys that can be used to authenticate API requests</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : apiKeys.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Key className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p>No API keys yet. Create one to get started.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Key</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Used</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {apiKeys.map((key: any) => (
                  <TableRow key={key.id} data-testid={`row-api-key-${key.id}`}>
                    <TableCell className="font-medium" data-testid={`text-key-name-${key.id}`}>{key.name}</TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-2 py-1 rounded" data-testid={`text-key-prefix-${key.id}`}>
                        {key.keyPrefix}...
                      </code>
                    </TableCell>
                    <TableCell>
                      {key.revoked ? (
                        <Badge variant="destructive" data-testid={`badge-key-status-${key.id}`}>Revoked</Badge>
                      ) : key.expiresAt && new Date(key.expiresAt) < new Date() ? (
                        <Badge variant="secondary" data-testid={`badge-key-status-${key.id}`}>Expired</Badge>
                      ) : (
                        <Badge variant="default" data-testid={`badge-key-status-${key.id}`}>Active</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {key.lastUsedAt ? (
                        <span className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          {new Date(key.lastUsedAt).toLocaleDateString()}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">Never</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(key.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {!key.revoked && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" data-testid={`button-revoke-key-${key.id}`}>
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Revoke API Key</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to revoke "{key.name}"? Any systems using this key will immediately lose access.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => revokeMutation.mutate(key.id)}
                                data-testid={`button-confirm-revoke-${key.id}`}
                              >
                                Revoke Key
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Security Notes
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>API keys provide full read and write access to your tenant data. Treat them like passwords.</p>
          <p>Keys are hashed before storage. The raw key is only shown once at creation time.</p>
          <p>Revoked keys take effect immediately. Consider creating a new key before revoking an old one.</p>
        </CardContent>
      </Card>
    </div>
  );
}
