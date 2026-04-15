import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useLanguage } from "@/hooks/use-language";
import { LanguageToggle } from "@/components/language-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  LayoutDashboard, Package, ShoppingCart, Truck, Factory,
  Users, Building2, Receipt, HandCoins, LogOut, Menu, X, Droplets, ChevronRight,
} from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const navItems = [
  { path: "/oil", icon: LayoutDashboard, label: "Dashboard", labelAr: "لوحة التحكم", exact: true },
  { path: "/oil/inventory", icon: Package, label: "Inventory", labelAr: "المخزون" },
  { path: "/oil/sales", icon: ShoppingCart, label: "Sales", labelAr: "المبيعات" },
  { path: "/oil/purchases", icon: Truck, label: "Purchases", labelAr: "المشتريات" },
  { path: "/oil/production", icon: Factory, label: "Production", labelAr: "الإنتاج" },
  { path: "/oil/customers", icon: Users, label: "Customers", labelAr: "العملاء" },
  { path: "/oil/suppliers", icon: Building2, label: "Suppliers", labelAr: "الموردون" },
  { path: "/oil/expenses", icon: Receipt, label: "Expenses", labelAr: "المصاريف" },
  { path: "/oil/debts", icon: HandCoins, label: "Debts", labelAr: "الديون" },
];

export default function OilLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { language } = useLanguage();
  const { toast } = useToast();
  const isAr = language === "ar";
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const logoutMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/logout"),
    onSuccess: () => {
      queryClient.clear();
      window.location.href = "/";
    },
  });

  const isActive = (item: typeof navItems[0]) => {
    if (item.exact) return location === item.path;
    return location.startsWith(item.path);
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-sm">
            <Droplets className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-sm leading-tight">OilPOS</p>
            <p className="text-[10px] text-muted-foreground">{isAr ? "نظام مصنع الزيوت" : "Oil Factory System"}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item);
          return (
            <Link key={item.path} href={item.path}>
              <a
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                  ${active
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                data-testid={`nav-${item.label.toLowerCase()}`}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                <span>{isAr ? item.labelAr : item.label}</span>
                {active && <ChevronRight className="h-3 w-3 ms-auto opacity-70" />}
              </a>
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t space-y-1">
        <div className="flex items-center justify-between px-1 pb-1">
          <LanguageToggle />
          <ThemeToggle />
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-muted-foreground hover:text-destructive"
          onClick={() => logoutMutation.mutate()}
          data-testid="button-logout"
        >
          <LogOut className="h-4 w-4 me-2" />
          {isAr ? "تسجيل الخروج" : "Sign Out"}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-56 border-e bg-card flex-shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute start-0 top-0 bottom-0 w-64 bg-card border-e flex flex-col">
            <div className="flex items-center justify-end p-3 border-b">
              <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <SidebarContent />
            </div>
          </aside>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="md:hidden flex items-center gap-3 px-4 py-3 border-b bg-card">
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Droplets className="h-5 w-5 text-blue-500" />
            <span className="font-bold">OilPOS</span>
          </div>
          <Badge variant="secondary" className="ms-auto text-[10px]">Factory</Badge>
        </div>
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
