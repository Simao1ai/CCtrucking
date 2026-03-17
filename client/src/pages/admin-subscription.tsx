import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CreditCard, Check, X, Users, Building2, Brain } from "lucide-react";
import { PLAN_FEATURE_LABELS, type PlanDefinition } from "@shared/plan-config";

interface UsageData {
  plan: string;
  planName: string;
  clientCount: number;
  clientLimit: number;
  userCount: number;
  userLimit: number;
  aiTokensUsed: number;
  aiTokenLimit: number;
  aiPercentUsed: number;
}

function formatLimit(value: number): string {
  return value === -1 ? "Unlimited" : value.toLocaleString();
}

function getUsagePercent(current: number, limit: number): number {
  if (limit === -1) return 0;
  if (limit === 0) return 100;
  return Math.min(Math.round((current / limit) * 100), 100);
}

function getProgressColor(percent: number): string {
  if (percent > 95) return "bg-red-500";
  if (percent > 80) return "bg-yellow-500";
  return "";
}

function PlanBadgeLarge({ plan }: { plan: string }) {
  const cls =
    plan === "enterprise"
      ? "bg-purple-500/15 text-purple-700 dark:text-purple-400"
      : plan === "pro"
        ? "bg-blue-500/15 text-blue-700 dark:text-blue-400"
        : "";
  return (
    <Badge
      className={`text-lg px-4 py-1 no-default-hover-elevate no-default-active-elevate ${cls}`}
      data-testid="badge-current-plan"
    >
      {plan.charAt(0).toUpperCase() + plan.slice(1)}
    </Badge>
  );
}

