/**
 * App Configuration
 * Quản lý tất cả environment variables và cấu hình ứng dụng
 */
import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Helper function to get environment variable
 * For web: reads from window._env_ (injected at runtime)
 * For native: reads from process.env
 */
const getEnv = (key: string): string | undefined => {
  // For web builds, check window object first (runtime injection)
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const win = window as any;
    if (win._env_ && win._env_[key]) {
      return win._env_[key];
    }
  }
  
  // Try process.env (works in development and native builds)
  const envValue = process.env[key];
  if (envValue && envValue !== 'undefined') {
    return envValue;
  }
  
  // Fallback to Constants.expoConfig.extra if available
  if (Constants.expoConfig?.extra?.[key]) {
    return Constants.expoConfig.extra[key];
  }
  
  return undefined;
};

/**
 * Auto-detect backend API URL
 * - Development: Use local backend on same WiFi network
 * - Production: Use Render backend
 */
const getApiUrl = (): string => {
  // Development: Auto-detect local IP from Expo dev server
  if (__DEV__ && Constants.expoConfig?.hostUri) {
    const [host] = Constants.expoConfig.hostUri.split(':');
    return `http://${host}:8000`;
  }

  // Production fallback
  return 'https://app-cook-backend.onrender.com';
};

export const AppConfig = {
  // Firebase Configuration
  firebase: {
    apiKey: getEnv('EXPO_PUBLIC_FIREBASE_API_KEY')!,
    authDomain: getEnv('EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN')!,
    projectId: getEnv('EXPO_PUBLIC_FIREBASE_PROJECT_ID')!,
    storageBucket: getEnv('EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET')!,
    messagingSenderId: getEnv('EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID')!,
    appId: getEnv('EXPO_PUBLIC_FIREBASE_APP_ID')!,
  },

  // App Information
  app: {
    name: getEnv('EXPO_PUBLIC_APP_NAME') || 'App Cook',
    version: getEnv('EXPO_PUBLIC_APP_VERSION') || '1.0.0',
    scheme: getEnv('EXPO_PUBLIC_APP_SCHEME') || 'aicook',
    bundleId: getEnv('EXPO_PUBLIC_BUNDLE_ID') || 'com.aicook.app',
    packageName: getEnv('EXPO_PUBLIC_PACKAGE_NAME') || 'com.aicook.app',
  },

  // Email Verification
  emailVerification: {
    actionUrl: getEnv('EXPO_PUBLIC_EMAIL_VERIFICATION_URL') || 
               `https://${getEnv('EXPO_PUBLIC_FIREBASE_PROJECT_ID')}.firebaseapp.com/__/auth/action`,
  },

  // Google OAuth
  google: {
    webClientId: getEnv('EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID')!,
    iosClientId: getEnv('EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID'),
    androidClientId: getEnv('EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID'),
    reversedClientId: getEnv('EXPO_PUBLIC_GOOGLE_REVERSED_CLIENT_ID'),
  },

  // Backend API
  api: {
    url: getApiUrl(),
    // Expose raw env value for debugging
    rawEnvUrl: getEnv('EXPO_PUBLIC_API_URL'),
  },
} as const;

// Validation function để kiểm tra các biến môi trường bắt buộc
export const validateConfig = () => {
  const requiredEnvVars = [
    'EXPO_PUBLIC_FIREBASE_API_KEY',
    'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN', 
    'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
    'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET',
    'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
    'EXPO_PUBLIC_FIREBASE_APP_ID',
  ];

  const missingVars = requiredEnvVars.filter(
    varName => !getEnv(varName)
  );

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(', ')}\n` +
      'Please check your .env file and ensure all required variables are set.'
    );
  }

  console.log('✅ Environment configuration validated successfully');
};

// Development helper để log cấu hình (chỉ trong dev mode)
export const logConfig = () => {
  if (__DEV__) {
    console.log('🔧 App Configuration:', {
      projectId: AppConfig.firebase.projectId,
      appName: AppConfig.app.name,
      version: AppConfig.app.version,
      scheme: AppConfig.app.scheme,
      bundleId: AppConfig.app.bundleId,
      packageName: AppConfig.app.packageName,
      emailVerificationUrl: AppConfig.emailVerification.actionUrl,
      apiUrl: AppConfig.api.url,
      rawEnvApiUrl: AppConfig.api.rawEnvUrl,
      expoHostUri: Constants.expoConfig?.hostUri,
    });
  }
};

export default AppConfig;