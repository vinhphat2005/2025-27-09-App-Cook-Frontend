// utils/storage.ts - Universal storage for web and native
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

// Web-compatible storage wrapper
export const universalStorage = {
  getItem: async (key: string): Promise<string | null> => {
    if (Platform.OS === "web") {
      try {
        return localStorage.getItem(key);
      } catch (e) {
        console.error("localStorage getItem error:", e);
        return null;
      }
    }
    return AsyncStorage.getItem(key);
  },

  setItem: async (key: string, value: string): Promise<void> => {
    if (Platform.OS === "web") {
      try {
        localStorage.setItem(key, value);
        return;
      } catch (e) {
        console.error("localStorage setItem error:", e);
        return;
      }
    }
    return AsyncStorage.setItem(key, value);
  },

  removeItem: async (key: string): Promise<void> => {
    if (Platform.OS === "web") {
      try {
        localStorage.removeItem(key);
        return;
      } catch (e) {
        console.error("localStorage removeItem error:", e);
        return;
      }
    }
    return AsyncStorage.removeItem(key);
  },
};
