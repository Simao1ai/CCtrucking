import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { PLAN_DEFINITIONS, type PlanTier } from "@shared/plan-config";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  Building2, Users, DollarSign, Activity, Eye, UserCog,
  Server, Database, ScrollText, Clock, Plus, Check, ChevronLeft, ChevronRight,
} from "lucide-react";

interface PlatformAnalytics {
  tenantStatusBreakdown: { status: string; count: number }[];
  totalUsers: number;
  totalRevenue: string;
  totalClients: number;
  monthlyRevenue: { month: string; total: string }[];
  perTenantRevenue: { tenantId: string; total: string; tenantName: string }[];
}

interface PlatformTenant {
  id: string;
  name: string;
  slug: string;
  plan: string;
  status: string;
  contactEmail?: string;
  clientCount?: number;
  userCount?: number;
}

interface AIUsageData {
  totals: { totalTokens: string; promptTokens: string; completionTokens: string; requestCount: number };
  perFeature: { feature: string; totalTokens: string; count: number }[];
  perTenant: { tenantId: string; totalTokens: string; count: number }[];
  dailyTrend: { date: string; totalTokens: string; count: number }[];
}

interface HealthData {
  tenantsByStatus: { status: string; count: number }[];
  tableCounts: Record<string, number>;
  recentAuditLogCount: number;
  systemUptime: number;
}

function formatCurrency(value: number) {
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const tenantFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  plan: z.enum(["basic", "pro", "enterprise"]),
  status: z.enum(["active", "trial", "suspended", "cancelled"]),
  contactEmail: z.string().email("Invalid email").or(z.literal("")),
});

type TenantFormValues = z.infer<typeof tenantFormSchema>;

