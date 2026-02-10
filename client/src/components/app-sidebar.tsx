import { useAuth } from "@/hooks/use-auth";
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
} from "lucide-react";

const adminItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Restaurants", url: "/restaurants", icon: Store },
  { title: "Subscriptions", url: "/subscriptions", icon: CreditCard },
];

const restaurantItems = [
  { title: "POS Terminal", url: "/", icon: UtensilsCrossed },
  { title: "Menu", url: "/menu", icon: ChefHat },
  { title: "Orders", url: "/orders", icon: ClipboardList },
  { title: "History", url: "/history", icon: History },
];

export function AppSidebar() {
  const { user, logoutMutation } = useAuth();
  const [location] = useLocation();

  const isAdmin = user?.role === "admin";
  const items = isAdmin ? adminItems : restaurantItems;

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
            <UtensilsCrossed className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <span className="font-semibold text-sm" data-testid="text-app-name">RestoPOS</span>
            <p className="text-xs text-muted-foreground">
              {isAdmin ? "Admin Panel" : "Restaurant POS"}
            </p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{isAdmin ? "Management" : "Point of Sale"}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                  >
                    <Link href={item.url} data-testid={`link-${item.title.toLowerCase().replace(/\s/g, "-")}`}>
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
            <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
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
