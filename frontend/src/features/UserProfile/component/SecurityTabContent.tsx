import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Shield,
  Lock,
  Smartphone,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
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
    <div className="space-y-6">
      {/* Security Overview Card */}
      <Card className="p-8 border border-blue-200 bg-blue-50/50">
        <div className="flex items-start gap-4">
          <Shield className="h-6 w-6 text-blue-600 flex-shrink-0 mt-1" />
          <div>
            <h3 className="text-lg font-semibold text-blue-900 mb-1">Security Overview</h3>
            <p className="text-sm text-blue-700">
              Your account security is important to us. Review and update your security settings to
              keep your account safe.
            </p>
          </div>
        </div>
      </Card>

      {/* Password Section */}
      <Card className="p-8 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between gap-6 mb-6 pb-6 border-b border-gray-200">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-gray-100 rounded-lg">
              <Lock className="h-5 w-5 text-gray-700" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Password</h3>
              <p className="text-sm text-gray-600 mt-1">
                Last changed{" "}
                <span className="font-medium">
                  {new Date(security.lastPasswordChange).toLocaleDateString()}
                </span>
              </p>
            </div>
          </div>
          <Button
            onClick={onChangePassword}
            className="bg-gray-900 hover:bg-gray-800 text-white font-medium px-6 py-2 rounded-lg transition-colors whitespace-nowrap"
          >
            Change Password
          </Button>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-sm text-gray-600">
            Update your password regularly to maintain account security. We recommend using a
            strong, unique password.
          </p>
        </div>
      </Card>

      {/* Two-Factor Authentication Section */}
      <Card className="p-8 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between gap-6 mb-6 pb-6 border-b border-gray-200">
          <div className="flex items-start gap-4 flex-1">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Smartphone className="h-5 w-5 text-purple-700" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Two-Factor Authentication</h3>
              <p className="text-sm text-gray-600 mt-1">
                Add an extra layer of security to your account
              </p>
              <div className="mt-3">
                <Badge
                  className={`${
                    twoFactorEnabled ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                  } border-0 font-medium`}
                >
                  {twoFactorEnabled ? "Enabled" : "Disabled"}
                </Badge>
              </div>
            </div>
          </div>
          <Button
            onClick={handle2FAToggle}
            disabled={isEnabling2FA}
            className={`font-medium px-6 py-2 rounded-lg transition-colors whitespace-nowrap ${
              twoFactorEnabled
                ? "bg-red-100 hover:bg-red-200 text-red-700"
                : "bg-blue-600 hover:bg-blue-700 text-white"
            }`}
          >
            {isEnabling2FA ? "Processing..." : twoFactorEnabled ? "Disable 2FA" : "Enable 2FA"}
          </Button>
        </div>

        <Alert
          className={
            twoFactorEnabled ? "border-green-200 bg-green-50" : "border-yellow-200 bg-yellow-50"
          }
        >
          {twoFactorEnabled ? (
            <>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Two-factor authentication is active. You'll need to provide a verification code in
                addition to your password when signing in.
              </AlertDescription>
            </>
          ) : (
            <>
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800">
                Enable two-factor authentication for enhanced security. You can use your phone or an
                authenticator app.
              </AlertDescription>
            </>
          )}
        </Alert>
      </Card>

      {/* Active Devices Section */}
      <Card className="p-8 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
        <div className="mb-6 pb-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Active Devices</h3>
          <p className="text-sm text-gray-600 mt-1">
            {security.activeDevices} device{security.activeDevices !== 1 ? "s" : ""} currently
            signed in
          </p>
        </div>

        <div className="space-y-4">
          {/* Current Device */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Laptop className="h-5 w-5 text-blue-700" />
              </div>
              <div>
                <p className="font-medium text-gray-900">This Device</p>
                <p className="text-xs text-gray-600">Chrome on Windows • Just now</p>
              </div>
            </div>
            <Badge className="bg-blue-100 text-blue-800 border-0">Current</Badge>
          </div>

          <p className="text-xs text-gray-500 pt-2">
            Remove any devices you don't recognize to secure your account.
          </p>
        </div>
      </Card>

      {/* Recent Activity Alert */}
      <Alert className="border-amber-200 bg-amber-50">
        <AlertCircle className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-amber-800">
          <p className="font-medium mb-1">Suspicious Activity?</p>
          If you notice any unusual activity, please change your password immediately and enable
          two-factor authentication.
        </AlertDescription>
      </Alert>
    </div>
  );
}
