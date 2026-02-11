import { useState } from "react";
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
} from "lucide-react";
import type { Store } from "@shared/schema";

const createStoreSchema = z.object({
  name: z.string().min(1, "Store name is required"),
  ownerName: z.string().min(1, "Owner name is required"),
  phone: z.string().min(1, "Phone is required"),
  email: z.string().email("Invalid email").or(z.literal("")).optional(),
  address: z.string().optional(),
  plan: z.enum(["basic", "standard", "premium"]),
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
});

type EditStoreValues = z.infer<typeof editStoreSchema>;

export default function AdminStores() {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [editStore, setEditStore] = useState<Store | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Store | null>(null);

  const { data: stores, isLoading } = useQuery<Store[]>({
    queryKey: ["/api/stores"],
  });

  const form = useForm<CreateStoreValues>({
    resolver: zodResolver(createStoreSchema),
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
                  name="plan"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("admin.selectPlan")}</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-plan">
                            <SelectValue placeholder={t("admin.selectPlan")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="basic">
                            {t("common.basic")} - 35,000 {t("common.currency")}
                          </SelectItem>
                          <SelectItem value="standard">
                            {t("common.standard")} - 75,000 {t("common.currency")}
                          </SelectItem>
                          <SelectItem value="premium">
                            {t("common.premium")} - 125,000 {t("common.currency")}
                          </SelectItem>
                        </SelectContent>
                      </Select>
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

      {stores?.length === 0 ? (
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
          {stores?.map((store) => (
            <Card
              key={store.id}
              className="hover-elevate"
              data-testid={`card-store-${store.id}`}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <StoreIcon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3
                        className="font-semibold text-sm"
                        data-testid={`text-store-name-${store.id}`}
                      >
                        {store.name}
                      </h3>
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
                    onClick={() => openEditDialog(store)}
                    data-testid={`button-edit-store-${store.id}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="text-destructive flex-shrink-0"
                    onClick={() => setDeleteTarget(store)}
                    data-testid={`button-delete-store-${store.id}`}
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
