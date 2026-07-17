import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Surface, StatusBadge } from "@/components/ui-kit";
import {
  Shield,
  Lock,
  Smartphone,
  AlertCircle,
  CheckCircle2,
  Laptop,
} from "lucide-react";
import type { SecuritySettings } from "../types/userProfile.types";

interface SecurityTabContentProps {
  security: SecuritySettings;
  onChangePassword?: () => void;
  onToggle2FA?: (enabled: boolean) => Promise<void>;
}

export function SecurityTabContent({
  security,
  onChangePassword,
  onToggle2FA,
}: SecurityTabContentProps) {
  const [isEnabling2FA, setIsEnabling2FA] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(security.twoFactorEnabled);

  const handle2FAToggle = async () => {
    try {
      setIsEnabling2FA(true);
      if (onToggle2FA) {
        await onToggle2FA(!twoFactorEnabled);
      }
      setTwoFactorEnabled(!twoFactorEnabled);
    } catch (error) {
      console.error("Failed to toggle 2FA:", error);
    } finally {
      setIsEnabling2FA(false);
    }
  };

  return (
    <div className="space-y-4">
      <Surface className="border-blue-200/60 bg-blue-50/50 dark:border-blue-900/40 dark:bg-blue-950/20">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-600">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Security Overview</h3>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Review and update your security settings to keep your account safe.
            </p>
          </div>
        </div>
      </Surface>

      <Surface padded={false} className="overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-border/70 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-600">
              <Lock className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Password</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Last changed{" "}
                <span className="font-medium text-foreground">
                  {new Date(security.lastPasswordChange).toLocaleDateString()}
                </span>
              </p>
            </div>
          </div>
          <Button
            onClick={onChangePassword}
            size="sm"
            className="h-9 rounded-lg bg-blue-600 hover:bg-blue-700"
          >
            Change Password
          </Button>
        </div>
        <div className="bg-muted/10 px-5 py-3">
          <p className="text-xs text-muted-foreground">
            Use a strong, unique password and update it regularly for better account security.
          </p>
        </div>
      </Surface>

      <Surface padded={false} className="overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-border/70 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-600">
              <Smartphone className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Two-Factor Authentication</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Add an extra layer of security to your account
              </p>
              <div className="mt-2">
                <StatusBadge tone={twoFactorEnabled ? "success" : "muted"} dot>
                  {twoFactorEnabled ? "Enabled" : "Disabled"}
                </StatusBadge>
              </div>
            </div>
          </div>
          <Button
            onClick={handle2FAToggle}
            disabled={isEnabling2FA}
            size="sm"
            variant={twoFactorEnabled ? "outline" : "default"}
            className={
              twoFactorEnabled
                ? "h-9 rounded-lg border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
                : "h-9 rounded-lg bg-blue-600 hover:bg-blue-700"
            }
          >
            {isEnabling2FA ? "Processing..." : twoFactorEnabled ? "Disable 2FA" : "Enable 2FA"}
          </Button>
        </div>

        <div className="p-5">
          <Alert
            className={
              twoFactorEnabled
                ? "border-emerald-600/30 bg-emerald-50 dark:bg-emerald-950/20"
                : "border-amber-500/30 bg-amber-50 dark:bg-amber-950/20"
            }
          >
            {twoFactorEnabled ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <AlertDescription className="text-xs text-emerald-800 dark:text-emerald-300">
                  Two-factor authentication is active. You'll need a verification code when signing in.
                </AlertDescription>
              </>
            ) : (
              <>
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-xs text-amber-800 dark:text-amber-300">
                  Enable 2FA for enhanced security using your phone or an authenticator app.
                </AlertDescription>
              </>
            )}
          </Alert>
        </div>
      </Surface>

      <Surface padded={false} className="overflow-hidden">
        <div className="border-b border-border/70 p-5">
          <h3 className="text-sm font-semibold text-foreground">Active Devices</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {security.activeDevices} device{security.activeDevices !== 1 ? "s" : ""} currently signed in
          </p>
        </div>

        <div className="space-y-3 p-5">
          <div className="flex items-center justify-between rounded-lg border border-border/70 bg-muted/20 px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-600">
                <Laptop className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">This Device</p>
                <p className="text-xs text-muted-foreground">Chrome on Windows · Just now</p>
              </div>
            </div>
            <StatusBadge tone="info">Current</StatusBadge>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Remove any devices you don't recognize to secure your account.
          </p>
        </div>
      </Surface>
    </div>
  );
}
