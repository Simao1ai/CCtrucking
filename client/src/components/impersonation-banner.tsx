import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Shield, X } from "lucide-react";

export function useIsImpersonating() {
  const { data: status } = useQuery<{
    impersonating: boolean;
    tenantName?: string;
    tenantId?: string;
  }>({
    queryKey: ["/api/platform/impersonation-status"],
    refetchInterval: 30000,
  });
  return status?.impersonating ?? false;
}

export function ImpersonationBanner() {
  const { data: status } = useQuery<{
    impersonating: boolean;
    tenantName?: string;
    tenantId?: string;
  }>({
    queryKey: ["/api/platform/impersonation-status"],
    refetchInterval: 30000,
  });

  const stopMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/platform/stop-impersonation");
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      window.location.href = "/platform";
    },
  });

  if (!status?.impersonating) return null;

  return (
    <div
      className="sticky top-0 z-50 bg-amber-500 text-black px-4 py-2 flex items-center justify-between shadow-md shrink-0"
      data-testid="impersonation-banner"
    >
      <div className="flex items-center gap-2 min-w-0">
        <Shield className="h-4 w-4 shrink-0" />
        <span className="text-sm font-medium truncate">
          Impersonating: <strong>{status.tenantName || status.tenantId}</strong>
        </span>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="h-7 bg-white/20 border-black/20 hover:bg-white/40 text-black shrink-0"
        onClick={() => stopMutation.mutate()}
        disabled={stopMutation.isPending}
        data-testid="button-stop-impersonation"
      >
        <X className="h-3 w-3 mr-1" />
        <span className="hidden sm:inline">Stop Impersonation</span>
        <span className="sm:hidden">Stop</span>
      </Button>
    </div>
  );
}
