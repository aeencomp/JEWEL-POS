import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient, getQueryFn } from "@/lib/queryClient";

export type DriverProfile = {
  id: number;
  name: string;
  phone: string;
  status: "offline" | "online" | "busy";
  vehicleType: string;
};

export function useDriverAuth() {
  const { data: driver, isLoading } = useQuery<DriverProfile | null>({
    queryKey: ["/api/driver/me"],
    queryFn: getQueryFn<DriverProfile | null>({ on401: "returnNull" }),
    retry: false,
  });

  const loginMutation = useMutation({
    mutationFn: async ({ phone, pin }: { phone: string; pin: string }) => {
      const res = await apiRequest("POST", "/api/driver/login", { phone, pin });
      return res.json() as Promise<DriverProfile>;
    },
    onSuccess: (d) => {
      queryClient.setQueryData(["/api/driver/me"], d);
    },
  });

  const logoutMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/driver/logout"),
    onSuccess: () => {
      queryClient.setQueryData(["/api/driver/me"], null);
      queryClient.removeQueries({ queryKey: ["/api/driver"] });
    },
  });

  const setStatusMutation = useMutation({
    mutationFn: (status: "online" | "offline" | "busy") =>
      apiRequest("PATCH", "/api/driver/status", { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/driver/me"] });
    },
  });

  return {
    driver: driver ?? null,
    isLoading,
    isAuthenticated: !!driver,
    loginMutation,
    logoutMutation,
    setStatusMutation,
  };
}
