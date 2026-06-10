import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Eye, EyeOff, Check, X } from "lucide-react";
import { getPasswordStrength } from "@/lib/auth-schemas";

// ─── AuthInput ─────────────────────────────────────────────────────────────────
interface AuthInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
  isLoading?: boolean;
  rightSlot?: React.ReactNode;
}

export const AuthInput = React.forwardRef<HTMLInputElement, AuthInputProps>(
  ({ label, error, hint, isLoading, rightSlot, className, id, ...props }, ref) => {
    const inputId = id ?? label.toLowerCase().replace(/\s+/g, "-");
    const hasError = !!error;

    return (
      <div className="space-y-1.5">
        <label
          htmlFor={inputId}
          className="block text-[12px] font-medium text-foreground"
        >
          {label}
        </label>
        <div className="relative">
          <input
            id={inputId}
            ref={ref}
            disabled={isLoading}
            className={cn(
              "w-full rounded-[6px] border border-border bg-background px-3 py-[7px] text-[13px] text-foreground placeholder:text-muted-foreground/50",
              "outline-none transition-shadow duration-150",
              "focus:border-ring/60 focus:ring-2 focus:ring-ring/20",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              hasError && "border-destructive/60 focus:ring-destructive/20 focus:border-destructive/60",
              rightSlot && "pr-9",
              className
            )}
            {...props}
          />
          {rightSlot && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
              {rightSlot}
            </div>
          )}
        </div>
        <AnimatePresence mode="wait">
          {hasError && (
            <motion.p
              key="error"
              initial={{ opacity: 0, y: -2 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -2 }}
              transition={{ duration: 0.14 }}
              className="flex items-center gap-1 text-[11px] text-destructive"
            >
              <X className="h-3 w-3 flex-shrink-0" />
              {error}
            </motion.p>
          )}
          {!hasError && hint && (
            <motion.p
              key="hint"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-[11px] text-muted-foreground"
            >
              {hint}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    );
  }
);
AuthInput.displayName = "AuthInput";

// ─── PasswordInput ─────────────────────────────────────────────────────────────
interface PasswordInputProps extends Omit<AuthInputProps, "type" | "rightSlot"> {
  showStrength?: boolean;
}

export const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ showStrength, ...props }, ref) => {
    const [show, setShow] = React.useState(false);
    const value = (props.value as string) ?? "";
    const strength = showStrength ? getPasswordStrength(value) : null;

    return (
      <div className="space-y-2">
        <AuthInput
          ref={ref}
          type={show ? "text" : "password"}
          {...props}
          rightSlot={
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShow((s) => !s)}
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              {show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </button>
          }
        />
        {showStrength && value.length > 0 && strength && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-1.5"
          >
            {/* Strength bar */}
            <div className="flex gap-1">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-[3px] flex-1 rounded-full transition-all duration-300"
                  style={{
                    background: i <= strength.score ? strength.color : "var(--border)",
                  }}
                />
              ))}
            </div>
            {strength.label && (
              <p
                className="text-[11px] font-medium"
                style={{ color: strength.color }}
              >
                {strength.label}
              </p>
            )}
          </motion.div>
        )}
      </div>
    );
  }
);
PasswordInput.displayName = "PasswordInput";

// ─── AuthButton ────────────────────────────────────────────────────────────────
interface AuthButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  variant?: "primary" | "secondary" | "ghost";
}

export function AuthButton({
  children,
  isLoading,
  variant = "primary",
  className,
  disabled,
  ...props
}: AuthButtonProps) {
  return (
    <button
      disabled={disabled ?? isLoading}
      className={cn(
        "relative inline-flex w-full items-center justify-center rounded-[6px] px-4 py-[8px] text-[13px] font-medium transition-all duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        variant === "primary" &&
          "bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.99]",
        variant === "secondary" &&
          "border border-border bg-background text-foreground hover:bg-accent active:scale-[0.99]",
        variant === "ghost" &&
          "text-muted-foreground hover:text-foreground hover:bg-accent",
        className
      )}
      {...props}
    >
      {isLoading && (
        <motion.span
          className="absolute inset-0 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <svg
            className="h-4 w-4 animate-spin text-current"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="3"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
            />
          </svg>
        </motion.span>
      )}
      <span className={cn("transition-opacity", isLoading && "opacity-0")}>
        {children}
      </span>
    </button>
  );
}

