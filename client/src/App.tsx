import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { TenantProvider, useTenant } from "@/context/tenant-context";
import { BrandLogo } from "@/components/brand-logo";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { PortalSidebar } from "@/components/portal-sidebar";
import { PreparerSidebar } from "@/components/preparer-sidebar";
import { PlatformSidebar } from "@/components/platform-sidebar";
import { ImpersonationBanner } from "@/components/impersonation-banner";
import { ThemeToggle } from "@/components/theme-toggle";
import { NotificationBell } from "@/components/notification-bell";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import NotFound from "@/pages/not-found";
import PlatformDashboard from "@/pages/platform-dashboard";
import PlatformTenants from "@/pages/platform-tenants";
import PlatformAIUsage from "@/pages/platform-ai-usage";
import PlatformAnalytics from "@/pages/platform-analytics";
import Home from "@/pages/home";
import Faqs from "@/pages/faqs";
import Contact from "@/pages/contact";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Clients from "@/pages/clients";
import Tickets from "@/pages/tickets";
import Documents from "@/pages/documents";
import Invoices from "@/pages/invoices";
import PortalDashboard from "@/pages/portal/portal-dashboard";
import PortalServices from "@/pages/portal/portal-services";
import PortalInvoices from "@/pages/portal/portal-invoices";
import PortalDocuments from "@/pages/portal/portal-documents";
import PortalChat from "@/pages/portal/portal-chat";
import AdminChat from "@/pages/admin-chat";
import AdminStaffChat from "@/pages/admin-staff-chat";
import AdminUsers from "@/pages/admin-users";
import AdminSheets from "@/pages/admin-sheets";
import AdminSignatures from "@/pages/admin-signatures";
import AdminClientDetail from "@/pages/admin-client-detail";
import AdminForms from "@/pages/admin-forms";
import AdminNotarizations from "@/pages/admin-notarizations";
import AdminAudit from "@/pages/admin-audit";
import AdminServiceItems from "@/pages/admin-service-items";
import AdminAnalytics from "@/pages/admin-analytics";
import AdminAiChat from "@/pages/admin-ai-chat";
import { AiChatWidget } from "@/components/ai-chat-widget";
import { PortalAiChatWidget } from "@/components/portal-ai-chat-widget";
import AdminTaxPrep from "@/pages/admin-tax-prep";
import AdminEmployeePerformance from "@/pages/admin-employee-performance";
import AdminBookkeeping from "@/pages/admin-bookkeeping";
import AdminRecurring from "@/pages/admin-recurring";
import AdminKnowledgeBase from "@/pages/admin-knowledge-base";
import AdminTenantSettings from "@/pages/admin-tenant-settings";
import AdminSubscription from "@/pages/admin-subscription";
import AdminApiKeys from "@/pages/admin-api-keys";
import AdminApiDocs from "@/pages/admin-api-docs";
import PortalSignatures from "@/pages/portal/portal-signatures";
import PortalTaxDocuments from "@/pages/portal/portal-tax-documents";
import PreparerDashboard from "@/pages/preparer/preparer-dashboard";
import PreparerClientDetail from "@/pages/preparer/preparer-client-detail";
import PortalBookkeeping from "@/pages/portal/portal-bookkeeping";
import PlatformHealth from "@/pages/platform-health";

const sidebarStyle = {
  "--sidebar-width": "16rem",
  "--sidebar-width-icon": "3rem",
} as React.CSSProperties;

function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  if (!user) {
    window.location.href = "/login";
    return null;
  }

  const adminRoles = ["admin", "owner", "tenant_admin", "tenant_owner", "platform_owner", "platform_admin"];
  if (!adminRoles.includes(user.role)) {
    window.location.href = "/portal";
    return null;
  }

  return (
    <SidebarProvider style={sidebarStyle}>
      <ImpersonationBanner />
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 min-w-0">
          <header className="flex items-center justify-between gap-2 p-2 border-b">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <div className="flex items-center gap-1">
              <NotificationBell basePath="/admin" />
              <ThemeToggle />
            </div>
          </header>
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
        <AiChatWidget />
      </div>
    </SidebarProvider>
  );
}

function PortalLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  if (!user) {
    window.location.href = "/login";
    return null;
  }

  return (
    <SidebarProvider style={sidebarStyle}>
      <div className="flex h-screen w-full">
        <PortalSidebar />
        <div className="flex flex-col flex-1 min-w-0">
          <header className="flex items-center justify-between gap-2 p-2 border-b">
            <SidebarTrigger data-testid="button-portal-sidebar-toggle" />
            <div className="flex items-center gap-1">
              <NotificationBell basePath="/portal" />
              <ThemeToggle />
            </div>
          </header>
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
        <PortalAiChatWidget />
      </div>
    </SidebarProvider>
  );
}

function PreparerLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  if (!user) {
    window.location.href = "/login";
    return null;
  }

  if (user.role !== "preparer") {
    window.location.href = "/login";
    return null;
  }

  return (
    <SidebarProvider style={sidebarStyle}>
      <div className="flex h-screen w-full">
        <PreparerSidebar />
        <div className="flex flex-col flex-1 min-w-0">
          <header className="flex items-center justify-between gap-2 p-2 border-b">
            <SidebarTrigger data-testid="button-preparer-sidebar-toggle" />
            <div className="flex items-center gap-1">
              <NotificationBell basePath="/preparer" />
              <ThemeToggle />
            </div>
          </header>
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function PlatformLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  if (!user) {
    window.location.href = "/login";
    return null;
  }

  const platformRoles = ["platform_owner", "platform_admin"];
  if (!platformRoles.includes(user.role)) {
    window.location.href = "/admin";
    return null;
  }

  return (
    <SidebarProvider style={sidebarStyle}>
      <div className="flex h-screen w-full">
        <PlatformSidebar />
        <div className="flex flex-col flex-1 min-w-0">
          <header className="flex items-center justify-between gap-2 p-2 border-b">
            <SidebarTrigger data-testid="button-platform-sidebar-toggle" />
            <div className="flex items-center gap-1">
              <ThemeToggle />
            </div>
          </header>
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function PublicLayout({ children }: { children: React.ReactNode }) {
  const branding = useTenant();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between px-6 py-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <a href="/" data-testid="link-logo">
          <BrandLogo size="sm" variant="dark" />
        </a>
        <nav className="flex items-center gap-1">
          <a href="/" className="text-sm px-3 py-2 rounded-md text-muted-foreground hover:text-foreground transition-colors" data-testid="nav-home">Home</a>
          <a href="/faqs" className="text-sm px-3 py-2 rounded-md text-muted-foreground hover:text-foreground transition-colors" data-testid="nav-faqs">FAQs</a>
          <a href="/contact" className="text-sm px-3 py-2 rounded-md text-muted-foreground hover:text-foreground transition-colors" data-testid="nav-contact">Contact</a>
          <a href="/login" className="text-sm px-3 py-2 rounded-md bg-primary text-primary-foreground ml-2" data-testid="nav-login">Sign In</a>
          <div className="ml-2">
            <ThemeToggle />
          </div>
        </nav>
      </header>
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TenantProvider>
      <TooltipProvider>
        <Switch>
          <Route path="/">
            <PublicLayout><Home /></PublicLayout>
          </Route>
          <Route path="/faqs">
            <PublicLayout><Faqs /></PublicLayout>
          </Route>
          <Route path="/contact">
            <PublicLayout><Contact /></PublicLayout>
          </Route>
          <Route path="/login">
            <Login />
          </Route>
          <Route path="/login/:slug">
            {(params) => <Login slug={params.slug} />}
          </Route>

          <Route path="/admin">
            <AdminLayout><Dashboard /></AdminLayout>
          </Route>
          <Route path="/admin/clients/:id">
            <AdminLayout><AdminClientDetail /></AdminLayout>
          </Route>
          <Route path="/admin/clients">
            <AdminLayout><Clients /></AdminLayout>
          </Route>
          <Route path="/admin/tickets">
            <AdminLayout><Tickets /></AdminLayout>
          </Route>
          <Route path="/admin/documents">
            <AdminLayout><Documents /></AdminLayout>
          </Route>
          <Route path="/admin/invoices">
            <AdminLayout><Invoices /></AdminLayout>
          </Route>
          <Route path="/admin/chat">
            <AdminLayout><AdminChat /></AdminLayout>
          </Route>
          <Route path="/admin/staff-chat">
            <AdminLayout><AdminStaffChat /></AdminLayout>
          </Route>
          <Route path="/admin/users">
            <AdminLayout><AdminUsers /></AdminLayout>
          </Route>
          <Route path="/admin/sheets">
            <AdminLayout><AdminSheets /></AdminLayout>
          </Route>
          <Route path="/admin/signatures">
            <AdminLayout><AdminSignatures /></AdminLayout>
          </Route>
          <Route path="/admin/forms">
            <AdminLayout><AdminForms /></AdminLayout>
          </Route>
          <Route path="/admin/notarizations">
            <AdminLayout><AdminNotarizations /></AdminLayout>
          </Route>
          <Route path="/admin/audit">
            <AdminLayout><AdminAudit /></AdminLayout>
          </Route>
          <Route path="/admin/service-items">
            <AdminLayout><AdminServiceItems /></AdminLayout>
          </Route>
          <Route path="/admin/analytics">
            <AdminLayout><AdminAnalytics /></AdminLayout>
          </Route>
          <Route path="/admin/ai-chat">
            <AdminLayout><div className="p-6 text-center text-muted-foreground">The AI Assistant is now available as a floating chat button in the bottom-right corner of every page.</div></AdminLayout>
          </Route>
          <Route path="/admin/tax-prep">
            <AdminLayout><AdminTaxPrep /></AdminLayout>
          </Route>
          <Route path="/admin/employee-performance">
            <AdminLayout><AdminEmployeePerformance /></AdminLayout>
          </Route>
          <Route path="/admin/bookkeeping">
            <AdminLayout><AdminBookkeeping /></AdminLayout>
          </Route>
          <Route path="/admin/recurring">
            <AdminLayout><AdminRecurring /></AdminLayout>
          </Route>
          <Route path="/admin/knowledge-base">
            <AdminLayout><AdminKnowledgeBase /></AdminLayout>
          </Route>
          <Route path="/admin/tenant-settings">
            <AdminLayout><AdminTenantSettings /></AdminLayout>
          </Route>
          <Route path="/admin/subscription">
            <AdminLayout><AdminSubscription /></AdminLayout>
          </Route>
          <Route path="/admin/api-keys">
            <AdminLayout><AdminApiKeys /></AdminLayout>
          </Route>
          <Route path="/admin/api-docs">
            <AdminLayout><AdminApiDocs /></AdminLayout>
          </Route>

          <Route path="/portal">
            <PortalLayout><PortalDashboard /></PortalLayout>
          </Route>
          <Route path="/portal/services">
            <PortalLayout><PortalServices /></PortalLayout>
          </Route>
          <Route path="/portal/invoices">
            <PortalLayout><PortalInvoices /></PortalLayout>
          </Route>
          <Route path="/portal/documents">
            <PortalLayout><PortalDocuments /></PortalLayout>
          </Route>
          <Route path="/portal/chat">
            <PortalLayout><PortalChat /></PortalLayout>
          </Route>
          <Route path="/portal/signatures">
            <PortalLayout><PortalSignatures /></PortalLayout>
          </Route>
          <Route path="/portal/bookkeeping">
            <PortalLayout><PortalBookkeeping /></PortalLayout>
          </Route>
          <Route path="/portal/tax-documents">
            <PortalLayout><PortalTaxDocuments /></PortalLayout>
          </Route>

          <Route path="/platform/tenants">
            <PlatformLayout><PlatformTenants /></PlatformLayout>
          </Route>
          <Route path="/platform/analytics">
            <PlatformLayout><PlatformAnalytics /></PlatformLayout>
          </Route>
          <Route path="/platform/ai-usage">
            <PlatformLayout><PlatformAIUsage /></PlatformLayout>
          </Route>
          <Route path="/platform/health">
            <PlatformLayout><PlatformHealth /></PlatformLayout>
          </Route>
          <Route path="/platform">
            <PlatformLayout><PlatformDashboard /></PlatformLayout>
          </Route>

          <Route path="/preparer">
            <PreparerLayout><PreparerDashboard /></PreparerLayout>
          </Route>
          <Route path="/preparer/client/:id">
            <PreparerLayout><PreparerClientDetail /></PreparerLayout>
          </Route>

          <Route path="/dashboard">
            {() => <Redirect to="/admin" />}
          </Route>
          <Route path="/auth/redirect">
            {() => <Redirect to="/login" />}
          </Route>

          <Route>
            <PublicLayout><NotFound /></PublicLayout>
          </Route>
        </Switch>
        <Toaster />
      </TooltipProvider>
      </TenantProvider>
    </QueryClientProvider>
  );
}

export default App;
