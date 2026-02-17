import { useMemo } from "react";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

// Mock user object for public access
const mockUser = {
  id: "public-user",
  name: "مستخدم عام",
  email: "public@tourism.local",
  role: "user" as const,
  openId: "public-user",
  loginMethod: "public",
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

export function useAuth(options?: UseAuthOptions) {
  const state = useMemo(() => {
    localStorage.setItem(
      "manus-runtime-user-info",
      JSON.stringify(mockUser)
    );
    return {
      user: mockUser,
      loading: false,
      error: null,
      isAuthenticated: true,
    };
  }, []);

  const logout = async () => {
    // No-op for public access
    return Promise.resolve();
  };

  return {
    ...state,
    refresh: () => Promise.resolve(),
    logout,
  };
}
