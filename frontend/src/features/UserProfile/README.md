# User Profile Dashboard

A modern, professional User Profile dashboard component for SaaS-style web admin systems. Features a clean, minimal, enterprise-grade UI with a focus on usability and clarity.

## Features

### 📋 Profile Tab
- **Editable Profile Form** - Update full name, email, phone number
- **Read-only Fields** - Role and join date (contact admin to change)
- **Success/Error Feedback** - Toast notifications for actions
- **Edit Mode Toggle** - Switch between view and edit modes with save/cancel buttons

### 🔒 Security Tab
- **Password Management** - Change password with direct button
- **Two-Factor Authentication** - Enable/disable 2FA with status badge
- **Active Devices** - View currently signed-in devices
- **Security Alerts** - Important security notifications and recommendations
- **Last Password Change** - Track when password was last updated

### 📊 Activity Tab
- **Activity Timeline** - Visual timeline of all account activities
- **Activity Types** - Login, profile updates, security changes, and actions
- **Timestamps** - Smart relative time display (2m ago, 1h ago, etc.)
- **Activity Details** - Description and metadata for each activity
- **Load More** - Pagination support for activity history

## Component Structure

```
UserProfile/
├── component/
│   ├── ProfileHeader.tsx              # User header with avatar, name, role
│   ├── ProfileTabContent.tsx          # Profile editing form
│   ├── SecurityTabContent.tsx         # Security settings and 2FA
│   ├── ActivityTabContent.tsx         # Activity timeline
│   └── UserProfileDashboard.tsx       # Main dashboard container
├── hooks/
│   └── useUserProfile.ts              # React Query hooks and mock data
├── pages/
│   └── UserProfilePage.tsx            # Page wrapper with loading states
├── types/
│   └── userProfile.types.ts           # TypeScript interfaces
└── index.ts                           # Main exports
```

## Usage

### Basic Implementation

```tsx
import { UserProfilePage } from "@/features/UserProfile";

export function App() {
  return <UserProfilePage />;
}
```

### Custom Implementation with Data

```tsx
import { UserProfileDashboard } from "@/features/UserProfile";
import type { UserProfile, SecuritySettings, ActivityLog } from "@/features/UserProfile";

export function CustomProfile() {
  const user: UserProfile = {
    id: 1,
    fullName: "John Doe",
    email: "john@example.com",
    phone: "+1 (555) 123-4567",
    role: "Manager",
    status: "active",
    department: "Sales",
    joinDate: "2023-01-15T00:00:00Z",
    lastLogin: new Date().toISOString(),
  };

  const security: SecuritySettings = {
    twoFactorEnabled: true,
    lastPasswordChange: new Date().toISOString(),
    activeDevices: 2,
  };

  const activities: ActivityLog[] = [
    {
      id: 1,
      type: "login",
      title: "Signed in",
      description: "Chrome on Windows",
      timestamp: new Date().toISOString(),
    },
  ];

  return (
    <UserProfileDashboard
      user={user}
      security={security}
      activities={activities}
      onUpdateProfile={async (data) => {
        // Handle profile update
        console.log("Update:", data);
      }}
      onToggle2FA={async (enabled) => {
        // Handle 2FA toggle
        console.log("2FA enabled:", enabled);
      }}
      onChangePassword={() => {
        // Handle password change
        console.log("Change password");
      }}
    />
  );
}
```

## Hooks

### useUserProfile
Fetch user profile data
```tsx
const { data: user, isLoading } = useUserProfile();
```

### useSecuritySettings
Fetch security settings
```tsx
const { data: security, isLoading } = useSecuritySettings();
```

### useActivityLogs
Fetch activity logs
```tsx
const { data: activities, isLoading } = useActivityLogs();
```

### useUpdateProfile
Mutate user profile
```tsx
const mutation = useUpdateProfile();
await mutation.mutateAsync({ fullName: "New Name", email: "new@example.com", phone: "+1 555-0000" });
```

### useToggle2FA
Toggle two-factor authentication
```tsx
const mutation = useToggle2FA();
await mutation.mutateAsync(true); // Enable 2FA
```

### useChangePassword
Change user password
```tsx
const mutation = useChangePassword();
await mutation.mutateAsync({ oldPassword: "old", newPassword: "new" });
```

## Styling

### Design System
- **Framework**: Tailwind CSS
- **Theme**: Light theme with dark mode support ready
- **Components**: Built-in UI components (Card, Button, Input, Badge, Tabs, etc.)
- **Colors**: Professional blue/gray palette with status indicators
- **Spacing**: Enterprise-grade spacing and typography
- **Shadows**: Subtle shadows for depth
- **Borders**: Soft, rounded corners

### Key Styling Features
- Responsive design (mobile-first)
- Gradient backgrounds for visual interest
- Card-based layout system
- Professional typography hierarchy
- Status badge color-coding
- Smooth transitions and hover states

## API Integration

The component uses React Query for data fetching. To connect to your backend:

1. Update hooks in `useUserProfile.ts`:

```tsx
export const useUserProfile = () => {
  return useQuery({
    queryKey: ["userProfile"],
    queryFn: async () => {
      const response = await axiosClient.get("/user/profile");
      return response.data;
    },
  });
};
```

2. Update mutation functions similarly to call your API endpoints

## Customization

### Status Colors
Modify `statusConfig` in `ProfileHeader.tsx`:
```tsx
const statusConfig = {
  active: { label: "Active", color: "bg-green-100 text-green-800" },
  // ... modify colors as needed
};
```

### Activity Types
Add new types to `ActivityLog` interface in `userProfile.types.ts` and update `getActivityIcon` in `ActivityTabContent.tsx`.

### Max Width
Change max-width in `UserProfileDashboard.tsx`:
```tsx
<div className="w-full max-w-5xl mx-auto"> {/* Change max-w-5xl */}
```

## Responsive Behavior

- **Mobile**: Single column, compact spacing, icons without text
- **Tablet**: Two column on some sections
- **Desktop**: Full layout with all features visible

## Accessibility

- Semantic HTML structure
- ARIA labels on interactive elements
- Keyboard navigation support
- High contrast color combinations
- Focus indicators on buttons and inputs

## Mock Data

The component includes mock data for development. Replace with real API calls:
- `mockUserProfile`
- `mockSecuritySettings`
- `mockActivities`

## Future Enhancements

- [ ] Avatar upload functionality
- [ ] Password change modal/dialog
- [ ] 2FA setup wizard
- [ ] Session management (logout from other devices)
- [ ] Activity filtering and search
- [ ] Export activity logs
- [ ] Theme customization
- [ ] Internationalization (i18n)

## Dependencies

- React 18+
- React Query (TanStack Query)
- Tailwind CSS
- shadcn/ui components
- Lucide React (icons)
- Sonner (toast notifications)

## Notes

✅ Isolated feature - does not affect other features
✅ Type-safe with full TypeScript support
✅ Modern SaaS-style design
✅ Professional enterprise appearance
✅ Responsive and accessible
✅ Mock data included for development
