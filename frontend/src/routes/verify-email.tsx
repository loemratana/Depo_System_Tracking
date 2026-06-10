import * as React from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AuthLayout } from "@/components/auth/auth-layout";
import {
  AuthButton,
  AuthErrorBanner,
} from "@/components/auth/auth-ui";
import { otpSchema, type OtpFormValues } from "@/lib/auth-schemas";
import { toast } from "sonner";
import { REGEXP_ONLY_DIGITS_AND_CHARS } from "input-otp";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

export const Route = createFileRoute("/verify-email")({
  component: VerifyEmailPage,
});

function VerifyEmailPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = React.useState(0);

  const {
    setValue,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<OtpFormValues>({
    resolver: zodResolver(otpSchema),
    defaultValues: {
      otp: "",
    },
  });

  const otpValue = watch("otp");

  const onSubmit = async (data: OtpFormValues) => {
    setIsLoading(true);
    setError(null);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1200));
      toast.success("Email verified", {
        description: "Your account is now fully activated.",
      });
      navigate({ to: "/login" });
    } catch (err) {
      setError("Invalid or expired verification code.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = () => {
    if (resendCooldown > 0) return;
    setResendCooldown(60);
    toast.info("Code resent", {
      description: "A new verification code has been sent to your email.",
    });
  };

  React.useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  return (
    <AuthLayout
      title="Verify your email"
      subtitle="We've sent a 6-digit code to your email address"
      backTo={{ href: "/login", label: "Back to login" }}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {error && <AuthErrorBanner message={error} />}

        <div className="flex flex-col items-center space-y-4">
          <InputOTP
            maxLength={6}
            pattern={REGEXP_ONLY_DIGITS_AND_CHARS}
            value={otpValue}
            onChange={(val) => setValue("otp", val)}
            disabled={isLoading}
          >
            <InputOTPGroup className="gap-2">
              <InputOTPSlot index={0} className="rounded-md border-border" />
              <InputOTPSlot index={1} className="rounded-md border-border" />
              <InputOTPSlot index={2} className="rounded-md border-border" />
              <InputOTPSlot index={3} className="rounded-md border-border" />
              <InputOTPSlot index={4} className="rounded-md border-border" />
              <InputOTPSlot index={5} className="rounded-md border-border" />
            </InputOTPGroup>
          </InputOTP>
          
          {errors.otp && (
            <p className="text-[11px] text-destructive">{errors.otp.message}</p>
          )}
        </div>

        <AuthButton type="submit" isLoading={isLoading} disabled={otpValue.length < 6}>
          Verify email
        </AuthButton>

        <div className="text-center">
          <p className="text-[13px] text-muted-foreground">
            Didn't receive the code?{" "}
            <button
              type="button"
              onClick={handleResend}
              disabled={resendCooldown > 0}
              className="font-medium text-foreground underline decoration-muted-foreground/30 underline-offset-4 transition-colors hover:text-primary hover:decoration-primary/50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
            </button>
          </p>
        </div>
      </form>
    </AuthLayout>
  );
}
