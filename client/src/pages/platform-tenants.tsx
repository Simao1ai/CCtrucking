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
import { useToast } from "@/hooks/use-toast";
import { PLAN_DEFINITIONS, type PlanTier } from "@shared/plan-config";
import {
  Building2, Eye, UserCog, Plus, Check, ChevronLeft, ChevronRight,
} from "lucide-react";

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

export default function PlatformTenants() {
  const { toast } = useToast();
  const [selectedTenant, setSelectedTenant] = useState<PlatformTenant | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const { data: tenants, isLoading: tenantsLoading } = useQuery<PlatformTenant[]>({
    queryKey: ["/api/platform/tenants"],
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

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-[1400px] mx-auto" data-testid="page-platform-tenants">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <PageHeader
          title="Tenants"
          description="Manage all tenants on the CarrierDeskHQ platform"
          icon={<Building2 className="w-5 h-5 text-muted-foreground" />}
        />
        <Button
          data-testid="button-create-tenant"
          onClick={() => setCreateDialogOpen(true)}
        >
          <Plus className="w-4 h-4 mr-1" />
          Create Tenant
        </Button>
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
