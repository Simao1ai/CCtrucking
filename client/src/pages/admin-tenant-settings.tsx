import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, Palette, Settings, Users, Save, Loader2, Upload, X, ImageIcon } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import type { Tenant, TenantBranding, TenantSettings } from "@shared/schema";

function GeneralTab() {
  const { toast } = useToast();
  const { data: tenant, isLoading } = useQuery<Tenant>({ queryKey: ["/api/admin/tenant"] });

  const [form, setForm] = useState({
    name: "",
    contactEmail: "",
    contactPhone: "",
    industry: "",
    plan: "",
  });

  useEffect(() => {
    if (tenant) {
      setForm({
        name: tenant.name || "",
        contactEmail: tenant.contactEmail || "",
        contactPhone: tenant.contactPhone || "",
        industry: tenant.industry || "",
        plan: tenant.plan || "basic",
      });
    }
  }, [tenant]);

  const mutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const res = await apiRequest("PATCH", "/api/admin/tenant", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tenant"] });
      toast({ title: "Tenant updated", description: "General settings saved successfully." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Building2 className="w-4 h-4" /> General Information</CardTitle>
        <CardDescription>Manage your organization's core settings</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate(form);
          }}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tenant-name">Organization Name</Label>
              <Input
                id="tenant-name"
                data-testid="input-tenant-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tenant-email">Contact Email</Label>
              <Input
                id="tenant-email"
                data-testid="input-tenant-email"
                type="email"
                value={form.contactEmail}
                onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tenant-phone">Contact Phone</Label>
              <Input
                id="tenant-phone"
                data-testid="input-tenant-phone"
                value={form.contactPhone}
                onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tenant-industry">Industry</Label>
              <Select value={form.industry} onValueChange={(v) => setForm({ ...form, industry: v })}>
                <SelectTrigger data-testid="select-tenant-industry">
                  <SelectValue placeholder="Select industry" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="trucking">Trucking</SelectItem>
                  <SelectItem value="accounting">Accounting</SelectItem>
                  <SelectItem value="consulting">Consulting</SelectItem>
                  <SelectItem value="legal">Legal</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tenant-plan">Plan</Label>
              <Select value={form.plan} onValueChange={(v) => setForm({ ...form, plan: v })}>
                <SelectTrigger data-testid="select-tenant-plan">
                  <SelectValue placeholder="Select plan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="basic">Basic</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {tenant && (
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline">Status: {tenant.status}</Badge>
              <Badge variant="outline">Slug: {tenant.slug}</Badge>
            </div>
          )}
          <div className="flex justify-end">
            <Button type="submit" disabled={mutation.isPending} data-testid="button-save-general">
              {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Save Changes
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function ColorPickerField({ label, id, testId, value, onChange, placeholder }: {
  label: string; id: string; testId: string; value: string; onChange: (v: string) => void; placeholder: string;
}) {
  const colorInputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="w-10 h-10 rounded-md border-2 border-border shrink-0 cursor-pointer hover:ring-2 hover:ring-ring hover:ring-offset-1 transition-all"
          style={{ backgroundColor: value || placeholder }}
          onClick={() => colorInputRef.current?.click()}
          data-testid={`${testId}-swatch`}
        />
        <input
          ref={colorInputRef}
          type="color"
          value={value || placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="sr-only"
          tabIndex={-1}
        />
        <Input
          id={id}
          data-testid={testId}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="font-mono text-sm"
        />
      </div>
    </div>
  );
}

function LogoUploader({ currentLogoUrl, onLogoChange }: { currentLogoUrl: string; onLogoChange: (url: string) => void }) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please upload an image file (PNG, JPG, SVG, WebP, GIF).", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Logo must be under 5MB.", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("logo", file);
      const res = await fetch("/api/admin/tenant/branding/logo", { method: "POST", body: formData, credentials: "include" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Upload failed");
      }
      const data = await res.json();
      onLogoChange(data.logoUrl);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tenant/branding"] });
      queryClient.invalidateQueries({ queryKey: ["/api/branding"] });
      toast({ title: "Logo uploaded", description: "Your logo has been saved." });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    try {
      const res = await fetch("/api/admin/tenant/branding/logo", { method: "DELETE", credentials: "include" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to remove");
      }
      onLogoChange("");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tenant/branding"] });
      queryClient.invalidateQueries({ queryKey: ["/api/branding"] });
      toast({ title: "Logo removed", description: "Your logo has been removed." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  };

  return (
    <div className="space-y-2 sm:col-span-2">
      <Label>Company Logo</Label>
      {currentLogoUrl ? (
        <div className="flex items-center gap-4 p-4 border rounded-lg bg-muted/30">
          <img src={currentLogoUrl} alt="Company logo" className="h-16 w-auto max-w-[200px] object-contain" data-testid="img-logo-preview" />
          <div className="flex gap-2 ml-auto">
            <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading} data-testid="button-change-logo">
              {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Upload className="w-4 h-4 mr-1" />}
              Change
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={handleRemove} data-testid="button-remove-logo">
              <X className="w-4 h-4 mr-1" /> Remove
            </Button>
          </div>
        </div>
      ) : (
        <div
          className={`flex flex-col items-center justify-center gap-2 p-8 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/30"}`}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          data-testid="dropzone-logo"
        >
          {uploading ? (
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          ) : (
            <ImageIcon className="w-8 h-8 text-muted-foreground" />
          )}
          <p className="text-sm text-muted-foreground font-medium">
            {uploading ? "Uploading..." : "Click or drag & drop to upload logo"}
          </p>
          <p className="text-xs text-muted-foreground">PNG, JPG, SVG, WebP, or GIF (max 5MB)</p>
        </div>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/svg+xml,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleUpload(file);
          e.target.value = "";
        }}
        data-testid="input-logo-file"
      />
    </div>
  );
}

function BrandingTab() {
  const { toast } = useToast();
  const { data: branding, isLoading } = useQuery<TenantBranding>({ queryKey: ["/api/admin/tenant/branding"] });

  const [form, setForm] = useState({
    companyName: "",
    tagline: "",
    primaryColor: "",
    accentColor: "",
    logoUrl: "",
    sidebarIcon: "",
    loginMessage: "",
    supportEmail: "",
    supportPhone: "",
    websiteUrl: "",
    address: "",
  });

  useEffect(() => {
    if (branding) {
      setForm({
        companyName: branding.companyName || "",
        tagline: branding.tagline || "",
        primaryColor: branding.primaryColor || "",
        accentColor: branding.accentColor || "",
        logoUrl: branding.logoUrl || "",
        sidebarIcon: branding.sidebarIcon || "",
        loginMessage: branding.loginMessage || "",
        supportEmail: branding.supportEmail || "",
        supportPhone: branding.supportPhone || "",
        websiteUrl: branding.websiteUrl || "",
        address: branding.address || "",
      });
    }
  }, [branding]);

  const mutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const res = await apiRequest("PATCH", "/api/admin/tenant/branding", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tenant/branding"] });
      queryClient.invalidateQueries({ queryKey: ["/api/branding"] });
      toast({ title: "Branding updated", description: "Your branding changes have been saved." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Palette className="w-4 h-4" /> Branding</CardTitle>
        <CardDescription>Customize your platform's appearance and branding</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-6"
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate(form);
          }}
        >
          <LogoUploader
            currentLogoUrl={form.logoUrl}
            onLogoChange={(url) => setForm({ ...form, logoUrl: url })}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="brand-company">Company Name</Label>
              <Input
                id="brand-company"
                data-testid="input-brand-company"
                value={form.companyName}
                onChange={(e) => setForm({ ...form, companyName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="brand-tagline">Tagline</Label>
              <Input
                id="brand-tagline"
                data-testid="input-brand-tagline"
                value={form.tagline}
                onChange={(e) => setForm({ ...form, tagline: e.target.value })}
              />
            </div>
            <ColorPickerField
              label="Primary Color"
              id="brand-primary-color"
              testId="input-brand-primary-color"
              value={form.primaryColor}
              onChange={(v) => setForm({ ...form, primaryColor: v })}
              placeholder="#1e3a5f"
            />
            <ColorPickerField
              label="Accent Color"
              id="brand-accent-color"
              testId="input-brand-accent-color"
              value={form.accentColor}
              onChange={(v) => setForm({ ...form, accentColor: v })}
              placeholder="#3b82f6"
            />
            <div className="space-y-2">
              <Label htmlFor="brand-sidebar-icon">Sidebar Icon</Label>
              <Select value={form.sidebarIcon} onValueChange={(v) => setForm({ ...form, sidebarIcon: v })}>
                <SelectTrigger data-testid="select-brand-sidebar-icon">
                  <SelectValue placeholder="Select icon" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Truck">Truck</SelectItem>
                  <SelectItem value="Building2">Building</SelectItem>
                  <SelectItem value="Briefcase">Briefcase</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="brand-login-message">Login Message</Label>
              <Input
                id="brand-login-message"
                data-testid="input-brand-login-message"
                value={form.loginMessage}
                onChange={(e) => setForm({ ...form, loginMessage: e.target.value })}
                placeholder="Welcome to our platform"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="brand-support-email">Support Email</Label>
              <Input
                id="brand-support-email"
                data-testid="input-brand-support-email"
                type="email"
                value={form.supportEmail}
                onChange={(e) => setForm({ ...form, supportEmail: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="brand-support-phone">Support Phone</Label>
              <Input
                id="brand-support-phone"
                data-testid="input-brand-support-phone"
                value={form.supportPhone}
                onChange={(e) => setForm({ ...form, supportPhone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="brand-website">Website URL</Label>
              <Input
                id="brand-website"
                data-testid="input-brand-website"
                value={form.websiteUrl}
                onChange={(e) => setForm({ ...form, websiteUrl: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="brand-address">Address</Label>
              <Input
                id="brand-address"
                data-testid="input-brand-address"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={mutation.isPending} data-testid="button-save-branding">
              {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Save Branding
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

const MODULE_KEYS = [
  { key: "modules.bookkeeping", label: "Bookkeeping", description: "Bank transaction categorization and monthly summaries" },
  { key: "modules.tax_preparation", label: "Tax Preparation", description: "Tax document upload, analysis, and preparation" },
  { key: "modules.notarizations", label: "Notarizations", description: "Notarization tracking and management" },
  { key: "modules.compliance_scheduling", label: "Compliance Scheduling", description: "Recurring compliance ticket automation" },
  { key: "modules.employee_performance", label: "Employee Performance", description: "Staff performance tracking and analytics" },
];

function SettingsTab() {
  const { toast } = useToast();
  const { data: settings, isLoading } = useQuery<TenantSettings[]>({ queryKey: ["/api/admin/tenant/settings"] });

  const settingsMap = new Map<string, string>();
  if (settings) {
    for (const s of settings) {
      settingsMap.set(s.key, s.value);
    }
  }

  const mutation = useMutation({
    mutationFn: async ({ key, value, type }: { key: string; value: string; type?: string }) => {
      const res = await apiRequest("PATCH", "/api/admin/tenant/settings", { key, value, type });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tenant/settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/modules"] });
      toast({ title: "Setting updated", description: "Module setting has been saved." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Settings className="w-4 h-4" /> Module Settings</CardTitle>
        <CardDescription>Enable or disable platform modules for your organization</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {MODULE_KEYS.map((mod) => {
            const isEnabled = settingsMap.get(mod.key) !== "false";
            return (
              <div key={mod.key} className="flex items-center justify-between gap-4 py-3 border-b last:border-b-0">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium" data-testid={`text-module-${mod.key}`}>{mod.label}</p>
                  <p className="text-xs text-muted-foreground">{mod.description}</p>
                </div>
                <Switch
                  data-testid={`switch-module-${mod.key}`}
                  checked={isEnabled}
                  disabled={mutation.isPending}
                  onCheckedChange={(checked) => {
                    mutation.mutate({ key: mod.key, value: checked ? "true" : "false", type: "boolean" });
                  }}
                />
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function UserRolesTab() {
  const { data: usersData, isLoading } = useQuery<any[]>({ queryKey: ["/api/admin/users"] });
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const res = await apiRequest("PATCH", "/api/auth/set-admin", { userId });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "Role updated", description: "User role has been changed." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  const roleLabel = (role: string) => {
    const labels: Record<string, string> = {
      owner: "Owner",
      admin: "Admin",
      client: "Client",
      preparer: "Preparer",
      tenant_owner: "Tenant Owner",
      tenant_admin: "Tenant Admin",
      platform_owner: "Platform Owner",
      platform_admin: "Platform Admin",
    };
    return labels[role] || role;
  };

  const roleBadgeVariant = (role: string): "default" | "secondary" | "outline" => {
    if (role === "owner" || role === "tenant_owner" || role === "platform_owner") return "default";
    if (role === "admin" || role === "tenant_admin" || role === "platform_admin") return "secondary";
    return "outline";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Users className="w-4 h-4" /> Users & Roles</CardTitle>
        <CardDescription>View users and their roles within your organization</CardDescription>
      </CardHeader>
      <CardContent>
        {usersData && usersData.length > 0 ? (
          <div className="space-y-2">
            {usersData.map((u: any) => (
              <div key={u.id} className="flex items-center justify-between gap-4 py-3 border-b last:border-b-0">
                <div className="space-y-0.5 min-w-0">
                  <p className="text-sm font-medium truncate" data-testid={`text-user-name-${u.id}`}>
                    {u.firstName && u.lastName ? `${u.firstName} ${u.lastName}` : u.username}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{u.email || u.username}</p>
                </div>
                <Badge variant={roleBadgeVariant(u.role)} data-testid={`badge-user-role-${u.id}`}>
                  {roleLabel(u.role)}
                </Badge>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No users found.</p>
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminTenantSettings() {
  const { user } = useAuth();
  const isOwnerRole = user?.role === "owner" || user?.role === "tenant_owner" || user?.role === "platform_owner";

  if (!isOwnerRole) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground" data-testid="text-access-denied">
              You do not have permission to access tenant settings. Only owners can manage these settings.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Tenant Settings"
        description="Manage your organization's settings, branding, and modules"
        icon={<Building2 className="h-5 w-5 text-muted-foreground" />}
      />

      <Tabs defaultValue="general">
        <TabsList data-testid="tabs-tenant-settings">
          <TabsTrigger value="general" data-testid="tab-general">General</TabsTrigger>
          <TabsTrigger value="branding" data-testid="tab-branding">Branding</TabsTrigger>
          <TabsTrigger value="modules" data-testid="tab-modules">Modules</TabsTrigger>
          <TabsTrigger value="users" data-testid="tab-users">Users</TabsTrigger>
        </TabsList>
        <TabsContent value="general" className="mt-4">
          <GeneralTab />
        </TabsContent>
        <TabsContent value="branding" className="mt-4">
          <BrandingTab />
        </TabsContent>
        <TabsContent value="modules" className="mt-4">
          <SettingsTab />
        </TabsContent>
        <TabsContent value="users" className="mt-4">
          <UserRolesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
