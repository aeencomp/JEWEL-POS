import { Switch, Route, useLocation, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageProvider, useLanguage } from "@/hooks/use-language";
import { LanguageToggle } from "@/components/language-toggle";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import StorePortal from "@/pages/store-portal";
import AdminDashboard from "@/pages/admin-dashboard";
import AdminStores from "@/pages/admin-stores";
import AdminSubscriptions from "@/pages/admin-subscriptions";
import PosTerminal from "@/pages/pos-terminal";
import PosHome from "@/pages/pos-home";
import InventoryManagement from "@/pages/inventory-management";
import CustomersPage from "@/pages/customers-page";
import OrdersHistory from "@/pages/orders-history";
import RepairOrders from "@/pages/repair-orders";
import LayawayPage from "@/pages/layaway-page";
import StoreBranding from "@/pages/store-branding";
import StoreBackup from "@/pages/store-backup";
import StockAudit from "@/pages/stock-audit";
import PurchasesPage from "@/pages/purchases-page";
import DebtsPage from "@/pages/debts-page";
import AdminBackup from "@/pages/admin-backup";
import { Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

function AdminRouter() {
  return (
    <Switch>
      <Route path="/" component={AdminDashboard} />
      <Route path="/restaurants" component={AdminStores} />
      <Route path="/subscriptions" component={AdminSubscriptions} />
      <Route path="/backup" component={AdminBackup} />
      <Route component={NotFound} />
    </Switch>
  );
}

function StoreRouter() {
  return (
    <Switch>
      <Route path="/" component={PosHome} />
      <Route path="/pos/:id" component={PosTerminal} />
      <Route path="/inventory" component={InventoryManagement} />
      <Route path="/customers" component={CustomersPage} />
      <Route path="/orders" component={OrdersHistory} />
      <Route path="/repairs" component={RepairOrders} />
      <Route path="/purchases" component={PurchasesPage} />
      <Route path="/layaway" component={LayawayPage} />
      <Route path="/branding" component={StoreBranding} />
      <Route path="/backup" component={StoreBackup} />
      <Route path="/stock-audit" component={StockAudit} />
      <Route path="/debts" component={DebtsPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function ImpersonationBanner() {
  const { impersonatingStoreName, stopImpersonateMutation } = useAuth();
  const { t } = useLanguage();

  return (
    <div className="flex items-center justify-between gap-2 px-3 py-1.5 bg-amber-500 text-white sticky top-0 z-[60]">
      <div className="flex items-center gap-2 text-sm font-medium">
        <span>{t("admin.viewingAs")}: {impersonatingStoreName}</span>
      </div>
      <Button
        size="sm"
        variant="outline"
        className="bg-white/20 border-white/40 text-white"
        onClick={() => stopImpersonateMutation.mutate()}
        disabled={stopImpersonateMutation.isPending}
        data-testid="button-stop-impersonate"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        <span className="ms-1">{t("admin.backToAdmin")}</span>
      </Button>
    </div>
  );
}

function MainLayout() {
  const { user, isImpersonating } = useAuth();
  const isAdmin = user?.role === "admin";
  const showStoreView = !isAdmin || isImpersonating;

  const style = {
    "--sidebar-width": "15rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 min-w-0">
          {isImpersonating && <ImpersonationBanner />}
          <header className="flex items-center justify-between gap-2 p-2 border-b bg-background sticky top-0 z-50">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <div className="flex items-center gap-1">
              <LanguageToggle />
              <ThemeToggle />
            </div>
          </header>
          <main className="flex-1 overflow-auto">
            {showStoreView ? <StoreRouter /> : <AdminRouter />}
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
    const terminalId = sessionStorage.getItem("selectedTerminalId");
    if (terminalId) {
      sessionStorage.removeItem("selectedTerminalId");
      return <Redirect to={`/pos/${terminalId}`} />;
    }
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
