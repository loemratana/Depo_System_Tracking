import { UserProfileDashboard } from "../component/UserProfileDashboard";
import type { UserProfile, SecuritySettings, ActivityLog } from "../types/userProfile.types";

// Mock data directly in the component for now
const mockUser: UserProfile = {
  id: 1,
  fullName: "Sarah Anderson",
  email: "sarah.anderson@company.com",
  phone: "+1 (555) 123-4567",
  role: "Administrator",
  avatar: undefined,
  status: "active",
  department: "Operations",
  joinDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
  lastLogin: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
};

const mockSecurity: SecuritySettings = {
  twoFactorEnabled: true,
  lastPasswordChange: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  activeDevices: 1,
  loginAttempts: 0,
};

const mockActivities: ActivityLog[] = [
  {
    id: 1,
    type: "login",
    title: "Signed in",
    description: "Successful login from Chrome on Windows",
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 2,
    type: "security",
    title: "Two-factor authentication enabled",
    description: "2FA has been activated for your account",
    timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 3,
    type: "update",
    title: "Profile updated",
    description: "Phone number has been changed",
    timestamp: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 4,
    type: "login",
    title: "Signed in",
    description: "Successful login from Safari on macOS",
    timestamp: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 5,
    type: "action",
    title: "API key generated",
    description: "New API key created for integration",
    timestamp: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

export function UserProfilePage() {
  return (
    <UserProfileDashboard
      user={mockUser}
      security={mockSecurity}
      activities={mockActivities}
      onUpdateProfile={async (data) => {
        console.log("Update profile:", data);
        // Add your API call here
      }}
      onToggle2FA={async (enabled) => {
        console.log("Toggle 2FA:", enabled);
        // Add your API call here
      }}
      onChangePassword={() => {
        console.log("Change password");
        // Add your modal logic here
      }}
    />
  );
}
