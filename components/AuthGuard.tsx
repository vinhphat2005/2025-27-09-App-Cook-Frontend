import { useAuthStore } from "@/store/authStore";
import { Redirect } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View, Text, Platform } from "react-native";

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { isAuthenticated, _hasHydrated } = useAuthStore();
  const [forceReady, setForceReady] = useState(false);

  useEffect(() => {
    // Fallback: Force ready after 2 seconds (especially for web)
    const timeout = setTimeout(() => {
      console.log("[AuthGuard] Force ready after timeout");
      setForceReady(true);
    }, 2000);

    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    console.log("[AuthGuard] State:", { 
      _hasHydrated, 
      isAuthenticated, 
      forceReady,
      platform: Platform.OS 
    });
  }, [_hasHydrated, isAuthenticated, forceReady]);

  // Wait for hydration or timeout
  if (!_hasHydrated && !forceReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#fcd303" />
        <Text style={styles.loadingText}>Đang tải...</Text>
      </View>
    );
  }

  // Once hydrated, check authentication
  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff"
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#666"
  }
});
