import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Store, CreditCard, DollarSign, TrendingUp, AlertCircle } from "lucide-react";
import type { Restaurant, Subscription } from "@shared/schema";

export default function AdminDashboard() {
  const { data: restaurants, isLoading: loadingRestaurants } = useQuery<Restaurant[]>({
    queryKey: ["/api/restaurants"],
  });

  const { data: subscriptions, isLoading: loadingSubs } = useQuery<Subscription[]>({
    queryKey: ["/api/subscriptions"],
  });

  const activeRestaurants = restaurants?.filter((r) => r.isActive).length || 0;
  const totalRestaurants = restaurants?.length || 0;
  const activeSubs = subscriptions?.filter((s) => s.status === "active").length || 0;
  const monthlyRevenue = subscriptions
    ?.filter((s) => s.status === "active")
    .reduce((sum, s) => sum + parseFloat(s.pricePerMonth), 0) || 0;
  const expiringSoon = subscriptions?.filter((s) => {
    if (!s.endDate) return false;
    const daysLeft = Math.ceil((new Date(s.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return daysLeft <= 7 && daysLeft > 0 && s.status === "active";
  }).length || 0;

  const isLoading = loadingRestaurants || loadingSubs;

  const stats = [
    {
      title: "Total Restaurants",
      value: totalRestaurants,
      subtitle: `${activeRestaurants} active`,
      icon: Store,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-50 dark:bg-blue-950/30",
    },
    {
      title: "Active Subscriptions",
      value: activeSubs,
      subtitle: `${expiringSoon} expiring soon`,
      icon: CreditCard,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-emerald-950/30",
    },
    {
      title: "Monthly Revenue",
      value: `$${monthlyRevenue.toFixed(2)}`,
      subtitle: "Recurring income",
      icon: DollarSign,
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-50 dark:bg-amber-950/30",
    },
    {
      title: "Avg Revenue/Restaurant",
      value: activeSubs > 0 ? `$${(monthlyRevenue / activeSubs).toFixed(2)}` : "$0.00",
      subtitle: "Per active subscription",
      icon: TrendingUp,
      color: "text-purple-600 dark:text-purple-400",
      bg: "bg-purple-50 dark:bg-purple-950/30",
    },
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-page-title">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Overview of your restaurant POS platform
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="p-5">
              {isLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-3 w-20" />
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <p className="text-sm text-muted-foreground font-medium">{stat.title}</p>
                    <div className={`w-8 h-8 rounded-md ${stat.bg} flex items-center justify-center flex-shrink-0`}>
                      <stat.icon className={`h-4 w-4 ${stat.color}`} />
                    </div>
                  </div>
                  <p className="text-2xl font-bold" data-testid={`text-stat-${stat.title.toLowerCase().replace(/\s/g, "-")}`}>
                    {stat.value}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{stat.subtitle}</p>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
            <CardTitle className="text-base">Recent Restaurants</CardTitle>
            <Badge variant="secondary">{totalRestaurants} total</Badge>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-8 w-8 rounded-md" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-32 mb-1" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                ))}
              </div>
            ) : restaurants?.length === 0 ? (
              <div className="text-center py-8">
                <Store className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">No restaurants yet</p>
                <p className="text-xs text-muted-foreground mt-1">Add your first restaurant to get started</p>
              </div>
            ) : (
              <div className="space-y-3">
                {restaurants?.slice(0, 5).map((restaurant) => (
                  <div key={restaurant.id} className="flex items-center gap-3" data-testid={`card-restaurant-${restaurant.id}`}>
                    <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                      <Store className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{restaurant.name}</p>
                      <p className="text-xs text-muted-foreground">{restaurant.ownerName}</p>
                    </div>
                    <Badge variant={restaurant.isActive ? "default" : "secondary"}>
                      {restaurant.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
            <CardTitle className="text-base">Subscription Status</CardTitle>
            <Badge variant="secondary">{activeSubs} active</Badge>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-8 w-8 rounded-md" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-32 mb-1" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                ))}
              </div>
            ) : subscriptions?.length === 0 ? (
              <div className="text-center py-8">
                <CreditCard className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">No subscriptions yet</p>
                <p className="text-xs text-muted-foreground mt-1">Create subscriptions for restaurants</p>
              </div>
            ) : (
              <div className="space-y-3">
                {subscriptions?.slice(0, 5).map((sub) => {
                  const statusColors: Record<string, string> = {
                    active: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400",
                    expired: "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400",
                    cancelled: "bg-gray-50 text-gray-700 dark:bg-gray-950/30 dark:text-gray-400",
                    trial: "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400",
                  };
                  return (
                    <div key={sub.id} className="flex items-center gap-3" data-testid={`card-subscription-${sub.id}`}>
                      <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium capitalize">{sub.plan} Plan</p>
                        <p className="text-xs text-muted-foreground">${sub.pricePerMonth}/month</p>
                      </div>
                      <Badge variant="outline" className={statusColors[sub.status] || ""}>
                        {sub.status}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
