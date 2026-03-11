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
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BrandLogo } from "@/components/brand-logo";

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

function NavGroup({ label, items, location, onNavClick }: { label: string; items: typeof mainNavItems; location: string; onNavClick: () => void }) {
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
                  <Link href={item.url} onClick={onNavClick} data-testid={`portal-nav-${item.title.toLowerCase().replace(/\s+/g, '-')}`}>
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
  const { setOpenMobile } = useSidebar();
  const closeMobile = () => setOpenMobile(false);

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <Link href="/portal" data-testid="link-portal-home" onClick={closeMobile}>
          <div className="flex items-center gap-2">
            <BrandLogo size="sm" variant="light" />
          </div>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <NavGroup label="Overview" items={mainNavItems} location={location} onNavClick={closeMobile} />
        <NavGroup label="Documents" items={docsNavItems} location={location} onNavClick={closeMobile} />
        <NavGroup label="Financial" items={financialNavItems} location={location} onNavClick={closeMobile} />
        <NavGroup label="Communication" items={communicationNavItems} location={location} onNavClick={closeMobile} />
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
