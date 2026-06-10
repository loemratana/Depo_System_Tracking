import * as React from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AuthLayout } from "@/components/auth/auth-layout";
import { AuthInput, PasswordInput, AuthButton, AuthErrorBanner } from "@/components/auth/auth-ui";
import { registerSchema, type RegisterFormValues } from "@/lib/auth-schemas";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/register")({
  component: RegisterPage,
});

function RegisterPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const { register: registerUser } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: "",
      email: "",
      role: "manager", // pre-fill
      password: "",
      confirmPassword: "",
      // terms: true,                // uncomment if schema requires it
    },
  });

  const onSubmit = async (data: RegisterFormValues) => {
    setIsLoading(true);
    setError(null);
    try {
      const payload = {
        email: data.email,
        password: data.password,
        fullName: data.fullName,
        role: data.role,
        // Do NOT include 'role' – backend doesn't expect it
      };
      console.log("Sending payload:", payload);
      await registerUser(payload);
      toast.success("Account created! Please sign in.");
      navigate("/login");
    } catch (err: any) {
      console.error("Registration error:", err.response?.data);
      let errorMsg = err.message;
      if (err.response?.data?.message) errorMsg = err.response.data.message;
      else if (err.response?.data?.errors?.length) errorMsg = err.response.data.errors[0].message;
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <AuthLayout title="Create an account" subtitle="Join Brand Depot to start tracking operations">
      <div className="space-y-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && <AuthErrorBanner message={error} />}

          {/* Hidden fields to satisfy validation */}
          <input type="hidden" {...register("workspace")} />
          <input type="hidden" {...register("role")} />

          <AuthInput
            label="Full name"
            placeholder="John Doe"
            error={errors.fullName?.message}
            isLoading={isLoading}
            {...register("fullName")}
          />

          <AuthInput
            label="Email address"
            type="email"
            placeholder="name@company.com"
            error={errors.email?.message}
            isLoading={isLoading}
            {...register("email")}
          />

          <div className="space-y-1.5">
            <label className="block text-[12px] font-medium text-foreground">Your Role</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: "manager", label: "Manager" },
                { id: "field_agent", label: "Field Agent" },
              ].map((role) => (
                <label
                  key={role.id}
                  className="relative flex cursor-pointer items-center justify-center rounded-[6px] border border-border bg-background px-3 py-2 transition-all hover:bg-accent has-[:checked]:border-primary/50 has-[:checked]:bg-primary/5"
                >
                  <input
                    type="radio"
                    className="sr-only"
                    value={role.id}
                    defaultChecked={role.id === "manager"}
                    {...register("role")}
                  />
                  <span className="text-[12px] font-medium text-foreground">{role.label}</span>
                </label>
              ))}
            </div>
            {errors.role && <p className="text-[11px] text-destructive">{errors.role.message}</p>}
          </div>

          <PasswordInput
            label="Password"
            placeholder="••••••••"
            showStrength
            error={errors.password?.message}
            isLoading={isLoading}
            {...register("password")}
          />

          <PasswordInput
            label="Confirm Password"
            placeholder="••••••••"
            error={errors.confirmPassword?.message}
            isLoading={isLoading}
            {...register("confirmPassword")}
          />

          <AuthButton type="submit" isLoading={isLoading} className="mt-2">
            Create account
          </AuthButton>
        </form>

        <p className="text-center text-[13px] text-muted-foreground">
          Already have an account?{" "}
          <Link
            to="/login"
            className="font-medium text-foreground underline decoration-muted-foreground/30 underline-offset-4 transition-colors hover:text-primary hover:decoration-primary/50"
          >
            Sign in
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
