import * as React from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AuthLayout } from "@/components/auth/auth-layout";
import {
  AuthInput,
  PasswordInput,
  AuthButton,
  AuthCheckbox,
  AuthDivider,
  SSOButton,
  AuthErrorBanner,
} from "@/components/auth/auth-ui";
import { loginSchema, type LoginFormValues } from "@/lib/auth-schemas";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const { login, status } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      remember: false,
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    setError(null);
    try {
      await login(data.email, data.password, data.remember);
      toast.success("Welcome back!", {
        description: "Successfully signed in to your account.",
      });
      navigate({ to: "/" });
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const isLoading = status === "loading";

  return (
    <AuthLayout
      title="Sign in to Brand Depot"
      subtitle="Enter your credentials to access your workspace"
    >
      <div className="space-y-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && <AuthErrorBanner message={error} />}

          <AuthInput
            label="Email address"
            type="email"
            placeholder="name@company.com"
            autoComplete="email"
            error={errors.email?.message}
            isLoading={isLoading}
            {...register("email")}
          />

          <div className="space-y-1">
            <PasswordInput
              label="Password"
              placeholder="••••••••"
              autoComplete="current-password"
              error={errors.password?.message}
              isLoading={isLoading}
              {...register("password")}
            />
            <div className="flex justify-end">
              <Link
                to="/forgot-password"
                className="text-[12px] text-muted-foreground transition-colors hover:text-primary"
              >
                Forgot password?
              </Link>
            </div>
          </div>

          {/* <AuthCheckbox
            id="remember"
            label="Remember this device"
            {...register("remember")}
          /> */}

          <AuthButton type="submit" isLoading={isLoading} className="mt-2">
            Sign in
          </AuthButton>
        </form>

        <AuthDivider label="or continue with" />

        {/* <div className="grid grid-cols-1 gap-3">
          <SSOButton provider="google" onClick={() => {}} />
          <SSOButton provider="microsoft" onClick={() => {}} />
        </div> */}

        <p className="text-center text-[13px] text-muted-foreground">
          Don't have an account?{" "}
          <Link
            to="/register"
            className="font-medium text-foreground underline decoration-muted-foreground/30 underline-offset-4 transition-colors hover:text-primary hover:decoration-primary/50"
          >
            Create an account
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
