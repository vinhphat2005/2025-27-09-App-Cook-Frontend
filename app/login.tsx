import { useAuth } from "@/hooks/useAuth";
import { AppConfig } from "@/lib/config";
import { yupResolver } from "@hookform/resolvers/yup";
import { Image } from "expo-image";
import { Stack, useRouter } from "expo-router";
import { useEffect, useState, useRef } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Keyboard,
  AppState,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { signInWithCustomToken } from "firebase/auth";
import { auth } from "@/utils/firebaseConfig";
import { responsive, isWeb } from "@/styles/responsive";
import * as yup from "yup";

const API_BASE_URL = AppConfig.api.url;
const { width } = Dimensions.get('window');

// Login schema
const loginSchema = yup.object({
  email: yup.string().email("Email không hợp lệ").required("Email là bắt buộc"),
  password: yup.string().min(6, "Mật khẩu ít nhất 6 ký tự").required("Mật khẩu là bắt buộc"),
});

type LoginFormData = yup.InferType<typeof loginSchema>;
type LoginStep = 'credentials' | 'otp';

export default function LoginOTP() {
  const router = useRouter();
  const { login, redirectIfAuthenticated } = useAuth();
  
  // State management
  const [currentStep, setCurrentStep] = useState<LoginStep>('credentials');
  const [isLoading, setIsLoading] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [otpId, setOtpId] = useState('');
  
  // OTP related states
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const maxAttempts = 3;

  // Form management
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: yupResolver(loginSchema),
  });
  
  // Refs for OTP inputs
  const otpInputRefs = useRef<TextInput[]>([]);

  // ✅ Fix keyboard not showing after app switch
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active' && currentStep === 'otp') {
        // Only refocus when in OTP step
        setTimeout(() => {
          const firstEmptyIndex = otp.findIndex(digit => digit === '');
          if (firstEmptyIndex !== -1 && otpInputRefs.current[firstEmptyIndex]) {
            otpInputRefs.current[firstEmptyIndex]?.focus();
          }
        }, 100);
      }
    });

    return () => {
      subscription.remove();
    };
  }, [currentStep, otp]);

  // Redirect if authenticated
  useEffect(() => {
    redirectIfAuthenticated();
  }, [redirectIfAuthenticated]);

  // Countdown timer for resend
  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setTimeout(() => setResendCountdown(resendCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCountdown]);

  // Handle login form submit (Step 1: Verify email + password → Send OTP)
  const onSubmitLogin = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      console.log("Step 1: Verifying credentials and sending OTP:", data.email);
      
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: data.email,
          password: data.password
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.detail || 'Đăng nhập thất bại');
      }

      if (result.success) {
        setUserEmail(data.email);
        setUserPassword(data.password);
        setOtpId(result.otp_id);
        setCurrentStep('otp');
        setResendCountdown(60); // 1 minute cooldown
        
        Alert.alert(
          'OTP đã được gửi',
          result.message || 'Chúng tôi đã gửi mã xác thực đến email của bạn.',
          [{ text: 'OK' }]
        );
      } else {
        throw new Error('Phản hồi không hợp lệ từ server');
      }
    } catch (error: any) {
      console.error("Login step 1 error:", error);
      Alert.alert('Lỗi', error.message || 'Có lỗi xảy ra khi đăng nhập');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle OTP input change
  const handleOtpChange = (text: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);

    // Auto focus next input
    if (text && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }

    // Auto verify when all 6 digits are entered
    if (newOtp.every(digit => digit !== '') && text) {
      handleVerifyOTP(newOtp.join(''));
    }
  };

  // Handle OTP key press
  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  // Verify OTP
  const handleVerifyOTP = async (otpCode: string) => {
    if (attempts >= maxAttempts) {
      Alert.alert('Lỗi', 'Đã vượt quá số lần thử tối đa');
      return;
    }

    setIsVerifying(true);
    try {
      console.log("Verifying OTP for login:", otpCode);
      
      const response = await fetch(`${API_BASE_URL}/api/auth/login/verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: userEmail,
          otp_code: otpCode,
          otp_id: otpId
        })
      });

      const result = await response.json();

      if (!response.ok) {
        setAttempts(prev => prev + 1);
        setOtp(['', '', '', '', '', '']);
        throw new Error(result.detail || 'Xác thực OTP thất bại');
      }

      if (result.success) {
        console.log("✅ OTP verified successfully");
        
        // Backend trả về custom token, sign in với Firebase
        if (result.firebase_token) {
          try {
            console.log("Signing in with custom token from backend...");
            
            // Sign in với custom token từ backend
            const userCredential = await signInWithCustomToken(auth, result.firebase_token);
            const user = userCredential.user;
            
            // Get Firebase ID token
            const idToken = await user.getIdToken();
            
            // Update auth context với user data từ backend
            const userData = result.user_data || {
              email: userEmail,
              id: user.uid,
              name: result.user_data?.name || "",
              address: "",
              username: result.user_data?.display_id || userEmail.split('@')[0],
              avatar: result.user_data?.avatar || "",
            };
            
            login(idToken, userData);
            
            Alert.alert(
              'Đăng nhập thành công!',
              'Chào mừng bạn quay trở lại.',
              [
                {
                  text: 'OK',
                  onPress: () => router.replace('/(tabs)')
                }
              ]
            );
            
          } catch (firebaseError: any) {
            console.error("Firebase custom token sign in error:", firebaseError);
            Alert.alert(
              'Lỗi đăng nhập',
              'OTP đã được xác thực nhưng có lỗi khi đăng nhập. Vui lòng thử lại.',
              [
                {
                  text: 'OK',
                  onPress: () => router.replace(`/login?email=${encodeURIComponent(userEmail)}`)
                }
              ]
            );
          }
        } else {
          // Fallback: Backend không trả custom token
          Alert.alert(
            'OTP xác thực thành công!',
            'Vui lòng thử đăng nhập lại.',
            [
              {
                text: 'OK',
                onPress: () => {
                  router.replace(`/login?email=${encodeURIComponent(userEmail)}&verified=true`);
                }
              }
            ]
          );
        }
      } else {
        throw new Error('Phản hồi không hợp lệ từ server');
      }
    } catch (error: any) {
      console.error("OTP verification error:", error);
      Alert.alert('Lỗi', error.message || 'Có lỗi xảy ra khi xác thực OTP');
    } finally {
      setIsVerifying(false);
    }
  };

  // Resend OTP
  const handleResendOTP = async () => {
    if (resendCountdown > 0 || isResending) return;

    setIsResending(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/resend-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          otp_id: otpId,
          email: userEmail
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.detail || 'Không thể gửi lại OTP');
      }

      if (result.success) {
        setResendCountdown(60);
        setOtp(['', '', '', '', '', '']);
        setAttempts(0);
        Alert.alert('Thành công', result.message);
      }
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Không thể gửi lại OTP');
    } finally {
      setIsResending(false);
    }
  };

  // Handle back to credentials step
  const handleBackToCredentials = () => {
    setCurrentStep('credentials');
    setOtp(['', '', '', '', '', '']);
    setAttempts(0);
    setResendCountdown(0);
  };

  // Render login credentials form
  const renderCredentialsForm = () => (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.logoContainer}>
        <Image
          source={require("@/assets/images/logo.png")}
          style={styles.logo}
        />
      </View>

      <Text style={styles.title}>Đăng nhập</Text>
      <Text style={styles.subtitle}>
        Nhập email và mật khẩu để nhận mã xác thực
      </Text>

      {/* Email */}
      <Text style={styles.label}>Email</Text>
      <Controller
        control={control}
        name="email"
        render={({ field: { onChange, onBlur, value } }) => (
          <View>
            <TextInput
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder="Nhập địa chỉ email"
              keyboardType="email-address"
              autoCapitalize="none"
              autoFocus={true}
              style={[styles.input, errors.email && styles.inputError]}
            />
            {errors.email && (
              <Text style={styles.errorText}>{errors.email.message}</Text>
            )}
          </View>
        )}
      />

      {/* Password */}
      <Text style={styles.label}>Mật khẩu</Text>
      <Controller
        control={control}
        name="password"
        render={({ field: { onChange, onBlur, value } }) => (
          <View>
            <TextInput
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder="Nhập mật khẩu"
              secureTextEntry
              style={[styles.input, errors.password && styles.inputError]}
            />
            {errors.password && (
              <Text style={styles.errorText}>{errors.password.message}</Text>
            )}
          </View>
        )}
      />

      <TouchableOpacity
        style={[styles.submitButton, isLoading && styles.disabledButton]}
        onPress={handleSubmit(onSubmitLogin)}
        disabled={isLoading}
      >
        <Text style={styles.submitButtonText}>
          {isLoading ? "Đang xác thực..." : "Gửi mã OTP"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.linkButton}
        onPress={() => router.replace("/otp-register")}
      >
        <Text style={styles.linkText}>
          Chưa có tài khoản? Đăng ký ngay
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen 
        options={{ 
          headerShown: false 
        }} 
      />
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        {currentStep === 'credentials' && renderCredentialsForm()}
        {currentStep === 'otp' && (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
          <View style={styles.logoContainer}>
            <Image
              source={require("@/assets/images/logo.png")}
              style={styles.logo}
            />
          </View>

          <Text style={styles.title}>Xác thực đăng nhập</Text>
          <Text style={styles.subtitle}>
            Nhập mã 6 số đã được gửi đến{'\n'}
            <Text style={styles.emailText}>{userEmail}</Text>
          </Text>

          <View style={styles.otpContainer}>
            {otp.map((digit, index) => (
              <TextInput
                key={index}
                ref={(ref) => {
                  if (ref) otpInputRefs.current[index] = ref;
                }}
                style={[
                  styles.otpInput,
                  digit && styles.otpInputFilled
                ]}
                value={digit}
                onChangeText={(text) => handleOtpChange(text.slice(-1), index)}
                onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
                onSubmitEditing={() => {
                  if (index < 5) {
                    otpInputRefs.current[index + 1]?.focus();
                  }
                }}
                keyboardType="number-pad"
                maxLength={1}
                textAlign="center"
                selectTextOnFocus
                autoFocus={index === 0}
                editable={!isVerifying}
              />
            ))}
          </View>

          <Text style={styles.attemptsText}>
            Còn {maxAttempts - attempts} lần thử
          </Text>

          <TouchableOpacity
            style={[
              styles.verifyButton,
              isVerifying && styles.disabledButton
            ]}
            onPress={() => handleVerifyOTP(otp.join(''))}
            disabled={isVerifying || otp.some(digit => digit === '')}
          >
            <Text style={styles.verifyButtonText}>
              {isVerifying ? 'Đang xác thực...' : 'Xác thực và đăng nhập'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.resendButton,
              (resendCountdown > 0 || isResending) && styles.disabledButton
            ]}
            onPress={handleResendOTP}
            disabled={resendCountdown > 0 || isResending}
          >
            <Text style={styles.resendButtonText}>
              {isResending 
                ? 'Đang gửi...' 
                : resendCountdown > 0 
                  ? `Gửi lại sau ${resendCountdown}s`
                  : 'Gửi lại mã OTP'
              }
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBackToCredentials}
          >
            <Text style={styles.backButtonText}>← Quay lại</Text>
          </TouchableOpacity>
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: isWeb ? "#f5f5f5" : "white"
  },
  keyboardAvoidingView: { 
    flex: 1 
  },
  scrollContent: { 
    flexGrow: 1, 
    padding: responsive.spacing.lg, 
    justifyContent: "center",
    ...(isWeb && {
      maxWidth: 480,
      alignSelf: 'center',
      width: '100%',
    }),
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: responsive.spacing.lg,
  },
  logo: { 
    width: isWeb ? 120 : 100, 
    height: isWeb ? 120 : 100
  },
  title: {
    fontSize: responsive.fontSize.xxl,
    fontWeight: "bold",
    marginBottom: responsive.spacing.sm,
    textAlign: "center",
    color: '#1a1a1a',
  },
  subtitle: {
    fontSize: responsive.fontSize.md,
    color: '#666',
    textAlign: 'center',
    marginBottom: responsive.spacing.xl,
    lineHeight: 22,
  },
  emailText: {
    fontWeight: 'bold',
    color: '#007AFF',
  },
  // Form styles
  label: { 
    marginBottom: responsive.spacing.sm,
    fontSize: responsive.fontSize.md,
    fontWeight: '600',
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: responsive.borderRadius.md,
    padding: responsive.spacing.md,
    marginBottom: responsive.spacing.md,
    fontSize: responsive.fontSize.md,
    backgroundColor: isWeb ? 'white' : 'transparent',
    ...(isWeb && {
      outlineStyle: 'none' as any,
      transition: 'border-color 0.2s',
    }),
  },
  inputError: {
    borderColor: "#ff3b30",
  },
  errorText: { 
    color: "#ff3b30", 
    fontSize: responsive.fontSize.sm, 
    marginTop: -responsive.spacing.sm, 
    marginBottom: responsive.spacing.sm 
  },
  submitButton: {
    backgroundColor: "#007AFF",
    borderRadius: responsive.borderRadius.md,
    padding: responsive.spacing.md,
    marginTop: responsive.spacing.lg,
    marginBottom: responsive.spacing.md,
    ...(isWeb && {
      boxShadow: '0 2px 8px rgba(0, 122, 255, 0.3)' as any,
      cursor: 'pointer' as any,
    }),
  },
  submitButtonText: {
    color: "white",
    fontSize: responsive.fontSize.lg,
    fontWeight: "600",
    textAlign: "center",
  },
  linkButton: {
    marginTop: responsive.spacing.md,
    padding: responsive.spacing.sm,
  },
  linkText: {
    color: "#007AFF",
    fontSize: responsive.fontSize.md,
    textAlign: "center",
  },
  // OTP styles
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: responsive.spacing.lg,
    gap: isWeb ? 12 : 8,
  },
  otpInput: {
    width: isWeb ? 55 : 45,
    height: isWeb ? 65 : 55,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderRadius: responsive.borderRadius.md,
    fontSize: responsive.fontSize.xxl,
    fontWeight: 'bold',
    backgroundColor: isWeb ? 'white' : '#f9f9f9',
    textAlign: 'center',
    ...(isWeb && {
      outlineStyle: 'none' as any,
    }),
  },
  otpInputFilled: {
    borderColor: '#007AFF',
    backgroundColor: '#f0f8ff',
  },
  attemptsText: {
    textAlign: 'center',
    color: '#666',
    marginBottom: responsive.spacing.lg,
    fontSize: responsive.fontSize.md,
  },
  verifyButton: {
    backgroundColor: '#007AFF',
    borderRadius: responsive.borderRadius.md,
    padding: responsive.spacing.md,
    marginBottom: responsive.spacing.md,
    ...(isWeb && {
      boxShadow: '0 2px 8px rgba(0, 122, 255, 0.3)' as any,
    }),
  },
  verifyButtonText: {
    color: 'white',
    fontSize: responsive.fontSize.lg,
    fontWeight: '600',
    textAlign: 'center',
  },
  resendButton: {
    backgroundColor: isWeb ? '#34c759' : '#28a745',
    borderRadius: responsive.borderRadius.md,
    padding: responsive.spacing.md,
    marginBottom: responsive.spacing.md,
  },
  resendButtonText: {
    color: 'white',
    fontSize: responsive.fontSize.lg,
    fontWeight: '600',
    textAlign: 'center',
  },
  disabledButton: {
    backgroundColor: '#ccc',
    opacity: 0.6,
  },
  backButton: {
    marginTop: responsive.spacing.md,
    padding: responsive.spacing.sm,
  },
  backButtonText: {
    color: '#007AFF',
    fontSize: responsive.fontSize.md,
    textAlign: 'center',
  },
});