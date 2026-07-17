import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Edit2, Mail, Calendar, Clock, Building2 } from "lucide-react";
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

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function ProfileHeader({ user, onEditClick }: ProfileHeaderProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm">
      <div className="relative h-24 bg-gradient-to-r from-blue-600 via-blue-700 to-sky-600">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_50%)]" />
      </div>

      <div className="relative px-5 pb-5 sm:px-6">
        <div className="-mt-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-4">
            <Avatar className="h-20 w-20 border-4 border-card shadow-lg ring-2 ring-blue-600/20">
              <AvatarImage src={user.avatar} alt={user.fullName} />
              <AvatarFallback className="bg-blue-600 text-lg font-bold text-white">
                {getInitials(user.fullName)}
              </AvatarFallback>
            </Avatar>

            <div className="space-y-1.5 pb-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-semibold tracking-tight text-foreground">
                  {user.fullName}
                </h1>
                <StatusBadge tone={statusTone[user.status]} dot>
                  {user.status}
                </StatusBadge>
              </div>
              <p className="text-sm font-medium text-muted-foreground">{user.role}</p>
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5" />
                  {user.email}
                </span>
                {user.department && (
                  <span className="inline-flex items-center gap-1">
                    <Building2 className="h-3.5 w-3.5" />
                    {user.department}
                  </span>
                )}
              </div>
            </div>
          </div>

          <Button
            onClick={onEditClick}
            size="sm"
            className="h-9 gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700"
          >
            <Edit2 className="h-3.5 w-3.5" />
            Edit Profile
          </Button>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 border-t border-border/60 pt-4 sm:grid-cols-3">
          <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600">
              <Calendar className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Member Since
              </p>
              <p className="text-sm font-medium text-foreground">
                {new Date(user.joinDate).toLocaleDateString()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-600">
              <Clock className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Last Login
              </p>
              <p className="text-sm font-medium text-foreground">
                {new Date(user.lastLogin).toLocaleString()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600">
              <Building2 className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Department
              </p>
              <p className="text-sm font-medium text-foreground">
                {user.department || "—"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
