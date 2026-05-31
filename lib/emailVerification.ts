import {
  sendEmailVerification,
  reload,
  User,
  fetchSignInMethodsForEmail,
  applyActionCode,
  verifyBeforeUpdateEmail
} from 'firebase/auth';
import { auth } from '@/utils/firebaseConfig';
import AppConfig from '@/lib/config';

export interface EmailVerificationService {
  sendVerificationEmail: (user: User) => Promise<void>;
  checkEmailVerified: (user: User) => Promise<boolean>;
  resendVerificationEmail: (user: User) => Promise<void>;
  checkEmailExists: (email: string) => Promise<boolean>;
  verifyActionCode: (code: string) => Promise<void>;
  validateEmailDeliverability: (email: string) => Promise<{
    valid: boolean;
    reason?: string;
  }>;
}

export const emailVerificationService: EmailVerificationService = {
  // Gửi email xác thực
  sendVerificationEmail: async (user: User) => {
    try {
      __DEV__ && console.debug('Sending verification email to:', user.email);

      // Cấu hình action code settings từ environment variables
      const actionCodeSettings = {
        // URL người dùng sẽ được redirect sau khi click link
        url: AppConfig.emailVerification.actionUrl,
        handleCodeInApp: true,
        // Cấu hình cho mobile app
        iOS: {
          bundleId: AppConfig.app.bundleId
        },
        android: {
          packageName: AppConfig.app.packageName,
          installApp: true,
          minimumVersion: AppConfig.app.version
        }
      };

      __DEV__ && console.debug('📧 Email verification config:', {
        url: actionCodeSettings.url,
        bundleId: actionCodeSettings.iOS.bundleId,
        packageName: actionCodeSettings.android.packageName
      });

      await sendEmailVerification(user, actionCodeSettings);
      __DEV__ && console.debug('✅ Verification email sent successfully');
    } catch (error: any) {
      console.error('❌ Error sending verification email:', error);

      // Handle specific errors
      switch (error.code) {
        case 'auth/too-many-requests':
          throw new Error('Đã gửi quá nhiều email. Vui lòng thử lại sau.');
        case 'auth/user-token-expired':
          throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        case 'auth/network-request-failed':
          throw new Error('Lỗi kết nối mạng. Vui lòng kiểm tra internet.');
        default:
          throw new Error(`Không thể gửi email xác thực: ${error.message}`);
      }
    }
  },

  // Kiểm tra email đã được xác thực chưa
  checkEmailVerified: async (user: User): Promise<boolean> => {
    try {
      // Reload user để lấy thông tin mới nhất
      await reload(user);
      __DEV__ && console.debug('Email verified status:', user.emailVerified);
      return user.emailVerified;
    } catch (error: any) {
      console.error('❌ Error checking email verification:', error);
      return false;
    }
  },

  // Gửi lại email xác thực
  resendVerificationEmail: async (user: User) => {
    try {
      // Kiểm tra xem có thể gửi lại không (rate limiting)
      const lastSent = localStorage.getItem(`lastVerificationSent_${user.uid}`);
      const now = Date.now();
      const cooldownTime = 60 * 1000; // 1 phút

      if (lastSent && (now - parseInt(lastSent)) < cooldownTime) {
        const remainingTime = Math.ceil((cooldownTime - (now - parseInt(lastSent))) / 1000);
        throw new Error(`Vui lòng đợi ${remainingTime} giây trước khi gửi lại.`);
      }

      await emailVerificationService.sendVerificationEmail(user);
      localStorage.setItem(`lastVerificationSent_${user.uid}`, now.toString());
    } catch (error: any) {
      throw error;
    }
  },

  // Kiểm tra email có tồn tại và có thể gửi email thực sự không
  checkEmailExists: async (email: string): Promise<boolean> => {
    try {
      __DEV__ && console.debug('Checking if email exists in Firebase:', email);

      // Bước 1: Kiểm tra email format hợp lệ
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new Error('Email không hợp lệ.');
      }

      // Bước 2: Kiểm tra email đã tồn tại trong Firebase
      const signInMethods = await fetchSignInMethodsForEmail(auth, email);
      __DEV__ && console.debug('Sign in methods for email:', signInMethods);

      const existsInFirebase = signInMethods.length > 0;

      // Bước 3: Kiểm tra email domain có hợp lệ không (basic validation)
      const domain = email.split('@')[1];
      const commonDomains = [
        'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com',
        'icloud.com', 'live.com', 'msn.com', 'aol.com',
        'protonmail.com', 'yandex.com', 'mail.com'
      ];

      const isCommonDomain = commonDomains.includes(domain.toLowerCase());

      if (!isCommonDomain) {
        __DEV__ && console.debug(`⚠️ Uncommon email domain: ${domain}`);
        // Không block, chỉ warning
      }

      __DEV__ && console.debug(`Email ${email} - Firebase exists: ${existsInFirebase}, Domain valid: ${isCommonDomain}`);

      return existsInFirebase;
    } catch (error: any) {
      console.error('❌ Error checking email existence:', error);

      switch (error.code) {
        case 'auth/invalid-email':
          throw new Error('Email không hợp lệ.');
        case 'auth/network-request-failed':
          throw new Error('Lỗi kết nối mạng.');
        default:
          // Nếu có lỗi khác, coi như email không tồn tại
          return false;
      }
    }
  },

  // Kiểm tra email có thể nhận email thực sự không (advanced validation)
  validateEmailDeliverability: async (email: string): Promise<{
    valid: boolean;
    reason?: string;
  }> => {
    try {
      // Basic email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return { valid: false, reason: 'Email format không hợp lệ' };
      }

      // Check for common disposable email domains
      const disposableDomains = [
        '10minutemail.com', 'tempmail.org', 'guerrillamail.com',
        'mailinator.com', 'yopmail.com', 'temp-mail.org',
        'throwaway.email', '10minuteemail.com'
      ];

      const domain = email.split('@')[1]?.toLowerCase();
      if (disposableDomains.includes(domain)) {
        return { valid: false, reason: 'Email tạm thời không được phép' };
      }

      // Check for common typos in popular domains
      const domainCorrections: { [key: string]: string } = {
        'gmai.com': 'gmail.com',
        'gmial.com': 'gmail.com',
        'gmail.co': 'gmail.com',
        'yahooo.com': 'yahoo.com',
        'hotmial.com': 'hotmail.com',
      };

      if (domainCorrections[domain]) {
        return {
          valid: false,
          reason: `Có phải bạn muốn dùng ${email.replace(domain, domainCorrections[domain])}?`
        };
      }

      return { valid: true };
    } catch (error) {
      console.error('Email validation error:', error);
      return { valid: true }; // Default to valid if validation fails
    }
  },

  // Xác thực action code (từ email link)
  verifyActionCode: async (code: string) => {
    try {
      await applyActionCode(auth, code);
      __DEV__ && console.debug('✅ Email verification completed');
    } catch (error: any) {
      console.error('❌ Error verifying action code:', error);

      switch (error.code) {
        case 'auth/expired-action-code':
          throw new Error('Mã xác thực đã hết hạn. Vui lòng yêu cầu gửi lại.');
        case 'auth/invalid-action-code':
          throw new Error('Mã xác thực không hợp lệ.');
        case 'auth/user-disabled':
          throw new Error('Tài khoản đã bị vô hiệu hóa.');
        default:
          throw new Error(`Không thể xác thực email: ${error.message}`);
      }
    }
  }
};

// Utility functions
export const getVerificationStatus = (user: User | null) => {
  if (!user) return 'not-authenticated';
  if (!user.emailVerified) return 'not-verified';
  return 'verified';
};

export const shouldBlockAccess = (user: User | null): boolean => {
  return !user || !user.emailVerified;
};

// Constants
export const VERIFICATION_COOLDOWN = 60 * 1000; // 1 phút
export const VERIFICATION_TIMEOUT = 10 * 60 * 1000; // 10 phút
