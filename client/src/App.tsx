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
import RestaurantPortal from "@/pages/restaurant-portal";
import AdminDashboard from "@/pages/admin-dashboard";
import AdminRestaurants from "@/pages/admin-restaurants";
import AdminSubscriptions from "@/pages/admin-subscriptions";
import PosTerminal from "@/pages/pos-terminal";
import PosMenu from "@/pages/pos-menu";
import PosOrders from "@/pages/pos-orders";
import PosHistory from "@/pages/pos-history";
import PosBranding from "@/pages/pos-branding";
import { Loader2 } from "lucide-react";

function AdminRouter() {
  return (
    <Switch>
      <Route path="/" component={AdminDashboard} />
      <Route path="/restaurants" component={AdminRestaurants} />
      <Route path="/subscriptions" component={AdminSubscriptions} />
      <Route component={NotFound} />
    </Switch>
  );
}

function RestaurantRouter() {
  return (
    <Switch>
      <Route path="/" component={PosTerminal} />
      <Route path="/menu" component={PosMenu} />
      <Route path="/orders" component={PosOrders} />
      <Route path="/history" component={PosHistory} />
      <Route path="/branding" component={PosBranding} />
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
            {isAdmin ? <AdminRouter /> : <RestaurantRouter />}
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
    if (location === "/restaurant-portal") {
      return <RestaurantPortal />;
    }
    return <Redirect to="/restaurant-portal" />;
  }

  if (location === "/auth" || location === "/restaurant-portal") {
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
