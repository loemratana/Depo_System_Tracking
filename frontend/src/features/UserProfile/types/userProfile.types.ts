export type UserStatus = "active" | "inactive" | "away" | "offline";

export interface UserProfile {
  id: number;
  fullName: string;
  email: string;
  phone: string;
  role: string;
  avatar?: string;
  status: UserStatus;
  department?: string;
  joinDate: string;
  lastLogin: string;
}

export interface ProfileUpdateInput {
  fullName: string;
  email: string;
  phone: string;
}

export interface ActivityLog {
  id: number;
  type: "login" | "update" | "action" | "security";
  title: string;
  description: string;
  timestamp: string;
  icon?: string;
}

export interface SecuritySettings {
  twoFactorEnabled: boolean;
  lastPasswordChange: string;
  activeDevices: number;
  loginAttempts?: number;
}