// ─── Divider ──────────────────────────────────────────────────────────────────
export function AuthDivider({ label = "or" }: { label?: string }) {
  return (
    <div className="relative my-4 flex items-center gap-3">
      <div className="h-px flex-1 bg-border" />
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}

// ─── SSOButton ────────────────────────────────────────────────────────────────
interface SSOButtonProps {
  provider: "google" | "microsoft" | "okta";
  onClick?: () => void;
  isLoading?: boolean;
}

const SSO_PROVIDERS = {
  google: {
    label: "Google",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4">
        <path
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          fill="#4285F4"
        />
        <path
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          fill="#34A853"
        />
        <path
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          fill="#FBBC05"
        />
        <path
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          fill="#EA4335"
        />
      </svg>
    ),
  },
  microsoft: {
    label: "Microsoft",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4">
        <path fill="#f25022" d="M1 1h10v10H1z" />
        <path fill="#00a4ef" d="M13 1h10v10H13z" />
        <path fill="#7fba00" d="M1 13h10v10H1z" />
        <path fill="#ffb900" d="M13 13h10v10H13z" />
      </svg>
    ),
  },
  okta: {
    label: "SSO / Okta",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none">
        <circle cx="12" cy="12" r="10" fill="#007DC1" />
        <circle cx="12" cy="12" r="4" fill="white" />
      </svg>
    ),
  },
};

export function SSOButton({ provider, onClick, isLoading }: SSOButtonProps) {
  const p = SSO_PROVIDERS[provider];
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isLoading}
      className="flex w-full items-center justify-center gap-2 rounded-[6px] border border-border bg-background px-3 py-[7px] text-[12px] font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-50"
    >
      {p.icon}
      <span>Continue with {p.label}</span>
    </button>
  );
}

// ─── AuthCheckbox ──────────────────────────────────────────────────────────────
interface AuthCheckboxProps {
  id: string;
  label: React.ReactNode;
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  error?: string;
}

export function AuthCheckbox({ id, label, checked, onChange, error }: AuthCheckboxProps) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="flex cursor-pointer items-start gap-2.5">
        <div className="relative mt-[1px] flex-shrink-0">
          <input
            id={id}
            type="checkbox"
            className="peer sr-only"
            checked={checked}
            onChange={(e) => onChange?.(e.target.checked)}
          />
          <div
            className={cn(
              "flex h-[15px] w-[15px] items-center justify-center rounded-[4px] border transition-colors duration-150",
              checked
                ? "border-primary bg-primary"
                : "border-border bg-background peer-focus-visible:ring-2 peer-focus-visible:ring-ring/30"
            )}
          >
            {checked && <Check className="h-2.5 w-2.5 text-primary-foreground" strokeWidth={2.5} />}
          </div>
        </div>
        <span className="text-[12px] leading-normal text-muted-foreground">{label}</span>
      </label>
      {error && (
        <p className="ml-[27px] text-[11px] text-destructive">{error}</p>
      )}
    </div>
  );
}

// ─── FieldErrorBanner ─────────────────────────────────────────────────────────
export function AuthErrorBanner({ message }: { message: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="flex items-start gap-2 rounded-[6px] border border-destructive/20 bg-destructive/5 px-3 py-2.5 text-[12px] text-destructive"
    >
      <X className="mt-px h-3.5 w-3.5 flex-shrink-0" />
      <span>{message}</span>
    </motion.div>
  );
}

// ─── Success State ─────────────────────────────────────────────────────────────
export function AuthSuccessState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="text-center"
    >
      <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-success/10 ring-1 ring-success/20">
        <Check className="h-5 w-5 text-success" />
      </div>
      <h3 className="text-[15px] font-semibold text-foreground">{title}</h3>
      <p className="mt-1.5 text-[13px] text-muted-foreground">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </motion.div>
  );
}
