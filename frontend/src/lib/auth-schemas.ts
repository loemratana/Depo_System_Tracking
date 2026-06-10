import { z } from "zod";

const passwordStrengthRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()\-_=+[\]{};:'",.<>/?\\|`~])/;

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Enter a valid email address"),
  password: z
    .string()
    .min(1, "Password is required")
    .min(6, "Password must be at least 6 characters"),
  remember: z.boolean().optional().default(false),
});

export const registerSchema = z
  .object({
    fullName: z
      .string()
      .min(2, "Full name must be at least 2 characters")
      .max(80, "Full name is too long"),
    // workspace: z
    //   .string()
    //   .min(2, "Company / workspace name required")
    //   .max(80),
    email: z
      .string()
      .min(1, "Email is required")
      .email("Enter a valid email address"),
    // role: z.enum(["admin", "manager", "field_agent", "viewer"], {
    //   required_error: "Select a role",
    // }),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(
        passwordStrengthRegex,
        "Include uppercase, lowercase, number, and special character"
      ),
    confirmPassword: z.string().min(1, "Confirm your password"),
    
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Enter a valid email address"),
});

export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(
        passwordStrengthRegex,
        "Include uppercase, lowercase, number, and special character"
      ),
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const otpSchema = z.object({
  otp: z
    .string()
    .length(6, "Enter the 6-digit code")
    .regex(/^\d+$/, "Code must be digits only"),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
export type RegisterFormValues = z.infer<typeof registerSchema>;
export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;
export type OtpFormValues = z.infer<typeof otpSchema>;

// Password strength score util (0-4)
export function getPasswordStrength(password: string): {
  score: number;
  label: string;
  color: string;
} {
  let score = 0;
  if (!password) return { score: 0, label: "", color: "" };
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[@$!%*?&#^()\-_=+[\]{};:'",.<>/?\\|`~]/.test(password)) score++;

  const levels = [
    { label: "Too weak", color: "var(--destructive)" },
    { label: "Weak", color: "oklch(0.7 0.15 45)" },
    { label: "Fair", color: "var(--warning)" },
    { label: "Good", color: "oklch(0.7 0.13 155)" },
    { label: "Strong", color: "var(--success)" },
  ];
  return { score, ...levels[score] };
}
