import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, DollarSign, TrendingUp, TrendingDown } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { BankTransaction, TransactionCategory, MonthlySummary } from "@shared/schema";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function PreparerClientDetail() {
  const [, setLocation] = useLocation();
  const [matched, params] = useRoute("/preparer/client/:id");
  const clientId = params?.id || "";
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

  const { data: summaries = [], isLoading: loadingSummaries } = useQuery<MonthlySummary[]>({
    queryKey: ["/api/preparer/clients", clientId, "summaries"],
    queryFn: async () => {
      const res = await fetch(`/api/preparer/clients/${clientId}/summaries`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch summaries");
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
      toast({ title: "Updated", description: "Transaction updated successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update transaction", variant: "destructive" });
    },
  });

  const currentYears = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);

  if (!matched) return null;

  return (
    <div className="p-6 space-y-6" data-testid="page-preparer-client-detail">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/preparer")} data-testid="button-back">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Client Bookkeeping</h1>
          <p className="text-muted-foreground text-sm">Review and categorize transactions</p>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <Select value={String(month)} onValueChange={(val) => setMonth(Number(val))}>
          <SelectTrigger className="w-40" data-testid="select-month">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MONTHS.map((name, i) => (
              <SelectItem key={i} value={String(i + 1)} data-testid={`option-month-${i + 1}`}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={String(year)} onValueChange={(val) => setYear(Number(val))}>
          <SelectTrigger className="w-28" data-testid="select-year">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {currentYears.map(y => (
              <SelectItem key={y} value={String(y)} data-testid={`option-year-${y}`}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loadingSummaries ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      ) : summaries.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {summaries.slice(0, 3).map(summary => (
            <Card key={summary.id} data-testid={`card-summary-${summary.id}`}>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {MONTHS[(summary.month || 1) - 1]} {summary.year}
                </CardTitle>
                <DollarSign className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm">
                    <TrendingUp className="w-3 h-3 text-green-500" />
                    <span className="text-muted-foreground">Income:</span>
                    <span className="font-medium" data-testid={`text-income-${summary.id}`}>
                      ${parseFloat(summary.totalIncome).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <TrendingDown className="w-3 h-3 text-red-500" />
                    <span className="text-muted-foreground">Expenses:</span>
                    <span className="font-medium" data-testid={`text-expenses-${summary.id}`}>
                      ${parseFloat(summary.totalExpenses).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm pt-1 border-t">
                    <span className="text-muted-foreground">Net:</span>
                    <span className="font-semibold" data-testid={`text-net-${summary.id}`}>
                      ${parseFloat(summary.netIncome).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Transactions - {MONTHS[month - 1]} {year}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingTx ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8" data-testid="text-no-transactions">
              No transactions found for this period.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="table-transactions">
                <thead>
                  <tr className="border-b text-left">
                    <th className="py-2 pr-3 font-medium text-muted-foreground">Date</th>
                    <th className="py-2 pr-3 font-medium text-muted-foreground">Description</th>
                    <th className="py-2 pr-3 font-medium text-muted-foreground">Amount</th>
                    <th className="py-2 pr-3 font-medium text-muted-foreground">Category</th>
                    <th className="py-2 pr-3 font-medium text-muted-foreground">Reviewed</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map(tx => (
                    <tr key={tx.id} className="border-b" data-testid={`row-transaction-${tx.id}`}>
                      <td className="py-2 pr-3 whitespace-nowrap" data-testid={`text-date-${tx.id}`}>
                        {new Date(tx.transactionDate).toLocaleDateString()}
                      </td>
                      <td className="py-2 pr-3" data-testid={`text-description-${tx.id}`}>
                        {tx.description}
                      </td>
                      <td className="py-2 pr-3 whitespace-nowrap" data-testid={`text-amount-${tx.id}`}>
                        <span className={parseFloat(tx.amount) >= 0 ? "text-green-600" : "text-red-600"}>
                          ${Math.abs(parseFloat(tx.amount)).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="py-2 pr-3">
                        <Select
                          value={tx.manualCategory || tx.aiCategory || ""}
                          onValueChange={(val) => {
                            updateTransaction.mutate({ id: tx.id, data: { manualCategory: val } });
                          }}
                        >
                          <SelectTrigger className="w-40" data-testid={`select-category-${tx.id}`}>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map(cat => (
                              <SelectItem key={cat.id} value={cat.name} data-testid={`option-category-${cat.id}`}>
                                {cat.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {tx.aiCategory && !tx.manualCategory && (
                          <Badge variant="secondary" className="mt-1 text-xs">
                            AI: {tx.aiCategory}
                          </Badge>
                        )}
                      </td>
                      <td className="py-2 pr-3">
                        <Checkbox
                          checked={tx.reviewed}
                          onCheckedChange={(checked) => {
                            updateTransaction.mutate({ id: tx.id, data: { reviewed: !!checked } });
                          }}
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
