import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { PortalSidebar } from "@/components/portal-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { NotificationBell } from "@/components/notification-bell";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import NotFound from "@/pages/not-found";
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
import AdminUsers from "@/pages/admin-users";
import AdminSheets from "@/pages/admin-sheets";
import AdminSignatures from "@/pages/admin-signatures";
import AdminClientDetail from "@/pages/admin-client-detail";
import AdminForms from "@/pages/admin-forms";
import AdminNotarizations from "@/pages/admin-notarizations";
import AdminAudit from "@/pages/admin-audit";
import PortalSignatures from "@/pages/portal/portal-signatures";

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

  if (user.role !== "admin") {
    window.location.href = "/portal";
    return null;
  }

  return (
    <SidebarProvider style={sidebarStyle}>
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
      </div>
    </SidebarProvider>
  );
}

function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between px-6 py-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <a href="/" className="flex items-center gap-2" data-testid="link-logo">
          <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary-foreground"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></svg>
          </div>
          <span className="font-semibold text-sm">CC Trucking Services</span>
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
    </QueryClientProvider>
  );
}

export default App;
