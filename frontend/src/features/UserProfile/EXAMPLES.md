/**
 * EXAMPLES AND CUSTOMIZATION GUIDE
 * This file shows various ways to use and customize the User Profile Dashboard
 */

import { UserProfileDashboard, UserProfilePage } from "@/features/UserProfile";
import type { UserProfile, SecuritySettings, ActivityLog } from "@/features/UserProfile";

// ============================================================================
// EXAMPLE 1: Basic Usage with Page Component
// ============================================================================
export function Example1_BasicUsage() {
  return <UserProfilePage />;
}

// ============================================================================
// EXAMPLE 2: Custom User Profile Data
// ============================================================================
export function Example2_CustomUserData() {
  const customUser: UserProfile = {
    id: 2,
    fullName: "Emily Johnson",
    email: "emily.johnson@company.com",
    phone: "+1 (555) 987-6543",
    role: "Senior Manager",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Emily",
    status: "active",
    department: "Finance",
    joinDate: "2022-06-15T00:00:00Z",
    lastLogin: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
  };

  const securitySettings: SecuritySettings = {
    twoFactorEnabled: false,
    lastPasswordChange: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    activeDevices: 2,
    loginAttempts: 0,
  };

  const activityLogs: ActivityLog[] = [
    {
      id: 1,
      type: "login",
      title: "Signed in",
      description: "Chrome on Windows - IP: 192.168.1.1",
      timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 2,
      type: "update",
      title: "Email address changed",
      description: "Changed from emily.old@company.com to emily.johnson@company.com",
      timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];

  return (
    <UserProfileDashboard
      user={customUser}
      security={securitySettings}
      activities={activityLogs}
    />
  );
}

// ============================================================================
// EXAMPLE 3: With Event Handlers
// ============================================================================
export function Example3_WithEventHandlers() {
  const mockUser: UserProfile = {
    id: 3,
    fullName: "Michael Chen",
    email: "michael.chen@company.com",
    phone: "+1 (555) 246-8135",
    role: "Team Lead",
    status: "active",
    department: "Engineering",
    joinDate: "2021-03-10T00:00:00Z",
    lastLogin: new Date().toISOString(),
  };

  const mockSecurity: SecuritySettings = {
    twoFactorEnabled: true,
    lastPasswordChange: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    activeDevices: 3,
  };

  const mockActivities: ActivityLog[] = [];

  return (
    <UserProfileDashboard
      user={mockUser}
      security={mockSecurity}
      activities={mockActivities}
      onUpdateProfile={async (data) => {
        console.log("Profile updated:", data);
        // API call example:
        // await axiosClient.put('/user/profile', data);
      }}
      onChangePassword={() => {
        console.log("Open password change dialog");
        // Open a modal dialog for password change
      }}
      onToggle2FA={async (enabled) => {
        console.log("Toggle 2FA:", enabled);
        // API call example:
        // await axiosClient.post('/user/2fa', { enabled });
      }}
    />
  );
}

// ============================================================================
// EXAMPLE 4: Different User Statuses
// ============================================================================
export function Example4_DifferentStatuses() {
  const statusExamples: Array<{
    name: string;
    user: UserProfile;
  }> = [
    {
      name: "Active User",
      user: {
        id: 4,
        fullName: "Active User",
        email: "active@company.com",
        phone: "+1 (555) 111-1111",
        role: "Manager",
        status: "active",
        joinDate: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
      },
    },
    {
      name: "Away User",
      user: {
        id: 5,
        fullName: "Away User",
        email: "away@company.com",
        phone: "+1 (555) 222-2222",
        role: "Staff",
        status: "away",
        joinDate: new Date().toISOString(),
        lastLogin: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      },
    },
    {
      name: "Inactive User",
      user: {
        id: 6,
        fullName: "Inactive User",
        email: "inactive@company.com",
        phone: "+1 (555) 333-3333",
        role: "Contractor",
        status: "inactive",
        joinDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
        lastLogin: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
      },
    },
  ];

  const mockSecurity: SecuritySettings = {
    twoFactorEnabled: false,
    lastPasswordChange: new Date().toISOString(),
    activeDevices: 1,
  };

  return (
    <div className="space-y-8">
      {statusExamples.map((example) => (
        <div key={example.user.id}>
          <h3 className="text-lg font-semibold mb-4">{example.name}</h3>
          <UserProfileDashboard
            user={example.user}
            security={mockSecurity}
            activities={[]}
          />
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// EXAMPLE 5: Extensive Activity History
// ============================================================================
export function Example5_ExtensiveActivityHistory() {
  const mockUser: UserProfile = {
    id: 7,
    fullName: "Sarah Anderson",
    email: "sarah.anderson@company.com",
    phone: "+1 (555) 555-5555",
    role: "Administrator",
    status: "active",
    department: "Operations",
    joinDate: new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000).toISOString(),
    lastLogin: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  };

  const extensiveActivities: ActivityLog[] = Array.from({ length: 15 }, (_, i) => {
    const types: Array<"login" | "update" | "security" | "action"> = [
      "login",
      "update",
      "security",
      "action",
    ];
    const descriptions = [
      "Signed in from Chrome on Windows",
      "Updated profile information",
      "Changed security settings",
      "Generated new API key",
      "Exported report",
      "Modified team members",
      "Updated department info",
      "Enabled notifications",
      "Disabled cookie consent",
      "Reviewed audit logs",
    ];

    return {
      id: i + 1,
      type: types[i % types.length],
      title: `Activity ${i + 1}`,
      description: descriptions[i % descriptions.length],
      timestamp: new Date(
        Date.now() - (i + 1) * 24 * 60 * 60 * 1000
      ).toISOString(),
    };
  });

  const mockSecurity: SecuritySettings = {
    twoFactorEnabled: true,
    lastPasswordChange: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    activeDevices: 3,
    loginAttempts: 0,
  };

  return (
    <UserProfileDashboard
      user={mockUser}
      security={mockSecurity}
      activities={extensiveActivities}
    />
  );
}

// ============================================================================
// EXAMPLE 6: Dark Theme Support (Customization)
// ============================================================================
export function Example6_DarkThemeSupport() {
  const mockUser: UserProfile = {
    id: 8,
    fullName: "David Wilson",
    email: "david.wilson@company.com",
    phone: "+1 (555) 666-6666",
    role: "Developer",
    status: "active",
    joinDate: new Date(Date.now() - 3 * 365 * 24 * 60 * 60 * 1000).toISOString(),
    lastLogin: new Date().toISOString(),
  };

  const mockSecurity: SecuritySettings = {
    twoFactorEnabled: true,
    lastPasswordChange: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    activeDevices: 2,
  };

  return (
    // Wrap with dark mode class
    <div className="dark">
      <div className="bg-slate-950 min-h-screen">
        <UserProfileDashboard
          user={mockUser}
          security={mockSecurity}
          activities={[]}
        />
      </div>
    </div>
  );
}

// ============================================================================
// EXAMPLE 7: Responsive Mobile View
// ============================================================================
export function Example7_MobileResponsive() {
  const mockUser: UserProfile = {
    id: 9,
    fullName: "Lisa Martinez",
    email: "lisa.martinez@company.com",
    phone: "+1 (555) 777-7777",
    role: "Coordinator",
    status: "active",
    department: "HR",
    joinDate: new Date(Date.now() - 1 * 365 * 24 * 60 * 60 * 1000).toISOString(),
    lastLogin: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  };

  const mockSecurity: SecuritySettings = {
    twoFactorEnabled: false,
    lastPasswordChange: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
    activeDevices: 1,
  };

  return (
    // Mobile viewport simulation
    <div className="w-full max-w-sm mx-auto">
      <UserProfileDashboard
        user={mockUser}
        security={mockSecurity}
        activities={[]}
      />
    </div>
  );
}

// ============================================================================
// USAGE IN ROUTES
// ============================================================================

/*
// In src/routes/profile.tsx
import { createFileRoute } from "@tanstack/react-router";
import { UserProfilePage } from "@/features/UserProfile";

export const Route = createFileRoute("/profile")({
  component: UserProfilePage,
  meta: () => [
    {
      title: "User Profile | Admin Dashboard",
    },
  ],
});
*/

// ============================================================================
// STYLING CUSTOMIZATION TIPS
// ============================================================================

/*

1. CHANGE PRIMARY COLOR:
   - Find all "blue-600" and "blue-" classes in components
   - Replace with your brand color (e.g., "purple-600", "green-600")

2. ADJUST MAX WIDTH:
   - In UserProfileDashboard.tsx, change "max-w-5xl" to "max-w-7xl" or "max-w-4xl"

3. MODIFY SPACING:
   - Change padding: "p-8" to "p-6" or "p-10"
   - Change gap: "gap-6" to "gap-4" or "gap-8"

4. CUSTOM AVATAR:
   - Replace avatar URLs with your own image service
   - Use Dicebear, Gravatar, or custom upload

5. ADD DARK MODE:
   - Use Tailwind's dark: prefix on classes
   - Add prefers-color-scheme media query support

*/

export default {
  Example1_BasicUsage,
  Example2_CustomUserData,
  Example3_WithEventHandlers,
  Example4_DifferentStatuses,
  Example5_ExtensiveActivityHistory,
  Example6_DarkThemeSupport,
  Example7_MobileResponsive,
};
