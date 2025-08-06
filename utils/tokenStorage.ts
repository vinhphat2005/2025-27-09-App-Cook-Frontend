import AsyncStorage from "@react-native-async-storage/async-storage";

const TOKEN_KEY = "jwt_access_token";

export const tokenStorage = {
  // Store access token
  setAccessToken: async (token: string): Promise<void> => {
    try {
      await AsyncStorage.setItem(TOKEN_KEY, token);
    } catch (error) {
      console.error("Error storing access token:", error);
    }
  },

  // Get access token
  getAccessToken: async (): Promise<string | null> => {
    try {
      return await AsyncStorage.getItem(TOKEN_KEY);
    } catch (error) {
      console.error("Error getting access token:", error);
      return null;
    }
  },

  // Clear all tokens
  clearTokens: async (): Promise<void> => {
    try {
      await AsyncStorage.multiRemove([TOKEN_KEY]);
    } catch (error) {
      console.error("Error clearing tokens:", error);
    }
  },

  // Check if user is authenticated
  isAuthenticated: async (): Promise<boolean> => {
    const token = await tokenStorage.getAccessToken();
    return token !== null;
  }
};
