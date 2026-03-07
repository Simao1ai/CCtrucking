import { useLocation, Link } from "wouter";
import { Truck, LayoutDashboard, Plus, FileText, Receipt, MessageCircle, LogOut, Home, PenLine, BookOpen, FileCheck } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const mainNavItems = [
  { title: "Dashboard", url: "/portal", icon: LayoutDashboard },
  { title: "Services", url: "/portal/services", icon: Plus },
];

const docsNavItems = [
  { title: "Documents", url: "/portal/documents", icon: FileText },
  { title: "Sign Documents", url: "/portal/signatures", icon: PenLine },
  { title: "Tax Documents", url: "/portal/tax-documents", icon: FileCheck },
];

const financialNavItems = [
  { title: "Invoices", url: "/portal/invoices", icon: Receipt },
  { title: "Bookkeeping", url: "/portal/bookkeeping", icon: BookOpen },
];

const communicationNavItems = [
  { title: "Messages", url: "/portal/chat", icon: MessageCircle },
];

function NavGroup({ label, items, location }: { label: string; items: typeof mainNavItems; location: string }) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => {
            const isActive = item.url === "/portal"
              ? location === "/portal"
              : location.startsWith(item.url);
            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton asChild data-active={isActive}>
                  <Link href={item.url} data-testid={`portal-nav-${item.title.toLowerCase().replace(/\s+/g, '-')}`}>
                    <item.icon className="w-4 h-4" />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

export function PortalSidebar() {
  const [location] = useLocation();
  const { user } = useAuth();

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <Link href="/portal" data-testid="link-portal-home">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-9 h-9 rounded-md bg-primary">
              <Truck className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold tracking-tight">CC Trucking</span>
              <span className="text-xs text-muted-foreground">Client Portal</span>
            </div>
          </div>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <NavGroup label="Overview" items={mainNavItems} location={location} />
        <NavGroup label="Documents" items={docsNavItems} location={location} />
        <NavGroup label="Financial" items={financialNavItems} location={location} />
        <NavGroup label="Communication" items={communicationNavItems} location={location} />
        <SidebarSeparator />
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <a href="/" data-testid="portal-nav-website">
                    <Home className="w-4 h-4" />
                    <span>Back to Website</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <button
                    onClick={() => {
                      fetch("/api/auth/logout", { method: "POST", credentials: "include" }).then(() => {
                        window.location.href = "/login";
                      });
                    }}
                    data-testid="portal-nav-logout"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4">
        {user && (
          <div className="flex items-center gap-2">
            <Avatar className="w-7 h-7">
              <AvatarImage src={user.profileImageUrl || undefined} />
              <AvatarFallback className="text-xs">
                {(user.firstName?.[0] || '') + (user.lastName?.[0] || '')}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-medium truncate">{user.firstName || user.lastName ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : user.username}</span>
              <span className="text-xs text-muted-foreground truncate">{user.email || user.username}</span>
            </div>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
