import { useLocation, Link } from "wouter";
import {
  Truck,
  LayoutDashboard,
  Users,
  Ticket,
  FileText,
  Receipt,
  LogOut,
  MessageCircle,
  UserCog,
  FileSpreadsheet,
  PenLine,
  ClipboardList,
  Stamp,
  History,
  BarChart3,
  DollarSign,
  Calculator,
  Award,
  BookOpen,
  RefreshCcw,
  MessagesSquare,
  Building2,
  Briefcase,
  Settings2,
  Shield,
  CreditCard,
  KeyRound,
  type LucideIcon,
} from "lucide-react";
import { useTenant, useTenantIcon } from "@/context/tenant-context";
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

interface NavItem {
  title: string;
  url: string;
  icon: LucideIcon;
  ownerOnly?: boolean;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    label: "Operations",
    items: [
      { title: "Dashboard", url: "/admin", icon: LayoutDashboard },
      { title: "Clients", url: "/admin/clients", icon: Users },
      { title: "Service Tickets", url: "/admin/tickets", icon: Ticket },
      { title: "Documents", url: "/admin/documents", icon: FileText },
      { title: "Invoices", url: "/admin/invoices", icon: Receipt },
    ],
  },
  {
    label: "Services",
    items: [
      { title: "Service Catalog", url: "/admin/service-items", icon: DollarSign },
      { title: "Compliance", url: "/admin/recurring", icon: RefreshCcw },
      { title: "Forms", url: "/admin/forms", icon: ClipboardList },
      { title: "Signatures", url: "/admin/signatures", icon: PenLine },
      { title: "Notarizations", url: "/admin/notarizations", icon: Stamp },
    ],
  },
  {
    label: "Financial",
    items: [
      { title: "Bookkeeping", url: "/admin/bookkeeping", icon: BookOpen },
      { title: "Tax Prep", url: "/admin/tax-prep", icon: Calculator },
    ],
  },
  {
    label: "Communication",
    items: [
      { title: "Client Messages", url: "/admin/chat", icon: MessageCircle },
      { title: "Staff Chat", url: "/admin/staff-chat", icon: MessagesSquare },
    ],
  },
  {
    label: "Resources",
    items: [
      { title: "Knowledge Base", url: "/admin/knowledge-base", icon: BookOpen },
    ],
  },
  {
    label: "Admin",
    items: [
      { title: "Analytics", url: "/admin/analytics", icon: BarChart3, ownerOnly: true },
      { title: "Employee Performance", url: "/admin/employee-performance", icon: Award, ownerOnly: true },
      { title: "Audit Log", url: "/admin/audit", icon: History, ownerOnly: true },
      { title: "Users", url: "/admin/users", icon: UserCog },
      { title: "Subscription", url: "/admin/subscription", icon: CreditCard, ownerOnly: true },
      { title: "API Keys", url: "/admin/api-keys", icon: KeyRound, ownerOnly: true },
      { title: "Settings", url: "/admin/tenant-settings", icon: Settings2, ownerOnly: true },
      { title: "Google Sheets", url: "/admin/sheets", icon: FileSpreadsheet },
    ],
  },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { user } = useAuth();
  const branding = useTenant();
  const tenantIcon = useTenantIcon();
  const { setOpenMobile } = useSidebar();
  const closeMobile = () => setOpenMobile(false);
  const isTenant = branding.companyName !== "CarrierDeskHQ";

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <Link href="/admin" data-testid="link-admin-home" onClick={closeMobile}>
          <div className="flex items-center gap-2">
            <BrandLogo size="sm" variant="light" name={isTenant ? branding.companyName : undefined} icon={isTenant ? tenantIcon : undefined} logoUrl={branding.logoUrl || undefined} />
          </div>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        {navGroups.map((group, groupIndex) => {
          const ownerRoles = ["owner", "tenant_owner", "platform_owner"];
          const visibleItems = group.items.filter(
            (item) => !item.ownerOnly || (user?.role && ownerRoles.includes(user.role))
          );
          if (visibleItems.length === 0) return null;

          return (
            <div key={group.label}>
              {groupIndex > 0 && <SidebarSeparator />}
              <SidebarGroup>
                <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {visibleItems.map((item) => {
                      const isActive =
                        item.url === "/admin"
                          ? location === "/admin"
                          : location.startsWith(item.url);
                      return (
                        <SidebarMenuItem key={item.title}>
                          <SidebarMenuButton asChild data-active={isActive}>
                            <Link
                              href={item.url}
                              onClick={closeMobile}
                              data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
                            >
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
            </div>
          );
        })}
        <SidebarSeparator />
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {user?.role && ["platform_owner", "platform_admin"].includes(user.role) && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link href="/platform" onClick={closeMobile} data-testid="nav-platform-admin">
                      <Shield className="w-4 h-4" />
                      <span>Platform Admin</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
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
                    data-testid="nav-logout"
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
                {(user.firstName?.[0] || "") + (user.lastName?.[0] || "")}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-medium truncate">
                {user.firstName || user.lastName
                  ? `${user.firstName || ""} ${user.lastName || ""}`.trim()
                  : user.username}
              </span>
              <span className="text-xs text-muted-foreground truncate">
                {["owner", "tenant_owner", "platform_owner"].includes(user.role) ? "Owner" : "Admin"}
              </span>
            </div>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
