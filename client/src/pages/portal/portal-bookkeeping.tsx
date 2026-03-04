import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { BookOpen, Upload, TrendingUp, TrendingDown, DollarSign, AlertCircle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import type { BookkeepingSubscription, BankTransaction, MonthlySummary } from "@shared/schema";

const MONTHS = [
  { value: "1", label: "January" },
  { value: "2", label: "February" },
  { value: "3", label: "March" },
  { value: "4", label: "April" },
  { value: "5", label: "May" },
  { value: "6", label: "June" },
  { value: "7", label: "July" },
  { value: "8", label: "August" },
  { value: "9", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => String(currentYear - i));

export default function PortalBookkeeping() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const now = new Date();
  const [filterMonth, setFilterMonth] = useState(String(now.getMonth() + 1));
  const [filterYear, setFilterYear] = useState(String(now.getFullYear()));
  const [uploadMonth, setUploadMonth] = useState(String(now.getMonth() + 1));
  const [uploadYear, setUploadYear] = useState(String(now.getFullYear()));
  const [bankName, setBankName] = useState("");
  const [accountLast4, setAccountLast4] = useState("");

  const { data: subscription, isLoading: loadingSub } = useQuery<BookkeepingSubscription | null>({
    queryKey: ["/api/portal/bookkeeping/subscription"],
  });

  const isActive = subscription?.status === "active";

  const { data: transactions = [], isLoading: loadingTx } = useQuery<BankTransaction[]>({
    queryKey: ["/api/portal/bookkeeping/transactions", filterMonth, filterYear],
    queryFn: async () => {
      const res = await fetch(`/api/portal/bookkeeping/transactions?month=${filterMonth}&year=${filterYear}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch transactions");
      return res.json();
    },
    enabled: isActive,
  });

  const { data: summaries = [], isLoading: loadingSummaries } = useQuery<MonthlySummary[]>({
    queryKey: ["/api/portal/bookkeeping/summaries"],
    enabled: isActive,
  });

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await fetch("/api/portal/bookkeeping/upload-statement", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Upload failed");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/portal/bookkeeping/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portal/bookkeeping/summaries"] });
      toast({ title: "Statement uploaded", description: "Your bank statement has been uploaded for processing." });
      setBankName("");
      setAccountLast4("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    onError: (err: Error) => {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    },
  });

  const handleUpload = () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      toast({ title: "No file selected", description: "Please select a CSV file to upload.", variant: "destructive" });
      return;
    }
    const formData = new FormData();
    formData.append("file", file);
    formData.append("month", uploadMonth);
    formData.append("year", uploadYear);
    formData.append("bankName", bankName);
    formData.append("accountLast4", accountLast4);
    uploadMutation.mutate(formData);
  };

  const chartData = summaries.map((s) => ({
    name: `${MONTHS.find((m) => m.value === String(s.month))?.label?.slice(0, 3) || s.month} ${s.year}`,
    Income: parseFloat(String(s.totalIncome)),
    Expenses: parseFloat(String(s.totalExpenses)),
    Net: parseFloat(String(s.netIncome)),
  }));

  return (
    <div className="p-6 space-y-6" data-testid="page-portal-bookkeeping">
      <div>
        <h1 className="text-2xl font-bold">Bookkeeping</h1>
        <p className="text-muted-foreground">Manage your bank statements and view financial summaries</p>
      </div>

      {loadingSub ? (
        <Skeleton className="h-24 w-full" data-testid="skeleton-subscription" />
      ) : !subscription ? (
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium" data-testid="text-no-subscription">No bookkeeping subscription</p>
            <p className="text-sm text-muted-foreground mt-1">Contact us to get started with bookkeeping services.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card data-testid="card-subscription">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                Subscription
              </CardTitle>
              <Badge
                variant={subscription.status === "active" ? "default" : "secondary"}
                data-testid="badge-subscription-status"
              >
                {subscription.status}
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6 flex-wrap">
                <div>
                  <span className="text-sm text-muted-foreground">Plan</span>
                  <p className="font-medium capitalize" data-testid="text-subscription-plan">{subscription.plan}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Price</span>
                  <p className="font-medium" data-testid="text-subscription-price">${parseFloat(String(subscription.price)).toFixed(2)}/mo</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Start Date</span>
                  <p className="font-medium" data-testid="text-subscription-start">
                    {subscription.startDate ? new Date(subscription.startDate).toLocaleDateString() : "N/A"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {isActive && (
            <Card data-testid="card-upload-statement">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Upload className="w-5 h-5" />
                  Upload Bank Statement
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="csv-file">CSV File</Label>
                    <Input
                      id="csv-file"
                      type="file"
                      accept=".csv"
                      ref={fileInputRef}
                      data-testid="input-csv-file"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Month / Year</Label>
                    <div className="flex gap-2">
                      <Select value={uploadMonth} onValueChange={setUploadMonth}>
                        <SelectTrigger data-testid="select-upload-month">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {MONTHS.map((m) => (
                            <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={uploadYear} onValueChange={setUploadYear}>
                        <SelectTrigger data-testid="select-upload-year">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {YEARS.map((y) => (
                            <SelectItem key={y} value={y}>{y}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bank-name">Bank Name</Label>
                    <Input
                      id="bank-name"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      placeholder="e.g. Chase"
                      data-testid="input-bank-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="account-last4">Account Last 4</Label>
                    <Input
                      id="account-last4"
                      value={accountLast4}
                      onChange={(e) => setAccountLast4(e.target.value.replace(/\D/g, "").slice(0, 4))}
                      placeholder="1234"
                      maxLength={4}
                      data-testid="input-account-last4"
                    />
                  </div>
                </div>
                <Button
                  className="mt-4"
                  onClick={handleUpload}
                  disabled={uploadMutation.isPending}
                  data-testid="button-upload-statement"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {uploadMutation.isPending ? "Uploading..." : "Upload Statement"}
                </Button>
              </CardContent>
            </Card>
          )}

          {isActive && (
            <Card data-testid="card-transactions">
              <CardHeader>
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <CardTitle className="text-lg">Transactions</CardTitle>
                  <div className="flex gap-2">
                    <Select value={filterMonth} onValueChange={setFilterMonth}>
                      <SelectTrigger className="w-[140px]" data-testid="select-filter-month">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MONTHS.map((m) => (
                          <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={filterYear} onValueChange={setFilterYear}>
                      <SelectTrigger className="w-[100px]" data-testid="select-filter-year">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {YEARS.map((y) => (
                          <SelectItem key={y} value={y}>{y}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loadingTx ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-10 w-full" />
                    ))}
                  </div>
                ) : transactions.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8" data-testid="text-no-transactions">
                    No transactions found for this period.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm" data-testid="table-transactions">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left p-2 font-medium">Date</th>
                          <th className="text-left p-2 font-medium">Description</th>
                          <th className="text-right p-2 font-medium">Amount</th>
                          <th className="text-left p-2 font-medium">Category</th>
                          <th className="text-right p-2 font-medium">AI Confidence</th>
                        </tr>
                      </thead>
                      <tbody>
                        {transactions.map((tx) => (
                          <tr key={tx.id} className="border-t" data-testid={`row-transaction-${tx.id}`}>
                            <td className="p-2">
                              {tx.transactionDate ? new Date(tx.transactionDate).toLocaleDateString() : "N/A"}
                            </td>
                            <td className="p-2">{tx.description}</td>
                            <td className={`p-2 text-right font-medium ${parseFloat(String(tx.amount)) >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                              ${Math.abs(parseFloat(String(tx.amount))).toFixed(2)}
                            </td>
                            <td className="p-2">
                              <Badge variant="secondary">
                                {tx.manualCategory || tx.aiCategory || tx.originalCategory || "Uncategorized"}
                              </Badge>
                            </td>
                            <td className="p-2 text-right">
                              {tx.aiConfidence ? `${parseFloat(String(tx.aiConfidence)).toFixed(0)}%` : "-"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {isActive && (
            <>
              <div>
                <h2 className="text-xl font-bold mb-4">Monthly Summaries</h2>
                {loadingSummaries ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-32 w-full" />
                    ))}
                  </div>
                ) : summaries.length === 0 ? (
                  <Card>
                    <CardContent className="py-8 text-center">
                      <p className="text-sm text-muted-foreground" data-testid="text-no-summaries">No monthly summaries available yet.</p>
                    </CardContent>
                  </Card>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {summaries.map((s) => {
                        const monthLabel = MONTHS.find((m) => m.value === String(s.month))?.label || String(s.month);
                        return (
                          <Card key={s.id} data-testid={`card-summary-${s.id}`}>
                            <CardHeader className="pb-2">
                              <CardTitle className="text-sm font-medium text-muted-foreground">
                                {monthLabel} {s.year}
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="flex items-center gap-1 text-sm">
                                  <TrendingUp className="w-4 h-4 text-green-500" /> Income
                                </span>
                                <span className="font-medium text-green-600 dark:text-green-400" data-testid={`text-income-${s.id}`}>
                                  ${parseFloat(String(s.totalIncome)).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="flex items-center gap-1 text-sm">
                                  <TrendingDown className="w-4 h-4 text-red-500" /> Expenses
                                </span>
                                <span className="font-medium text-red-600 dark:text-red-400" data-testid={`text-expenses-${s.id}`}>
                                  ${parseFloat(String(s.totalExpenses)).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                              <div className="flex items-center justify-between border-t pt-2">
                                <span className="flex items-center gap-1 text-sm font-medium">
                                  <DollarSign className="w-4 h-4" /> Net
                                </span>
                                <span
                                  className={`font-bold ${parseFloat(String(s.netIncome)) >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
                                  data-testid={`text-net-${s.id}`}
                                >
                                  ${parseFloat(String(s.netIncome)).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>

                    {chartData.length > 0 && (
                      <Card className="mt-4" data-testid="card-monthly-chart">
                        <CardHeader>
                          <CardTitle className="text-lg">Monthly Overview</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={chartData}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="name" />
                              <YAxis />
                              <Tooltip formatter={(value: number) => `$${value.toLocaleString("en-US", { minimumFractionDigits: 2 })}`} />
                              <Legend />
                              <Bar dataKey="Income" fill="hsl(142, 71%, 45%)" />
                              <Bar dataKey="Expenses" fill="hsl(0, 84%, 60%)" />
                              <Bar dataKey="Net" fill="hsl(221, 83%, 53%)" />
                            </BarChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>
                    )}
                  </>
                )}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}