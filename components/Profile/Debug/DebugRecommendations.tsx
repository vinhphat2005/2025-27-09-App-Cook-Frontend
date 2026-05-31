// components/Debug/DebugRecommendations.tsx
import { useState } from "react";
import { View, Text, Button, ScrollView, StyleSheet } from "react-native";
import { useAuthStore } from "@/store/authStore";
import { AppConfig } from "@/lib/config";

const API_URL = AppConfig.api.url;

export function DebugRecommendations() {
  const [results, setResults] = useState<string[]>([]);
  const { token } = useAuthStore();

  const addLog = (message: string) => {
    __DEV__ && console.debug(message);
    setResults((prev) => [...prev, message]);
  };

  const testEndpoint = async (endpoint: string, requiresAuth: boolean = false) => {
    try {
      addLog(`\n🧪 Testing: ${endpoint}`);
      addLog(`📍 Full URL: ${API_URL}${endpoint}`);

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (requiresAuth && token) {
        headers.Authorization = `Bearer ${token}`;
        addLog(`🔑 Using auth token: ${token.substring(0, 20)}...`);
      }

      const response = await fetch(`${API_URL}${endpoint}`, {
        method: "GET",
        headers,
      });

      addLog(`📊 Status: ${response.status} ${response.statusText}`);

      if (response.ok) {
        const data = await response.json();
        addLog(`✅ Success! Data keys: ${Object.keys(data).join(", ")}`);
        if (data.recommendations) {
          addLog(`📦 Got ${data.recommendations.length} recommendations`);
        }
      } else {
        const errorText = await response.text();
        addLog(`❌ Error response: ${errorText}`);
      }
    } catch (error: any) {
      addLog(`💥 Exception: ${error.message}`);
    }
  };

  const runAllTests = async () => {
    setResults([]);
    addLog(`🚀 Starting API Tests`);
    addLog(`🌐 API_URL: ${API_URL}`);
    addLog(`🔐 Has token: ${!!token}`);

    // Test 1: Trending (no auth)
    await testEndpoint("/api/recommendations/trending?limit=5&days=7&min_rating=0");

    // Test 2: Personalized feed (requires auth)
    if (token) {
      await testEndpoint("/api/recommendations/personalized?limit=5&exclude_seen=true&min_rating=0", true);
    } else {
      addLog(`⚠️ Skipping /personalized - no auth token`);
    }

    // Test 3: Check if endpoint exists
    addLog(`\n🔍 Checking backend health...`);
    try {
      const healthCheck = await fetch(`${API_URL}/docs`);
      addLog(`📚 Swagger docs status: ${healthCheck.status}`);
      if (healthCheck.ok) {
        addLog(`✅ Backend is running! Check ${API_URL}/docs for available endpoints`);
      }
    } catch {
      addLog(`❌ Cannot reach backend at ${API_URL}`);
    }

    addLog(`\n✨ Tests completed!`);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🔧 API Recommendations Debug</Text>
      
      <View style={styles.buttonContainer}>
        <Button title="Run All Tests" onPress={runAllTests} />
        <Button 
          title="Clear" 
          onPress={() => setResults([])} 
          color="#999"
        />
      </View>

      <ScrollView style={styles.logContainer}>
        {results.map((log, index) => (
          <Text key={index} style={styles.logText}>
            {log}
          </Text>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#f5f5f5",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center",
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  logContainer: {
    flex: 1,
    backgroundColor: "#1e1e1e",
    borderRadius: 8,
    padding: 12,
  },
  logText: {
    color: "#fff",
    fontFamily: "monospace",
    fontSize: 12,
    marginBottom: 4,
  },
});
