import { useLocation, Link } from "wouter";
import { Truck, LayoutDashboard, Plus, FileText, Receipt, MessageCircle, LogOut, Home, PenLine, BookOpen, FileCheck, Building2, Briefcase } from "lucide-react";
import { useTenant } from "@/context/tenant-context";
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
import logoPath from "@assets/ChatGPT_Image_Mar_10,_2026_at_11_30_21_PM_1773199847239.png";

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
  const branding = useTenant();
  const IconMap: Record<string, typeof Truck> = { Truck, Building2, Briefcase };
  const BrandIcon = IconMap[branding.sidebarIconName] || Truck;

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <Link href="/portal" data-testid="link-portal-home">
          <div className="flex items-center gap-2">
            <img src={logoPath} alt={branding.shortName} className="h-8 w-auto drop-shadow-[0_0_1px_rgba(255,255,255,0.8)] brightness-[1.8]" data-testid="img-sidebar-logo" />
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
                  <button
                    onClick={() => {
                      fetch("/api/auth/logout", { method: "POST", credentials: "include" })
                        .then(r => r.json())
                        .then(data => {
                          window.location.href = data.tenantSlug ? `/login/${data.tenantSlug}` : "/login";
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
