import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, Megaphone, Plus, Pencil, Trash2, Info, AlertTriangle, AlertCircle, CheckCircle } from "lucide-react";
import type { PlatformAnnouncement } from "@shared/schema";

const TYPE_CONFIG: Record<string, { icon: any; color: string; label: string }> = {
  info: { icon: Info, color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400", label: "Info" },
  warning: { icon: AlertTriangle, color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400", label: "Warning" },
  critical: { icon: AlertCircle, color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400", label: "Critical" },
  success: { icon: CheckCircle, color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400", label: "Success" },
};

const emptyForm = {
  title: "",
  message: "",
  type: "info",
  priority: "normal",
  isActive: true,
  targetAudience: "all",
  startsAt: "",
  expiresAt: "",
};

export default function PlatformAnnouncementsPage() {
  const { toast } = useToast();
  const [showDialog, setShowDialog] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data: announcements, isLoading } = useQuery<PlatformAnnouncement[]>({
    queryKey: ["/api/platform/announcements"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const payload = { ...data };
      if (payload.startsAt) payload.startsAt = new Date(payload.startsAt).toISOString();
      else delete payload.startsAt;
      if (payload.expiresAt) payload.expiresAt = new Date(payload.expiresAt).toISOString();
      else delete payload.expiresAt;
      const res = await apiRequest("POST", "/api/platform/announcements", payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/platform/announcements"] });
      setShowDialog(false);
      setForm(emptyForm);
      toast({ title: "Announcement created" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const payload = { ...data };
      if (payload.startsAt) payload.startsAt = new Date(payload.startsAt).toISOString();
      else payload.startsAt = null;
      if (payload.expiresAt) payload.expiresAt = new Date(payload.expiresAt).toISOString();
      else payload.expiresAt = null;
      const res = await apiRequest("PATCH", `/api/platform/announcements/${id}`, payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/platform/announcements"] });
      setShowDialog(false);
      setEditId(null);
      setForm(emptyForm);
      toast({ title: "Announcement updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/platform/announcements/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/platform/announcements"] });
      toast({ title: "Announcement deleted" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const res = await apiRequest("PATCH", `/api/platform/announcements/${id}`, { isActive });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/platform/announcements"] });
    },
  });

  const openEdit = (a: PlatformAnnouncement) => {
    setEditId(a.id);
    setForm({
      title: a.title,
      message: a.message,
      type: a.type,
      priority: a.priority,
      isActive: a.isActive,
      targetAudience: a.targetAudience,
      startsAt: a.startsAt ? new Date(a.startsAt).toISOString().slice(0, 16) : "",
      expiresAt: a.expiresAt ? new Date(a.expiresAt).toISOString().slice(0, 16) : "",
    });
    setShowDialog(true);
  };

  const openCreate = () => {
    setEditId(null);
    setForm(emptyForm);
    setShowDialog(true);
  };

  const handleSubmit = () => {
    if (editId) {
      updateMutation.mutate({ id: editId, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const now = new Date();
  const activeCount = announcements?.filter(a => {
    if (!a.isActive) return false;
    if (a.startsAt && new Date(a.startsAt) > now) return false;
    if (a.expiresAt && new Date(a.expiresAt) < now) return false;
    return true;
  }).length || 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6" data-testid="page-platform-announcements">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Announcements</h1>
          <p className="text-muted-foreground">Broadcast messages to tenants and users across the platform.</p>
        </div>
        <Button onClick={openCreate} data-testid="button-create-announcement">
          <Plus className="w-4 h-4 mr-2" /> New Announcement
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold" data-testid="text-total-announcements">{announcements?.length || 0}</div>
            <p className="text-sm text-muted-foreground">Total Announcements</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600" data-testid="text-active-announcements">{activeCount}</div>
            <p className="text-sm text-muted-foreground">Currently Active</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-amber-600" data-testid="text-scheduled-announcements">
              {announcements?.filter(a => a.startsAt && new Date(a.startsAt) > now).length || 0}
            </div>
            <p className="text-sm text-muted-foreground">Scheduled</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        {announcements?.map((a) => {
          const config = TYPE_CONFIG[a.type] || TYPE_CONFIG.info;
          const Icon = config.icon;
          const isCurrentlyActive = a.isActive &&
            (!a.startsAt || new Date(a.startsAt) <= now) &&
            (!a.expiresAt || new Date(a.expiresAt) >= now);

          return (
            <Card key={a.id} className={!isCurrentlyActive ? "opacity-60" : ""} data-testid={`card-announcement-${a.id}`}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="w-5 h-5" />
                    <CardTitle className="text-base">{a.title}</CardTitle>
                    <Badge variant="secondary" className={config.color}>{config.label}</Badge>
                    {a.priority === "high" && <Badge variant="destructive">High Priority</Badge>}
                    {isCurrentlyActive ? (
                      <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Active</Badge>
                    ) : (
                      <Badge variant="outline">Inactive</Badge>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Switch
                      checked={a.isActive}
                      onCheckedChange={(v) => toggleMutation.mutate({ id: a.id, isActive: v })}
                      data-testid={`switch-toggle-${a.id}`}
                    />
                    <Button variant="ghost" size="icon" onClick={() => openEdit(a)} data-testid={`button-edit-${a.id}`}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(a.id)} data-testid={`button-delete-${a.id}`}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                <CardDescription className="flex gap-4 text-xs mt-1">
                  <span>Audience: {a.targetAudience}</span>
                  {a.startsAt && <span>Starts: {new Date(a.startsAt).toLocaleDateString()}</span>}
                  {a.expiresAt && <span>Expires: {new Date(a.expiresAt).toLocaleDateString()}</span>}
                  <span>Created: {new Date(a.createdAt).toLocaleDateString()}</span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{a.message}</p>
              </CardContent>
            </Card>
          );
        })}
        {(!announcements || announcements.length === 0) && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Megaphone className="w-12 h-12 mb-4 opacity-50" />
              <p className="text-lg font-medium">No announcements yet</p>
              <p className="text-sm">Create your first announcement to broadcast to tenants.</p>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Announcement" : "New Announcement"}</DialogTitle>
            <DialogDescription>
              {editId ? "Update the announcement details." : "Create a new announcement to broadcast across the platform."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                data-testid="input-announcement-title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Scheduled Maintenance Window"
              />
            </div>
            <div className="space-y-2">
              <Label>Message</Label>
              <Textarea
                data-testid="input-announcement-message"
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                placeholder="We will be performing scheduled maintenance..."
                rows={4}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger data-testid="select-announcement-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="success">Success</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                  <SelectTrigger data-testid="select-announcement-priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Target Audience</Label>
                <Select value={form.targetAudience} onValueChange={(v) => setForm({ ...form, targetAudience: v })}>
                  <SelectTrigger data-testid="select-announcement-audience">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    <SelectItem value="admins">Tenant Admins Only</SelectItem>
                    <SelectItem value="clients">Clients Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Start Date (optional)</Label>
                <Input
                  data-testid="input-announcement-start"
                  type="datetime-local"
                  value={form.startsAt}
                  onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Expiry Date (optional)</Label>
                <Input
                  data-testid="input-announcement-expiry"
                  type="datetime-local"
                  value={form.expiresAt}
                  onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button
              onClick={handleSubmit}
              disabled={!form.title || !form.message || createMutation.isPending || updateMutation.isPending}
              data-testid="button-submit-announcement"
            >
              {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editId ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
