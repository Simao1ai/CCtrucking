import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Building2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import type { Client, BookkeepingSubscription } from "@shared/schema";

type AssignedClient = Client & { subscription?: BookkeepingSubscription };

export default function PreparerDashboard() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  const { data: clients = [], isLoading } = useQuery<AssignedClient[]>({
    queryKey: ["/api/preparer/clients"],
  });

  const preparerName = user?.firstName || user?.lastName
    ? `${user.firstName || ""} ${user.lastName || ""}`.trim()
    : user?.username || "";

  return (
    <div className="p-6 space-y-6" data-testid="page-preparer-dashboard">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-page-title">Preparer Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1" data-testid="text-preparer-subtitle">
          Welcome, {preparerName}
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
      ) : clients.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground" data-testid="text-no-clients">No clients assigned to you yet. Contact an administrator to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clients.map(client => (
            <Card
              key={client.id}
              className="cursor-pointer hover-elevate"
              onClick={() => setLocation(`/preparer/client/${client.id}`)}
              data-testid={`card-client-${client.id}`}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 shrink-0">
                    <Building2 className="w-5 h-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate" data-testid={`text-company-${client.id}`}>
                      {client.companyName}
                    </p>
                    <p className="text-xs text-muted-foreground truncate" data-testid={`text-contact-${client.id}`}>
                      {client.contactName}
                    </p>
                    <div className="mt-2">
                      <Badge
                        variant={client.subscription?.status === "active" ? "default" : "secondary"}
                        data-testid={`badge-subscription-${client.id}`}
                      >
                        {client.subscription?.status || "No Subscription"}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
