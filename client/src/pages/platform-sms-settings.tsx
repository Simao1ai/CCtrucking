import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageSquare, Save, Loader2, Shield, Phone, AlertCircle, Radio } from "lucide-react";

export default function PlatformSmsSettings() {
  const { toast } = useToast();

  const { data: config, isLoading } = useQuery<any>({
    queryKey: ["/api/platform/sms-config"],
  });

  const [form, setForm] = useState({
    provider: "twilio",
    twilioAccountSid: "",
    twilioAuthToken: "",
    commshubBaseUrl: "",
    commshubApiKey: "",
    defaultFromNumber: "",
    enabled: false,
    monthlyBudgetCents: "",
  });

  useEffect(() => {
    if (config) {
      setForm({
        provider: config.provider || "twilio",
        twilioAccountSid: config.twilioAccountSid || "",
        twilioAuthToken: config.twilioAuthToken || "",
        commshubBaseUrl: config.commshubBaseUrl || "",
        commshubApiKey: config.commshubApiKey || "",
        defaultFromNumber: config.defaultFromNumber || "",
        enabled: config.enabled || false,
        monthlyBudgetCents: config.monthlyBudgetCents?.toString() || "",
      });
    }
  }, [config]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PUT", "/api/platform/sms-config", {
        ...form,
        monthlyBudgetCents: form.monthlyBudgetCents ? parseInt(form.monthlyBudgetCents) : null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/platform/sms-config"] });
      toast({ title: "SMS settings saved" });
    },
    onError: (e: any) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto" data-testid="page-platform-sms">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">SMS Configuration</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure your SMS provider to enable text messaging across all tenants
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Radio className="w-4 h-4 text-blue-500" />
            SMS Provider
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Enable SMS Service</Label>
              <p className="text-xs text-muted-foreground">Turn on to allow tenants to send text messages</p>
            </div>
            <Switch
              checked={form.enabled}
              onCheckedChange={checked => setForm(f => ({ ...f, enabled: checked }))}
              data-testid="switch-sms-enabled"
            />
          </div>

          <div>
            <Label>Provider</Label>
            <Select value={form.provider} onValueChange={val => setForm(f => ({ ...f, provider: val }))}>
              <SelectTrigger data-testid="select-sms-provider">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="twilio">Twilio</SelectItem>
                <SelectItem value="commshub">CommsHub</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              {form.provider === "commshub"
                ? "Route SMS through your CommsHub platform"
                : "Send SMS directly via Twilio API"}
            </p>
          </div>
        </CardContent>
      </Card>

      {form.provider === "twilio" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-blue-500" />
              Twilio Credentials
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/50">
              <Shield className="w-4 h-4 text-blue-500 flex-shrink-0" />
              <p className="text-xs text-muted-foreground">
                Get your credentials from <a href="https://console.twilio.com" target="_blank" rel="noopener" className="text-blue-500 underline">console.twilio.com</a>. Your auth token is stored securely and never displayed after saving.
              </p>
            </div>

            <div>
              <Label>Account SID</Label>
              <Input
                value={form.twilioAccountSid}
                onChange={e => setForm(f => ({ ...f, twilioAccountSid: e.target.value }))}
                placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                data-testid="input-account-sid"
              />
            </div>

            <div>
              <Label>Auth Token</Label>
              <Input
                type="password"
                value={form.twilioAuthToken}
                onChange={e => setForm(f => ({ ...f, twilioAuthToken: e.target.value }))}
                placeholder="Enter auth token..."
                data-testid="input-auth-token"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {form.provider === "commshub" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-emerald-500" />
              CommsHub Credentials
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/50">
              <Shield className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              <p className="text-xs text-muted-foreground">
                Get your API key from your CommsHub business dashboard. Each business has its own unique API key.
              </p>
            </div>

            <div>
              <Label>CommsHub Base URL</Label>
              <Input
                value={form.commshubBaseUrl}
                onChange={e => setForm(f => ({ ...f, commshubBaseUrl: e.target.value }))}
                placeholder="https://commhub.replit.app"
                data-testid="input-commshub-url"
              />
              <p className="text-xs text-muted-foreground mt-1">
                The base URL of your CommsHub instance
              </p>
            </div>

            <div>
              <Label>API Key</Label>
              <Input
                type="password"
                value={form.commshubApiKey}
                onChange={e => setForm(f => ({ ...f, commshubApiKey: e.target.value }))}
                placeholder="ch_xxxxxxxxxxxxxxxx"
                data-testid="input-commshub-key"
              />
              <p className="text-xs text-muted-foreground mt-1">
                The API key from your CommsHub business card
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Phone className="w-4 h-4 text-blue-500" />
            General Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Default From Number</Label>
            <Input
              value={form.defaultFromNumber}
              onChange={e => setForm(f => ({ ...f, defaultFromNumber: e.target.value }))}
              placeholder="+15551234567"
              data-testid="input-default-number"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {form.provider === "commshub"
                ? "The phone number assigned to your business in CommsHub"
                : "Fallback number used when a tenant hasn't configured their own"}
            </p>
          </div>

          <div>
            <Label>Monthly Budget (cents, optional)</Label>
            <Input
              type="number"
              value={form.monthlyBudgetCents}
              onChange={e => setForm(f => ({ ...f, monthlyBudgetCents: e.target.value }))}
              placeholder="e.g. 10000 ($100)"
              data-testid="input-budget"
            />
          </div>

          <div className="pt-2">
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              data-testid="button-save-sms-config"
            >
              {saveMutation.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
              Save Settings
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-500" />
            Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={form.enabled ? "text-emerald-600 border-emerald-200" : "text-red-600 border-red-200"} data-testid="badge-sms-status">
              {form.enabled ? "Enabled" : "Disabled"}
            </Badge>
            <Badge variant="outline" data-testid="badge-sms-provider">
              {form.provider === "commshub" ? "CommsHub" : "Twilio"}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {form.enabled
                ? form.provider === "commshub"
                  ? form.commshubApiKey ? "SMS service is active via CommsHub" : "CommsHub API key required"
                  : form.twilioAccountSid ? "SMS service is active via Twilio" : "Twilio credentials required"
                : "SMS service is currently disabled"}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
