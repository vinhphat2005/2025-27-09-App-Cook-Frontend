/**
 * App Configuration
 * Quản lý tất cả environment variables và cấu hình ứng dụng
 */
import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Auto-detect backend API URL
 * - Production: Dùng EXPO_PUBLIC_API_URL từ .env
 * - Development: Tự động phát hiện IP từ Expo dev server
 */
const getApiUrl = (): string => {
  // Nếu có EXPO_PUBLIC_API_URL trong .env và không phải localhost
  const envApiUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envApiUrl && !envApiUrl.includes('localhost') && !envApiUrl.includes('127.0.0.1')) {
    return envApiUrl;
  }

  // Auto-detect từ Expo manifest (chỉ work trong development)
  if (__DEV__ && Constants.expoConfig?.hostUri) {
    const [host] = Constants.expoConfig.hostUri.split(':');
    return `http://${host}:8000`;
  }

  // Fallback: Dùng .env hoặc localhost
  return envApiUrl || 'http://localhost:8000';
};

export const AppConfig = {
  // Firebase Configuration
  firebase: {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY!,
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN!,
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID!,
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET!,
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID!,
  },

  // App Information
  app: {
    name: process.env.EXPO_PUBLIC_APP_NAME || 'App Cook',
    version: process.env.EXPO_PUBLIC_APP_VERSION || '1.0.0',
    scheme: process.env.EXPO_PUBLIC_APP_SCHEME || 'aicook',
    bundleId: process.env.EXPO_PUBLIC_BUNDLE_ID || 'com.aicook.app',
    packageName: process.env.EXPO_PUBLIC_PACKAGE_NAME || 'com.aicook.app',
  },

  // Email Verification
  emailVerification: {
    actionUrl: process.env.EXPO_PUBLIC_EMAIL_VERIFICATION_URL || 
               `https://${process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID}.firebaseapp.com/__/auth/action`,
  },

  // Google OAuth
  google: {
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID!,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    reversedClientId: process.env.EXPO_PUBLIC_GOOGLE_REVERSED_CLIENT_ID,
  },

  // Backend API
  api: {
    url: getApiUrl(),
    // Expose raw env value for debugging
    rawEnvUrl: process.env.EXPO_PUBLIC_API_URL,
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
    varName => !process.env[varName]
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