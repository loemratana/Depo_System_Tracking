import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Edit2 } from "lucide-react";
import { StatusBadge } from "@/components/ui-kit";
import type { UserProfile, UserStatus } from "../types/userProfile.types";

interface ProfileHeaderProps {
  user: UserProfile;
  onEditClick: () => void;
}

const statusTone: Record<UserStatus, "success" | "warning" | "danger" | "muted"> = {
  active: "success",
  away: "warning",
  offline: "danger",
  inactive: "muted",
};

export function ProfileHeader({ user, onEditClick }: ProfileHeaderProps) {
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="flex flex-col w-full md:flex-row md:items-center justify-between gap-4 border-b border-border  px-6 py-5 shadow-sm">
      <div className="flex items-center gap-4">
        {/* Avatar */}
        <Avatar className="h-12 w-12 ring-1 ring-border">
          <AvatarImage src={user.avatar} alt={user.fullName} />
          <AvatarFallback className="bg-muted text-xs font-semibold text-foreground">
            {getInitials(user.fullName)}
          </AvatarFallback>
        </Avatar>

        {/* User info */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-base font-semibold tracking-tight text-foreground">
              {user.fullName}
            </h1>
            <StatusBadge tone={statusTone[user.status]} size="sm">
              {user.status}
            </StatusBadge>
          </div>
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
            {user.role}
          </p>
          {user.department && (
            <p className="text-[10px] text-muted-foreground/80">{user.department}</p>
          )}
        </div>
      </div>

      {/* Edit button */}
      <Button
        onClick={onEditClick}
        variant="outline"
        size="sm"
        className="h-8 gap-1.5 text-[11px] font-medium"
      >
        <Edit2 className="h-3.5 w-3.5" />
        Edit Profile
      </Button>
    </div>
  );
}