function UsageMeterCard({
  title,
  icon: Icon,
  current,
  limit,
  loading,
  testId,
}: {
  title: string;
  icon: typeof Users;
  current: number;
  limit: number;
  loading: boolean;
  testId: string;
}) {
  const percent = getUsagePercent(current, limit);
  const colorClass = getProgressColor(percent);
  const isUnlimited = limit === -1;

  return (
    <Card data-testid={testId}>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="w-4 h-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-6 w-24" data-testid={`${testId}-skeleton`} />
            <Skeleton className="h-4 w-full" />
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xl font-bold" data-testid={`${testId}-value`}>
              {current.toLocaleString()} / {formatLimit(limit)}
            </p>
            {isUnlimited ? (
              <p className="text-xs text-muted-foreground" data-testid={`${testId}-unlimited`}>
                Unlimited
              </p>
            ) : (
              <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary" data-testid={`${testId}-progress`}>
                <div
                  className={`h-full transition-all ${colorClass || "bg-primary"}`}
                  style={{ width: `${percent}%` }}
                />
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const ALL_MODULES = [
  "clients",
  "tickets",
  "documents",
  "invoices",
  "chat",
  "forms",
  "signatures",
  "notarizations",
  "knowledge_base",
  "bookkeeping",
  "tax_prep",
  "compliance_scheduling",
  "employee_performance",
];

const EXTRA_FEATURES = ["customBranding", "whiteLabel", "apiAccess"] as const;
const EXTRA_FEATURE_LABELS: Record<string, string> = {
  customBranding: "Custom Branding",
  whiteLabel: "White Label",
  apiAccess: "API Access",
};

export default function AdminSubscription() {
  const { data: usage, isLoading: usageLoading } = useQuery<UsageData>({
    queryKey: ["/api/tenant/usage"],
  });

  const { data: plans, isLoading: plansLoading } = useQuery<Record<string, PlanDefinition>>({
    queryKey: ["/api/tenant/plans"],
  });

  const planOrder = ["basic", "pro", "enterprise"] as const;
  const orderedPlans = planOrder
    .map((key) => plans?.[key])
    .filter(Boolean) as PlanDefinition[];

  const currentPlan = usage?.plan ?? "";

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-[1400px] mx-auto" data-testid="page-admin-subscription">
      <PageHeader
        title="Subscription & Usage"
        icon={<CreditCard className="w-5 h-5 text-muted-foreground" />}
      />

      <Card data-testid="card-current-plan">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">Current Plan</CardTitle>
        </CardHeader>
        <CardContent>
          {usageLoading ? (
            <Skeleton className="h-10 w-32" data-testid="skeleton-current-plan" />
          ) : (
            <div className="space-y-2">
              <PlanBadgeLarge plan={usage?.planName?.toLowerCase() ?? currentPlan} />
              <p className="text-sm text-muted-foreground" data-testid="text-plan-description">
                Contact platform admin to change your plan
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3" data-testid="section-usage-meters">
        <UsageMeterCard
          title="Clients"
          icon={Building2}
          current={usage?.clientCount ?? 0}
          limit={usage?.clientLimit ?? 0}
          loading={usageLoading}
          testId="card-usage-clients"
        />
        <UsageMeterCard
          title="Users"
          icon={Users}
          current={usage?.userCount ?? 0}
          limit={usage?.userLimit ?? 0}
          loading={usageLoading}
          testId="card-usage-users"
        />
        <UsageMeterCard
          title="AI Tokens"
          icon={Brain}
          current={usage?.aiTokensUsed ?? 0}
          limit={usage?.aiTokenLimit ?? 0}
          loading={usageLoading}
          testId="card-usage-ai"
        />
      </div>

      <Card data-testid="card-plan-comparison">
        <CardHeader>
          <CardTitle className="text-base font-semibold" data-testid="text-plan-comparison-title">
            Plan Comparison
          </CardTitle>
        </CardHeader>
        <CardContent>
          {plansLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-10 w-full" data-testid={`skeleton-plan-row-${i}`} />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table data-testid="table-plan-comparison">
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[180px]">Feature</TableHead>
                    {orderedPlans.map((plan) => (
                      <TableHead
                        key={plan.tier}
                        className={`text-center min-w-[140px] ${plan.tier === currentPlan ? "bg-muted/50" : ""}`}
                        data-testid={`header-plan-${plan.tier}`}
                      >
                        <div className="space-y-1">
                          <span className="font-semibold">{plan.name}</span>
                          {plan.tier === currentPlan && (
                            <Badge
                              className="ml-2 no-default-hover-elevate no-default-active-elevate"
                              data-testid="badge-current-indicator"
                            >
                              Current
                            </Badge>
                          )}
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow data-testid="row-description">
                    <TableCell className="font-medium text-muted-foreground">Description</TableCell>
                    {orderedPlans.map((plan) => (
                      <TableCell
                        key={plan.tier}
                        className={`text-center text-sm ${plan.tier === currentPlan ? "bg-muted/50" : ""}`}
                        data-testid={`cell-description-${plan.tier}`}
                      >
                        {plan.description}
                      </TableCell>
                    ))}
                  </TableRow>
                  <TableRow data-testid="row-price">
                    <TableCell className="font-medium text-muted-foreground">Price</TableCell>
                    {orderedPlans.map((plan) => (
                      <TableCell
                        key={plan.tier}
                        className={`text-center text-sm font-medium ${plan.tier === currentPlan ? "bg-muted/50" : ""}`}
                        data-testid={`cell-price-${plan.tier}`}
                      >
                        {plan.pricePlaceholder}
                      </TableCell>
                    ))}
                  </TableRow>

                  <TableRow>
                    <TableCell colSpan={4} className="font-semibold text-xs uppercase tracking-wider text-muted-foreground pt-4">
                      Limits
                    </TableCell>
                  </TableRow>
                  <TableRow data-testid="row-limit-clients">
                    <TableCell className="font-medium text-muted-foreground">Max Clients</TableCell>
                    {orderedPlans.map((plan) => (
                      <TableCell
                        key={plan.tier}
                        className={`text-center ${plan.tier === currentPlan ? "bg-muted/50" : ""}`}
                        data-testid={`cell-limit-clients-${plan.tier}`}
                      >
                        {formatLimit(plan.limits.maxClients)}
                      </TableCell>
                    ))}
                  </TableRow>
                  <TableRow data-testid="row-limit-users">
                    <TableCell className="font-medium text-muted-foreground">Max Users</TableCell>
                    {orderedPlans.map((plan) => (
                      <TableCell
                        key={plan.tier}
                        className={`text-center ${plan.tier === currentPlan ? "bg-muted/50" : ""}`}
                        data-testid={`cell-limit-users-${plan.tier}`}
                      >
                        {formatLimit(plan.limits.maxUsers)}
                      </TableCell>
                    ))}
                  </TableRow>
                  <TableRow data-testid="row-limit-ai">
                    <TableCell className="font-medium text-muted-foreground">AI Tokens / Month</TableCell>
                    {orderedPlans.map((plan) => (
                      <TableCell
                        key={plan.tier}
                        className={`text-center ${plan.tier === currentPlan ? "bg-muted/50" : ""}`}
                        data-testid={`cell-limit-ai-${plan.tier}`}
                      >
                        {formatLimit(plan.limits.aiTokensPerMonth)}
                      </TableCell>
                    ))}
                  </TableRow>

                  <TableRow>
                    <TableCell colSpan={4} className="font-semibold text-xs uppercase tracking-wider text-muted-foreground pt-4">
                      Modules
                    </TableCell>
                  </TableRow>
                  {ALL_MODULES.map((mod) => (
                    <TableRow key={mod} data-testid={`row-module-${mod}`}>
                      <TableCell className="font-medium text-muted-foreground">
                        {PLAN_FEATURE_LABELS[mod] ?? mod}
                      </TableCell>
                      {orderedPlans.map((plan) => {
                        const included = plan.features.modules.includes(mod);
                        return (
                          <TableCell
                            key={plan.tier}
                            className={`text-center ${plan.tier === currentPlan ? "bg-muted/50" : ""}`}
                            data-testid={`cell-module-${mod}-${plan.tier}`}
                          >
                            {included ? (
                              <Check className="w-4 h-4 text-green-600 dark:text-green-400 mx-auto" />
                            ) : (
                              <X className="w-4 h-4 text-muted-foreground mx-auto" />
                            )}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}

                  <TableRow>
                    <TableCell colSpan={4} className="font-semibold text-xs uppercase tracking-wider text-muted-foreground pt-4">
                      Features
                    </TableCell>
                  </TableRow>
                  {EXTRA_FEATURES.map((feat) => (
                    <TableRow key={feat} data-testid={`row-feature-${feat}`}>
                      <TableCell className="font-medium text-muted-foreground">
                        {EXTRA_FEATURE_LABELS[feat]}
                      </TableCell>
                      {orderedPlans.map((plan) => {
                        const enabled = plan.features[feat];
                        return (
                          <TableCell
                            key={plan.tier}
                            className={`text-center ${plan.tier === currentPlan ? "bg-muted/50" : ""}`}
                            data-testid={`cell-feature-${feat}-${plan.tier}`}
                          >
                            {enabled ? (
                              <Check className="w-4 h-4 text-green-600 dark:text-green-400 mx-auto" />
                            ) : (
                              <X className="w-4 h-4 text-muted-foreground mx-auto" />
                            )}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
