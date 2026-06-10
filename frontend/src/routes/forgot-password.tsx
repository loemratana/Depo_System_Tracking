import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AuthLayout } from "@/components/auth/auth-layout";
import {
  AuthInput,
  AuthButton,
  AuthSuccessState,
} from "@/components/auth/auth-ui";
import {
  forgotPasswordSchema,
  type ForgotPasswordFormValues,
} from "@/lib/auth-schemas";

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = React.useState(false);
  const [isSubmitted, setIsSubmitted] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async (data: ForgotPasswordFormValues) => {
    setIsLoading(true);
    try {
      // Mock API call
      await new Promise((resolve) => setTimeout(resolve, 1200));
      setIsSubmitted(true);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <AuthLayout title="Check your email">
        <AuthSuccessState
          title="Reset link sent"
          description="If an account exists for that email, we've sent a password reset link."
          action={
            <div className="space-y-3">
              <AuthButton
                variant="secondary"
                onClick={() => setIsSubmitted(false)}
              >
                Try a different email
              </AuthButton>
              <Link to="/login" className="block text-[13px] text-muted-foreground hover:text-foreground">
                Back to login
              </Link>
            </div>
          }
        />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Reset your password"
      subtitle="Enter your email and we'll send you a recovery link"
      backTo={{ href: "/login", label: "Back to login" }}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <AuthInput
          label="Email address"
          type="email"
          placeholder="name@company.com"
          error={errors.email?.message}
          isLoading={isLoading}
          {...register("email")}
        />

        <AuthButton type="submit" isLoading={isLoading}>
          Send reset link
        </AuthButton>

        <p className="text-[12px] text-muted-foreground leading-relaxed">
          If you don't receive an email within a few minutes, please check your
          spam folder or contact support.
        </p>
      </form>
    </AuthLayout>
  );
}
