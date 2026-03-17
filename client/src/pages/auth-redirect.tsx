import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

export default function AuthRedirect() {
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      window.location.href = "/";
      return;
    }

    if (user.role === "admin" || user.role === "owner") {
      window.location.href = "/admin";
    } else {
      window.location.href = "/portal";
    }
  }, [user, isLoading]);

  return (
    <div className="flex items-center justify-center h-screen" data-testid="page-auth-redirect">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Signing you in...</p>
      </div>
    </div>
  );
}
