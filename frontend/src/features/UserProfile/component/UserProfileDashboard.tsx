import { useState } from "react";
import { PageHeader, Surface } from "@/components/ui-kit";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProfileSidebar } from "./ProfileSidebar";
import { ProfileTabContent } from "./ProfileTabContent";
import { SecurityTabContent } from "./SecurityTabContent";
import { ActivityTabContent } from "./ActivityTabContent";
import { User, Lock, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import type { UserProfile, ProfileUpdateInput, ActivityLog, SecuritySettings } from "../types/userProfile.types";

interface UserProfileDashboardProps {
  user: UserProfile;
  security: SecuritySettings;
  activities: ActivityLog[];
  twoFactorEnabled?: boolean;
  onUpdateProfile?: (data: ProfileUpdateInput) => Promise<void>;
  onChangePassword?: () => void;
  onToggle2FA?: (enabled: boolean) => Promise<void>;
  onAvatarChange?: (file: File) => void;
}

export function UserProfileDashboard({
  user,
  security,
  activities,
  twoFactorEnabled = false,
  onUpdateProfile,
  onChangePassword,
  onToggle2FA,
  onAvatarChange,
}: UserProfileDashboardProps) {
  const [activeTab, setActiveTab] = useState("profile");

  return (
    <div className="space-y-5">
      <PageHeader
        title="My Profile"
        description="Manage your photo, personal details, security, and activity."
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
        <ProfileSidebar
          user={user}
          twoFactorEnabled={twoFactorEnabled}
          onAvatarChange={onAvatarChange}
          onEditClick={() => {
            setActiveTab("profile");
            document.getElementById("profile-tabs")?.scrollIntoView({ behavior: "smooth" });
          }}
        />

        <Surface padded={false} className="overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList
              id="profile-tabs"
              className="grid h-auto w-full grid-cols-3 rounded-none border-b border-border/70 bg-muted/20 p-1.5"
            >
              {[
                { value: "profile", label: "Profile", icon: User },
                { value: "security", label: "Security", icon: Lock },
                { value: "activity", label: "Activity", icon: Activity },
              ].map(({ value, label, icon: Icon }) => (
                <TabsTrigger
                  key={value}
                  value={value}
                  className={cn(
                    "flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-all",
                    "data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-sm",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{label}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            <div className="p-5 sm:p-6">
              <TabsContent value="profile" className="mt-0">
                <ProfileTabContent user={user} onUpdate={onUpdateProfile} />
              </TabsContent>

              <TabsContent value="security" className="mt-0">
                <SecurityTabContent
                  security={security}
                  onChangePassword={onChangePassword}
                  onToggle2FA={onToggle2FA}
                />
              </TabsContent>

              <TabsContent value="activity" className="mt-0">
                <ActivityTabContent activities={activities} />
              </TabsContent>
            </div>
          </Tabs>
        </Surface>
      </div>
    </div>
  );
}
