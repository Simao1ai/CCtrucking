import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { Cpu, Zap, Hash, TrendingUp } from "lucide-react";

interface AIUsageData {
  totals: { totalTokens: string; promptTokens: string; completionTokens: string; requestCount: number };
  perFeature: { feature: string; totalTokens: string; count: number }[];
  perTenant: { tenantId: string; totalTokens: string; count: number }[];
  dailyTrend: { date: string; totalTokens: string; count: number }[];
}

export default function PlatformAIUsage() {
  const { data: aiUsage, isLoading } = useQuery<AIUsageData>({
    queryKey: ["/api/platform/ai-usage"],
  });

  const totalTokens = parseInt(aiUsage?.totals?.totalTokens ?? "0", 10);
  const promptTokens = parseInt(aiUsage?.totals?.promptTokens ?? "0", 10);
  const completionTokens = parseInt(aiUsage?.totals?.completionTokens ?? "0", 10);
  const requestCount = aiUsage?.totals?.requestCount ?? 0;

  const byFeature = (aiUsage?.perFeature ?? []).map(f => ({
    feature: f.feature,
    tokens: parseInt(f.totalTokens ?? "0", 10),
    count: f.count,
  }));

  const byTenant = (aiUsage?.perTenant ?? []).map(t => ({
    tenantId: t.tenantId || "unknown",
    tokens: parseInt(t.totalTokens ?? "0", 10),
    count: t.count,
  }));

  const dailyTrend = (aiUsage?.dailyTrend ?? []).map(d => ({
    date: d.date,
    tokens: parseInt(d.totalTokens ?? "0", 10),
    count: d.count,
  }));

  const maxFeatureTokens = byFeature.length
    ? Math.max(...byFeature.map((f) => f.tokens))
    : 1;

  const maxTenantTokens = byTenant.length
    ? Math.max(...byTenant.map((t) => t.tokens))
    : 1;

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-[1400px] mx-auto" data-testid="page-platform-ai-usage">
      <PageHeader
        title="AI Usage"
        description="Token consumption across features and tenants"
        icon={<Cpu className="w-5 h-5 text-muted-foreground" />}
      />

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4" data-testid="section-ai-summary-cards">
        <Card data-testid="card-total-tokens">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Tokens</CardTitle>
            <Zap className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" data-testid="skeleton-total-tokens" />
            ) : (
              <div className="text-2xl font-bold" data-testid="value-total-tokens">{totalTokens.toLocaleString()}</div>
            )}
          </CardContent>
        </Card>
        <Card data-testid="card-prompt-tokens">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Prompt Tokens</CardTitle>
            <Zap className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" data-testid="skeleton-prompt-tokens" />
            ) : (
              <div className="text-2xl font-bold" data-testid="value-prompt-tokens">{promptTokens.toLocaleString()}</div>
            )}
          </CardContent>
        </Card>
        <Card data-testid="card-completion-tokens">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Completion Tokens</CardTitle>
            <Zap className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" data-testid="skeleton-completion-tokens" />
            ) : (
              <div className="text-2xl font-bold" data-testid="value-completion-tokens">{completionTokens.toLocaleString()}</div>
            )}
          </CardContent>
        </Card>
        <Card data-testid="card-request-count">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Requests</CardTitle>
            <Hash className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" data-testid="skeleton-request-count" />
            ) : (
              <div className="text-2xl font-bold" data-testid="value-request-count">{requestCount.toLocaleString()}</div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card data-testid="card-daily-trend">
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
            Daily Token Usage
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-[300px] w-full" data-testid="skeleton-daily-trend" />
          ) : dailyTrend.length > 0 ? (
            <div data-testid="chart-daily-trend">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dailyTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => v.toLocaleString()} />
                  <Tooltip formatter={(value: number) => value.toLocaleString()} />
                  <Bar dataKey="tokens" fill="hsl(215, 70%, 50%)" name="Tokens" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8" data-testid="text-no-daily-trend">No daily trend data available</p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card data-testid="card-ai-by-feature">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Usage by Feature</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-10 w-full" data-testid={`skeleton-feature-${i}`} />
                ))}
              </div>
            ) : byFeature.length > 0 ? (
              <div className="space-y-3" data-testid="ai-feature-list">
                {byFeature.map((f, i) => (
                  <div key={f.feature} data-testid={`ai-feature-${i}`}>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-sm truncate">{f.feature}</span>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">{f.tokens.toLocaleString()} tokens</span>
                    </div>
                    <Progress
                      value={(f.tokens / maxFeatureTokens) * 100}
                      className="h-2"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8" data-testid="text-no-feature-data">No feature usage data</p>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-ai-by-tenant">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Usage by Tenant</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-10 w-full" data-testid={`skeleton-tenant-${i}`} />
                ))}
              </div>
            ) : byTenant.length > 0 ? (
              <div className="space-y-3" data-testid="ai-tenant-list">
                {byTenant.map((t, i) => (
                  <div key={t.tenantId} data-testid={`ai-tenant-${i}`}>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-sm truncate">{t.tenantId}</span>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">{t.tokens.toLocaleString()} tokens</span>
                    </div>
                    <Progress
                      value={(t.tokens / maxTenantTokens) * 100}
                      className="h-2"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8" data-testid="text-no-tenant-data">No tenant usage data</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}