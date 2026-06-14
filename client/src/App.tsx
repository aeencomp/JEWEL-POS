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
import JewelLayout from "@/components/jewel-layout";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import StorePortal from "@/pages/store-portal";
import AdminDashboard from "@/pages/admin-dashboard";
import AdminStores from "@/pages/admin-stores";
import AdminSubscriptions from "@/pages/admin-subscriptions";
import PosTerminal from "@/pages/pos-terminal";
import InventoryManagement from "@/pages/inventory-management";
import FashionReturns from "@/pages/fashion-returns";
import FashionLogin from "@/pages/fashion/fashion-login";
import FashionLayout from "@/pages/fashion/fashion-layout";
import FashionDashboard from "@/pages/fashion/fashion-dashboard";
import FashionPos from "@/pages/fashion/fashion-pos";
import FashionReports from "@/pages/fashion/fashion-reports";
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
import AdminSignupRequests from "@/pages/admin-signup-requests";
import AdminPricing from "@/pages/admin-pricing";
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
import OilDelivery from "@/pages/oil/oil-delivery";
import OilBatch from "@/pages/oil/oil-batch";
import OilReports from "@/pages/oil/oil-reports";
import OilMaterials from "@/pages/oil/oil-materials";
import OilLogin from "@/pages/oil/oil-login";
import RestaurantLogin from "@/pages/restaurant/restaurant-login";
import RestaurantLayout from "@/pages/restaurant/restaurant-layout";
import RestaurantDashboard from "@/pages/restaurant/restaurant-dashboard";
import RestaurantPos from "@/pages/restaurant/restaurant-pos";
import RestaurantKitchen from "@/pages/restaurant/restaurant-kitchen";
import RestaurantMenu from "@/pages/restaurant/restaurant-menu";
import RestaurantOrders from "@/pages/restaurant/restaurant-orders";
import RestaurantQr from "@/pages/restaurant/restaurant-qr";
import RestaurantReports from "@/pages/restaurant/restaurant-reports";
import RestaurantDelivery from "@/pages/restaurant/restaurant-delivery";
import RestaurantDrivers from "@/pages/restaurant/restaurant-drivers";
import PublicOrderPage from "@/pages/public-order";
import IqOrderHome from "@/pages/iq-order/iq-order-home";
import IqOrderStore from "@/pages/iq-order/iq-order-store";
import IqOrderTrack from "@/pages/iq-order/iq-order-track";
import DriverLogin from "@/pages/driver/driver-login";
import DriverApp from "@/pages/driver/driver-app";
import PharmacyLogin from "@/pages/pharmacy/pharmacy-login";
import PharmacyLayout from "@/pages/pharmacy/pharmacy-layout";
import PharmacyDashboard from "@/pages/pharmacy/pharmacy-dashboard";
import PharmacyPos from "@/pages/pharmacy/pharmacy-pos";
import PharmacyInventory from "@/pages/pharmacy/pharmacy-inventory";
import PharmacyPrescriptions from "@/pages/pharmacy/pharmacy-prescriptions";
import PharmacyExpiry from "@/pages/pharmacy/pharmacy-expiry";
import PharmacyReports from "@/pages/pharmacy/pharmacy-reports";
import PrivacyPage from "@/pages/privacy";
import { Loader2 } from "lucide-react";
import { resolveUserPosSystem } from "@/lib/pos-system";

