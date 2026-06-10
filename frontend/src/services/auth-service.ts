import axiosClient from "@/api/axios-client";

export const authService = {
  login: async (credentials: any) => {
    const response = await axiosClient.post("/auth/login", credentials);
    return response.data;
  },

  register: async (userData: any) => {
    const response = await axiosClient.post("/auth/register", {
      email: userData.email,
    password: userData.password,
    username: userData.fullName,
    position: userData.role,
    phone: userData.phone || "",
    role: userData.role,
    });
    return response.data;
  },

  refreshToken: async (refreshToken: string) => {
    const response = await axiosClient.post("/auth/refresh", { refreshToken });
    return response.data;
  },

  logout: async (refreshToken: string) => {
    const response = await axiosClient.post("/auth/logout", { refreshToken });
    return response.data;
  },

  getProfile: async () => {
    const response = await axiosClient.get("/auth/me");
    return response.data;
  }
};
