import { useAuthStore } from "@/store/authStore";
import { emailVerificationService, shouldBlockAccess } from "@/lib/emailVerification"; 
import { auth } from "@/utils/firebaseConfig";
import { useRouter } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";
import { useEffect, useState } from "react";
export function useAuthReady() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const unsub = (useAuthStore as any).persist.onFinishHydration?.(() => setReady(true));
    // fallback nếu không dùng persist plugin:
    setReady(true);
    return () => unsub?.();
  }, []);
  return ready;
}

export function useAuth() {
  const { isAuthenticated, token, user, login, logout } = useAuthStore();
  const router = useRouter();
  const [isEmailVerified, setIsEmailVerified] = useState<boolean | null>(null);

  // Monitor Firebase Auth state và email verification
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Kiểm tra email verification status
          const verified = await emailVerificationService.checkEmailVerified(firebaseUser);
          setIsEmailVerified(verified);
          
          console.log('Firebase user email verified:', verified);
          
          // Nếu user đã đăng nhập trong app store nhưng email chưa verified
          if (isAuthenticated && !verified) {
            console.log('User authenticated but email not verified, logging out...');
            logout();
            router.replace(`/notification?type=email-verification&email=${encodeURIComponent(firebaseUser.email || '')}`);
          }
        } catch (error) {
          console.error('Error checking email verification:', error);
          setIsEmailVerified(false);
        }
      } else {
        setIsEmailVerified(null);
        // Nếu Firebase user null nhưng app store vẫn authenticated
        if (isAuthenticated) {
          console.log('Firebase user null but app authenticated, logging out...');
          logout();
        }
      }
    });

    return unsubscribe;
  }, [isAuthenticated, logout, router]);

  const requireAuth = () => {
    if (!isAuthenticated) {
      router.replace("/login");
      return false;
    }
    
    // Kiểm tra email verification
    if (isEmailVerified === false) {
      console.log('Email not verified, redirecting to verification...');
      const currentUser = auth.currentUser;
      if (currentUser?.email) {
        router.replace(`/notification?type=email-verification&email=${encodeURIComponent(currentUser.email)}`);
      } else {
        router.replace("/login");
      }
      return false;
    }
    
    return true;
  };

  const redirectIfAuthenticated = () => {
    if (isAuthenticated && isEmailVerified === true) {
      router.replace("/(tabs)");
      return true;
    }
    return false;
  };

  // Kiểm tra xem có nên block access không
  const shouldBlockAppAccess = () => {
    return shouldBlockAccess(auth.currentUser);
  };

  // Gửi lại email verification
  const resendEmailVerification = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('Không có user đang đăng nhập');
    }
    
    await emailVerificationService.resendVerificationEmail(currentUser);
  };

  // Check email verification status manually
  const checkEmailVerificationStatus = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      return false;
    }
    
    const verified = await emailVerificationService.checkEmailVerified(currentUser);
    setIsEmailVerified(verified);
    return verified;
  };

  return {
    isAuthenticated,
    token,
    user,
    login,
    logout,
    requireAuth,
    redirectIfAuthenticated,
    isEmailVerified,
    shouldBlockAppAccess,
    resendEmailVerification,
    checkEmailVerificationStatus
  };
}
