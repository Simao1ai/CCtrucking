import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import {
  ArrowLeft, DollarSign, TrendingUp, TrendingDown, FileText,
  Upload, MessageCircle, Send, BarChart3, Receipt, Calendar,
  Building2, User, CheckCircle2, XCircle, Clock, Eye, SendHorizonal
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import type { BankTransaction, TransactionCategory, MonthlySummary, TaxDocument, ChatMessage } from "@shared/schema";
import { format, formatDistanceToNow } from "date-fns";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const YEARS = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

const DOC_TYPES = [
  "W-2", "1099-MISC", "1099-NEC", "1099-K", "1099-INT", "1099-DIV", "1099-R",
  "1098", "Schedule K-1", "IFTA Return", "Fuel Tax Report",
  "Mileage Log", "Expense Report", "Bank Statement", "Other",
];

function formatCurrency(value: number | string) {
  const num = typeof value === "string" ? parseFloat(value) : value;
  return `$${Math.abs(num).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function TransactionsTab({ clientId }: { clientId: string }) {
  const { toast } = useToast();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const { data: transactions = [], isLoading: loadingTx } = useQuery<BankTransaction[]>({
    queryKey: ["/api/preparer/clients", clientId, "transactions", month, year],
    queryFn: async () => {
      const res = await fetch(`/api/preparer/clients/${clientId}/transactions?month=${month}&year=${year}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch transactions");
      return res.json();
    },
    enabled: !!clientId,
  });

  const { data: categories = [] } = useQuery<TransactionCategory[]>({
    queryKey: ["/api/bookkeeping/categories"],
  });

  const updateTransaction = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { manualCategory?: string; reviewed?: boolean } }) => {
      await apiRequest("PATCH", `/api/preparer/transactions/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/preparer/clients", clientId, "transactions", month, year] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update transaction", variant: "destructive" });
    },
  });

  const totalIncome = transactions.filter(t => parseFloat(t.amount) > 0).reduce((s, t) => s + parseFloat(t.amount), 0);
  const totalExpenses = transactions.filter(t => parseFloat(t.amount) < 0).reduce((s, t) => s + Math.abs(parseFloat(t.amount)), 0);
  const reviewedCount = transactions.filter(t => t.reviewed).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={String(month)} onValueChange={(val) => setMonth(Number(val))}>
          <SelectTrigger className="w-[140px]" data-testid="select-month">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MONTHS.map((name, i) => (
              <SelectItem key={i} value={String(i + 1)}>{name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={String(year)} onValueChange={(val) => setYear(Number(val))}>
          <SelectTrigger className="w-[100px]" data-testid="select-year">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {YEARS.map(y => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground ml-auto">
          {transactions.length} transaction{transactions.length !== 1 ? "s" : ""} · {reviewedCount} reviewed
        </span>
      </div>

      {transactions.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard title="Income" value={formatCurrency(totalIncome)} icon={TrendingUp} iconColor="text-emerald-600 dark:text-emerald-400" iconBg="bg-emerald-100 dark:bg-emerald-900/40" />
          <StatCard title="Expenses" value={formatCurrency(totalExpenses)} icon={TrendingDown} iconColor="text-red-600 dark:text-red-400" iconBg="bg-red-100 dark:bg-red-900/40" />
          <StatCard title="Net Income" value={formatCurrency(totalIncome - totalExpenses)} icon={DollarSign} iconColor={totalIncome - totalExpenses >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"} iconBg={totalIncome - totalExpenses >= 0 ? "bg-emerald-100 dark:bg-emerald-900/40" : "bg-red-100 dark:bg-red-900/40"} />
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          {loadingTx ? (
            <div className="space-y-3 p-4">
              {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : transactions.length === 0 ? (
            <EmptyState icon={Receipt} title="No transactions" description={`No transactions found for ${MONTHS[month - 1]} ${year}`} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="table-transactions">
                <thead>
                  <tr className="border-b text-left bg-muted/30">
                    <th className="py-2.5 px-3 font-medium text-muted-foreground text-xs">Date</th>
                    <th className="py-2.5 px-3 font-medium text-muted-foreground text-xs">Description</th>
                    <th className="py-2.5 px-3 font-medium text-muted-foreground text-xs">Amount</th>
                    <th className="py-2.5 px-3 font-medium text-muted-foreground text-xs">Category</th>
                    <th className="py-2.5 px-3 font-medium text-muted-foreground text-xs">Reviewed</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map(tx => (
                    <tr key={tx.id} className="border-b hover:bg-muted/20 transition-colors" data-testid={`row-transaction-${tx.id}`}>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {new Date(tx.transactionDate).toLocaleDateString()}
                      </td>
                      <td className="py-2.5 px-3 max-w-[240px] truncate">
                        {tx.description}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap font-medium">
                        <span className={parseFloat(tx.amount) >= 0 ? "text-emerald-600" : "text-red-600"}>
                          {parseFloat(tx.amount) < 0 ? "-" : ""}${Math.abs(parseFloat(tx.amount)).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <Select
                          value={tx.manualCategory || tx.aiCategory || ""}
                          onValueChange={(val) => updateTransaction.mutate({ id: tx.id, data: { manualCategory: val } })}
                        >
                          <SelectTrigger className="w-[160px] h-8 text-xs" data-testid={`select-category-${tx.id}`}>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map(cat => (
                              <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {tx.aiCategory && !tx.manualCategory && (
                          <Badge variant="secondary" className="mt-1 text-[10px]">AI</Badge>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <Checkbox
                          checked={tx.reviewed}
                          onCheckedChange={(checked) => updateTransaction.mutate({ id: tx.id, data: { reviewed: !!checked } })}
                          data-testid={`checkbox-reviewed-${tx.id}`}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function taxDocStatusBadge(status: string) {
  switch (status) {
    case "ready_for_review":
      return <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800 text-xs"><Eye className="w-3 h-3 mr-1" />Sent to Client</Badge>;
    case "approved":
      return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800 text-xs"><CheckCircle2 className="w-3 h-3 mr-1" />Approved</Badge>;
    case "rejected":
      return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800 text-xs"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
    case "analyzed":
      return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800 text-xs"><CheckCircle2 className="w-3 h-3 mr-1" />Analyzed</Badge>;
    case "pending":
    default:
      return <Badge variant="secondary" className="text-xs"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
  }
}

function uploaderBadge(role?: string | null) {
  if (role === "client") return <Badge variant="outline" className="text-xs bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800"><User className="w-3 h-3 mr-1" />Client</Badge>;
  if (role === "preparer") return <Badge variant="outline" className="text-xs bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800"><User className="w-3 h-3 mr-1" />Preparer</Badge>;
  if (role === "admin" || role === "owner") return <Badge variant="outline" className="text-xs"><User className="w-3 h-3 mr-1" />Staff</Badge>;
  return <Badge variant="outline" className="text-xs"><User className="w-3 h-3 mr-1" />—</Badge>;
}

function TaxDocumentsTab({ clientId }: { clientId: string }) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [docType, setDocType] = useState("");
  const [taxYear, setTaxYear] = useState(String(new Date().getFullYear()));
  const [payerName, setPayerName] = useState("");

  const { data: docs = [], isLoading } = useQuery<TaxDocument[]>({
    queryKey: ["/api/preparer/clients", clientId, "tax-documents"],
    queryFn: async () => {
      const res = await fetch(`/api/preparer/clients/${clientId}/tax-documents`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: !!clientId,
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("taxYear", taxYear);
      formData.append("documentType", docType);
      formData.append("payerName", payerName);
      const res = await fetch(`/api/preparer/clients/${clientId}/tax-documents/upload`, {
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
      queryClient.invalidateQueries({ queryKey: ["/api/preparer/clients", clientId, "tax-documents"] });
      toast({ title: "Document uploaded" });
      setDocType("");
      setPayerName("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    onError: (e: Error) => toast({ title: "Upload failed", description: e.message, variant: "destructive" }),
  });

  const sendForReviewMutation = useMutation({
    mutationFn: async (docId: string) => {
      const res = await apiRequest("PATCH", `/api/preparer/clients/${clientId}/tax-documents/${docId}/send-for-review`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/preparer/clients", clientId, "tax-documents"] });
      toast({ title: "Sent to client for review" });
    },
    onError: (e: Error) => toast({ title: "Failed to send", description: e.message, variant: "destructive" }),
  });

  const handleUpload = () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) return toast({ title: "No file selected", variant: "destructive" });
    if (!docType) return toast({ title: "Select a document type", variant: "destructive" });
    uploadMutation.mutate(file);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Upload className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-semibold">Upload Tax Document</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Select value={docType} onValueChange={setDocType}>
              <SelectTrigger className="h-9 text-sm" data-testid="select-doc-type">
                <SelectValue placeholder="Document type..." />
              </SelectTrigger>
              <SelectContent>
                {DOC_TYPES.map(t => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={taxYear} onValueChange={setTaxYear}>
              <SelectTrigger className="h-9 text-sm" data-testid="select-tax-year">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {YEARS.map(y => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              value={payerName}
              onChange={e => setPayerName(e.target.value)}
              placeholder="Payer name (optional)"
              className="h-9 text-sm"
              data-testid="input-payer-name"
            />
            <div className="flex gap-2">
              <input
                type="file"
                ref={fileInputRef}
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx,.csv,.txt"
                className="text-sm file:mr-2 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 flex-1"
                data-testid="input-file-upload"
              />
              <Button size="sm" onClick={handleUpload} disabled={uploadMutation.isPending} className="h-9" data-testid="button-upload">
                <Upload className="w-3.5 h-3.5 mr-1" />
                Upload
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-3 p-4">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : docs.length === 0 ? (
            <EmptyState icon={FileText} title="No tax documents" description="Upload tax documents for this client to get started" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="table-tax-documents">
                <thead>
                  <tr className="border-b text-left bg-muted/30">
                    <th className="py-2.5 px-3 font-medium text-muted-foreground text-xs">Document</th>
                    <th className="py-2.5 px-3 font-medium text-muted-foreground text-xs">Type</th>
                    <th className="py-2.5 px-3 font-medium text-muted-foreground text-xs">Tax Year</th>
                    <th className="py-2.5 px-3 font-medium text-muted-foreground text-xs">Uploaded By</th>
                    <th className="py-2.5 px-3 font-medium text-muted-foreground text-xs">Status</th>
                    <th className="py-2.5 px-3 font-medium text-muted-foreground text-xs">Date</th>
                    <th className="py-2.5 px-3 font-medium text-muted-foreground text-xs">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {docs.map(doc => (
                    <tr key={doc.id} className="border-b hover:bg-muted/20 transition-colors" data-testid={`row-doc-${doc.id}`}>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <FileText className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                          <span className="font-medium truncate max-w-[200px]">{doc.fileName || "Manual Entry"}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <Badge variant="outline" className="text-xs">{doc.documentType}</Badge>
                      </td>
                      <td className="py-2.5 px-3">{doc.taxYear}</td>
                      <td className="py-2.5 px-3">{uploaderBadge(doc.uploadedByRole)}</td>
                      <td className="py-2.5 px-3">{taxDocStatusBadge(doc.status)}</td>
                      <td className="py-2.5 px-3 text-muted-foreground text-xs">
                        {doc.createdAt ? formatDistanceToNow(new Date(doc.createdAt), { addSuffix: true }) : "—"}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1">
                          {(doc.status === "pending" || doc.status === "analyzed" || doc.status === "rejected") && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => sendForReviewMutation.mutate(doc.id)}
                              disabled={sendForReviewMutation.isPending}
                              data-testid={`button-send-review-${doc.id}`}
                            >
                              <SendHorizonal className="w-3 h-3 mr-1" />
                              Send to Client
                            </Button>
                          )}
                          {doc.status === "rejected" && doc.rejectionFeedback && (
                            <span className="text-xs text-red-600 dark:text-red-400 ml-1 max-w-[150px] truncate" title={doc.rejectionFeedback} data-testid={`text-feedback-${doc.id}`}>
                              {doc.rejectionFeedback}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

interface BookkeepingSummaryData {
  hasBookkeeping: boolean;
  subscriptionStatus?: string;
  taxYear: number;
  totalIncome: number;
  totalExpenses: number;
  netIncome: number;
  transactionCount: number;
  monthsCovered: number;
  topCategories: { name: string; amount: number }[];
  monthlyBreakdown: { month: number; year: number; income: number; expenses: number; net: number }[];
}

function BookkeepingSummaryTab({ clientId }: { clientId: string }) {
  const [taxYear, setTaxYear] = useState(new Date().getFullYear());

  const { data: summary, isLoading } = useQuery<BookkeepingSummaryData>({
    queryKey: ["/api/preparer/clients", clientId, "bookkeeping-summary", taxYear],
    queryFn: async () => {
      const res = await fetch(`/api/preparer/clients/${clientId}/bookkeeping-summary?taxYear=${taxYear}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: !!clientId,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-28" />
        <div className="grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      </div>
    );
  }

  if (!summary?.hasBookkeeping) {
    return <EmptyState icon={BarChart3} title="No bookkeeping data" description="This client does not have an active bookkeeping subscription" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Select value={String(taxYear)} onValueChange={(val) => setTaxYear(Number(val))}>
          <SelectTrigger className="w-[120px]" data-testid="select-summary-year">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {YEARS.map(y => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">
          {summary.transactionCount} transactions · {summary.monthsCovered} months covered
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title="Total Income" value={formatCurrency(summary.totalIncome)} subtitle={`Tax Year ${taxYear}`} icon={TrendingUp} iconColor="text-emerald-600 dark:text-emerald-400" iconBg="bg-emerald-100 dark:bg-emerald-900/40" />
        <StatCard title="Total Expenses" value={formatCurrency(summary.totalExpenses)} subtitle={`Tax Year ${taxYear}`} icon={TrendingDown} iconColor="text-red-600 dark:text-red-400" iconBg="bg-red-100 dark:bg-red-900/40" />
        <StatCard title="Net Income" value={formatCurrency(summary.netIncome)} subtitle={summary.netIncome >= 0 ? "Profitable" : "Net loss"} icon={DollarSign} iconColor={summary.netIncome >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"} iconBg={summary.netIncome >= 0 ? "bg-emerald-100 dark:bg-emerald-900/40" : "bg-red-100 dark:bg-red-900/40"} />
      </div>

      {summary.monthlyBreakdown.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="table-monthly-breakdown">
                <thead>
                  <tr className="border-b text-left bg-muted/30">
                    <th className="py-2.5 px-3 font-medium text-muted-foreground text-xs">Month</th>
                    <th className="py-2.5 px-3 font-medium text-muted-foreground text-xs text-right">Income</th>
                    <th className="py-2.5 px-3 font-medium text-muted-foreground text-xs text-right">Expenses</th>
                    <th className="py-2.5 px-3 font-medium text-muted-foreground text-xs text-right">Net</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.monthlyBreakdown.map(m => (
                    <tr key={m.month} className="border-b hover:bg-muted/20 transition-colors">
                      <td className="py-2.5 px-3 font-medium">{MONTHS[m.month - 1]} {m.year}</td>
                      <td className="py-2.5 px-3 text-right text-emerald-600">{formatCurrency(m.income)}</td>
                      <td className="py-2.5 px-3 text-right text-red-600">{formatCurrency(m.expenses)}</td>
                      <td className="py-2.5 px-3 text-right font-medium">
                        <span className={m.net >= 0 ? "text-emerald-600" : "text-red-600"}>{formatCurrency(m.net)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {summary.topCategories.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-semibold">Top Expense/Income Categories</span>
            </div>
            <div className="space-y-2">
              {summary.topCategories.map((cat, i) => {
                const maxAmt = summary.topCategories[0]?.amount || 1;
                const pct = (cat.amount / maxAmt) * 100;
                return (
                  <div key={i} className="flex items-center gap-3" data-testid={`category-bar-${i}`}>
                    <span className="text-xs text-muted-foreground w-[140px] truncate flex-shrink-0">{cat.name}</span>
                    <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                      <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs font-medium w-[80px] text-right flex-shrink-0">{formatCurrency(cat.amount)}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function MessagesTab({ clientId }: { clientId: string }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: messages = [], isLoading } = useQuery<ChatMessage[]>({
    queryKey: ["/api/preparer/clients", clientId, "chat"],
    queryFn: async () => {
      const res = await fetch(`/api/preparer/clients/${clientId}/chat`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: !!clientId,
    refetchInterval: 5000,
  });

  const sendMessage = useMutation({
    mutationFn: async (msg: string) => {
      await apiRequest("POST", `/api/preparer/clients/${clientId}/chat`, { message: msg });
    },
    onSuccess: () => {
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ["/api/preparer/clients", clientId, "chat"] });
    },
    onError: () => toast({ title: "Failed to send message", variant: "destructive" }),
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!message.trim()) return;
    sendMessage.mutate(message.trim());
  };

  return (
    <div className="space-y-3">
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="h-[400px] overflow-y-auto p-4 space-y-3" data-testid="chat-messages">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-3/4" />)}
              </div>
            ) : messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-sm text-muted-foreground" data-testid="text-no-messages">No messages yet. Start a conversation with this client.</p>
              </div>
            ) : (
              <>
                {messages.map(msg => {
                  const isMe = msg.senderId === user?.id;
                  return (
                    <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`} data-testid={`message-${msg.id}`}>
                      <div className={`max-w-[75%] rounded-xl px-3.5 py-2.5 ${isMe ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className={`text-[10px] font-semibold ${isMe ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                            {msg.senderName}
                          </span>
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                        <p className={`text-[10px] mt-1 ${isMe ? "text-primary-foreground/50" : "text-muted-foreground/60"}`}>
                          {msg.createdAt ? formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true }) : ""}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>
          <div className="border-t p-3 flex gap-2">
            <Textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Type a message..."
              className="min-h-[40px] max-h-[100px] resize-none text-sm"
              onKeyDown={e => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              data-testid="input-chat-message"
            />
            <Button size="icon" onClick={handleSend} disabled={sendMessage.isPending || !message.trim()} data-testid="button-send-message">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function PreparerClientDetail() {
  const [, setLocation] = useLocation();
  const [matched, params] = useRoute("/preparer/client/:id");
  const clientId = params?.id || "";

  const { data: clients = [] } = useQuery<any[]>({
    queryKey: ["/api/preparer/clients"],
  });

  const client = clients.find((c: any) => c.id === clientId);

  if (!matched) return null;

  return (
    <div className="p-6 space-y-6" data-testid="page-preparer-client-detail">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/preparer")} data-testid="button-back">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold truncate" data-testid="text-page-title">
            {client?.companyName || "Client"}
          </h1>
          <p className="text-muted-foreground text-sm truncate">
            {client?.contactName && <span className="flex items-center gap-1"><User className="w-3 h-3 inline" /> {client.contactName}</span>}
          </p>
        </div>
        {client?.bookkeepingSubscription?.status && (
          <Badge variant={client.bookkeepingSubscription.status === "active" ? "default" : "secondary"}>
            Bookkeeping {client.bookkeepingSubscription.status}
          </Badge>
        )}
      </div>

      <Tabs defaultValue="transactions" className="w-full">
        <TabsList className="w-full flex h-9 gap-0.5 p-0.5" data-testid="tabs-preparer-client">
          <TabsTrigger value="transactions" className="flex-1 text-xs gap-1.5" data-testid="tab-transactions">
            <Receipt className="w-3.5 h-3.5" /> Transactions
          </TabsTrigger>
          <TabsTrigger value="tax-documents" className="flex-1 text-xs gap-1.5" data-testid="tab-tax-documents">
            <FileText className="w-3.5 h-3.5" /> Tax Documents
          </TabsTrigger>
          <TabsTrigger value="summary" className="flex-1 text-xs gap-1.5" data-testid="tab-summary">
            <BarChart3 className="w-3.5 h-3.5" /> Bookkeeping Summary
          </TabsTrigger>
          <TabsTrigger value="messages" className="flex-1 text-xs gap-1.5" data-testid="tab-messages">
            <MessageCircle className="w-3.5 h-3.5" /> Messages
          </TabsTrigger>
        </TabsList>

        <TabsContent value="transactions" className="mt-4">
          <TransactionsTab clientId={clientId} />
        </TabsContent>

        <TabsContent value="tax-documents" className="mt-4">
          <TaxDocumentsTab clientId={clientId} />
        </TabsContent>

        <TabsContent value="summary" className="mt-4">
          <BookkeepingSummaryTab clientId={clientId} />
        </TabsContent>

        <TabsContent value="messages" className="mt-4">
          <MessagesTab clientId={clientId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
