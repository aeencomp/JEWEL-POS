import { useMemo, useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from "@/hooks/use-auth";
import {
  Store as StoreIcon,
  Plus,
  Loader2,
  Phone,
  Mail,
  MapPin,
  Power,
  PowerOff,
  Trash2,
  Pencil,
  Eye,
  User,
  KeyRound,
  Gem,
  Droplets,
  Shirt,
  Utensils,
  ShieldCheck,
  RotateCcw,
} from "lucide-react";
import { posSystemLabel, type PosSystem } from "@/lib/pos-system";
import { useQueryParam } from "@/hooks/use-query-param";

const POS_TYPE_OPTIONS = [
  { value: "jewel" as const, label: "JewelPOS", sub: "Jewelry store", Icon: Gem, color: "#d4a574" },
  { value: "fashion" as const, label: "FashionPOS", sub: "Clothing store", Icon: Shirt, color: "#db2777" },
  { value: "oil" as const, label: "FactoryPOS", sub: "Oil factory ERP", Icon: Droplets, color: "#06b6d4" },
  { value: "restaurant" as const, label: "RestoPOS", sub: "Restaurant & café", Icon: Utensils, color: "#ea580c" },
];

function storePosMeta(posSystem: string) {
  return POS_TYPE_OPTIONS.find((o) => o.value === posSystem) ?? POS_TYPE_OPTIONS[0];
}
import type { Store } from "@shared/schema";

type StoreWithUsername = Store & { storeUsername?: string | null };

const OIL_FEATURES = [
  { key: "pos", label: "POS", labelAr: "نقطة البيع" },
  { key: "inventory", label: "Inventory", labelAr: "المخزون" },
  { key: "sales", label: "Sales", labelAr: "المبيعات" },
  { key: "purchases", label: "Purchases", labelAr: "المشتريات" },
  { key: "production", label: "Production", labelAr: "الإنتاج" },
  { key: "customers", label: "Customers", labelAr: "العملاء" },
  { key: "suppliers", label: "Suppliers", labelAr: "الموردون" },
  { key: "expenses", label: "Expenses", labelAr: "المصاريف" },
  { key: "debts", label: "Debts", labelAr: "الديون" },
  { key: "delivery", label: "Delivery Notes", labelAr: "وصولات التسليم" },
  { key: "batch", label: "Product Records", labelAr: "سجل المنتجات" },
];

const createStoreSchema = z.object({
  name: z.string().min(1, "Store name is required"),
  ownerName: z.string().min(1, "Owner name is required"),
  phone: z.string().min(1, "Phone is required"),
  email: z.string().email("Invalid email").or(z.literal("")).optional(),
  address: z.string().optional(),
  posSystem: z.enum(["jewel", "oil", "fashion", "restaurant"]),
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type CreateStoreValues = z.infer<typeof createStoreSchema>;

const editStoreSchema = z.object({
  name: z.string().min(1, "Store name is required"),
  ownerName: z.string().min(1, "Owner name is required"),
  phone: z.string().min(1, "Phone is required"),
  email: z.string().email("Invalid email").or(z.literal("")).optional(),
  address: z.string().optional(),
  posSystem: z.enum(["jewel", "oil", "fashion", "restaurant"]).optional(),
  password: z.string().min(6, "Password must be at least 6 characters").or(z.literal("")).optional(),
});

type EditStoreValues = z.infer<typeof editStoreSchema>;

export default function AdminStores() {
  const { toast } = useToast();
  const { t } = useLanguage();
  const { impersonateMutation } = useAuth();
  const [open, setOpen] = useState(false);
  const [editStore, setEditStore] = useState<Store | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Store | null>(null);
  const [resetPasswordStore, setResetPasswordStore] = useState<Store | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [permissionsStore, setPermissionsStore] = useState<Store | null>(null);
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [clearDataTarget, setClearDataTarget] = useState<Store | null>(null);

  const statusFilter = useQueryParam("status");

  const { data: stores, isLoading } = useQuery<StoreWithUsername[]>({
    queryKey: ["/api/stores"],
  });

  const displayedStores = useMemo(() => {
    if (!stores) return [];
    if (statusFilter === "active") return stores.filter((s) => s.isActive);
    if (statusFilter === "inactive") return stores.filter((s) => !s.isActive);
    return stores;
  }, [stores, statusFilter]);

  const form = useForm<CreateStoreValues>({
    resolver: zodResolver(createStoreSchema),
    defaultValues: {
      name: "",
      ownerName: "",
      phone: "",
      email: "",
      address: "",
      posSystem: "jewel",
      username: "",
      password: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (values: CreateStoreValues) => {
      const res = await apiRequest("POST", "/api/stores", values);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stores"] });
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions"] });
      setOpen(false);
      form.reset();
      toast({ title: t("admin.addStore") });
    },
    onError: (error: Error) => {
      toast({
        title: t("admin.addStore"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const editForm = useForm<EditStoreValues>({
    resolver: zodResolver(editStoreSchema),
    defaultValues: {
      name: "",
      ownerName: "",
      phone: "",
      email: "",
      address: "",
      password: "",
    },
  });

  const editMutation = useMutation({
    mutationFn: async ({ id, values }: { id: number; values: EditStoreValues }) => {
      const res = await apiRequest("PATCH", `/api/stores/${id}`, values);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stores"] });
      setEditStore(null);
      toast({ title: t("admin.editStore") });
    },
    onError: (error: Error) => {
      toast({
        title: t("admin.editStore"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const openEditDialog = (store: Store) => {
    editForm.reset({
      name: store.name,
      ownerName: store.ownerName,
      phone: store.phone || "",
      email: store.email || "",
      address: store.address || "",
      posSystem: (store.posSystem as PosSystem) || "jewel",
      password: "",
    });
    setEditStore(store);
  };

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      const res = await apiRequest("PATCH", `/api/stores/${id}`, { isActive });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stores"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/stores/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stores"] });
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions"] });
      setDeleteTarget(null);
      toast({ title: t("common.delete") });
    },
    onError: (error: Error) => {
      toast({
        title: t("common.delete"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async ({ id, password }: { id: number; password: string }) => {
      const res = await apiRequest("POST", `/api/stores/${id}/reset-password`, { password });
      return res.json();
    },
    onSuccess: () => {
      setResetPasswordStore(null);
      setNewPassword("");
      toast({ title: t("admin.resetPassword") });
    },
    onError: (error: Error) => {
      toast({ title: t("admin.resetPassword"), description: error.message, variant: "destructive" });
    },
  });

  const featuresMutation = useMutation({
    mutationFn: async ({ id, features }: { id: number; features: string[] }) => {
      const res = await apiRequest("PATCH", `/api/stores/${id}`, {
        features: features.length === OIL_FEATURES.length ? null : JSON.stringify(features),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stores"] });
      setPermissionsStore(null);
      toast({ title: "Permissions updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update permissions", description: error.message, variant: "destructive" });
    },
  });

  const clearDataMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("POST", `/api/admin/reset-oil-store/${id}`);
    },
    onSuccess: () => {
      setClearDataTarget(null);
      toast({ title: "Store data cleared successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to clear data", description: error.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" data-testid="loading-spinner" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-2xl font-bold" data-testid="text-page-title">
          {t("admin.addStore").replace(/^Add /, "")}s
        </h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-store">
              <Plus className="h-4 w-4 me-2" />
              {t("admin.addStore")}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{t("admin.addStore")}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit((v) => createMutation.mutate(v))}
                className="space-y-4 mt-2"
              >
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("admin.storeName")}</FormLabel>
                        <FormControl>
                          <Input
                            placeholder={t("admin.storeName")}
                            data-testid="input-store-name"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="ownerName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("admin.owner")}</FormLabel>
                        <FormControl>
                          <Input
                            placeholder={t("admin.owner")}
                            data-testid="input-owner-name"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("admin.phone")}</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="+964 xxx xxx xxxx"
                            data-testid="input-phone"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("admin.email")}</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="email@example.com"
                            data-testid="input-email"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("admin.address")}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t("admin.address")}
                          data-testid="input-address"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="posSystem"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>POS System</FormLabel>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {POS_TYPE_OPTIONS.map(({ value, label, sub, Icon, color }) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => field.onChange(value)}
                            className={`flex items-center gap-3 p-3 rounded-xl border-2 text-start transition-all ${
                              field.value === value
                                ? "border-primary bg-primary/5"
                                : "border-border hover:border-muted-foreground/40"
                            }`}
                            data-testid={`button-pos-${value}`}
                          >
                            <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: color + "20" }}>
                              <Icon className="h-5 w-5" style={{ color }} />
                            </div>
                            <div>
                              <p className="font-semibold text-sm">{label}</p>
                              <p className="text-xs text-muted-foreground">{sub}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="border-t pt-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("admin.username")}</FormLabel>
                          <FormControl>
                            <Input
                              placeholder={t("admin.username")}
                              data-testid="input-username"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("admin.password")}</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder={t("admin.password")}
                              data-testid="input-password"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setOpen(false)}
                    data-testid="button-cancel"
                  >
                    {t("common.cancel")}
                  </Button>
                  <Button
                    type="submit"
                    disabled={createMutation.isPending}
                    data-testid="button-save-store"
                  >
                    {createMutation.isPending && (
                      <Loader2 className="me-2 h-4 w-4 animate-spin" />
                    )}
                    {t("common.save")}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {statusFilter && (
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">
            {statusFilter === "active"
              ? (t("admin.activeStores"))
              : (t("common.inactive"))}
          </Badge>
          <Link href="/restaurants" className="text-sm text-primary hover:underline">
            {t("inventory.showAll")}
          </Link>
        </div>
      )}

      {displayedStores.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <StoreIcon className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <p className="text-lg font-medium text-muted-foreground">
              {t("common.noData")}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayedStores.map((store) => (
            <Card
              key={store.id}
              className="hover-elevate"
              data-testid={`card-store-${store.id}`}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-3">
                    {(() => {
                      const meta = storePosMeta(store.posSystem);
                      const Icon = meta.Icon;
                      return (
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: meta.color + "20" }}
                    >
                      <Icon className="h-5 w-5" style={{ color: meta.color }} />
                    </div>
                      );
                    })()}
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3
                          className="font-semibold text-sm"
                          data-testid={`text-store-name-${store.id}`}
                        >
                          {store.name}
                        </h3>
                        <span
                          className="text-[10px] font-bold px-1.5 py-0.5 rounded-md"
                          style={{
                            backgroundColor: storePosMeta(store.posSystem).color + "15",
                            color: storePosMeta(store.posSystem).color,
                          }}
                        >
                          {posSystemLabel(store.posSystem as PosSystem, false)}
                        </span>
                      </div>
                      <p
                        className="text-xs text-muted-foreground"
                        data-testid={`text-store-owner-${store.id}`}
                      >
                        {store.ownerName}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant={store.isActive ? "default" : "secondary"}
                    data-testid={`badge-store-status-${store.id}`}
                  >
                    {store.isActive ? t("common.active") : t("common.inactive")}
                  </Badge>
                </div>

                <div className="space-y-1.5 mb-4">
                  {store.phone && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Phone className="h-3 w-3" />
                      <span data-testid={`text-store-phone-${store.id}`}>
                        {store.phone}
                      </span>
                    </div>
                  )}
                  {store.email && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Mail className="h-3 w-3" />
                      <span data-testid={`text-store-email-${store.id}`}>
                        {store.email}
                      </span>
                    </div>
                  )}
                  {store.address && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      <span>{store.address}</span>
                    </div>
                  )}
                  {(store as StoreWithUsername).storeUsername && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <User className="h-3 w-3" />
                      <span data-testid={`text-store-username-${store.id}`}>
                        {t("auth.username")}: <span className="font-medium text-foreground">{(store as StoreWithUsername).storeUsername}</span>
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant={store.isActive ? "outline" : "default"}
                    className="flex-1"
                    size="sm"
                    onClick={() =>
                      toggleMutation.mutate({
                        id: store.id,
                        isActive: !store.isActive,
                      })
                    }
                    disabled={toggleMutation.isPending}
                    data-testid={`button-toggle-${store.id}`}
                  >
                    {store.isActive ? (
                      <>
                        <PowerOff className="h-3 w-3 me-2" />
                        {t("common.inactive")}
                      </>
                    ) : (
                      <>
                        <Power className="h-3 w-3 me-2" />
                        {t("common.active")}
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="flex-shrink-0"
                    onClick={() => impersonateMutation.mutate(store.id)}
                    disabled={impersonateMutation.isPending}
                    data-testid={`button-impersonate-store-${store.id}`}
                    title={t("admin.viewStore")}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="flex-shrink-0"
                    onClick={() => openEditDialog(store)}
                    data-testid={`button-edit-store-${store.id}`}
                    title={t("admin.editStore")}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="flex-shrink-0 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/30 border-amber-200 dark:border-amber-800"
                    onClick={() => { setResetPasswordStore(store); setNewPassword(""); }}
                    data-testid={`button-reset-password-${store.id}`}
                    title={t("admin.resetPassword")}
                  >
                    <KeyRound className="h-4 w-4" />
                  </Button>
                  {store.posSystem === "oil" && (
                    <Button
                      variant="outline"
                      size="icon"
                      className="flex-shrink-0 text-cyan-600 hover:text-cyan-700 hover:bg-cyan-50 dark:hover:bg-cyan-950/30 border-cyan-200 dark:border-cyan-800"
                      onClick={() => {
                        const existing = store.features;
                        const parsed = existing ? JSON.parse(existing) as string[] : OIL_FEATURES.map(f => f.key);
                        setSelectedFeatures(parsed);
                        setPermissionsStore(store);
                      }}
                      data-testid={`button-permissions-${store.id}`}
                      title="Module Permissions"
                    >
                      <ShieldCheck className="h-4 w-4" />
                    </Button>
                  )}
                  {store.posSystem === "oil" && (
                    <Button
                      variant="outline"
                      size="icon"
                      className="flex-shrink-0 text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-950/30 border-orange-200 dark:border-orange-800"
                      onClick={() => setClearDataTarget(store)}
                      data-testid={`button-clear-data-${store.id}`}
                      title="Clear All Store Data"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="icon"
                    className="text-destructive flex-shrink-0"
                    onClick={() => setDeleteTarget(store)}
                    data-testid={`button-delete-store-${store.id}`}
                    title={t("common.delete")}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!editStore} onOpenChange={(v) => !v && setEditStore(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("admin.editStore")}</DialogTitle>
          </DialogHeader>
          <Form {...editForm}>
            <form
              onSubmit={editForm.handleSubmit((v) =>
                editStore && editMutation.mutate({ id: editStore.id, values: v })
              )}
              className="space-y-4 mt-2"
            >
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("admin.storeName")}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t("admin.storeName")}
                          data-testid="input-edit-store-name"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="ownerName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("admin.owner")}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t("admin.owner")}
                          data-testid="input-edit-owner-name"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("admin.phone")}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="+964 xxx xxx xxxx"
                          data-testid="input-edit-phone"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("admin.email")}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="email@example.com"
                          data-testid="input-edit-email"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={editForm.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("admin.address")}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t("admin.address")}
                        data-testid="input-edit-address"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="posSystem"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>POS System</FormLabel>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {POS_TYPE_OPTIONS.map(({ value, label, sub, Icon, color }) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => field.onChange(value)}
                          className={`flex items-center gap-3 p-3 rounded-xl border-2 text-start transition-all ${
                            field.value === value
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-muted-foreground/40"
                          }`}
                          data-testid={`button-edit-pos-${value}`}
                        >
                          <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: color + "20" }}>
                            <Icon className="h-5 w-5" style={{ color }} />
                          </div>
                          <div>
                            <p className="font-semibold text-sm">{label}</p>
                            <p className="text-xs text-muted-foreground">{sub}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="border-t pt-4 mt-4">
                <FormField
                  control={editForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("admin.password")}</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder={t("admin.newPasswordPlaceholder")}
                          data-testid="input-edit-password"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditStore(null)}
                  data-testid="button-cancel-edit"
                >
                  {t("common.cancel")}
                </Button>
                <Button
                  type="submit"
                  disabled={editMutation.isPending}
                  data-testid="button-save-edit"
                >
                  {editMutation.isPending && (
                    <Loader2 className="me-2 h-4 w-4 animate-spin" />
                  )}
                  {t("common.save")}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* ── Reset Password Dialog ── */}
      <Dialog
        open={!!resetPasswordStore}
        onOpenChange={(v) => { if (!v) { setResetPasswordStore(null); setNewPassword(""); } }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-amber-600" />
              {t("admin.resetPassword")}
            </DialogTitle>
            <DialogDescription>
              {resetPasswordStore?.name} — {t("admin.resetPasswordDesc")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <label className="text-sm font-medium">{t("admin.password")}</label>
            <Input
              type="password"
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              data-testid="input-reset-password"
              autoFocus
            />
            {newPassword.length > 0 && newPassword.length < 6 && (
              <p className="text-xs text-destructive">Minimum 6 characters</p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setResetPasswordStore(null); setNewPassword(""); }}
              data-testid="button-cancel-reset-password"
            >
              {t("common.cancel")}
            </Button>
            <Button
              onClick={() => resetPasswordStore && resetPasswordMutation.mutate({ id: resetPasswordStore.id, password: newPassword })}
              disabled={newPassword.length < 6 || resetPasswordMutation.isPending}
              className="bg-amber-600 hover:bg-amber-700 text-white"
              data-testid="button-confirm-reset-password"
            >
              {resetPasswordMutation.isPending && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
              {t("admin.resetPassword")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Module Permissions Dialog (OilPOS only) ── */}
      <Dialog open={!!permissionsStore} onOpenChange={(v) => !v && setPermissionsStore(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-cyan-600" />
              Module Permissions — {permissionsStore?.name}
            </DialogTitle>
            <DialogDescription>
              Choose which modules are accessible for this FactoryPOS store.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2 py-2">
            {OIL_FEATURES.map(f => {
              const enabled = selectedFeatures.includes(f.key);
              return (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setSelectedFeatures(prev =>
                    enabled ? prev.filter(x => x !== f.key) : [...prev, f.key]
                  )}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-start transition-all text-sm ${
                    enabled
                      ? "border-cyan-500 bg-cyan-50 dark:bg-cyan-950/30 text-cyan-700 dark:text-cyan-300 font-medium"
                      : "border-border text-muted-foreground hover:border-muted-foreground/40"
                  }`}
                  data-testid={`toggle-feature-${f.key}`}
                >
                  <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${enabled ? "bg-cyan-500 border-cyan-500" : "border-muted-foreground/40"}`} />
                  {f.label}
                </button>
              );
            })}
          </div>
          <div className="flex items-center justify-between pt-2 border-t">
            <button
              type="button"
              className="text-xs text-muted-foreground hover:text-foreground underline"
              onClick={() => setSelectedFeatures(OIL_FEATURES.map(f => f.key))}
            >
              Select All
            </button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setPermissionsStore(null)}>Cancel</Button>
              <Button
                className="bg-cyan-600 hover:bg-cyan-700 text-white"
                disabled={featuresMutation.isPending || selectedFeatures.length === 0}
                onClick={() => permissionsStore && featuresMutation.mutate({ id: permissionsStore.id, features: selectedFeatures })}
                data-testid="button-save-permissions"
              >
                {featuresMutation.isPending && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
                Save Permissions
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Clear Store Data Dialog (OilPOS only) ── */}
      <AlertDialog open={!!clearDataTarget} onOpenChange={(v) => !v && setClearDataTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-orange-600" />
              Clear All Data — {clearDataTarget?.name}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span className="block">This will permanently delete <strong>all</strong> data for this store:</span>
              <span className="block text-sm">Products, inventory, sales, purchases, production batches, customers, suppliers, debts, batch records, and delivery notes.</span>
              <span className="block font-semibold text-orange-600 dark:text-orange-400">The store account and settings will remain. This action cannot be undone.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-clear-data">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-orange-600 hover:bg-orange-700 text-white border-orange-600"
              onClick={() => clearDataTarget && clearDataMutation.mutate(clearDataTarget.id)}
              disabled={clearDataMutation.isPending}
              data-testid="button-confirm-clear-data"
            >
              {clearDataMutation.isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              Yes, Clear All Data
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("common.delete")} - {deleteTarget?.name}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("admin.deleteStoreConfirm")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground border-destructive"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
