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
import LandingPage from "@/pages/landing-page";
import StockAudit from "@/pages/stock-audit";
import PurchasesPage from "@/pages/purchases-page";
import DebtsPage from "@/pages/debts-page";
import AdminBackup from "@/pages/admin-backup";
import OilLayout from "@/pages/oil/oil-layout";
import OilDashboard from "@/pages/oil/oil-dashboard";
import OilPos from "@/pages/oil/oil-pos";
import OilInventory from "@/pages/oil/oil-inventory";
import OilSales from "@/pages/oil/oil-sales";
import OilPurchases from "@/pages/oil/oil-purchases";
import OilProduction from "@/pages/oil/oil-production";
import OilCustomers from "@/pages/oil/oil-customers";
import OilSuppliers from "@/pages/oil/oil-suppliers";
import OilExpenses from "@/pages/oil/oil-expenses";
import OilDebts from "@/pages/oil/oil-debts";
import OilLogin from "@/pages/oil/oil-login";
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
      <Route path="/" component={PosTerminal} />
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

function OilRouter() {
  return (
    <OilLayout>
      <Switch>
        <Route path="/oil" component={OilDashboard} />
        <Route path="/oil/pos" component={OilPos} />
        <Route path="/oil/inventory" component={OilInventory} />
        <Route path="/oil/sales" component={OilSales} />
        <Route path="/oil/purchases" component={OilPurchases} />
        <Route path="/oil/production" component={OilProduction} />
        <Route path="/oil/customers" component={OilCustomers} />
        <Route path="/oil/suppliers" component={OilSuppliers} />
        <Route path="/oil/expenses" component={OilExpenses} />
        <Route path="/oil/debts" component={OilDebts} />
        <Route component={NotFound} />
      </Switch>
    </OilLayout>
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
          <main className="flex-1 overflow-auto flex flex-col">
            {showStoreView ? <StoreRouter /> : <AdminRouter />}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function AppContent() {
  const { user, isLoading, isImpersonating } = useAuth();
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
    if (location === "/oil-login") {
      return <OilLogin />;
    }
    if (location === "/oil" || location.startsWith("/oil/")) {
      return <Redirect to="/oil-login" />;
    }
    return <LandingPage />;
  }

  if (location === "/oil-login") {
    return <Redirect to="/oil" />;
  }

  if (location === "/auth" || location === "/store-portal") {
    sessionStorage.removeItem("selectedTerminalId");
    return <Redirect to="/" />;
  }

  if (location === "/oil" || location.startsWith("/oil/")) {
    return <OilRouter />;
  }

  if (location === "/" && (user?.role === "store" || isImpersonating)) {
    const posSystem = user ? localStorage.getItem(`posSystem_${user.id}`) : null;
    if (posSystem === "oil") return <Redirect to="/oil" />;
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
