import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/hooks/use-language";
import { useQuery } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
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
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  LayoutDashboard,
  Store,
  CreditCard,
  ShoppingCart,
  Package,
  Users,
  ClipboardList,
  Wrench,
  Clock,
  Palette,
  LogOut,
  Gem,
  ShoppingBag,
  HardDrive,
  ClipboardCheck,
  HandCoins,
  DatabaseBackup,
} from "lucide-react";

type BrandingData = {
  brandColor: string | null;
  logoUrl: string | null;
  receiptHeader: string | null;
  receiptFooter: string | null;
  name: string;
};

export function AppSidebar() {
  const { user, logoutMutation, isImpersonating } = useAuth();
  const { t } = useLanguage();
  const [location] = useLocation();

  const isAdmin = user?.role === "admin";
  const showStoreNav = !isAdmin || isImpersonating;

  const { data: branding } = useQuery<BrandingData>({
    queryKey: ["/api/store/branding"],
    enabled: showStoreNav,
  });

  const adminItems = [
    { title: t("nav.dashboard"), url: "/", icon: LayoutDashboard },
    { title: t("nav.stores"), url: "/restaurants", icon: Store },
    { title: t("nav.subscriptions"), url: "/subscriptions", icon: CreditCard },
    { title: t("nav.backup"), url: "/backup", icon: DatabaseBackup },
  ];

  const storeItems = [
    { title: t("nav.pos"), url: "/", icon: ShoppingCart },
    { title: t("nav.inventory"), url: "/inventory", icon: Package },
    { title: t("nav.customers"), url: "/customers", icon: Users },
    { title: t("nav.orders"), url: "/orders", icon: ClipboardList },
    { title: t("nav.repairs"), url: "/repairs", icon: Wrench },
    { title: t("nav.purchases"), url: "/purchases", icon: ShoppingBag },
    { title: t("nav.layaway"), url: "/layaway", icon: Clock },
    { title: t("nav.debts"), url: "/debts", icon: HandCoins },
    { title: t("nav.stockAudit"), url: "/stock-audit", icon: ClipboardCheck },
    { title: t("nav.branding"), url: "/branding", icon: Palette },
    { title: t("nav.backup"), url: "/backup", icon: HardDrive },
  ];

  const items = showStoreNav ? storeItems : adminItems;

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          {showStoreNav && branding?.logoUrl ? (
            <img
              src={branding.logoUrl}
              alt=""
              className="w-8 h-8 rounded-md object-contain"
              data-testid="img-sidebar-logo"
            />
          ) : (
            <div
              className="w-8 h-8 rounded-md flex items-center justify-center"
              style={showStoreNav && branding?.brandColor ? { backgroundColor: branding.brandColor } : { backgroundColor: "hsl(var(--primary))" }}
            >
              <Gem className="h-4 w-4 text-white" />
            </div>
          )}
          <div>
            <span className="font-semibold text-sm" data-testid="text-app-name">
              {showStoreNav && branding?.name ? branding.name : "JewelPOS"}
            </span>
            <p className="text-xs text-muted-foreground">
              {showStoreNav ? t("auth.storePortal") : t("auth.adminPortal")}
            </p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{showStoreNav ? t("nav.pos") : t("nav.dashboard")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                  >
                    <Link href={item.url} data-testid={`link-${item.url === "/" ? "home" : item.url.replace("/", "")}`}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs bg-muted">
              {user?.username?.charAt(0).toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate" data-testid="text-username">
              {user?.username}
            </p>
            <p className="text-xs text-muted-foreground">
              {showStoreNav ? t("auth.storePortal") : t("auth.adminPortal")}
            </p>
          </div>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => logoutMutation.mutate()}
            disabled={logoutMutation.isPending}
            data-testid="button-logout"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
