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
  UtensilsCrossed,
  ClipboardList,
  History,
  LogOut,
  Settings,
  ChefHat,
  Palette,
} from "lucide-react";

type BrandingData = {
  brandColor: string | null;
  logoUrl: string | null;
  receiptHeader: string | null;
  receiptFooter: string | null;
  name: string;
};

export function AppSidebar() {
  const { user, logoutMutation } = useAuth();
  const { t } = useLanguage();
  const [location] = useLocation();

  const isAdmin = user?.role === "admin";

  const { data: branding } = useQuery<BrandingData>({
    queryKey: ["/api/restaurant/branding"],
    enabled: !isAdmin && !!user?.restaurantId,
  });

  const adminItems = [
    { title: t("sidebar.dashboard"), url: "/", icon: LayoutDashboard },
    { title: t("sidebar.restaurants"), url: "/restaurants", icon: Store },
    { title: t("sidebar.subscriptions"), url: "/subscriptions", icon: CreditCard },
  ];

  const restaurantItems = [
    { title: t("sidebar.posTerminal"), url: "/", icon: UtensilsCrossed },
    { title: t("sidebar.menu"), url: "/menu", icon: ChefHat },
    { title: t("sidebar.orders"), url: "/orders", icon: ClipboardList },
    { title: t("sidebar.history"), url: "/history", icon: History },
    { title: t("sidebar.branding"), url: "/branding", icon: Palette },
  ];

  const items = isAdmin ? adminItems : restaurantItems;

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          {!isAdmin && branding?.logoUrl ? (
            <img
              src={branding.logoUrl}
              alt=""
              className="w-8 h-8 rounded-md object-contain"
              data-testid="img-sidebar-logo"
            />
          ) : (
            <div
              className="w-8 h-8 rounded-md flex items-center justify-center"
              style={!isAdmin && branding?.brandColor ? { backgroundColor: branding.brandColor } : { backgroundColor: "hsl(var(--primary))" }}
            >
              <UtensilsCrossed className="h-4 w-4 text-white" />
            </div>
          )}
          <div>
            <span className="font-semibold text-sm" data-testid="text-app-name">
              {!isAdmin && branding?.name ? branding.name : "RestoPOS"}
            </span>
            <p className="text-xs text-muted-foreground">
              {isAdmin ? t("sidebar.adminPanel") : t("sidebar.restaurantPOS")}
            </p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{isAdmin ? t("sidebar.management") : t("sidebar.pointOfSale")}</SidebarGroupLabel>
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
              {user?.role === "admin" ? t("common.admin") : t("common.restaurant")}
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
