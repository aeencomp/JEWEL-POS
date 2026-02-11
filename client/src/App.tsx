import { Switch, Route, useLocation, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageProvider } from "@/hooks/use-language";
import { LanguageToggle } from "@/components/language-toggle";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import StorePortal from "@/pages/store-portal";
import AdminDashboard from "@/pages/admin-dashboard";
import AdminStores from "@/pages/admin-stores";
import AdminSubscriptions from "@/pages/admin-subscriptions";
import PosTerminal from "@/pages/pos-terminal";
import InventoryManagement from "@/pages/inventory-management";
import CustomersPage from "@/pages/customers-page";
import OrdersHistory from "@/pages/orders-history";
import RepairOrders from "@/pages/repair-orders";
import LayawayPage from "@/pages/layaway-page";
import StoreBranding from "@/pages/store-branding";
import { Loader2 } from "lucide-react";

function AdminRouter() {
  return (
    <Switch>
      <Route path="/" component={AdminDashboard} />
      <Route path="/restaurants" component={AdminStores} />
      <Route path="/subscriptions" component={AdminSubscriptions} />
      <Route component={NotFound} />
    </Switch>
  );
}

function StoreRouter() {
  return (
    <Switch>
      <Route path="/" component={PosTerminal} />
      <Route path="/inventory" component={InventoryManagement} />
      <Route path="/customers" component={CustomersPage} />
      <Route path="/orders" component={OrdersHistory} />
      <Route path="/repairs" component={RepairOrders} />
      <Route path="/layaway" component={LayawayPage} />
      <Route path="/branding" component={StoreBranding} />
      <Route component={NotFound} />
    </Switch>
  );
}

function MainLayout() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const style = {
    "--sidebar-width": "15rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 min-w-0">
          <header className="flex items-center justify-between gap-2 p-2 border-b bg-background sticky top-0 z-50">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <div className="flex items-center gap-1">
              <LanguageToggle />
              <ThemeToggle />
            </div>
          </header>
          <main className="flex-1 overflow-auto">
            {isAdmin ? <AdminRouter /> : <StoreRouter />}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function AppContent() {
  const { user, isLoading } = useAuth();
  const [location] = useLocation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  if (!user) {
    if (location === "/auth") {
      return <AuthPage />;
    }
    if (location === "/store-portal") {
      return <StorePortal />;
    }
    return <Redirect to="/store-portal" />;
  }

  if (location === "/auth" || location === "/store-portal") {
    return <Redirect to="/" />;
  }

  return <MainLayout />;
}

function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <TooltipProvider>
              <Toaster />
              <AppContent />
            </TooltipProvider>
          </AuthProvider>
        </QueryClientProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default App;
