import { useLocation, Link } from "wouter";
import { Truck, LayoutDashboard, LogOut, Home, Building2, Briefcase } from "lucide-react";
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
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const navItems = [
  { title: "Dashboard", url: "/preparer", icon: LayoutDashboard },
];

export function PreparerSidebar() {
  const [location] = useLocation();
  const { user } = useAuth();
  const branding = useTenant();
  const IconMap: Record<string, typeof Truck> = { Truck, Building2, Briefcase };
  const BrandIcon = IconMap[branding.sidebarIconName] || Truck;

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <Link href="/preparer" data-testid="link-preparer-home">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-9 h-9 rounded-md bg-primary">
              <BrandIcon className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold tracking-tight">{branding.shortName}</span>
              <span className="text-xs text-muted-foreground">Preparer Portal</span>
            </div>
          </div>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive = item.url === "/preparer"
                  ? location === "/preparer"
                  : location.startsWith(item.url);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild data-active={isActive}>
                      <Link href={item.url} data-testid={`preparer-nav-${item.title.toLowerCase()}`}>
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
                  <button
                    onClick={() => {
                      fetch("/api/auth/logout", { method: "POST", credentials: "include" })
                        .then(r => r.json())
                        .then(data => {
                          window.location.href = data.tenantSlug ? `/login/${data.tenantSlug}` : "/login";
                        });
                    }}
                    data-testid="preparer-nav-logout"
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
          <div className="flex items-center gap-2" data-testid="preparer-user-info">
            <Avatar className="w-7 h-7">
              <AvatarImage src={user.profileImageUrl || undefined} />
              <AvatarFallback className="text-xs">
                {(user.firstName?.[0] || '') + (user.lastName?.[0] || '')}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-medium truncate" data-testid="text-preparer-name">{user.firstName || user.lastName ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : user.username}</span>
              <span className="text-xs text-muted-foreground truncate">{user.email || user.username}</span>
            </div>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
