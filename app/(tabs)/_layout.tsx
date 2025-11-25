import { Tabs } from "expo-router";
import React from "react";
import { Platform } from "react-native";
import { isWeb } from "@/styles/responsive";

import { AuthGuard } from "@/components/AuthGuard";
import { HapticTab } from "@/components/HapticTab";
import { IconSymbol } from "@/components/ui/IconSymbol";
import TabBarBackground from "@/components/ui/TabBarBackground";

export default function TabLayout() {
  return (
    <AuthGuard>
      <Tabs
        screenOptions={{
          headerStyle: {
            backgroundColor: "white",
          },
          headerShown: false,
          tabBarActiveTintColor: "#dd3300",
          tabBarInactiveTintColor: "#666",
          tabBarButton: HapticTab,
          tabBarStyle: Platform.select({
            ios: {
              // Use a transparent background on iOS to show the blur effect
              position: "absolute",
            },
            web: {
              height: 60,
              paddingBottom: 8,
              paddingTop: 8,
              borderTopWidth: 1,
              borderTopColor: "#e0e0e0",
              backgroundColor: "white",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: -2 },
              shadowOpacity: 0.1,
              shadowRadius: 8,
            },
            default: {},
          }),
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Trang chủ",
            tabBarIcon: ({ color }) => (
              <IconSymbol size={28} name="house.fill" color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="recipe"
          options={{
            title: "Công thức",
            tabBarIcon: ({ color }) => (
              <IconSymbol size={28} name="fork.knife" color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="favorite"
          options={{
            title: "Yêu thích",
            tabBarIcon: ({ color }) => (
              <IconSymbol size={28} name="heart.fill" color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            headerShown: true,
            headerTitle: "Thông tin cá nhân",
            headerTitleStyle: {
              fontSize: 20,
            },
            headerStyle: {
              borderBottomWidth: 0,
              borderBottomColor: "transparent",
              backgroundColor: "white",
            },
            title: "Cá nhân",
            tabBarIcon: ({ color }) => (
              <IconSymbol size={28} name="person.fill" color={color} />
            ),
          }}
        />
      </Tabs>
    </AuthGuard>
  );
}
