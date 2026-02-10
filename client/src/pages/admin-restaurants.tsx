import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Store, Plus, Loader2, Phone, Mail, MapPin, Search, Power, PowerOff } from "lucide-react";
import type { Restaurant, Subscription } from "@shared/schema";

const createRestaurantSchema = z.object({
  name: z.string().min(1, "Restaurant name is required"),
  ownerName: z.string().min(1, "Owner name is required"),
  phone: z.string().min(1, "Phone is required"),
  email: z.string().email("Invalid email").or(z.literal("")).optional(),
  address: z.string().optional(),
  plan: z.enum(["basic", "standard", "premium"]),
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type CreateRestaurantValues = z.infer<typeof createRestaurantSchema>;

const planPrices = { basic: "29.99", standard: "59.99", premium: "99.99" };

export default function AdminRestaurants() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const { data: restaurants, isLoading } = useQuery<Restaurant[]>({
    queryKey: ["/api/restaurants"],
  });

  const { data: subscriptions } = useQuery<Subscription[]>({
    queryKey: ["/api/subscriptions"],
  });

  const form = useForm<CreateRestaurantValues>({
    resolver: zodResolver(createRestaurantSchema),
    defaultValues: {
      name: "",
      ownerName: "",
      phone: "",
      email: "",
      address: "",
      plan: "basic",
      username: "",
      password: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (values: CreateRestaurantValues) => {
      const res = await apiRequest("POST", "/api/restaurants", values);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/restaurants"] });
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions"] });
      setOpen(false);
      form.reset();
      toast({ title: "Restaurant created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create restaurant", description: error.message, variant: "destructive" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      const res = await apiRequest("PATCH", `/api/restaurants/${id}`, { isActive });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/restaurants"] });
      toast({ title: "Restaurant status updated" });
    },
  });

  const getSubscription = (restaurantId: number) =>
    subscriptions?.find((s) => s.restaurantId === restaurantId);

  const filtered = restaurants?.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.ownerName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Restaurants</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage restaurant accounts and access</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-restaurant">
              <Plus className="h-4 w-4 mr-2" />
              Add Restaurant
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Add New Restaurant</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit((v) => createMutation.mutate(v))} className="space-y-4 mt-2">
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Restaurant Name</FormLabel>
                      <FormControl><Input placeholder="Restaurant name" data-testid="input-restaurant-name" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="ownerName" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Owner Name</FormLabel>
                      <FormControl><Input placeholder="Owner name" data-testid="input-owner-name" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="phone" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl><Input placeholder="+1 234 567 890" data-testid="input-phone" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl><Input placeholder="email@example.com" data-testid="input-email" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="address" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl><Input placeholder="Restaurant address" data-testid="input-address" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="plan" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subscription Plan</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-plan">
                          <SelectValue placeholder="Select a plan" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="basic">Basic - $29.99/mo</SelectItem>
                        <SelectItem value="standard">Standard - $59.99/mo</SelectItem>
                        <SelectItem value="premium">Premium - $99.99/mo</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="border-t pt-4 mt-4">
                  <p className="text-sm font-medium mb-3">Login Credentials</p>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="username" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl><Input placeholder="Login username" data-testid="input-username" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="password" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl><Input type="password" placeholder="Login password" data-testid="input-password" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={createMutation.isPending} data-testid="button-submit-restaurant">
                  {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Restaurant
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search restaurants..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
          data-testid="input-search-restaurants"
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-5">
                <div className="space-y-3">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-8 w-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filtered?.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Store className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <p className="text-lg font-medium text-muted-foreground">No restaurants found</p>
            <p className="text-sm text-muted-foreground mt-1">
              {search ? "Try a different search term" : "Add your first restaurant to get started"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered?.map((restaurant) => {
            const sub = getSubscription(restaurant.id);
            return (
              <Card key={restaurant.id} className="hover-elevate" data-testid={`card-restaurant-${restaurant.id}`}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Store className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm">{restaurant.name}</h3>
                        <p className="text-xs text-muted-foreground">{restaurant.ownerName}</p>
                      </div>
                    </div>
                    <Badge variant={restaurant.isActive ? "default" : "secondary"}>
                      {restaurant.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>

                  <div className="space-y-1.5 mb-4">
                    {restaurant.phone && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        <span>{restaurant.phone}</span>
                      </div>
                    )}
                    {restaurant.email && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Mail className="h-3 w-3" />
                        <span>{restaurant.email}</span>
                      </div>
                    )}
                    {restaurant.address && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        <span>{restaurant.address}</span>
                      </div>
                    )}
                  </div>

                  {sub && (
                    <div className="flex items-center justify-between gap-2 p-2.5 rounded-md bg-muted/50 mb-3">
                      <div>
                        <p className="text-xs font-medium capitalize">{sub.plan} Plan</p>
                        <p className="text-xs text-muted-foreground">${sub.pricePerMonth}/mo</p>
                      </div>
                      <Badge variant="outline" className="text-xs capitalize">{sub.status}</Badge>
                    </div>
                  )}

                  <Button
                    variant={restaurant.isActive ? "outline" : "default"}
                    className="w-full"
                    size="sm"
                    onClick={() => toggleMutation.mutate({ id: restaurant.id, isActive: !restaurant.isActive })}
                    disabled={toggleMutation.isPending}
                    data-testid={`button-toggle-${restaurant.id}`}
                  >
                    {restaurant.isActive ? (
                      <><PowerOff className="h-3 w-3 mr-2" />Deactivate</>
                    ) : (
                      <><Power className="h-3 w-3 mr-2" />Activate</>
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
