import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Settings, Globe, Building2, AlertTriangle } from "lucide-react";
import type { PlatformSettings } from "@shared/schema";

const TIMEZONES = [
  "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles",
  "America/Anchorage", "Pacific/Honolulu", "America/Phoenix",
  "Europe/London", "Europe/Berlin", "Asia/Tokyo", "Australia/Sydney",
];

const DATE_FORMATS = ["MM/DD/YYYY", "DD/MM/YYYY", "YYYY-MM-DD"];

export default function PlatformSettingsPage() {
  const { toast } = useToast();

  const { data: settings, isLoading } = useQuery<PlatformSettings | null>({
    queryKey: ["/api/platform/settings"],
  });

  const [form, setForm] = useState<Partial<PlatformSettings>>({});

  const current = { ...settings, ...form };

  const saveMutation = useMutation({
    mutationFn: async (data: Partial<PlatformSettings>) => {
      const res = await apiRequest("POST", "/api/platform/settings", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/platform/settings"] });
      setForm({});
      toast({ title: "Settings saved", description: "Platform settings have been updated." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleSave = () => {
    saveMutation.mutate({
      platformName: current.platformName || "CarrierDeskHQ",
      platformTagline: current.platformTagline,
      logoUrl: current.logoUrl,
      faviconUrl: current.faviconUrl,
      supportEmail: current.supportEmail,
      supportPhone: current.supportPhone,
      websiteUrl: current.websiteUrl,
      defaultTimezone: current.defaultTimezone || "America/New_York",
      defaultDateFormat: current.defaultDateFormat || "MM/DD/YYYY",
      maintenanceMode: current.maintenanceMode || false,
      maintenanceMessage: current.maintenanceMessage,
      termsUrl: current.termsUrl,
      privacyUrl: current.privacyUrl,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6" data-testid="page-platform-settings">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Platform Settings</h1>
          <p className="text-muted-foreground">Configure your platform's identity, branding, and global defaults.</p>
        </div>
        <Button onClick={handleSave} disabled={saveMutation.isPending} data-testid="button-save-settings">
          {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Save Changes
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Company Profile
          </CardTitle>
          <CardDescription>Your platform's identity as seen across the system.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="platformName">Platform Name</Label>
              <Input
                id="platformName"
                data-testid="input-platform-name"
                value={current.platformName || ""}
                onChange={(e) => setForm({ ...form, platformName: e.target.value })}
                placeholder="CarrierDeskHQ"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="platformTagline">Tagline</Label>
              <Input
                id="platformTagline"
                data-testid="input-platform-tagline"
                value={current.platformTagline || ""}
                onChange={(e) => setForm({ ...form, platformTagline: e.target.value })}
                placeholder="Professional Trucking Operations & Compliance"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="logoUrl">Logo URL</Label>
              <Input
                id="logoUrl"
                data-testid="input-logo-url"
                value={current.logoUrl || ""}
                onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
                placeholder="https://example.com/logo.png"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="faviconUrl">Favicon URL</Label>
              <Input
                id="faviconUrl"
                data-testid="input-favicon-url"
                value={current.faviconUrl || ""}
                onChange={(e) => setForm({ ...form, faviconUrl: e.target.value })}
                placeholder="https://example.com/favicon.ico"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Contact Information
          </CardTitle>
          <CardDescription>How users and tenants can reach platform support.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="supportEmail">Support Email</Label>
              <Input
                id="supportEmail"
                data-testid="input-support-email"
                type="email"
                value={current.supportEmail || ""}
                onChange={(e) => setForm({ ...form, supportEmail: e.target.value })}
                placeholder="support@carrierdeskhq.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="supportPhone">Support Phone</Label>
              <Input
                id="supportPhone"
                data-testid="input-support-phone"
                value={current.supportPhone || ""}
                onChange={(e) => setForm({ ...form, supportPhone: e.target.value })}
                placeholder="+1 (555) 123-4567"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="websiteUrl">Website URL</Label>
            <Input
              id="websiteUrl"
              data-testid="input-website-url"
              value={current.websiteUrl || ""}
              onChange={(e) => setForm({ ...form, websiteUrl: e.target.value })}
              placeholder="https://carrierdeskhq.com"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Regional Defaults
          </CardTitle>
          <CardDescription>Default timezone and date format for new tenants.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Default Timezone</Label>
              <Select
                value={current.defaultTimezone || "America/New_York"}
                onValueChange={(v) => setForm({ ...form, defaultTimezone: v })}
              >
                <SelectTrigger data-testid="select-timezone">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map(tz => (
                    <SelectItem key={tz} value={tz}>{tz.replace(/_/g, " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Date Format</Label>
              <Select
                value={current.defaultDateFormat || "MM/DD/YYYY"}
                onValueChange={(v) => setForm({ ...form, defaultDateFormat: v })}
              >
                <SelectTrigger data-testid="select-date-format">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DATE_FORMATS.map(df => (
                    <SelectItem key={df} value={df}>{df}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Legal & Compliance
          </CardTitle>
          <CardDescription>Links to your legal documents.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="termsUrl">Terms of Service URL</Label>
              <Input
                id="termsUrl"
                data-testid="input-terms-url"
                value={current.termsUrl || ""}
                onChange={(e) => setForm({ ...form, termsUrl: e.target.value })}
                placeholder="https://carrierdeskhq.com/terms"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="privacyUrl">Privacy Policy URL</Label>
              <Input
                id="privacyUrl"
                data-testid="input-privacy-url"
                value={current.privacyUrl || ""}
                onChange={(e) => setForm({ ...form, privacyUrl: e.target.value })}
                placeholder="https://carrierdeskhq.com/privacy"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
            <AlertTriangle className="w-5 h-5" />
            Maintenance Mode
          </CardTitle>
          <CardDescription>Enable to show a maintenance banner to all users across the platform.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Switch
              data-testid="switch-maintenance-mode"
              checked={current.maintenanceMode || false}
              onCheckedChange={(v) => setForm({ ...form, maintenanceMode: v })}
            />
            <Label>Maintenance Mode {current.maintenanceMode ? "Enabled" : "Disabled"}</Label>
          </div>
          {current.maintenanceMode && (
            <div className="space-y-2">
              <Label htmlFor="maintenanceMessage">Maintenance Message</Label>
              <Textarea
                id="maintenanceMessage"
                data-testid="input-maintenance-message"
                value={current.maintenanceMessage || ""}
                onChange={(e) => setForm({ ...form, maintenanceMessage: e.target.value })}
                placeholder="We are currently performing scheduled maintenance. Please check back shortly."
                rows={3}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
