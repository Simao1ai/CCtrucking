import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Truck, Loader2, AlertCircle } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { queryClient } from "@/lib/queryClient";

export default function Login() {
  const [, setLocation] = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
        credentials: "include",
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.message || "Login failed");
        setIsLoading(false);
        return;
      }

      const user = await res.json();
      queryClient.setQueryData(["/api/auth/user"], user);

      if (user.role === "admin" || user.role === "owner") {
        setLocation("/admin");
      } else {
        setLocation("/portal");
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-muted/30">
      <header className="flex items-center justify-between px-6 py-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <a href="/" className="flex items-center gap-2" data-testid="link-logo">
          <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary">
            <Truck className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-semibold text-sm">CC Trucking Services</span>
        </a>
        <ThemeToggle />
      </header>

      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-sm" data-testid="card-login">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 mb-2">
              <Truck className="w-6 h-6 text-primary" />
            </div>
            <CardTitle className="text-xl">Sign In</CardTitle>
            <CardDescription>Enter your credentials to access your account</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-md p-3" data-testid="text-login-error">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  required
                  autoComplete="username"
                  data-testid="input-username"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                  data-testid="input-password"
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading} data-testid="button-login">
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Signing in...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
