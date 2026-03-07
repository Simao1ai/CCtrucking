import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import type { Client, BookkeepingSubscription, BankTransaction, TransactionCategory, MonthlySummary } from "@shared/schema";
import {
  BookOpen, Search, Upload, Brain, Plus, Trash2, ArrowLeft,
  DollarSign, TrendingDown, TrendingUp, Pencil, Check, X,
  Building2, Users, ArrowRight, Receipt, BarChart3, Tags
} from "lucide-react";
import { format } from "date-fns";

interface Preparer {
  id: string;
  username: string;
  firstName: string | null;
  lastName: string | null;
}

const MONTHS = [
  { value: "1", label: "January" }, { value: "2", label: "February" },
  { value: "3", label: "March" }, { value: "4", label: "April" },
  { value: "5", label: "May" }, { value: "6", label: "June" },
  { value: "7", label: "July" }, { value: "8", label: "August" },
  { value: "9", label: "September" }, { value: "10", label: "October" },
  { value: "11", label: "November" }, { value: "12", label: "December" },
];

const YEARS = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

function formatCurrency(value: number | string) {
  const num = typeof value === "string" ? parseFloat(value) : value;
  return `$${Math.abs(num).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function ClientsTab({
  onSelectClient,
}: {
  onSelectClient: (client: Client) => void;
}) {
  const [search, setSearch] = useState("");
  const { toast } = useToast();

  const { data: clients, isLoading: clientsLoading } = useQuery<Client[]>({ queryKey: ["/api/clients"] });
  const { data: subscriptions } = useQuery<BookkeepingSubscription[]>({ queryKey: ["/api/admin/bookkeeping/subscriptions"] });
  const { data: preparers } = useQuery<Preparer[]>({ queryKey: ["/api/admin/bookkeeping/preparers"] });

  const subMap = new Map((subscriptions ?? []).map(s => [s.clientId, s]));

  const activateMutation = useMutation({
    mutationFn: async (clientId: string) => {
      const res = await apiRequest("POST", "/api/admin/bookkeeping/subscriptions", { clientId });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/bookkeeping/subscriptions"] });
      toast({ title: "Subscription activated" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await apiRequest("PATCH", `/api/admin/bookkeeping/subscriptions/${id}`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/bookkeeping/subscriptions"] });
      toast({ title: "Subscription updated" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const assignPreparerMutation = useMutation({
    mutationFn: async ({ preparerId, clientId }: { preparerId: string; clientId: string }) => {
      const res = await apiRequest("POST", "/api/admin/bookkeeping/preparer-assignments", { preparerId, clientId });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/bookkeeping/subscriptions"] });
      toast({ title: "Preparer assigned" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const filtered = (clients ?? []).filter(c =>
    search === "" || c.companyName.toLowerCase().includes(search.toLowerCase())
  );

  const activeCount = filtered.filter(c => subMap.get(c.id)?.status === "active").length;
  const inactiveCount = filtered.filter(c => !subMap.get(c.id) || subMap.get(c.id)?.status !== "active").length;

  if (clientsLoading) {
    return (
      <div className="space-y-3" data-testid="loading-clients">
        {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          title="Total Clients"
          value={filtered.length}
          icon={Users}
          iconColor="text-blue-600 dark:text-blue-400"
          iconBg="bg-blue-100 dark:bg-blue-900/40"
        />
        <StatCard
          title="Active Subscriptions"
          value={activeCount}
          subtitle={`$${(activeCount * 50).toLocaleString()}/mo revenue`}
          icon={BookOpen}
          iconColor="text-emerald-600 dark:text-emerald-400"
          iconBg="bg-emerald-100 dark:bg-emerald-900/40"
        />
        <StatCard
          title="Unsubscribed"
          value={inactiveCount}
          icon={Building2}
          iconColor="text-gray-500 dark:text-gray-400"
          iconBg="bg-gray-100 dark:bg-gray-800"
        />
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search clients..."
            className="pl-9"
            data-testid="input-search-clients"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState icon={Users} title="No clients found" description="No clients match your search" />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(client => {
            const sub = subMap.get(client.id);
            const isActive = sub?.status === "active";
            return (
              <Card key={client.id} className={`transition-colors ${isActive ? "" : "opacity-75"}`} data-testid={`row-client-${client.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${isActive ? "bg-emerald-100 dark:bg-emerald-900/40" : "bg-muted"}`}>
                      <Building2 className={`w-5 h-5 ${isActive ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          className="text-sm font-semibold hover:underline text-left"
                          onClick={() => onSelectClient(client)}
                          data-testid={`link-client-${client.id}`}
                        >
                          {client.companyName}
                        </button>
                        <StatusBadge status={isActive ? "active" : "inactive"} />
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                        {sub && <span className="font-medium">${sub.price}/mo</span>}
                        {sub?.preparerId && (
                          <span>Preparer assigned</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
                      <Select
                        value={sub?.preparerId ?? ""}
                        onValueChange={val => assignPreparerMutation.mutate({ preparerId: val, clientId: client.id })}
                      >
                        <SelectTrigger className="w-[140px] h-8 text-xs" data-testid={`select-preparer-${client.id}`}>
                          <SelectValue placeholder="Assign preparer" />
                        </SelectTrigger>
                        <SelectContent>
                          {(preparers ?? []).map(p => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.firstName && p.lastName ? `${p.firstName} ${p.lastName}` : p.username}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {!sub ? (
                        <Button
                          size="sm"
                          className="h-8 text-xs"
                          onClick={() => activateMutation.mutate(client.id)}
                          disabled={activateMutation.isPending}
                          data-testid={`button-activate-${client.id}`}
                        >
                          Activate
                        </Button>
                      ) : isActive ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs"
                          onClick={() => toggleStatusMutation.mutate({ id: sub.id, status: "inactive" })}
                          disabled={toggleStatusMutation.isPending}
                          data-testid={`button-deactivate-${client.id}`}
                        >
                          Deactivate
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          className="h-8 text-xs"
                          onClick={() => toggleStatusMutation.mutate({ id: sub.id, status: "active" })}
                          disabled={toggleStatusMutation.isPending}
                          data-testid={`button-reactivate-${client.id}`}
                        >
                          Activate
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 text-xs"
                        onClick={() => onSelectClient(client)}
                        data-testid={`button-view-detail-${client.id}`}
                      >
                        View <ArrowRight className="w-3.5 h-3.5 ml-1" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ClientDetailTab({
  client,
  onBack,
}: {
  client: Client;
  onBack: () => void;
}) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedMonth, setSelectedMonth] = useState(String(new Date().getMonth() + 1));
  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()));
  const [bankName, setBankName] = useState("");
  const [accountLast4, setAccountLast4] = useState("");

  const { data: subscription } = useQuery<BookkeepingSubscription[]>({
    queryKey: ["/api/admin/bookkeeping/subscriptions"],
    select: (subs) => subs.filter(s => s.clientId === client.id),
  });

  const isSubscribed = subscription && subscription.length > 0 && subscription[0].status === "active";

  const { data: transactions, isLoading: txLoading } = useQuery<BankTransaction[]>({
    queryKey: ["/api/admin/bookkeeping/transactions", { clientId: client.id, month: selectedMonth, year: selectedYear }],
    queryFn: async () => {
      const res = await fetch(`/api/admin/bookkeeping/transactions?clientId=${client.id}&month=${selectedMonth}&year=${selectedYear}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch transactions");
      return res.json();
    },
  });

  const { data: categories } = useQuery<TransactionCategory[]>({ queryKey: ["/api/admin/bookkeeping/categories"] });

  const { data: summaries } = useQuery<MonthlySummary[]>({
    queryKey: ["/api/admin/bookkeeping/summaries", { clientId: client.id }],
    queryFn: async () => {
      const res = await fetch(`/api/admin/bookkeeping/summaries?clientId=${client.id}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch summaries");
      return res.json();
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("month", selectedMonth);
      formData.append("year", selectedYear);
      formData.append("bankName", bankName);
      formData.append("accountLast4", accountLast4);
      const res = await fetch(`/api/admin/bookkeeping/upload-statement/${client.id}`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Upload failed" }));
        throw new Error(err.message);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/bookkeeping/transactions"] });
      toast({ title: "Statement uploaded", description: "Bank statement has been processed." });
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    onError: (e: Error) => toast({ title: "Upload failed", description: e.message, variant: "destructive" }),
  });

  const aiCategorizeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/admin/bookkeeping/ai-categorize/${client.id}`, {
        month: parseInt(selectedMonth),
        year: parseInt(selectedYear),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/bookkeeping/transactions"] });
      toast({ title: "AI categorization complete" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateTransactionMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: string; manualCategory?: string; reviewed?: boolean }) => {
      const res = await apiRequest("PATCH", `/api/admin/bookkeeping/transactions/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/bookkeeping/transactions"] });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const generateSummaryMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/admin/bookkeeping/generate-summary/${client.id}`, {
        month: parseInt(selectedMonth),
        year: parseInt(selectedYear),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/bookkeeping/summaries"] });
      toast({ title: "Summary generated" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const currentSummary = (summaries ?? []).find(
    s => s.month === parseInt(selectedMonth) && s.year === parseInt(selectedYear)
  );

  let categoryBreakdown: Record<string, number> = {};
  if (currentSummary?.categoryBreakdown) {
    try { categoryBreakdown = JSON.parse(currentSummary.categoryBreakdown); } catch {}
  }

  const txList = transactions ?? [];
  const totalIncome = txList.filter(t => parseFloat(t.amount) > 0).reduce((sum, t) => sum + parseFloat(t.amount), 0);
  const totalExpenses = txList.filter(t => parseFloat(t.amount) < 0).reduce((sum, t) => sum + Math.abs(parseFloat(t.amount)), 0);
  const reviewedCount = txList.filter(t => t.reviewed).length;

  const monthLabel = MONTHS.find(m => m.value === selectedMonth)?.label ?? "";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <button onClick={onBack} className="hover:text-foreground transition-colors flex items-center gap-1" data-testid="button-back-to-clients">
          <ArrowLeft className="w-3.5 h-3.5" /> Bookkeeping
        </button>
        <span>/</span>
        <span className="font-medium text-foreground" data-testid="text-client-name">{client.companyName}</span>
        {isSubscribed ? (
          <StatusBadge status="active" />
        ) : (
          <StatusBadge status="inactive" label="No Subscription" />
        )}
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-[140px]" data-testid="select-month">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MONTHS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={selectedYear} onValueChange={setSelectedYear}>
          <SelectTrigger className="w-[100px]" data-testid="select-year">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {YEARS.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground ml-auto">
          {txList.length} transaction{txList.length !== 1 ? "s" : ""} · {reviewedCount} reviewed
        </span>
      </div>

      {txList.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard
            title="Income"
            value={formatCurrency(totalIncome)}
            subtitle={`${monthLabel} ${selectedYear}`}
            icon={TrendingUp}
            iconColor="text-emerald-600 dark:text-emerald-400"
            iconBg="bg-emerald-100 dark:bg-emerald-900/40"
          />
          <StatCard
            title="Expenses"
            value={formatCurrency(totalExpenses)}
            subtitle={`${monthLabel} ${selectedYear}`}
            icon={TrendingDown}
            iconColor="text-red-600 dark:text-red-400"
            iconBg="bg-red-100 dark:bg-red-900/40"
          />
          <StatCard
            title="Net Income"
            value={formatCurrency(totalIncome - totalExpenses)}
            subtitle={totalIncome - totalExpenses >= 0 ? "Profitable" : "Net loss"}
            icon={DollarSign}
            iconColor={totalIncome - totalExpenses >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}
            iconBg={totalIncome - totalExpenses >= 0 ? "bg-emerald-100 dark:bg-emerald-900/40" : "bg-red-100 dark:bg-red-900/40"}
          />
        </div>
      )}

      <Card data-testid="card-upload-statement">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Upload className="w-4 h-4" /> Upload Bank Statement
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Bank Name</label>
              <Input
                value={bankName}
                onChange={e => setBankName(e.target.value)}
                placeholder="e.g. Chase, Wells Fargo"
                className="mt-1.5"
                data-testid="input-bank-name"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Account Last 4</label>
              <Input
                value={accountLast4}
                onChange={e => setAccountLast4(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="1234"
                className="mt-1.5"
                maxLength={4}
                data-testid="input-account-last4"
              />
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:text-primary-foreground"
              data-testid="input-csv-upload"
            />
            <Button
              onClick={() => {
                const file = fileInputRef.current?.files?.[0];
                if (file) uploadMutation.mutate(file);
              }}
              disabled={uploadMutation.isPending}
              data-testid="button-upload-statement"
            >
              <Upload className="w-4 h-4 mr-1" />
              {uploadMutation.isPending ? "Uploading..." : "Upload"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card data-testid="card-transactions">
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Receipt className="w-4 h-4" /> Transactions
          </CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={() => aiCategorizeMutation.mutate()}
            disabled={aiCategorizeMutation.isPending}
            data-testid="button-ai-categorize"
          >
            <Brain className="w-4 h-4 mr-1" />
            {aiCategorizeMutation.isPending ? "Processing..." : "AI Categorize"}
          </Button>
        </CardHeader>
        <CardContent>
          {txLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : txList.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="No transactions for this period"
              description="Upload a bank statement to get started"
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">AI Conf.</TableHead>
                    <TableHead>Reviewed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {txList.map(tx => {
                    const amt = parseFloat(tx.amount);
                    const currentCategory = tx.manualCategory || tx.aiCategory || "";
                    const isDebit = amt < 0;
                    return (
                      <TableRow key={tx.id} className={isDebit ? "" : "bg-emerald-50/30 dark:bg-emerald-950/10"} data-testid={`row-transaction-${tx.id}`}>
                        <TableCell className="text-sm whitespace-nowrap">
                          {tx.transactionDate ? format(new Date(tx.transactionDate), "MM/dd/yyyy") : "—"}
                        </TableCell>
                        <TableCell className="text-sm max-w-[200px] truncate" data-testid={`text-tx-desc-${tx.id}`}>
                          {tx.description}
                        </TableCell>
                        <TableCell className={`text-sm text-right font-semibold ${isDebit ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`} data-testid={`text-tx-amount-${tx.id}`}>
                          {isDebit ? "-" : "+"}{formatCurrency(amt)}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={currentCategory}
                            onValueChange={val => updateTransactionMutation.mutate({ id: tx.id, manualCategory: val })}
                          >
                            <SelectTrigger className="w-[150px] h-8 text-xs" data-testid={`select-category-${tx.id}`}>
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                              {(categories ?? []).map(cat => (
                                <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-sm text-right text-muted-foreground" data-testid={`text-tx-confidence-${tx.id}`}>
                          {tx.aiConfidence ? `${parseFloat(tx.aiConfidence).toFixed(0)}%` : "—"}
                        </TableCell>
                        <TableCell>
                          <Checkbox
                            checked={tx.reviewed}
                            onCheckedChange={checked => updateTransactionMutation.mutate({ id: tx.id, reviewed: !!checked })}
                            data-testid={`checkbox-reviewed-${tx.id}`}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card data-testid="card-monthly-summary">
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <BarChart3 className="w-4 h-4" /> Monthly Summary
          </CardTitle>
          <Button
            size="sm"
            onClick={() => generateSummaryMutation.mutate()}
            disabled={generateSummaryMutation.isPending}
            data-testid="button-generate-summary"
          >
            {generateSummaryMutation.isPending ? "Generating..." : "Generate Summary"}
          </Button>
        </CardHeader>
        <CardContent>
          {currentSummary ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatCard
                  title="Income"
                  value={formatCurrency(currentSummary.totalIncome)}
                  icon={TrendingUp}
                  iconColor="text-emerald-600 dark:text-emerald-400"
                  iconBg="bg-emerald-100 dark:bg-emerald-900/40"
                />
                <StatCard
                  title="Expenses"
                  value={formatCurrency(currentSummary.totalExpenses)}
                  icon={TrendingDown}
                  iconColor="text-red-600 dark:text-red-400"
                  iconBg="bg-red-100 dark:bg-red-900/40"
                />
                <StatCard
                  title="Net Income"
                  value={formatCurrency(currentSummary.netIncome)}
                  icon={DollarSign}
                  iconColor="text-blue-600 dark:text-blue-400"
                  iconBg="bg-blue-100 dark:bg-blue-900/40"
                />
              </div>

              {Object.keys(categoryBreakdown).length > 0 && (
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                    <Tags className="w-4 h-4" /> Category Breakdown
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2" data-testid="section-category-breakdown">
                    {Object.entries(categoryBreakdown).map(([cat, amt]) => (
                      <div key={cat} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 text-sm border">
                        <span className="truncate mr-2 text-xs font-medium">{cat}</span>
                        <span className="font-semibold text-xs whitespace-nowrap">{formatCurrency(amt)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <EmptyState
              icon={BarChart3}
              title="No summary for this period"
              description="Generate a summary to see income, expenses, and category breakdowns"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function CategoriesTab() {
  const { toast } = useToast();
  const [newCatName, setNewCatName] = useState("");
  const [newCatDescription, setNewCatDescription] = useState("");
  const [newCatParent, setNewCatParent] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");

  const { data: categories, isLoading } = useQuery<TransactionCategory[]>({ queryKey: ["/api/admin/bookkeeping/categories"] });

  const addMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/bookkeeping/categories", {
        name: newCatName,
        description: newCatDescription || null,
        parentCategory: newCatParent || null,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/bookkeeping/categories"] });
      setNewCatName("");
      setNewCatDescription("");
      setNewCatParent("");
      toast({ title: "Category added" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, name, description }: { id: string; name: string; description: string }) => {
      const res = await apiRequest("PATCH", `/api/admin/bookkeeping/categories/${id}`, { name, description: description || null });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/bookkeeping/categories"] });
      setEditingId(null);
      toast({ title: "Category updated" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/admin/bookkeeping/categories/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/bookkeeping/categories"] });
      toast({ title: "Category deleted" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-4">
      <Card data-testid="card-add-category">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Category
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-3 flex-wrap">
            <div className="flex-1 min-w-[150px]">
              <label className="text-sm font-medium">Name</label>
              <Input
                value={newCatName}
                onChange={e => setNewCatName(e.target.value)}
                placeholder="Category name"
                className="mt-1.5"
                data-testid="input-new-category-name"
              />
            </div>
            <div className="flex-1 min-w-[150px]">
              <label className="text-sm font-medium">Description</label>
              <Input
                value={newCatDescription}
                onChange={e => setNewCatDescription(e.target.value)}
                placeholder="Optional description"
                className="mt-1.5"
                data-testid="input-new-category-desc"
              />
            </div>
            <div className="flex-1 min-w-[150px]">
              <label className="text-sm font-medium">Parent Category</label>
              <Input
                value={newCatParent}
                onChange={e => setNewCatParent(e.target.value)}
                placeholder="Optional parent"
                className="mt-1.5"
                data-testid="input-new-category-parent"
              />
            </div>
            <Button
              onClick={() => addMutation.mutate()}
              disabled={addMutation.isPending || !newCatName.trim()}
              data-testid="button-add-category"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card data-testid="card-categories-list">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Parent</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4}>
                  <Skeleton className="h-8 w-full" />
                </TableCell>
              </TableRow>
            ) : (categories ?? []).length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                  No categories yet
                </TableCell>
              </TableRow>
            ) : (
              (categories ?? []).map(cat => (
                <TableRow key={cat.id} data-testid={`row-category-${cat.id}`}>
                  <TableCell>
                    {editingId === cat.id ? (
                      <Input
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        className="w-[150px]"
                        data-testid={`input-edit-name-${cat.id}`}
                      />
                    ) : (
                      <span className="text-sm font-medium" data-testid={`text-category-name-${cat.id}`}>{cat.name}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === cat.id ? (
                      <Input
                        value={editDescription}
                        onChange={e => setEditDescription(e.target.value)}
                        className="w-[200px]"
                        data-testid={`input-edit-desc-${cat.id}`}
                      />
                    ) : (
                      <span className="text-sm text-muted-foreground">{cat.description || "—"}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {cat.parentCategory || "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {editingId === cat.id ? (
                        <>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => updateMutation.mutate({ id: cat.id, name: editName, description: editDescription })}
                            disabled={updateMutation.isPending}
                            data-testid={`button-save-category-${cat.id}`}
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setEditingId(null)}
                            data-testid={`button-cancel-edit-${cat.id}`}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              setEditingId(cat.id);
                              setEditName(cat.name);
                              setEditDescription(cat.description || "");
                            }}
                            data-testid={`button-edit-category-${cat.id}`}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => deleteMutation.mutate(cat.id)}
                            disabled={deleteMutation.isPending}
                            data-testid={`button-delete-category-${cat.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

export default function AdminBookkeeping() {
  const [activeTab, setActiveTab] = useState("clients");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  const handleSelectClient = (client: Client) => {
    setSelectedClient(client);
    setActiveTab("detail");
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto" data-testid="page-admin-bookkeeping">
      <PageHeader
        title="Bookkeeping"
        description="Manage client bookkeeping subscriptions, transactions, and categories"
      />

      <Tabs value={activeTab} onValueChange={v => {
        if (v === "clients") setSelectedClient(null);
        setActiveTab(v);
      }}>
        <TabsList data-testid="tabs-bookkeeping">
          <TabsTrigger value="clients" data-testid="tab-clients">
            Clients & Subscriptions
          </TabsTrigger>
          {selectedClient && (
            <TabsTrigger value="detail" data-testid="tab-detail">
              {selectedClient.companyName}
            </TabsTrigger>
          )}
          <TabsTrigger value="categories" data-testid="tab-categories">
            Categories
          </TabsTrigger>
        </TabsList>

        <TabsContent value="clients" className="mt-4">
          <ClientsTab onSelectClient={handleSelectClient} />
        </TabsContent>

        <TabsContent value="detail" className="mt-4">
          {selectedClient && (
            <ClientDetailTab
              client={selectedClient}
              onBack={() => {
                setSelectedClient(null);
                setActiveTab("clients");
              }}
            />
          )}
        </TabsContent>

        <TabsContent value="categories" className="mt-4">
          <CategoriesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
