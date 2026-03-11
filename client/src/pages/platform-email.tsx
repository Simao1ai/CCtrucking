import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Mail,
  Server,
  Shield,
  CheckCircle2,
  XCircle,
  Send,
  AlertTriangle,
  Info,
} from "lucide-react";

interface EmailConfigResponse {
  configured: boolean;
  hasEnvCredentials: boolean;
  config: {
    id: string;
    provider: string;
    smtpHost: string;
    smtpPort: number;
    smtpSecure: boolean;
    smtpUser: string | null;
    smtpPass: string | null;
    fromName: string | null;
    enabled: boolean;
    lastTestedAt: string | null;
    lastTestResult: string | null;
  } | null;
}

const PROVIDER_PRESETS: Record<string, { host: string; port: number; secure: boolean }> = {
  office365: { host: "smtp.office365.com", port: 587, secure: false },
  gmail: { host: "smtp.gmail.com", port: 587, secure: false },
  ses: { host: "email-smtp.us-east-1.amazonaws.com", port: 587, secure: false },
  custom: { host: "", port: 587, secure: false },
};

export default function PlatformEmail() {
  const { toast } = useToast();
  const [testEmail, setTestEmail] = useState("");

  const { data, isLoading } = useQuery<EmailConfigResponse>({
    queryKey: ["/api/platform/email-config"],
  });

  const [form, setForm] = useState<{
    provider: string;
    smtpHost: string;
    smtpPort: string;
    smtpSecure: boolean;
    smtpUser: string;
    smtpPass: string;
    fromName: string;
    enabled: boolean;
  } | null>(null);

  const currentForm = form || {
    provider: data?.config?.provider || "office365",
    smtpHost: data?.config?.smtpHost || "smtp.office365.com",
    smtpPort: String(data?.config?.smtpPort || 587),
    smtpSecure: data?.config?.smtpSecure || false,
    smtpUser: data?.config?.smtpUser || "",
    smtpPass: data?.config?.smtpPass || "",
    fromName: data?.config?.fromName || "CarrierDeskHQ",
    enabled: data?.config?.enabled || false,
  };

  const saveMutation = useMutation({
    mutationFn: async (formData: typeof currentForm) => {
      const res = await apiRequest("POST", "/api/platform/email-config", formData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/platform/email-config"] });
      setForm(null);
      toast({ title: "Email configuration saved" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to save", description: err.message, variant: "destructive" });
    },
  });

  const testMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/platform/email-config/test", {
        testEmail: testEmail || undefined,
      });
      return res.json();
    },
    onSuccess: (result: { success: boolean; message: string }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/platform/email-config"] });
      toast({ title: result.success ? "Test passed" : "Test failed", description: result.message });
    },
    onError: (err: Error) => {
      toast({ title: "Test failed", description: err.message, variant: "destructive" });
    },
  });

  const handleProviderChange = (provider: string) => {
    const preset = PROVIDER_PRESETS[provider] || PROVIDER_PRESETS.custom;
    setForm({
      ...currentForm,
      provider,
      smtpHost: preset.host || currentForm.smtpHost,
      smtpPort: String(preset.port),
      smtpSecure: preset.secure,
    });
  };

  const updateField = (field: string, value: string | boolean) => {
    setForm({ ...currentForm, [field]: value });
  };

  if (isLoading) {
    return (
      <div className="p-4 lg:p-6 space-y-6 max-w-[1000px] mx-auto" data-testid="page-platform-email">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  const isConfigured = data?.configured;
  const lastTest = data?.config?.lastTestResult;
  const lastTestPassed = lastTest === "success";
  const lastTestDate = data?.config?.lastTestedAt
    ? new Date(data.config.lastTestedAt).toLocaleString()
    : null;

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-[1000px] mx-auto" data-testid="page-platform-email">
      <PageHeader
        title="Email Service"
        description="Configure the SMTP connection used to send emails to all tenant clients"
        icon={<Mail className="w-5 h-5 text-muted-foreground" />}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card data-testid="card-email-status">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              {isConfigured && data?.config?.enabled ? (
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              ) : (
                <XCircle className="w-8 h-8 text-muted-foreground" />
              )}
              <div>
                <p className="font-semibold text-sm" data-testid="text-email-status">
                  {isConfigured && data?.config?.enabled ? "Active" : "Not Configured"}
                </p>
                <p className="text-xs text-muted-foreground">Email Service</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-connection-test">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              {lastTestPassed ? (
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              ) : lastTest ? (
                <XCircle className="w-8 h-8 text-red-500" />
              ) : (
                <AlertTriangle className="w-8 h-8 text-muted-foreground" />
              )}
              <div>
                <p className="font-semibold text-sm" data-testid="text-test-status">
                  {lastTestPassed ? "Verified" : lastTest ? "Failed" : "Not Tested"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {lastTestDate || "No test run yet"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-env-status">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              {data?.hasEnvCredentials ? (
                <Shield className="w-8 h-8 text-blue-500" />
              ) : (
                <Info className="w-8 h-8 text-muted-foreground" />
              )}
              <div>
                <p className="font-semibold text-sm" data-testid="text-env-status">
                  {data?.hasEnvCredentials ? "Available" : "Not Set"}
                </p>
                <p className="text-xs text-muted-foreground">Environment Secrets</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {data?.hasEnvCredentials && !isConfigured && (
        <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-sm">Environment credentials detected</p>
                <p className="text-sm text-muted-foreground mt-1">
                  SMTP_EMAIL and SMTP_PASSWORD are set as environment secrets. You can either configure the email service below for full control, or the platform will use these secrets automatically as a fallback.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card data-testid="card-smtp-config">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Server className="w-4 h-4" />
            SMTP Configuration
          </CardTitle>
          <CardDescription>
            Connect your email provider to enable sending invoices, signature requests, and notifications to tenant clients.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="provider">Email Provider</Label>
              <Select
                value={currentForm.provider}
                onValueChange={handleProviderChange}
              >
                <SelectTrigger data-testid="select-provider">
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="office365">Microsoft 365 / Outlook</SelectItem>
                  <SelectItem value="gmail">Gmail / Google Workspace</SelectItem>
                  <SelectItem value="ses">Amazon SES</SelectItem>
                  <SelectItem value="custom">Custom SMTP</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fromName">Sender Display Name</Label>
              <Input
                id="fromName"
                data-testid="input-from-name"
                value={currentForm.fromName}
                onChange={(e) => updateField("fromName", e.target.value)}
                placeholder="CarrierDeskHQ"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="smtpHost">SMTP Host</Label>
              <Input
                id="smtpHost"
                data-testid="input-smtp-host"
                value={currentForm.smtpHost}
                onChange={(e) => updateField("smtpHost", e.target.value)}
                placeholder="smtp.example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="smtpPort">Port</Label>
              <Input
                id="smtpPort"
                data-testid="input-smtp-port"
                type="number"
                value={currentForm.smtpPort}
                onChange={(e) => updateField("smtpPort", e.target.value)}
                placeholder="587"
              />
            </div>

            <div className="space-y-2">
              <Label>SSL/TLS</Label>
              <div className="flex items-center gap-2 h-10">
                <Switch
                  data-testid="switch-smtp-secure"
                  checked={currentForm.smtpSecure}
                  onCheckedChange={(checked) => updateField("smtpSecure", checked)}
                />
                <span className="text-sm text-muted-foreground">
                  {currentForm.smtpSecure ? "SSL (port 465)" : "STARTTLS (port 587)"}
                </span>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="smtpUser">SMTP Username / Email</Label>
              <Input
                id="smtpUser"
                data-testid="input-smtp-user"
                type="email"
                value={currentForm.smtpUser}
                onChange={(e) => updateField("smtpUser", e.target.value)}
                placeholder="noreply@yourdomain.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="smtpPass">SMTP Password</Label>
              <Input
                id="smtpPass"
                data-testid="input-smtp-pass"
                type="password"
                value={currentForm.smtpPass}
                onChange={(e) => updateField("smtpPass", e.target.value)}
                placeholder="Enter password"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t">
            <div className="flex items-center gap-3">
              <Switch
                data-testid="switch-enabled"
                checked={currentForm.enabled}
                onCheckedChange={(checked) => updateField("enabled", checked)}
              />
              <div>
                <p className="text-sm font-medium">Enable Email Service</p>
                <p className="text-xs text-muted-foreground">When enabled, the platform will send emails to tenant clients</p>
              </div>
            </div>

            <Button
              data-testid="button-save-config"
              onClick={() => saveMutation.mutate(currentForm)}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? "Saving..." : "Save Configuration"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card data-testid="card-test-connection">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Send className="w-4 h-4" />
            Test Connection
          </CardTitle>
          <CardDescription>
            Send a test email to verify your SMTP configuration is working correctly.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-3">
            <div className="flex-1 space-y-2">
              <Label htmlFor="testEmail">Test Email Address (optional)</Label>
              <Input
                id="testEmail"
                data-testid="input-test-email"
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="Leave blank to send to SMTP user"
              />
            </div>
            <Button
              data-testid="button-test-connection"
              variant="outline"
              onClick={() => testMutation.mutate()}
              disabled={testMutation.isPending}
            >
              {testMutation.isPending ? "Sending..." : "Send Test Email"}
            </Button>
          </div>

          {lastTest && lastTestDate && (
            <div className={`mt-4 p-3 rounded-md text-sm flex items-start gap-2 ${
              lastTestPassed
                ? "bg-green-50 text-green-800 dark:bg-green-950/30 dark:text-green-300"
                : "bg-red-50 text-red-800 dark:bg-red-950/30 dark:text-red-300"
            }`} data-testid="text-test-result">
              {lastTestPassed ? (
                <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
              ) : (
                <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
              )}
              <div>
                <p className="font-medium">{lastTestPassed ? "Connection verified" : "Connection failed"}</p>
                <p className="text-xs mt-1 opacity-75">Last tested: {lastTestDate}</p>
                {!lastTestPassed && <p className="text-xs mt-1">{lastTest}</p>}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card data-testid="card-email-types">
        <CardHeader>
          <CardTitle className="text-base">Supported Email Types</CardTitle>
          <CardDescription>
            These are the emails the platform will send on behalf of your tenants once the email service is active.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-start gap-3 p-3 rounded-md bg-muted/50" data-testid="email-type-invoice">
              <Badge variant="outline" className="mt-0.5 shrink-0">Invoice</Badge>
              <div>
                <p className="text-sm font-medium">Invoice Delivery</p>
                <p className="text-xs text-muted-foreground">Sends invoice PDF to client with amount and due date</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-md bg-muted/50" data-testid="email-type-reminder">
              <Badge variant="outline" className="mt-0.5 shrink-0">Reminder</Badge>
              <div>
                <p className="text-sm font-medium">Payment Reminders</p>
                <p className="text-xs text-muted-foreground">Automatic escalation at 7, 14, and 21 days overdue</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-md bg-muted/50" data-testid="email-type-signature">
              <Badge variant="outline" className="mt-0.5 shrink-0">Signature</Badge>
              <div>
                <p className="text-sm font-medium">Signature Requests</p>
                <p className="text-xs text-muted-foreground">Notifies client when a document needs their signature</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-md bg-muted/50" data-testid="email-type-notarization">
              <Badge variant="outline" className="mt-0.5 shrink-0">Notary</Badge>
              <div>
                <p className="text-sm font-medium">Notarization Updates</p>
                <p className="text-xs text-muted-foreground">Status updates when notarizations are scheduled or completed</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
