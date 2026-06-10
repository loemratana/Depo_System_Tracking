import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProfileHeader } from "./ProfileHeader";
import { ProfileTabContent } from "./ProfileTabContent";
import { SecurityTabContent } from "./SecurityTabContent";
import { ActivityTabContent } from "./ActivityTabContent";
import { User, Lock, Activity } from "lucide-react";
import type { UserProfile, ProfileUpdateInput, ActivityLog, SecuritySettings } from "../types/userProfile.types";

interface UserProfileDashboardProps {
  user: UserProfile;
  security: SecuritySettings;
  activities: ActivityLog[];
  onUpdateProfile?: (data: ProfileUpdateInput) => Promise<void>;
  onChangePassword?: () => void;
  onToggle2FA?: (enabled: boolean) => Promise<void>;
}

export function UserProfileDashboard({
  user,
  security,
  activities,
  onUpdateProfile,
  onChangePassword,
  onToggle2FA,
}: UserProfileDashboardProps) {
  const [activeTab, setActiveTab] = useState("profile");

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {/* Main Container */}
      <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10">
        {/* Profile Header */}
        <ProfileHeader
          user={user}
          onEditClick={() => {
            setActiveTab("profile");
            // Scroll to tab if on mobile
            const tabsElement = document.getElementById("profile-tabs");
            if (tabsElement) {
              tabsElement.scrollIntoView({ behavior: "smooth" });
            }
          }}
        />

        {/* Tabs Section */}
        <Card className="mt-8 border border-gray-200 rounded-b-2xl rounded-t-none shadow-lg">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            {/* Tab Navigation */}
            <TabsList
              id="profile-tabs"
              className="grid w-full grid-cols-3 border-b border-gray-200 bg-gray-50/50 p-0"
            >
              <TabsTrigger
                value="profile"
                className="flex items-center gap-2 rounded-none border-b-2 border-transparent px-6 py-4 data-[state=active]:border-blue-600 data-[state=active]:bg-white"
              >
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">Profile</span>
              </TabsTrigger>

              <TabsTrigger
                value="security"
                className="flex items-center gap-2 rounded-none border-b-2 border-transparent px-6 py-4 data-[state=active]:border-blue-600 data-[state=active]:bg-white"
              >
                <Lock className="h-4 w-4" />
                <span className="hidden sm:inline">Security</span>
              </TabsTrigger>

              <TabsTrigger
                value="activity"
                className="flex items-center gap-2 rounded-none border-b-2 border-transparent px-6 py-4 data-[state=active]:border-blue-600 data-[state=active]:bg-white"
              >
                <Activity className="h-4 w-4" />
                <span className="hidden sm:inline">Activity</span>
              </TabsTrigger>
            </TabsList>

            {/* Tab Content */}
            <div className="p-8">
              {/* Profile Tab */}
              <TabsContent value="profile" className="space-y-6">
                <ProfileTabContent user={user} onUpdate={onUpdateProfile} />
              </TabsContent>

              {/* Security Tab */}
              <TabsContent value="security" className="space-y-6">
                <SecurityTabContent
                  security={security}
                  onChangePassword={onChangePassword}
                  onToggle2FA={onToggle2FA}
                />
              </TabsContent>

              {/* Activity Tab */}
              <TabsContent value="activity" className="space-y-6">
                <ActivityTabContent activities={activities} />
              </TabsContent>
            </div>
          </Tabs>
        </Card>

        {/* Footer Info */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Last login: {new Date(user.lastLogin).toLocaleString()}</p>
          <p className="mt-1">Need help? Contact our support team.</p>
        </div>
      </div>
    </div>
  );
}
