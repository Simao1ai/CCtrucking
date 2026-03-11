import { useLocation, Link } from "wouter";
import {
  LayoutDashboard,
  Building2,
  BarChart3,
  Brain,
  Activity,
  LogOut,
  Shield,
  type LucideIcon,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BrandLogo } from "@/components/brand-logo";

interface NavItem {
  title: string;
  url: string;
  icon: LucideIcon;
}

const navItems: NavItem[] = [
  { title: "Dashboard", url: "/platform", icon: LayoutDashboard },
  { title: "Tenants", url: "/platform/tenants", icon: Building2 },
  { title: "Analytics", url: "/platform/analytics", icon: BarChart3 },
  { title: "AI Usage", url: "/platform/ai-usage", icon: Brain },
  { title: "Health", url: "/platform/health", icon: Activity },
];

export function PlatformSidebar() {
  const [location] = useLocation();
  const { user } = useAuth();

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <Link href="/platform" data-testid="link-platform-home">
          <div className="flex items-center gap-2">
            <BrandLogo size="sm" variant="light" />
          </div>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive =
                  item.url === "/platform"
                    ? location === "/platform"
                    : location.startsWith(item.url);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild data-active={isActive}>
                      <Link
                        href={item.url}
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
        <SidebarSeparator />
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
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
          <div className="flex items-center gap-2" data-testid="platform-user-info">
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
              <span className="text-xs text-muted-foreground truncate">Platform Owner</span>
            </div>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
