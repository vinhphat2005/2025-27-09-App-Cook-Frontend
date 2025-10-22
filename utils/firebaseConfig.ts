import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import AppConfig, { validateConfig, logConfig } from "@/lib/config";

// Validate environment variables
validateConfig();

// Log configuration in development
logConfig();

const firebaseConfig = AppConfig.firebase;

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

export async function getFirebaseToken(forceRefresh = false) {
  const user = auth.currentUser;
  if (!user) return null; // chưa đăng nhập
  return user.getIdToken(forceRefresh);
}

export const db = getFirestore(app);
