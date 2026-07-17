import { useMemo, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { UserProfileDashboard } from "../component/UserProfileDashboard";
import {
  useUserProfile,
  useSecuritySettings,
  useActivityLogs,
  useUpdateProfile,
  useToggle2FA,
} from "../hooks/useUserProfile";
import type { UserProfile } from "../types/userProfile.types";
import { toast } from "sonner";

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrator",
  manager: "Manager",
  field_agent: "Field Agent",
  viewer: "Viewer",
};

function mapAuthToProfile(
  authUser: NonNullable<ReturnType<typeof useAuth>["user"]>,
  base: UserProfile,
): UserProfile {
  return {
    ...base,
    fullName: authUser.name || base.fullName,
    email: authUser.email || base.email,
    role: ROLE_LABELS[authUser.role] ?? authUser.role,
    avatar: authUser.avatar ?? base.avatar,
    lastLogin: authUser.lastLogin ?? base.lastLogin,
    status: "active",
  };
}

export function UserProfilePage() {
  const { user: authUser, updateUser } = useAuth();
  const { data: profileData, isLoading: profileLoading } = useUserProfile();
  const { data: securityData, isLoading: securityLoading } = useSecuritySettings();
  const { data: activities = [], isLoading: activitiesLoading } = useActivityLogs();
  const updateProfile = useUpdateProfile();
  const toggle2FA = useToggle2FA();
  const [localAvatar, setLocalAvatar] = useState<string | undefined>();

  const user = useMemo(() => {
    if (!profileData) return null;
    const mapped = authUser ? mapAuthToProfile(authUser, profileData) : profileData;
    return localAvatar ? { ...mapped, avatar: localAvatar } : mapped;
  }, [authUser, profileData, localAvatar]);

  const handleAvatarChange = useCallback(
    (file: File) => {
      if (!file.type.startsWith("image/")) {
        toast.error("Please select an image file");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image must be smaller than 5MB");
        return;
      }
      const objectUrl = URL.createObjectURL(file);
      setLocalAvatar(objectUrl);
      updateUser({ avatar: objectUrl });
      toast.success("Profile photo updated");
    },
    [updateUser],
  );

  const isLoading = profileLoading || securityLoading || activitiesLoading;

  if (isLoading || !user || !securityData) {
    return (
      <div className="space-y-5">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-muted/50" />
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
          <div className="h-[420px] animate-pulse rounded-xl bg-muted/50" />
          <div className="h-[420px] animate-pulse rounded-xl bg-muted/50" />
        </div>
      </div>
    );
  }

  return (
    <UserProfileDashboard
      user={user}
      twoFactorEnabled={authUser?.twoFactorEnabled ?? securityData.twoFactorEnabled}
      security={{
        ...securityData,
        twoFactorEnabled: authUser?.twoFactorEnabled ?? securityData.twoFactorEnabled,
      }}
      activities={activities}
      onAvatarChange={handleAvatarChange}
      onUpdateProfile={async (data) => {
        await updateProfile.mutateAsync(data);
      }}
      onToggle2FA={async (enabled) => {
        await toggle2FA.mutateAsync(enabled);
        updateUser({ twoFactorEnabled: enabled });
      }}
      onChangePassword={() => {
        console.log("Change password");
      }}
    />
  );
}
