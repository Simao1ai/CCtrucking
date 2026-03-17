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
import { MessageSquare, Save, Loader2, Shield, Phone, AlertCircle } from "lucide-react";

export default function PlatformSmsSettings() {
  const { toast } = useToast();

  const { data: config, isLoading } = useQuery<any>({
    queryKey: ["/api/platform/sms-config"],
  });

  const [form, setForm] = useState({
    twilioAccountSid: "",
    twilioAuthToken: "",
    defaultFromNumber: "",
    enabled: false,
    monthlyBudgetCents: "",
  });

  useEffect(() => {
    if (config) {
      setForm({
        twilioAccountSid: config.twilioAccountSid || "",
        twilioAuthToken: config.twilioAuthToken || "",
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
          Configure Twilio credentials to enable text messaging across all tenants
        </p>
      </div>

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

          <div>
            <Label>Default From Number</Label>
            <Input
              value={form.defaultFromNumber}
              onChange={e => setForm(f => ({ ...f, defaultFromNumber: e.target.value }))}
              placeholder="+15551234567"
              data-testid="input-default-number"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Fallback number used when a tenant hasn't configured their own
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
            <span className="text-sm text-muted-foreground">
              {form.enabled
                ? form.twilioAccountSid ? "SMS service is active and ready to send messages" : "Enable requires Account SID and Auth Token"
                : "SMS service is currently disabled"}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