function PlanBadge({ plan }: { plan: string }) {
  const cls =
    plan === "enterprise"
      ? "bg-purple-500/15 text-purple-700 dark:text-purple-400"
      : plan === "pro"
        ? "bg-blue-500/15 text-blue-700 dark:text-blue-400"
        : "";
  return (
    <Badge className={`no-default-hover-elevate no-default-active-elevate ${cls}`} data-testid={`badge-plan-${plan}`}>
      {plan}
    </Badge>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === "active"
      ? "bg-green-500/15 text-green-700 dark:text-green-400"
      : status === "trial"
        ? "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400"
        : status === "suspended"
          ? "bg-red-500/15 text-red-700 dark:text-red-400"
          : "bg-gray-500/15 text-gray-700 dark:text-gray-400";
  return (
    <Badge className={`no-default-hover-elevate no-default-active-elevate ${cls}`} data-testid={`badge-status-${status}`}>
      {status}
    </Badge>
  );
}

function TenantDetailDialog({
  tenant,
  open,
  onOpenChange,
}: {
  tenant: PlatformTenant | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const form = useForm<TenantFormValues>({
    resolver: zodResolver(tenantFormSchema),
    values: {
      name: tenant?.name ?? "",
      plan: (tenant?.plan as TenantFormValues["plan"]) ?? "basic",
      status: (tenant?.status as TenantFormValues["status"]) ?? "active",
      contactEmail: tenant?.contactEmail ?? "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: TenantFormValues) => {
      await apiRequest("PATCH", `/api/platform/tenants/${tenant?.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/platform/tenants"] });
      queryClient.invalidateQueries({ queryKey: ["/api/platform/analytics"] });
      toast({ title: "Tenant updated", description: "Changes saved successfully." });
      onOpenChange(false);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="dialog-tenant-detail">
        <DialogHeader>
          <DialogTitle data-testid="text-dialog-title">Edit Tenant</DialogTitle>
        </DialogHeader>
        {tenant && (
          <div className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground">Slug</Label>
              <p className="text-sm font-medium" data-testid="text-tenant-slug">{tenant.slug}</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tenant-name">Name</Label>
              <Input
                id="tenant-name"
                data-testid="input-tenant-name"
                {...form.register("name")}
              />
              {form.formState.errors.name && (
                <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tenant-plan">Plan</Label>
              <Select
                value={form.watch("plan")}
                onValueChange={(v) => form.setValue("plan", v as TenantFormValues["plan"])}
              >
                <SelectTrigger data-testid="select-tenant-plan">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="basic">Basic</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tenant-status">Status</Label>
              <Select
                value={form.watch("status")}
                onValueChange={(v) => form.setValue("status", v as TenantFormValues["status"])}
              >
                <SelectTrigger data-testid="select-tenant-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="trial">Trial</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tenant-email">Contact Email</Label>
              <Input
                id="tenant-email"
                data-testid="input-tenant-email"
                {...form.register("contactEmail")}
              />
              {form.formState.errors.contactEmail && (
                <p className="text-xs text-destructive">{form.formState.errors.contactEmail.message}</p>
              )}
            </div>
          </div>
        )}
        <DialogFooter>
          <Button
            data-testid="button-save-tenant"
            onClick={form.handleSubmit((data) => mutation.mutate(data))}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const createTenantSchema = z.object({
  name: z.string().min(1, "Company name is required"),
  slug: z.string().min(1, "Slug is required"),
  contactEmail: z.string().email("Valid email is required"),
  industry: z.enum(["trucking", "logistics", "transportation", "other"]),
  plan: z.enum(["basic", "pro", "enterprise"]),
  ownerUsername: z.string().min(1, "Username is required"),
  ownerPassword: z.string().min(6, "Password must be at least 6 characters"),
  ownerEmail: z.string().email("Valid email").or(z.literal("")).optional(),
  ownerFirstName: z.string().optional(),
  ownerLastName: z.string().optional(),
});

type CreateTenantFormValues = z.infer<typeof createTenantSchema>;

function generateSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

const WIZARD_STEPS = ["Company Info", "Plan", "Owner Account", "Review & Create"];

function CreateTenantDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [createdResult, setCreatedResult] = useState<{ tenant: any; credentials: any } | null>(null);

  const form = useForm<CreateTenantFormValues>({
    resolver: zodResolver(createTenantSchema),
    defaultValues: {
      name: "",
      slug: "",
      contactEmail: "",
      industry: "trucking",
      plan: "basic",
      ownerUsername: "",
      ownerPassword: "",
      ownerEmail: "",
      ownerFirstName: "",
      ownerLastName: "",
    },
  });

  const nameValue = form.watch("name");

  useEffect(() => {
    if (!slugManuallyEdited && nameValue) {
      form.setValue("slug", generateSlug(nameValue));
    }
  }, [nameValue, slugManuallyEdited, form]);

  const mutation = useMutation({
    mutationFn: async (data: CreateTenantFormValues) => {
      const res = await apiRequest("POST", "/api/platform/tenants", {
        ...data,
        status: "active",
      });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/platform/tenants"] });
      queryClient.invalidateQueries({ queryKey: ["/api/platform/analytics"] });
      setCreatedResult({
        tenant: data,
        credentials: {
          username: form.getValues("ownerUsername"),
          password: form.getValues("ownerPassword"),
        },
      });
    },
    onError: (err: Error) => {
      toast({ title: "Error creating tenant", description: err.message, variant: "destructive" });
    },
  });

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setStep(0);
      setSlugManuallyEdited(false);
      setCreatedResult(null);
      form.reset();
    }, 200);
  };

  const validateCurrentStep = async (): Promise<boolean> => {
    if (step === 0) {
      return form.trigger(["name", "slug", "contactEmail", "industry"]);
    }
    if (step === 1) {
      return form.trigger(["plan"]);
    }
    if (step === 2) {
      return form.trigger(["ownerUsername", "ownerPassword"]);
    }
    return true;
  };

  const handleNext = async () => {
    const valid = await validateCurrentStep();
    if (valid) setStep((s) => Math.min(s + 1, 3));
  };

  const handleBack = () => setStep((s) => Math.max(s - 1, 0));

  const handleSubmit = () => {
    form.handleSubmit((data) => mutation.mutate(data))();
  };

  const selectedPlan = form.watch("plan");

  if (createdResult) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent data-testid="dialog-create-tenant-success">
          <DialogHeader>
            <DialogTitle data-testid="text-create-success-title">Tenant Created Successfully</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 rounded-md bg-green-500/10 space-y-2">
              <div className="flex items-center gap-2">
                <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
                <span className="font-medium text-green-700 dark:text-green-300" data-testid="text-success-message">Tenant is now active</span>
              </div>
            </div>
            <div className="space-y-2">
              <div>
                <Label className="text-xs text-muted-foreground">Tenant Name</Label>
                <p className="text-sm font-medium" data-testid="text-created-tenant-name">{createdResult.tenant?.name || form.getValues("name")}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Slug</Label>
                <p className="text-sm font-medium" data-testid="text-created-tenant-slug">{createdResult.tenant?.slug || form.getValues("slug")}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Plan</Label>
                <p className="text-sm font-medium" data-testid="text-created-tenant-plan">{form.getValues("plan")}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Owner Username</Label>
                <p className="text-sm font-medium" data-testid="text-created-owner-username">{createdResult.credentials.username}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Owner Password</Label>
                <p className="text-sm font-mono" data-testid="text-created-owner-password">{createdResult.credentials.password}</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button data-testid="button-close-success" onClick={handleClose}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[540px]" data-testid="dialog-create-tenant">
        <DialogHeader>
          <DialogTitle data-testid="text-create-dialog-title">Create Tenant</DialogTitle>
          <div className="flex items-center gap-2 pt-2">
            {WIZARD_STEPS.map((label, i) => (
              <div key={label} className="flex items-center gap-1">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                    i < step
                      ? "bg-green-500/15 text-green-700 dark:text-green-400"
                      : i === step
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                  }`}
                  data-testid={`wizard-step-indicator-${i}`}
                >
                  {i < step ? <Check className="w-3 h-3" /> : i + 1}
                </div>
                <span className={`text-xs hidden sm:inline ${i === step ? "font-medium" : "text-muted-foreground"}`} data-testid={`wizard-step-label-${i}`}>
                  {label}
                </span>
                {i < WIZARD_STEPS.length - 1 && <div className="w-4 h-px bg-border" />}
              </div>
            ))}
          </div>
        </DialogHeader>

        <div className="min-h-[280px]">
          {step === 0 && (
            <div className="space-y-4" data-testid="wizard-step-company-info">
              <div className="space-y-1.5">
                <Label htmlFor="create-name">Company Name</Label>
                <Input
                  id="create-name"
                  data-testid="input-create-name"
                  placeholder="e.g. Acme Trucking"
                  {...form.register("name")}
                />
                {form.formState.errors.name && (
                  <p className="text-xs text-destructive" data-testid="error-create-name">{form.formState.errors.name.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="create-slug">Slug</Label>
                <Input
                  id="create-slug"
                  data-testid="input-create-slug"
                  {...form.register("slug", {
                    onChange: () => setSlugManuallyEdited(true),
                  })}
                />
                {form.formState.errors.slug && (
                  <p className="text-xs text-destructive" data-testid="error-create-slug">{form.formState.errors.slug.message}</p>
                )}
                <p className="text-xs text-muted-foreground">Auto-generated from name. You can edit it.</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="create-email">Contact Email</Label>
                <Input
                  id="create-email"
                  data-testid="input-create-contact-email"
                  type="email"
                  placeholder="admin@company.com"
                  {...form.register("contactEmail")}
                />
                {form.formState.errors.contactEmail && (
                  <p className="text-xs text-destructive" data-testid="error-create-contact-email">{form.formState.errors.contactEmail.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="create-industry">Industry</Label>
                <Select
                  value={form.watch("industry")}
                  onValueChange={(v) => form.setValue("industry", v as CreateTenantFormValues["industry"])}
                >
                  <SelectTrigger data-testid="select-create-industry">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="trucking">Trucking</SelectItem>
                    <SelectItem value="logistics">Logistics</SelectItem>
                    <SelectItem value="transportation">Transportation</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-3" data-testid="wizard-step-plan">
              <p className="text-sm text-muted-foreground">Select a plan for this tenant</p>
              {(Object.keys(PLAN_DEFINITIONS) as PlanTier[]).map((tier) => {
                const def = PLAN_DEFINITIONS[tier];
                const isSelected = selectedPlan === tier;
                return (
                  <div
                    key={tier}
                    className={`p-4 rounded-md border cursor-pointer transition-colors ${
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-border hover-elevate"
                    }`}
                    data-testid={`plan-card-${tier}`}
                    onClick={() => form.setValue("plan", tier)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                            isSelected ? "border-primary" : "border-muted-foreground/40"
                          }`}
                        >
                          {isSelected && <div className="w-2 h-2 rounded-full bg-primary" />}
                        </div>
                        <div>
                          <p className="text-sm font-medium" data-testid={`text-plan-name-${tier}`}>{def.name}</p>
                          <p className="text-xs text-muted-foreground" data-testid={`text-plan-desc-${tier}`}>{def.description}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">{def.limits.maxClients === -1 ? "Unlimited" : def.limits.maxClients} clients</p>
                        <p className="text-xs text-muted-foreground">{def.limits.maxUsers === -1 ? "Unlimited" : def.limits.maxUsers} users</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4" data-testid="wizard-step-owner">
              <p className="text-sm text-muted-foreground">Create the tenant owner account</p>
              <div className="space-y-1.5">
                <Label htmlFor="create-owner-username">Username</Label>
                <Input
                  id="create-owner-username"
                  data-testid="input-create-owner-username"
                  placeholder="admin"
                  {...form.register("ownerUsername")}
                />
                {form.formState.errors.ownerUsername && (
                  <p className="text-xs text-destructive" data-testid="error-create-owner-username">{form.formState.errors.ownerUsername.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="create-owner-password">Password</Label>
                <Input
                  id="create-owner-password"
                  data-testid="input-create-owner-password"
                  type="password"
                  placeholder="Min 6 characters"
                  {...form.register("ownerPassword")}
                />
                {form.formState.errors.ownerPassword && (
                  <p className="text-xs text-destructive" data-testid="error-create-owner-password">{form.formState.errors.ownerPassword.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="create-owner-email">Email (optional)</Label>
                <Input
                  id="create-owner-email"
                  data-testid="input-create-owner-email"
                  type="email"
                  {...form.register("ownerEmail")}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="create-owner-first">First Name</Label>
                  <Input
                    id="create-owner-first"
                    data-testid="input-create-owner-first-name"
                    {...form.register("ownerFirstName")}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="create-owner-last">Last Name</Label>
                  <Input
                    id="create-owner-last"
                    data-testid="input-create-owner-last-name"
                    {...form.register("ownerLastName")}
                  />
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4" data-testid="wizard-step-review">
              <p className="text-sm text-muted-foreground">Review the details before creating</p>
              <div className="space-y-3 p-4 rounded-md bg-muted/50">
                <div>
                  <Label className="text-xs text-muted-foreground">Company</Label>
                  <p className="text-sm font-medium" data-testid="review-name">{form.getValues("name")}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Slug</Label>
                  <p className="text-sm font-medium" data-testid="review-slug">{form.getValues("slug")}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Contact Email</Label>
                  <p className="text-sm font-medium" data-testid="review-contact-email">{form.getValues("contactEmail")}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Industry</Label>
                  <p className="text-sm font-medium capitalize" data-testid="review-industry">{form.getValues("industry")}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Plan</Label>
                  <p className="text-sm font-medium capitalize" data-testid="review-plan">{form.getValues("plan")}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Owner Username</Label>
                  <p className="text-sm font-medium" data-testid="review-owner-username">{form.getValues("ownerUsername")}</p>
                </div>
                {form.getValues("ownerEmail") && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Owner Email</Label>
                    <p className="text-sm font-medium" data-testid="review-owner-email">{form.getValues("ownerEmail")}</p>
                  </div>
                )}
                {(form.getValues("ownerFirstName") || form.getValues("ownerLastName")) && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Owner Name</Label>
                    <p className="text-sm font-medium" data-testid="review-owner-name">
                      {[form.getValues("ownerFirstName"), form.getValues("ownerLastName")].filter(Boolean).join(" ")}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-row justify-between gap-2">
          <div>
            {step > 0 && (
              <Button variant="outline" onClick={handleBack} data-testid="button-wizard-back">
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
            )}
          </div>
          <div>
            {step < 3 ? (
              <Button onClick={handleNext} data-testid="button-wizard-next">
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={mutation.isPending}
                data-testid="button-wizard-create"
              >
                {mutation.isPending ? "Creating..." : "Create Tenant"}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function PlatformDashboard() {
  const { toast } = useToast();
  const [selectedTenant, setSelectedTenant] = useState<PlatformTenant | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const { data: analytics, isLoading: analyticsLoading } = useQuery<PlatformAnalytics>({
    queryKey: ["/api/platform/analytics"],
  });

  const { data: tenants, isLoading: tenantsLoading } = useQuery<PlatformTenant[]>({
    queryKey: ["/api/platform/tenants"],
  });

  const { data: aiUsage, isLoading: aiLoading } = useQuery<AIUsageData>({
    queryKey: ["/api/platform/ai-usage"],
  });

  const { data: health, isLoading: healthLoading } = useQuery<HealthData>({
    queryKey: ["/api/platform/health"],
  });

  const impersonateMutation = useMutation({
    mutationFn: async (tenantId: string) => {
      await apiRequest("POST", `/api/platform/impersonate/${tenantId}`);
    },
    onSuccess: () => {
      toast({ title: "Impersonating tenant", description: "Session switched." });
      window.location.reload();
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const totalTenants = analytics?.tenantStatusBreakdown
    ? analytics.tenantStatusBreakdown.reduce((s, v) => s + Number(v.count), 0)
    : 0;
  const activeTenants = analytics?.tenantStatusBreakdown?.find(s => s.status === "active")?.count ?? 0;
  const totalUsers = analytics?.totalUsers ?? 0;
  const totalRevenue = parseFloat(analytics?.totalRevenue ?? "0");

  const aiTotalTokens = parseInt(aiUsage?.totals?.totalTokens ?? "0", 10);
  const aiByFeature = (aiUsage?.perFeature ?? []).map(f => ({
    feature: f.feature,
    tokens: parseInt(f.totalTokens ?? "0", 10),
  }));
  const aiByTenant = (aiUsage?.perTenant ?? []).map(t => ({
    tenantId: t.tenantId || "unknown",
    tokens: parseInt(t.totalTokens ?? "0", 10),
  }));

  const maxFeatureTokens = aiByFeature.length
    ? Math.max(...aiByFeature.map((f) => f.tokens))
    : 1;

  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (d > 0) return `${d}d ${h}h ${m}m`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-[1400px] mx-auto" data-testid="page-platform-dashboard">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <PageHeader
          title="Platform Dashboard"
          description="CarrierDeskHQ platform overview — tenants, revenue, and system health"
          icon={<Server className="w-5 h-5 text-muted-foreground" />}
        />
        <Button
          data-testid="button-create-tenant"
          onClick={() => setCreateDialogOpen(true)}
        >
          <Plus className="w-4 h-4 mr-1" />
          Create Tenant
        </Button>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4" data-testid="section-overview-cards">
        <Card data-testid="card-total-tenants">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Tenants</CardTitle>
            <Building2 className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {analyticsLoading ? (
              <Skeleton className="h-8 w-20" data-testid="skeleton-total-tenants" />
            ) : (
              <div className="text-2xl font-bold" data-testid="value-total-tenants">{totalTenants}</div>
            )}
          </CardContent>
        </Card>
        <Card data-testid="card-active-tenants">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Tenants</CardTitle>
            <Activity className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {analyticsLoading ? (
              <Skeleton className="h-8 w-20" data-testid="skeleton-active-tenants" />
            ) : (
              <div className="text-2xl font-bold" data-testid="value-active-tenants">{activeTenants}</div>
            )}
          </CardContent>
        </Card>
        <Card data-testid="card-total-users">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
            <Users className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {analyticsLoading ? (
              <Skeleton className="h-8 w-20" data-testid="skeleton-total-users" />
            ) : (
              <div className="text-2xl font-bold" data-testid="value-total-users">{totalUsers}</div>
            )}
          </CardContent>
        </Card>
        <Card data-testid="card-platform-revenue">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Platform Revenue</CardTitle>
            <DollarSign className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {analyticsLoading ? (
              <Skeleton className="h-8 w-28" data-testid="skeleton-platform-revenue" />
            ) : (
              <div className="text-2xl font-bold" data-testid="value-platform-revenue">{formatCurrency(totalRevenue)}</div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card data-testid="card-tenants-table">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Tenants</CardTitle>
        </CardHeader>
        <CardContent>
          {tenantsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-12 w-full" data-testid={`skeleton-tenant-row-${i}`} />
              ))}
            </div>
          ) : (
            <Table data-testid="table-tenants">
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Clients</TableHead>
                  <TableHead>Users</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(tenants ?? []).map((tenant) => (
                  <TableRow key={tenant.id} data-testid={`row-tenant-${tenant.id}`}>
                    <TableCell className="font-medium" data-testid={`text-tenant-name-${tenant.id}`}>{tenant.name}</TableCell>
                    <TableCell className="text-muted-foreground" data-testid={`text-tenant-slug-${tenant.id}`}>{tenant.slug}</TableCell>
                    <TableCell><PlanBadge plan={tenant.plan} /></TableCell>
                    <TableCell><StatusBadge status={tenant.status} /></TableCell>
                    <TableCell data-testid={`text-tenant-clients-${tenant.id}`}>{tenant.clientCount ?? 0}</TableCell>
                    <TableCell data-testid={`text-tenant-users-${tenant.id}`}>{tenant.userCount ?? 0}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          data-testid={`button-view-tenant-${tenant.id}`}
                          onClick={() => {
                            setSelectedTenant(tenant);
                            setDialogOpen(true);
                          }}
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" />
                          View
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          data-testid={`button-impersonate-tenant-${tenant.id}`}
                          onClick={() => impersonateMutation.mutate(tenant.id)}
                          disabled={impersonateMutation.isPending}
                        >
                          <UserCog className="w-3.5 h-3.5 mr-1" />
                          Impersonate
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {(tenants ?? []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8" data-testid="text-no-tenants">
                      No tenants found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2" data-testid="section-charts-row">
        <Card data-testid="card-revenue-chart">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Monthly Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            {analyticsLoading ? (
              <Skeleton className="h-[300px] w-full" data-testid="skeleton-revenue-chart" />
            ) : (
              <div data-testid="chart-monthly-revenue">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={(analytics?.monthlyRevenue ?? []).map(r => ({ month: r.month, revenue: parseFloat(r.total || "0") }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${v.toLocaleString()}`} />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Bar dataKey="revenue" fill="hsl(215, 70%, 50%)" name="Revenue" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-ai-usage">
          <CardHeader>
            <CardTitle className="text-base font-semibold">AI Usage Summary</CardTitle>
          </CardHeader>
          <CardContent>
            {aiLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-8 w-40" data-testid="skeleton-ai-total" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            ) : (
              <div className="space-y-5">
                <div data-testid="ai-total-tokens">
                  <p className="text-sm text-muted-foreground">Total Tokens Used</p>
                  <p className="text-2xl font-bold">{aiTotalTokens.toLocaleString()}</p>
                </div>

                {aiByFeature.length > 0 && (
                  <div data-testid="ai-by-feature">
                    <p className="text-sm font-medium text-muted-foreground mb-2">By Feature</p>
                    <div className="space-y-2">
                      {aiByFeature.map((f, i) => (
                        <div key={f.feature} data-testid={`ai-feature-${i}`}>
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="text-sm truncate">{f.feature}</span>
                            <span className="text-xs text-muted-foreground whitespace-nowrap">{f.tokens.toLocaleString()}</span>
                          </div>
                          <Progress
                            value={(f.tokens / maxFeatureTokens) * 100}
                            className="h-2"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {aiByTenant.length > 0 && (
                  <div data-testid="ai-by-tenant">
                    <p className="text-sm font-medium text-muted-foreground mb-2">By Tenant</p>
                    <div className="space-y-1.5">
                      {aiByTenant.map((t, i) => (
                        <div key={t.tenantId} className="flex items-center justify-between gap-2" data-testid={`ai-tenant-${i}`}>
                          <span className="text-sm truncate">{t.tenantId}</span>
                          <span className="text-sm font-medium tabular-nums">{t.tokens.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card data-testid="card-health-status">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Platform Health</CardTitle>
        </CardHeader>
        <CardContent>
          {healthLoading ? (
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-20 w-full" data-testid={`skeleton-health-${i}`} />
              ))}
            </div>
          ) : (
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4" data-testid="health-stats">
              <div className="flex flex-col gap-1 p-4 rounded-md bg-muted/50" data-testid="health-uptime">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground font-medium">Uptime</span>
                </div>
                <span className="text-lg font-bold" data-testid="value-uptime">{health?.systemUptime ? formatUptime(health.systemUptime) : "N/A"}</span>
              </div>
              <div className="flex flex-col gap-1 p-4 rounded-md bg-muted/50" data-testid="health-audit-logs">
                <div className="flex items-center gap-2">
                  <ScrollText className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground font-medium">Audit Logs (24h)</span>
                </div>
                <span className="text-lg font-bold" data-testid="value-audit-logs">{(health?.recentAuditLogCount ?? 0).toLocaleString()}</span>
              </div>
              {health?.tableCounts && Object.entries(health.tableCounts).map(([table, cnt]) => (
                <div key={table} className="flex flex-col gap-1 p-4 rounded-md bg-muted/50" data-testid={`health-db-${table}`}>
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground font-medium capitalize">{table}</span>
                  </div>
                  <span className="text-lg font-bold" data-testid={`value-db-${table}`}>{cnt.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <TenantDetailDialog
        tenant={selectedTenant}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />

      <CreateTenantDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />
    </div>
  );
}
