import * as React from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AuthLayout } from "@/components/auth/auth-layout";
import {
  PasswordInput,
  AuthButton,
  AuthSuccessState,
  AuthErrorBanner,
} from "@/components/auth/auth-ui";
import {
  resetPasswordSchema,
  type ResetPasswordFormValues,
} from "@/lib/auth-schemas";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = React.useState(false);
  const [isSuccess, setIsSuccess] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (data: ResetPasswordFormValues) => {
    setIsLoading(true);
    setError(null);
    try {
      // Mock API call
      await new Promise((resolve) => setTimeout(resolve, 1500));
      setIsSuccess(true);
      toast.success("Password updated", {
        description: "You can now sign in with your new password.",
      });
    } catch (err) {
      setError("This reset link has expired or is invalid.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <AuthLayout title="Password updated">
        <AuthSuccessState
          title="Security updated"
          description="Your password has been successfully reset. Use your new credentials to sign in."
          action={
            <AuthButton onClick={() => navigate({ to: "/login" })}>
              Sign in to Brand Depot
            </AuthButton>
          }
        />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Set new password"
      subtitle="Choose a strong, unique password to secure your account"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {error && <AuthErrorBanner message={error} />}

        <PasswordInput
          label="New Password"
          placeholder="••••••••"
          showStrength
          error={errors.password?.message}
          isLoading={isLoading}
          {...register("password")}
        />

        <PasswordInput
          label="Confirm New Password"
          placeholder="••••••••"
          error={errors.confirmPassword?.message}
          isLoading={isLoading}
          {...register("confirmPassword")}
        />

        <AuthButton type="submit" isLoading={isLoading}>
          Reset password
        </AuthButton>
      </form>
    </AuthLayout>
  );
}
