import { useAuth } from "@/hooks/useAuth";
import { auth } from "@/utils/firebaseConfig";
import { Stack, useRouter } from "expo-router";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { useEffect, useState } from "react";
import { Button, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function DebugAuth() {
  const router = useRouter();
  const { isAuthenticated, token, user, logout } = useAuth();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [testResult, setTestResult] = useState<string>("");

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
      console.log("Auth state changed:", user);
    });

    return () => unsubscribe();
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      logout();
      console.log("Signed out successfully");
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  const handleClearStorage = () => {
    logout();
    console.log("Cleared local storage");
  };

  const testLogin = async () => {
    try {
      setTestResult("Testing login...");
      const result = await signInWithEmailAndPassword(
        auth,
        "test@example.com",
        "password123"
      );
      setTestResult(`Test login successful: ${result.user.email}`);
    } catch (error: any) {
      setTestResult(`Test login failed: ${error.code} - ${error.message}`);
      console.error("Test login error:", error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: "Debug Auth" }} />
      <ScrollView style={styles.scrollView}>
        <Text style={styles.title}>Firebase Auth Debug</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Local State (Zustand)</Text>
          <Text>Is Authenticated: {isAuthenticated ? "Yes" : "No"}</Text>
          <Text>Token: {token ? "Present" : "None"}</Text>
          <Text>User Email: {user?.email || "None"}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Firebase Auth State</Text>
          <Text>Current User: {currentUser ? "Present" : "None"}</Text>
          <Text>User ID: {currentUser?.uid || "None"}</Text>
          <Text>User Email: {currentUser?.email || "None"}</Text>
          <Text>
            Email Verified: {currentUser?.emailVerified ? "Yes" : "No"}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Test Login</Text>
          <Text style={styles.testResult}>{testResult}</Text>
          <Button title="Test Login (test@example.com)" onPress={testLogin} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actions</Text>
          <Button title="Sign Out (Firebase)" onPress={handleSignOut} />
          <View style={styles.buttonSpacer} />
          <Button title="Clear Local Storage" onPress={handleClearStorage} />
          <View style={styles.buttonSpacer} />
          <Button
            title="Go to Login"
            onPress={() => router.replace("/login")}
          />
          <View style={styles.buttonSpacer} />
          <Button
            title="Go to Register"
            onPress={() => router.replace("/register")}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "white"
  },
  scrollView: {
    flex: 1,
    padding: 20
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center"
  },
  section: {
    marginBottom: 30,
    padding: 15,
    backgroundColor: "#f5f5f5",
    borderRadius: 8
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10
  },
  buttonSpacer: {
    height: 10
  },
  testResult: {
    marginBottom: 10,
    padding: 10,
    backgroundColor: "#e8f4fd",
    borderRadius: 4,
    fontSize: 12
  }
});
