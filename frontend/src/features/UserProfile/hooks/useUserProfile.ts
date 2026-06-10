import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import type { UserProfile, ProfileUpdateInput, ActivityLog, SecuritySettings } from "../types/userProfile.types";

// Mock user data - replace with actual API call
const mockUserProfile: UserProfile = {
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

const mockSecuritySettings: SecuritySettings = {
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

// Hooks
export const useUserProfile = () => {
  return useQuery({
    queryKey: ["userProfile"],
    queryFn: async () => {
      // Replace with actual API call
      // const response = await api.get('/user/profile');
      // return response.data;
      return mockUserProfile;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
  });
};

export const useSecuritySettings = () => {
  return useQuery({
    queryKey: ["securitySettings"],
    queryFn: async () => {
      // Replace with actual API call
      // const response = await api.get('/user/security');
      // return response.data;
      return mockSecuritySettings;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
  });
};

export const useActivityLogs = () => {
  return useQuery({
    queryKey: ["activityLogs"],
    queryFn: async () => {
      // Replace with actual API call
      // const response = await api.get('/user/activities');
      // return response.data;
      return mockActivities;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
  });
};

export const useUpdateProfile = () => {
  return useMutation({
    mutationFn: async (data: ProfileUpdateInput) => {
      // Replace with actual API call
      // const response = await api.put('/user/profile', data);
      // return response.data;
      return { ...mockUserProfile, ...data };
    },
    onSuccess: () => {
      toast.success("Profile updated successfully!");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to update profile");
    },
  });
};

export const useChangePassword = () => {
  return useMutation({
    mutationFn: async (passwords: { oldPassword: string; newPassword: string }) => {
      // Replace with actual API call
      // const response = await api.post('/user/change-password', passwords);
      // return response.data;
      return { success: true };
    },
    onSuccess: () => {
      toast.success("Password changed successfully!");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to change password");
    },
  });
};

export const useToggle2FA = () => {
  return useMutation({
    mutationFn: async (enable: boolean) => {
      // Replace with actual API call
      // const response = await api.post('/user/2fa', { enable });
      // return response.data;
      return { twoFactorEnabled: enable };
    },
    onSuccess: (data) => {
      toast.success(
        data.twoFactorEnabled
          ? "Two-factor authentication enabled!"
          : "Two-factor authentication disabled!"
      );
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to toggle 2FA");
    },
  });
};
