import { useAuthStore } from "@/store/authStore";
import { useRouter } from "expo-router";

export function useAuth() {
  const { isAuthenticated, token, user, login, logout } = useAuthStore();
  const router = useRouter();

  const requireAuth = () => {
    if (!isAuthenticated) {
      router.replace("/login");
      return false;
    }
    return true;
  };

  const redirectIfAuthenticated = () => {
    if (isAuthenticated) {
      router.replace("/(tabs)");
      return true;
    }
    return false;
  };

  return {
    isAuthenticated,
    token,
    user,
    login,
    logout,
    requireAuth,
    redirectIfAuthenticated
  };
}
