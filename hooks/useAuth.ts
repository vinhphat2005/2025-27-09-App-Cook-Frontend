import { useAuthStore } from "@/store/authStore";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
export function useAuthReady() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const unsub = (useAuthStore as any).persist.onFinishHydration?.(() => setReady(true));
    // fallback nếu không dùng persist plugin:
    setReady(true);
    return () => unsub?.();
  }, []);
  return ready;
}

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
