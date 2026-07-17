import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Surface, StatusBadge } from "@/components/ui-kit";
import { UserAvatar } from "@/components/ui/user-avatar";
import {
  Camera,
  Mail,
  Phone,
  Building2,
  Calendar,
  Clock,
  Edit2,
  Shield,
} from "lucide-react";
import type { UserProfile, UserStatus } from "../types/userProfile.types";

interface ProfileSidebarProps {
  user: UserProfile;
  twoFactorEnabled?: boolean;
  onEditClick: () => void;
  onAvatarChange?: (file: File) => void;
}

const statusTone: Record<UserStatus, "success" | "warning" | "danger" | "muted"> = {
  active: "success",
  away: "warning",
  offline: "danger",
  inactive: "muted",
};

export function ProfileSidebar({
  user,
  twoFactorEnabled = false,
  onEditClick,
  onAvatarChange,
}: ProfileSidebarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <Surface className="sticky top-[4.5rem] space-y-5 p-5">
      <div className="flex flex-col items-center text-center">
        <div className="relative">
          <UserAvatar
            src={user.avatar}
            name={user.fullName}
            email={user.email}
            id={user.id}
            size="2xl"
            showRing
            className="border-4 border-card shadow-lg"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="absolute bottom-1 right-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-card bg-blue-600 text-white shadow-md transition-colors hover:bg-blue-700"
            title="Change photo"
          >
            <Camera className="h-3.5 w-3.5" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file && onAvatarChange) onAvatarChange(file);
              e.target.value = "";
            }}
          />
        </div>

        <div className="mt-4 space-y-2">
          <h1 className="text-lg font-semibold tracking-tight text-foreground">{user.fullName}</h1>
          <p className="text-sm text-muted-foreground">{user.role}</p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <StatusBadge tone={statusTone[user.status]} dot>
              {user.status}
            </StatusBadge>
            {twoFactorEnabled && (
              <StatusBadge tone="info" dot>
                2FA
              </StatusBadge>
            )}
          </div>
        </div>

        <Button
          onClick={onEditClick}
          size="sm"
          className="mt-4 h-9 w-full gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700"
        >
          <Edit2 className="h-3.5 w-3.5" />
          Edit Profile
        </Button>
      </div>

      <div className="space-y-2 border-t border-border/60 pt-4">
        <InfoRow icon={Mail} label="Email" value={user.email} />
        <InfoRow icon={Phone} label="Phone" value={user.phone || "—"} />
        <InfoRow icon={Building2} label="Department" value={user.department || "—"} />
        <InfoRow
          icon={Calendar}
          label="Member since"
          value={new Date(user.joinDate).toLocaleDateString()}
        />
        <InfoRow
          icon={Clock}
          label="Last login"
          value={new Date(user.lastLogin).toLocaleString()}
        />
        <InfoRow
          icon={Shield}
          label="Security"
          value={twoFactorEnabled ? "2FA enabled" : "Standard"}
        />
      </div>
    </Surface>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Mail;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted/30">
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted/60">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1 text-left">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <p className="truncate text-sm font-medium text-foreground">{value}</p>
      </div>
    </div>
  );
}
