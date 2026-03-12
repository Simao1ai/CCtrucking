import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Loader2, Shield, Lock, Clock, Globe, Plus, X } from "lucide-react";
import type { SecuritySettings } from "@shared/schema";

export default function PlatformSecurityPage() {
  const { toast } = useToast();

  const { data: settings, isLoading } = useQuery<SecuritySettings | null>({
    queryKey: ["/api/platform/security"],
  });

  const [form, setForm] = useState<Partial<SecuritySettings>>({});
  const [newIp, setNewIp] = useState("");

  const current = {
    minPasswordLength: 8,
    requireUppercase: true,
    requireNumbers: true,
    requireSpecialChars: false,
    sessionTimeoutMinutes: 480,
    maxLoginAttempts: 5,
    lockoutDurationMinutes: 30,
    enforceIpAllowlist: false,
    ipAllowlist: [] as string[],
    twoFactorEnabled: false,
    ...settings,
    ...form,
  };

  const saveMutation = useMutation({
    mutationFn: async (data: Partial<SecuritySettings>) => {
      const res = await apiRequest("POST", "/api/platform/security", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/platform/security"] });
      setForm({});
      toast({ title: "Security settings saved", description: "Security policies have been updated." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleSave = () => {
    saveMutation.mutate({
      minPasswordLength: current.minPasswordLength,
      requireUppercase: current.requireUppercase,
      requireNumbers: current.requireNumbers,
      requireSpecialChars: current.requireSpecialChars,
      sessionTimeoutMinutes: current.sessionTimeoutMinutes,
      maxLoginAttempts: current.maxLoginAttempts,
      lockoutDurationMinutes: current.lockoutDurationMinutes,
      enforceIpAllowlist: current.enforceIpAllowlist,
      ipAllowlist: current.ipAllowlist,
      twoFactorEnabled: current.twoFactorEnabled,
    });
  };

  const addIp = () => {
    const trimmed = newIp.trim();
    if (!trimmed) return;
    const list = [...(current.ipAllowlist || []), trimmed];
    setForm({ ...form, ipAllowlist: list });
    setNewIp("");
  };

  const removeIp = (ip: string) => {
    const list = (current.ipAllowlist || []).filter(i => i !== ip);
    setForm({ ...form, ipAllowlist: list });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6" data-testid="page-platform-security">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Security Center</h1>
          <p className="text-muted-foreground">Manage password policies, session controls, and access restrictions.</p>
        </div>
        <Button onClick={handleSave} disabled={saveMutation.isPending} data-testid="button-save-security">
          {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Save Changes
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5" />
            Password Policy
          </CardTitle>
          <CardDescription>Define the minimum requirements for user passwords across the platform.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="minPasswordLength">Minimum Password Length</Label>
              <Input
                id="minPasswordLength"
                data-testid="input-min-password-length"
                type="number"
                min={6}
                max={32}
                value={current.minPasswordLength}
                onChange={(e) => setForm({ ...form, minPasswordLength: parseInt(e.target.value) || 8 })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxLoginAttempts">Max Login Attempts Before Lockout</Label>
              <Input
                id="maxLoginAttempts"
                data-testid="input-max-login-attempts"
                type="number"
                min={3}
                max={20}
                value={current.maxLoginAttempts}
                onChange={(e) => setForm({ ...form, maxLoginAttempts: parseInt(e.target.value) || 5 })}
              />
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Switch
                data-testid="switch-require-uppercase"
                checked={current.requireUppercase}
                onCheckedChange={(v) => setForm({ ...form, requireUppercase: v })}
              />
              <Label>Require uppercase letters</Label>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                data-testid="switch-require-numbers"
                checked={current.requireNumbers}
                onCheckedChange={(v) => setForm({ ...form, requireNumbers: v })}
              />
              <Label>Require numbers</Label>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                data-testid="switch-require-special"
                checked={current.requireSpecialChars}
                onCheckedChange={(v) => setForm({ ...form, requireSpecialChars: v })}
              />
              <Label>Require special characters (!@#$%^&*)</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Session Management
          </CardTitle>
          <CardDescription>Control session timeouts and lockout durations.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sessionTimeout">Session Timeout (minutes)</Label>
              <Input
                id="sessionTimeout"
                data-testid="input-session-timeout"
                type="number"
                min={15}
                max={1440}
                value={current.sessionTimeoutMinutes}
                onChange={(e) => setForm({ ...form, sessionTimeoutMinutes: parseInt(e.target.value) || 480 })}
              />
              <p className="text-xs text-muted-foreground">
                {current.sessionTimeoutMinutes >= 60
                  ? `${Math.floor(current.sessionTimeoutMinutes / 60)}h ${current.sessionTimeoutMinutes % 60}m`
                  : `${current.sessionTimeoutMinutes}m`}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="lockoutDuration">Lockout Duration (minutes)</Label>
              <Input
                id="lockoutDuration"
                data-testid="input-lockout-duration"
                type="number"
                min={5}
                max={1440}
                value={current.lockoutDurationMinutes}
                onChange={(e) => setForm({ ...form, lockoutDurationMinutes: parseInt(e.target.value) || 30 })}
              />
              <p className="text-xs text-muted-foreground">
                Duration users are locked out after exceeding max login attempts.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Two-Factor Authentication
          </CardTitle>
          <CardDescription>Require or enable two-factor authentication for all platform users.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Switch
              data-testid="switch-2fa"
              checked={current.twoFactorEnabled}
              onCheckedChange={(v) => setForm({ ...form, twoFactorEnabled: v })}
            />
            <div>
              <Label>Two-Factor Authentication</Label>
              <p className="text-xs text-muted-foreground">When enabled, users will be prompted to set up 2FA on next login.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            IP Allowlist
          </CardTitle>
          <CardDescription>Restrict platform admin access to specific IP addresses.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Switch
              data-testid="switch-ip-allowlist"
              checked={current.enforceIpAllowlist}
              onCheckedChange={(v) => setForm({ ...form, enforceIpAllowlist: v })}
            />
            <Label>Enforce IP Allowlist</Label>
          </div>
          {current.enforceIpAllowlist && (
            <>
              <div className="flex gap-2">
                <Input
                  data-testid="input-new-ip"
                  value={newIp}
                  onChange={(e) => setNewIp(e.target.value)}
                  placeholder="e.g., 192.168.1.0/24 or 10.0.0.1"
                  onKeyDown={(e) => e.key === "Enter" && addIp()}
                />
                <Button variant="outline" onClick={addIp} data-testid="button-add-ip">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {(current.ipAllowlist || []).map((ip) => (
                  <Badge key={ip} variant="secondary" className="gap-1 px-3 py-1">
                    {ip}
                    <button onClick={() => removeIp(ip)} className="ml-1 hover:text-destructive" data-testid={`button-remove-ip-${ip}`}>
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
                {(!current.ipAllowlist || current.ipAllowlist.length === 0) && (
                  <p className="text-sm text-muted-foreground">No IP addresses added. All IPs will be blocked when enforcement is enabled.</p>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