function AdminRouter() {
  return (
    <Switch>
      <Route path="/" component={AdminDashboard} />
      <Route path="/restaurants" component={AdminStores} />
      <Route path="/subscriptions" component={AdminSubscriptions} />
      <Route path="/signup-requests" component={AdminSignupRequests} />
      <Route path="/pricing" component={AdminPricing} />
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
      <Route path="/returns" component={FashionReturns} />
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

function FashionRouter() {
  return (
    <Switch>
      <Route path="/fashion" component={FashionDashboard} />
      <Route path="/fashion/pos" component={FashionPos} />
      <Route path="/fashion/inventory" component={InventoryManagement} />
      <Route path="/fashion/customers" component={CustomersPage} />
      <Route path="/fashion/orders" component={OrdersHistory} />
      <Route path="/fashion/returns" component={FashionReturns} />
      <Route path="/fashion/reports" component={FashionReports} />
      <Route path="/fashion/stock-audit" component={StockAudit} />
      <Route path="/fashion/debts" component={DebtsPage} />
      <Route path="/fashion/branding" component={StoreBranding} />
      <Route path="/fashion/backup" component={StoreBackup} />
      <Route component={NotFound} />
    </Switch>
  );
}

function PharmacyRouter() {
  return (
    <Switch>
      <Route path="/pharmacy" component={PharmacyDashboard} />
      <Route path="/pharmacy/pos" component={PharmacyPos} />
      <Route path="/pharmacy/inventory" component={PharmacyInventory} />
      <Route path="/pharmacy/prescriptions" component={PharmacyPrescriptions} />
      <Route path="/pharmacy/expiry" component={PharmacyExpiry} />
      <Route path="/pharmacy/customers" component={CustomersPage} />
      <Route path="/pharmacy/orders" component={OrdersHistory} />
      <Route path="/pharmacy/reports" component={PharmacyReports} />
      <Route path="/pharmacy/stock-audit" component={StockAudit} />
      <Route path="/pharmacy/branding" component={StoreBranding} />
      <Route path="/pharmacy/backup" component={StoreBackup} />
      <Route component={NotFound} />
    </Switch>
  );
}

function IqOrderRouter() {
  return (
    <Switch>
      <Route path="/app" component={IqOrderHome} />
      <Route path="/app/store/:storeId" component={IqOrderStore} />
      <Route path="/app/track/:token" component={IqOrderTrack} />
      <Route component={NotFound} />
    </Switch>
  );
}

function RestaurantRouter() {
  return (
    <Switch>
      <Route path="/restaurant" component={RestaurantDashboard} />
      <Route path="/restaurant/pos" component={RestaurantPos} />
      <Route path="/restaurant/kitchen" component={RestaurantKitchen} />
      <Route path="/restaurant/delivery" component={RestaurantDelivery} />
      <Route path="/restaurant/drivers" component={RestaurantDrivers} />
      <Route path="/restaurant/menu" component={RestaurantMenu} />
      <Route path="/restaurant/orders" component={RestaurantOrders} />
      <Route path="/restaurant/reports" component={RestaurantReports} />
      <Route path="/restaurant/qr" component={RestaurantQr} />
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
        <Route path="/oil/delivery" component={OilDelivery} />
        <Route path="/oil/batch" component={OilBatch} />
        <Route path="/oil/reports" component={OilReports} />
        <Route path="/oil/materials" component={OilMaterials} />
        <Route path="/oil/branding" component={StoreBranding} />
        <Route component={NotFound} />
      </Switch>
    </OilLayout>
  );
}

function AdminLayout() {
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
          <main className="flex-1 overflow-auto flex flex-col">
            <AdminRouter />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function StoreLayout() {
  const { isImpersonating, impersonatingStoreName, stopImpersonateMutation } = useAuth();
  return (
    <JewelLayout
      isImpersonating={isImpersonating}
      impersonatingStoreName={impersonatingStoreName}
      onStopImpersonate={() => stopImpersonateMutation.mutate()}
    >
      <StoreRouter />
    </JewelLayout>
  );
}

function FashionStoreLayout() {
  const { isImpersonating, impersonatingStoreName, stopImpersonateMutation } = useAuth();
  return (
    <FashionLayout
      isImpersonating={isImpersonating}
      impersonatingStoreName={impersonatingStoreName}
      onStopImpersonate={() => stopImpersonateMutation.mutate()}
    >
      <FashionRouter />
    </FashionLayout>
  );
}

function RestaurantStoreLayout() {
  const { isImpersonating, impersonatingStoreName, stopImpersonateMutation } = useAuth();
  return (
    <RestaurantLayout
      isImpersonating={isImpersonating}
      impersonatingStoreName={impersonatingStoreName}
      onStopImpersonate={() => stopImpersonateMutation.mutate()}
    >
      <RestaurantRouter />
    </RestaurantLayout>
  );
}

function PharmacyStoreLayout() {
  const { isImpersonating, impersonatingStoreName, stopImpersonateMutation } = useAuth();
  return (
    <PharmacyLayout
      isImpersonating={isImpersonating}
      impersonatingStoreName={impersonatingStoreName}
      onStopImpersonate={() => stopImpersonateMutation.mutate()}
    >
      <PharmacyRouter />
    </PharmacyLayout>
  );
}

function storeHomePath(posSystem?: string): string {
  if (posSystem === "oil") return "/oil";
  if (posSystem === "fashion") return "/fashion";
  if (posSystem === "restaurant") return "/restaurant";
  if (posSystem === "pharmacy") return "/pharmacy";
  return "/";
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
    if (location === "/driver-login") return <DriverLogin />;
    if (location === "/driver" || location.startsWith("/driver/")) return <DriverApp />;
    if (location.startsWith("/app")) {
      return <IqOrderRouter />;
    }
    if (location.startsWith("/order/")) {
      return <PublicOrderPage />;
    }
    if (location === "/privacy") {
      return <PrivacyPage />;
    }
    if (location === "/auth") {
      return <AuthPage />;
    }
    if (location === "/store-portal") {
      return <StorePortal />;
    }
    if (location === "/fashion-login") {
      return <FashionLogin />;
    }
    if (location === "/oil-login") {
      return <OilLogin />;
    }
    if (location === "/restaurant-login") {
      return <RestaurantLogin />;
    }
    if (location === "/pharmacy-login") {
      return <PharmacyLogin />;
    }
    if (location === "/oil" || location.startsWith("/oil/")) {
      return <Redirect to="/oil-login" />;
    }
    if (location === "/fashion" || location.startsWith("/fashion/")) {
      return <Redirect to="/fashion-login" />;
    }
    if (location === "/restaurant" || location.startsWith("/restaurant/")) {
      return <Redirect to="/restaurant-login" />;
    }
    if (location === "/pharmacy" || location.startsWith("/pharmacy/")) {
      return <Redirect to="/pharmacy-login" />;
    }
    return <LandingPage />;
  }

  const posSystem = resolveUserPosSystem(user as { username?: string; posSystem?: string }, location);
  const home = storeHomePath(posSystem);

  if (location === "/oil-login") {
    return <Redirect to={posSystem === "oil" ? "/oil" : home} />;
  }
  if (location === "/fashion-login") {
    return <Redirect to={posSystem === "fashion" ? "/fashion" : home} />;
  }
  if (location === "/restaurant-login") {
    return <Redirect to={posSystem === "restaurant" ? "/restaurant" : home} />;
  }
  if (location === "/pharmacy-login") {
    return <Redirect to={posSystem === "pharmacy" ? "/pharmacy" : home} />;
  }
  if (location === "/driver-login") return <DriverLogin />;
  if (location === "/driver" || location.startsWith("/driver/")) return <DriverApp />;
  if (location.startsWith("/app")) {
    return <IqOrderRouter />;
  }
  if (location.startsWith("/order/")) {
    return <PublicOrderPage />;
  }
  if (location === "/privacy") {
    return <PrivacyPage />;
  }

  if (location === "/auth" || location === "/store-portal") {
    sessionStorage.removeItem("selectedTerminalId");
    return <Redirect to={home} />;
  }

  if (user?.role === "store" || isImpersonating) {
    if (posSystem === "oil") {
      if (!location.startsWith("/oil")) {
        return <Redirect to="/oil" />;
      }
      return <OilRouter />;
    }
    if (posSystem === "fashion") {
      if (!location.startsWith("/fashion")) {
        return <Redirect to="/fashion" />;
      }
      return <FashionStoreLayout />;
    }
    if (posSystem === "restaurant") {
      if (!location.startsWith("/restaurant")) {
        return <Redirect to="/restaurant" />;
      }
      return <RestaurantStoreLayout />;
    }
    if (posSystem === "pharmacy") {
      if (!location.startsWith("/pharmacy")) {
        return <Redirect to="/pharmacy" />;
      }
      return <PharmacyStoreLayout />;
    }
    if (location.startsWith("/fashion") || location.startsWith("/oil") || location.startsWith("/restaurant") || location.startsWith("/pharmacy")) {
      return <Redirect to="/" />;
    }
  }

  if (user?.role === "admin" && !isImpersonating) {
    return <AdminLayout />;
  }

  return <StoreLayout />;
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
