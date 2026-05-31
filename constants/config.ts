/**
 * API Configuration
 * Automatically detects environment and uses appropriate API URL
 */

import { Platform } from 'react-native';
import { AppConfig } from '@/lib/config';

// Detect if running on Cloudflare Pages or local dev
const isCloudflare = typeof window !== 'undefined' &&
                      window.location.hostname !== 'localhost' &&
                      window.location.hostname !== '127.0.0.1';

/**
 * Base API URL - auto-selects based on environment
 * - Production (Cloudflare): Uses Railway API URL
 * - Local dev: Uses localhost:8000
 * - Expo Go: Uses your computer's local IP
 */
export const API_BASE_URL = AppConfig.api.url;

export const API_ENDPOINTS = {
  // Auth
  AUTH: {
    LOGIN: `${API_BASE_URL}/auth/login`,
    REGISTER: `${API_BASE_URL}/auth/register`,
    VERIFY_TOKEN: `${API_BASE_URL}/auth/verify-token`,
    REFRESH: `${API_BASE_URL}/auth/refresh`,
  },

  // Users
  USERS: {
    BASE: `${API_BASE_URL}/users`,
    PROFILE: (userId: string) => `${API_BASE_URL}/users/${userId}`,
    UPDATE: (userId: string) => `${API_BASE_URL}/users/${userId}`,
    FOLLOWERS: (userId: string) => `${API_BASE_URL}/users/${userId}/followers`,
    FOLLOWING: (userId: string) => `${API_BASE_URL}/users/${userId}/following`,
  },

  // Dishes
  DISHES: {
    BASE: `${API_BASE_URL}/dishes`,
    DETAIL: (dishId: string) => `${API_BASE_URL}/dishes/${dishId}`,
    CREATE: `${API_BASE_URL}/dishes`,
    UPDATE: (dishId: string) => `${API_BASE_URL}/dishes/${dishId}`,
    DELETE: (dishId: string) => `${API_BASE_URL}/dishes/${dishId}`,
    TRENDING: `${API_BASE_URL}/dishes/trending`,
    FAVORITES: `${API_BASE_URL}/dishes/favorites`,
    BY_USER: (userId: string) => `${API_BASE_URL}/dishes/user/${userId}`,
  },

  // Recipes
  RECIPES: {
    BASE: `${API_BASE_URL}/recipes`,
    BY_DISH: (dishId: string) => `${API_BASE_URL}/recipes/dish/${dishId}`,
  },

  // Comments
  COMMENTS: {
    BASE: `${API_BASE_URL}/comments`,
    BY_DISH: (dishId: string) => `${API_BASE_URL}/comments/dish/${dishId}`,
  },

  // Search
  SEARCH: {
    BASE: `${API_BASE_URL}/search`,
    DISHES: `${API_BASE_URL}/search/dishes`,
    USERS: `${API_BASE_URL}/search/users`,
  },

  // Recommendations
  RECOMMENDATIONS: {
    BASE: `${API_BASE_URL}/api/recommendations`,
    PERSONALIZED: `${API_BASE_URL}/api/recommendations/personalized`,
  },
};

// Warm up backend if in production (prevent cold start)
if (isCloudflare && typeof window !== 'undefined') {
  fetch(`${API_BASE_URL}/health`, { method: 'HEAD' }).catch(() => {});
}
// Log current environment for debugging
if (__DEV__) {
  __DEV__ && console.debug('🌐 API Configuration:', {
    environment: isCloudflare ? 'Production (Cloudflare)' : 'Development',
    baseURL: API_BASE_URL,
    platform: Platform.OS,
  });
}
