import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, UtensilsCrossed, Shield, BarChart3, Clock } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

const registerSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginValues = z.infer<typeof loginSchema>;
type RegisterValues = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const { user, loginMutation, registerMutation } = useAuth();
  const [isRegister, setIsRegister] = useState(false);

  const loginForm = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  });

  const registerForm = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { username: "", password: "" },
  });

  if (user) {
    return <Redirect to="/" />;
  }

  const onLogin = (values: LoginValues) => {
    loginMutation.mutate(values);
  };

  const onRegister = (values: RegisterValues) => {
    registerMutation.mutate({ ...values, role: "admin", restaurantId: null });
  };

  const features = [
    { icon: UtensilsCrossed, title: "Full POS System", desc: "Manage orders, menus, and tables with ease" },
    { icon: Shield, title: "Subscription Management", desc: "Monthly billing with flexible plans" },
    { icon: BarChart3, title: "Revenue Tracking", desc: "Real-time analytics and reporting" },
    { icon: Clock, title: "Order History", desc: "Complete records of all transactions" },
  ];

  return (
    <div className="min-h-screen flex">
      <div className="flex-1 flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
                <UtensilsCrossed className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-semibold text-lg">RestoPOS</span>
            </div>
            <h1 className="text-2xl font-bold mt-4" data-testid="text-auth-title">
              {isRegister ? "Create an account" : "Welcome back"}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              {isRegister
                ? "Get started with your POS platform"
                : "Sign in to your account to continue"}
            </p>
          </div>

          {!isRegister ? (
            <Form {...loginForm}>
              <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                <FormField
                  control={loginForm.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter your username"
                          data-testid="input-login-username"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={loginForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Enter your password"
                          data-testid="input-login-password"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="w-full"
                  disabled={loginMutation.isPending}
                  data-testid="button-login"
                >
                  {loginMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Sign In
                </Button>
              </form>
            </Form>
          ) : (
            <Form {...registerForm}>
              <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-4">
                <FormField
                  control={registerForm.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Choose a username"
                          data-testid="input-register-username"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={registerForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Create a password"
                          data-testid="input-register-password"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="w-full"
                  disabled={registerMutation.isPending}
                  data-testid="button-register"
                >
                  {registerMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Account
                </Button>
              </form>
            </Form>
          )}

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => setIsRegister(!isRegister)}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              data-testid="button-toggle-auth"
            >
              {isRegister
                ? "Already have an account? Sign in"
                : "Don't have an account? Register"}
            </button>
          </div>
        </div>
      </div>

      <div className="hidden lg:flex flex-1 bg-primary p-12 items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-primary/80" />
        <div className="relative z-10 max-w-md text-primary-foreground">
          <h2 className="text-3xl font-bold mb-3">
            Restaurant POS Platform
          </h2>
          <p className="text-primary-foreground/80 mb-10 text-sm leading-relaxed">
            The complete point-of-sale system with built-in subscription management.
            Rent POS accounts to restaurants with monthly billing.
          </p>
          <div className="space-y-5">
            {features.map((feature) => (
              <div key={feature.title} className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-md bg-primary-foreground/10 flex items-center justify-center flex-shrink-0">
                  <feature.icon className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">{feature.title}</h3>
                  <p className="text-primary-foreground/70 text-xs mt-0.5">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
