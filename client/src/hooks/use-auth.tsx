import { createContext, ReactNode, useContext, useState } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { User as SelectUser, InsertUser } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type UserWithImpersonation = SelectUser & {
  impersonatingStoreId?: number;
  impersonatingStoreName?: string;
};

type TwoFAResponse = {
  requires2FA: true;
  maskedEmail: string;
  message: string;
};

type AuthContextType = {
  user: UserWithImpersonation | null;
  isLoading: boolean;
  error: Error | null;
  isImpersonating: boolean;
  impersonatingStoreName: string | null;
  loginMutation: UseMutationResult<SelectUser | TwoFAResponse, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<SelectUser, Error, InsertUser>;
  impersonateMutation: UseMutationResult<UserWithImpersonation, Error, number>;
  stopImpersonateMutation: UseMutationResult<SelectUser, Error, void>;
  verify2FAMutation: UseMutationResult<SelectUser, Error, string>;
  resend2FAMutation: UseMutationResult<void, Error, void>;
  pending2FA: TwoFAResponse | null;
  clearPending2FA: () => void;
};

type LoginData = Pick<InsertUser, "username" | "password"> & { portal?: string };

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [pending2FA, setPending2FA] = useState<TwoFAResponse | null>(null);

  const {
    data: user,
    error,
    isLoading,
  } = useQuery<SelectUser | undefined, Error>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchInterval: 5 * 60 * 1000,
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      const res = await apiRequest("POST", "/api/login", credentials);
      return await res.json();
    },
    onSuccess: (data: SelectUser | TwoFAResponse) => {
      if ("requires2FA" in data && data.requires2FA) {
        setPending2FA(data as TwoFAResponse);
      } else {
        queryClient.setQueryData(["/api/user"], data);
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const verify2FAMutation = useMutation({
    mutationFn: async (code: string) => {
      const res = await apiRequest("POST", "/api/verify-2fa", { code });
      return await res.json();
    },
    onSuccess: (user: SelectUser) => {
      setPending2FA(null);
      queryClient.setQueryData(["/api/user"], user);
    },
    onError: (error: Error) => {
      toast({
        title: "Verification failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resend2FAMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/resend-2fa");
    },
    onSuccess: () => {
      toast({
        title: "Code resent",
        description: "A new verification code has been sent to your email.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to resend code",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (credentials: InsertUser) => {
      const res = await apiRequest("POST", "/api/register", credentials);
      return await res.json();
    },
    onSuccess: (user: SelectUser) => {
      queryClient.setQueryData(["/api/user"], user);
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/logout");
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/user"], null);
    },
    onError: (error: Error) => {
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const impersonateMutation = useMutation({
    mutationFn: async (storeId: number) => {
      const res = await apiRequest("POST", `/api/admin/impersonate/${storeId}`);
      return await res.json();
    },
    onSuccess: (data: UserWithImpersonation) => {
      queryClient.setQueryData(["/api/user"], data);
      queryClient.invalidateQueries({ queryKey: ["/api/store/branding"] });
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/repairs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/layaways"] });
      window.location.href = "/";
    },
    onError: (error: Error) => {
      toast({
        title: "Impersonation failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const stopImpersonateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/stop-impersonate");
      return await res.json();
    },
    onSuccess: (data: SelectUser) => {
      queryClient.setQueryData(["/api/user"], data);
      queryClient.invalidateQueries({ queryKey: ["/api/stores"] });
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions"] });
      window.location.href = "/";
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to stop impersonation",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const isImpersonating = !!(user as UserWithImpersonation)?.impersonatingStoreId;
  const impersonatingStoreName = (user as UserWithImpersonation)?.impersonatingStoreName || null;

  const clearPending2FA = () => setPending2FA(null);

  return (
    <AuthContext.Provider
      value={{
        user: (user as UserWithImpersonation) ?? null,
        isLoading,
        error,
        isImpersonating,
        impersonatingStoreName,
        loginMutation,
        logoutMutation,
        registerMutation,
        impersonateMutation,
        stopImpersonateMutation,
        verify2FAMutation,
        resend2FAMutation,
        pending2FA,
        clearPending2FA,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
