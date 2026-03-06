import { useLocation, Link } from "wouter";
import { Truck, LayoutDashboard, Users, Ticket, FileText, Receipt, LogOut, Home, MessageCircle, UserCog, FileSpreadsheet, PenLine, ClipboardList, Stamp, History, BarChart3, DollarSign, Calculator, Award, BookOpen, RefreshCcw } from "lucide-react";
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
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const navItems = [
  { title: "Dashboard", url: "/admin", icon: LayoutDashboard },
  { title: "Clients", url: "/admin/clients", icon: Users },
  { title: "Service Tickets", url: "/admin/tickets", icon: Ticket },
  { title: "Forms", url: "/admin/forms", icon: ClipboardList },
  { title: "Documents", url: "/admin/documents", icon: FileText },
  { title: "Invoices", url: "/admin/invoices", icon: Receipt },
  { title: "Service Catalog", url: "/admin/service-items", icon: DollarSign },
  { title: "Signatures", url: "/admin/signatures", icon: PenLine },
  { title: "Notarizations", url: "/admin/notarizations", icon: Stamp },
  { title: "Messages", url: "/admin/chat", icon: MessageCircle },
  { title: "Tax Prep", url: "/admin/tax-prep", icon: Calculator },
  { title: "Bookkeeping", url: "/admin/bookkeeping", icon: BookOpen },
  { title: "Compliance", url: "/admin/recurring", icon: RefreshCcw },
  { title: "Analytics", url: "/admin/analytics", icon: BarChart3, ownerOnly: true },
  { title: "Employee Performance", url: "/admin/employee-performance", icon: Award, ownerOnly: true },
  { title: "Audit Log", url: "/admin/audit", icon: History, ownerOnly: true },
  { title: "Google Sheets", url: "/admin/sheets", icon: FileSpreadsheet },
  { title: "Users", url: "/admin/users", icon: UserCog },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { user } = useAuth();

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <Link href="/admin" data-testid="link-admin-home">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-9 h-9 rounded-md bg-primary">
              <Truck className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold tracking-tight">CC Trucking</span>
              <span className="text-xs text-muted-foreground">Admin Portal</span>
            </div>
          </div>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Management</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.filter(item => !("ownerOnly" in item && item.ownerOnly) || user?.role === "owner").map((item) => {
                const isActive = item.url === "/admin"
                  ? location === "/admin"
                  : location.startsWith(item.url);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild data-active={isActive}>
                      <Link href={item.url} data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, '-')}`}>
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
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <a href="/" data-testid="nav-website">
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
                {(user.firstName?.[0] || '') + (user.lastName?.[0] || '')}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-medium truncate">{user.firstName || user.lastName ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : user.username}</span>
              <span className="text-xs text-muted-foreground truncate">{user.role === "owner" ? "Owner" : "Admin"}</span>
            </div>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
