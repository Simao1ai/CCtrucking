import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { ServiceItem } from "@shared/schema";
import { Plus, Search, Package, CheckCircle, DollarSign, Pencil, Trash2, Tag } from "lucide-react";

const CATEGORIES = ["DOT Compliance", "IFTA Filing", "Tax Filing", "Business Setup", "General"];

const defaultFormState = {
  name: "",
  description: "",
  category: "General",
  defaultPrice: "",
  isActive: true,
};

export default function AdminServiceItems() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [createDialog, setCreateDialog] = useState(false);
  const [editItem, setEditItem] = useState<ServiceItem | null>(null);
  const [formState, setFormState] = useState(defaultFormState);

  const { data: serviceItems = [], isLoading } = useQuery<ServiceItem[]>({
    queryKey: ["/api/admin/service-items"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formState) => {
      await apiRequest("POST", "/api/admin/service-items", {
        ...data,
        defaultPrice: data.defaultPrice,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/service-items"] });
      setCreateDialog(false);
      setFormState(defaultFormState);
      toast({ title: "Service created", description: "New service item has been added to the catalog." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ServiceItem> }) => {
      await apiRequest("PATCH", `/api/admin/service-items/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/service-items"] });
      setEditItem(null);
      toast({ title: "Service updated", description: "Service item has been updated." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/admin/service-items/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/service-items"] });
      toast({ title: "Service deleted", description: "Service item has been removed." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      await apiRequest("PATCH", `/api/admin/service-items/${id}`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/service-items"] });
      toast({ title: "Status updated" });
    },
  });

  const filtered = serviceItems.filter(item =>
    item.name.toLowerCase().includes(search.toLowerCase()) ||
    (item.description ?? "").toLowerCase().includes(search.toLowerCase()) ||
    item.category.toLowerCase().includes(search.toLowerCase())
  );

  const totalServices = serviceItems.length;
  const activeServices = serviceItems.filter(s => s.isActive).length;
  const avgPrice = totalServices > 0
    ? serviceItems.reduce((sum, s) => sum + parseFloat(s.defaultPrice), 0) / totalServices
    : 0;

  const handleCreate = () => {
    if (!formState.name || !formState.defaultPrice) {
      toast({ title: "Missing fields", description: "Name and price are required.", variant: "destructive" });
      return;
    }
    createMutation.mutate(formState);
  };

  const handleUpdate = () => {
    if (!editItem) return;
    updateMutation.mutate({
      id: editItem.id,
      data: {
        name: editItem.name,
        description: editItem.description,
        category: editItem.category,
        defaultPrice: editItem.defaultPrice,
        isActive: editItem.isActive,
      },
    });
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto" data-testid="page-service-items">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-service-catalog-title">Service Catalog</h1>
          <p className="text-sm text-muted-foreground">Manage your service fees and pricing</p>
        </div>
        <Dialog open={createDialog} onOpenChange={setCreateDialog}>
          <DialogTrigger asChild>
            <Button data-testid="button-new-service">
              <Plus className="w-4 h-4 mr-2" /> New Service
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Service Item</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Name</Label>
                <Input
                  value={formState.name}
                  onChange={e => setFormState(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., DOT Compliance Filing"
                  data-testid="input-service-name"
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={formState.description}
                  onChange={e => setFormState(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of this service..."
                  data-testid="input-service-description"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Category</Label>
                  <Select value={formState.category} onValueChange={v => setFormState(prev => ({ ...prev, category: v }))}>
                    <SelectTrigger data-testid="select-service-category">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(c => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Default Price ($)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formState.defaultPrice}
                    onChange={e => setFormState(prev => ({ ...prev, defaultPrice: e.target.value }))}
                    placeholder="0.00"
                    data-testid="input-service-price"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  checked={formState.isActive}
                  onCheckedChange={v => setFormState(prev => ({ ...prev, isActive: v }))}
                  data-testid="switch-service-active"
                />
                <Label>Active</Label>
              </div>
              <Button
                className="w-full"
                onClick={handleCreate}
                disabled={createMutation.isPending}
                data-testid="button-confirm-create-service"
              >
                {createMutation.isPending ? "Creating..." : "Create Service"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs text-muted-foreground">Total Services</p>
                <p className="text-xl font-bold" data-testid="text-total-services">{totalServices}</p>
              </div>
              <Package className="w-5 h-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs text-muted-foreground">Active</p>
                <p className="text-xl font-bold text-chart-2" data-testid="text-active-services">{activeServices}</p>
              </div>
              <CheckCircle className="w-5 h-5 text-chart-2" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs text-muted-foreground">Average Price</p>
                <p className="text-xl font-bold" data-testid="text-avg-price">
                  ${avgPrice.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <DollarSign className="w-5 h-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search services..."
          className="pl-10"
          data-testid="input-search-services"
        />
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-40" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>{search ? "No services match your search." : "No service items yet. Create your first service to get started."}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map(item => (
            <Card key={item.id} data-testid={`card-service-item-${item.id}`}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-semibold text-sm" data-testid={`text-service-name-${item.id}`}>{item.name}</h3>
                  <Badge variant={item.isActive ? "default" : "secondary"} className="text-xs flex-shrink-0" data-testid={`badge-status-${item.id}`}>
                    {item.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
                {item.description && (
                  <p className="text-xs text-muted-foreground mb-3 line-clamp-2" data-testid={`text-service-desc-${item.id}`}>{item.description}</p>
                )}
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <Badge variant="outline" className="text-xs" data-testid={`badge-category-${item.id}`}>
                    <Tag className="w-3 h-3 mr-1" />
                    {item.category}
                  </Badge>
                  <span className="text-sm font-bold ml-auto" data-testid={`text-price-${item.id}`}>
                    ${parseFloat(item.defaultPrice).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setEditItem(item)}
                    data-testid={`button-edit-service-${item.id}`}
                  >
                    <Pencil className="w-3.5 h-3.5 mr-1" /> Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toggleActive.mutate({ id: item.id, isActive: !item.isActive })}
                    data-testid={`button-toggle-active-${item.id}`}
                  >
                    {item.isActive ? "Deactivate" : "Activate"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => { if (confirm("Delete this service item?")) deleteMutation.mutate(item.id); }}
                    data-testid={`button-delete-service-${item.id}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!editItem} onOpenChange={(open) => { if (!open) setEditItem(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Service Item</DialogTitle>
          </DialogHeader>
          {editItem && (
            <div className="space-y-4">
              <div>
                <Label>Name</Label>
                <Input
                  value={editItem.name}
                  onChange={e => setEditItem(prev => prev ? { ...prev, name: e.target.value } : null)}
                  data-testid="input-edit-service-name"
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={editItem.description ?? ""}
                  onChange={e => setEditItem(prev => prev ? { ...prev, description: e.target.value } : null)}
                  data-testid="input-edit-service-description"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Category</Label>
                  <Select value={editItem.category} onValueChange={v => setEditItem(prev => prev ? { ...prev, category: v } : null)}>
                    <SelectTrigger data-testid="select-edit-service-category">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Default Price ($)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editItem.defaultPrice}
                    onChange={e => setEditItem(prev => prev ? { ...prev, defaultPrice: e.target.value } : null)}
                    data-testid="input-edit-service-price"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  checked={editItem.isActive}
                  onCheckedChange={v => setEditItem(prev => prev ? { ...prev, isActive: v } : null)}
                  data-testid="switch-edit-service-active"
                />
                <Label>Active</Label>
              </div>
              <Button
                className="w-full"
                onClick={handleUpdate}
                disabled={updateMutation.isPending}
                data-testid="button-confirm-edit-service"
              >
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}