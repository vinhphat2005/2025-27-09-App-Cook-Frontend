import { useAuth } from "@/hooks/useAuth";
import { auth } from "@/utils/firebaseConfig";
import AppConfig from "@/lib/config";
import { yupResolver } from "@hookform/resolvers/yup";
import { Image } from "expo-image";
import { Stack, useRouter } from "expo-router";
import { signInWithCustomToken } from "firebase/auth";
import { useEffect, useState, useRef } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  Alert,
  Button,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as yup from "yup";

// Schema xác thực
const registerSchema = yup.object({
  email: yup.string().email("Vui lòng nhập Email hợp lệ").required("Bắt buộc"),
  password: yup
    .string()
    .min(6, "Mật khẩu chứa ít nhất 6 ký tự")
    .required("Bắt buộc"),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref("password")], "Mật khẩu không trùng khớp")
    .required("Bắt buộc"),
});

type RegisterFormData = yup.InferType<typeof registerSchema>;

type RegistrationStep = 'info' | 'otp' | 'completed';

export default function OTPRegister() {
  const router = useRouter();
  const { login, redirectIfAuthenticated } = useAuth();
  
  // State management
  const [currentStep, setCurrentStep] = useState<RegistrationStep>('info');
  const [isLoading, setIsLoading] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [otpId, setOtpId] = useState('');
  
  // OTP related states
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [resendCountdown, setResendCountdown] = useState(0);
  const [otpAttempts, setOtpAttempts] = useState(0);
  const [maxAttempts] = useState(3);
  
  // Refs for OTP inputs
  const otpInputRefs = useRef<TextInput[]>([]);

  // Form management
  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<RegisterFormData>({
    resolver: yupResolver(registerSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

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

  // Handle registration form submit
  const onSubmitRegistration = async (data: RegisterFormData) => {
    setIsLoading(true);
    try {
      console.log("Starting new OTP registration for:", data.email);
      
      // Call backend register API (Step 1: Send OTP for registration)
      const response = await fetch(`${AppConfig.api.url}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          name: data.email.split('@')[0] // Use email prefix as default name
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.detail || 'Đăng ký thất bại');
      }

      if (result.success) {
        setUserEmail(data.email);
        setUserPassword(data.password);
        setOtpId(result.otp_id);
        setCurrentStep('otp');
        setResendCountdown(60); // 1 minute cooldown
        
        Alert.alert(
          'OTP đã được gửi',
          result.message,
          [{ text: 'OK' }]
        );
      } else {
        throw new Error('Phản hồi không hợp lệ từ server');
      }
    } catch (error: any) {
      console.error("Registration error:", error);
      Alert.alert('Lỗi', error.message || 'Có lỗi xảy ra khi đăng ký');
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

  // Handle OTP verification
  const handleVerifyOTP = async (otpCode: string) => {
    if (otpAttempts >= maxAttempts) {
      Alert.alert('Lỗi', 'Đã vượt quá số lần thử tối đa');
      return;
    }

    setIsLoading(true);
    try {
      console.log("Verifying OTP for registration:", otpCode);
      
      const response = await fetch(`${AppConfig.api.url}/api/auth/register/verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: userEmail,
          otp_code: otpCode,
          otp_id: otpId,
          password: userPassword,
          name: userEmail.split('@')[0] // Use email prefix as default name
        })
      });

      const result = await response.json();

      if (!response.ok) {
        setOtpAttempts(prev => prev + 1);
        setOtp(['', '', '', '', '', '']);
        throw new Error(result.detail || 'Xác thực OTP thất bại');
      }

      if (result.success) {
        console.log("✅ OTP verified successfully - Backend đã tạo account");
        
        // Backend đã tạo Firebase account và trả về custom token
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
              'Đăng ký thành công!',
              'Tài khoản của bạn đã được tạo và xác thực.',
              [
                {
                  text: 'OK',
                  onPress: () => {
                    setCurrentStep('completed');
                    setTimeout(() => router.replace('/(tabs)'), 1000);
                  }
                }
              ]
            );
            
          } catch (firebaseError: any) {
            console.error("Firebase custom token sign in error:", firebaseError);
            Alert.alert(
              'Lỗi đăng nhập',
              'Tài khoản đã được tạo nhưng có lỗi khi đăng nhập. Vui lòng thử đăng nhập thủ công.',
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
            'Đăng ký thành công!',
            'Tài khoản đã được tạo. Vui lòng đăng nhập.',
            [
              {
                text: 'OK',
                onPress: () => router.replace(`/login?email=${encodeURIComponent(userEmail)}`)
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
      setIsLoading(false);
    }
  };

  // Handle resend OTP
  const handleResendOTP = async () => {
    if (resendCountdown > 0) return;

    setIsLoading(true);
    try {
      const response = await fetch(`${AppConfig.api.url}/api/auth/resend-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: userEmail,
          otp_id: otpId
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.detail || 'Không thể gửi lại OTP');
      }

      if (result.success) {
        setResendCountdown(60);
        setOtp(['', '', '', '', '', '']);
        setOtpAttempts(0);
        Alert.alert('Thành công', result.message);
      }
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Không thể gửi lại OTP');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle back to info step
  const handleBackToInfo = () => {
    setCurrentStep('info');
    setOtp(['', '', '', '', '', '']);
    setOtpAttempts(0);
    setResendCountdown(0);
  };

  // Render registration form
  const renderRegistrationForm = () => (
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

      <Text style={styles.title}>Đăng ký tài khoản</Text>
      <Text style={styles.subtitle}>
        Nhập thông tin để tạo tài khoản mới
      </Text>

      {/* Email */}
      <Text style={styles.label}>Email</Text>
      <Controller
        control={control}
        name="email"
        render={({ field: { onChange, value } }) => (
          <View>
            <TextInput
              value={value}
              onChangeText={onChange}
              placeholder="Nhập địa chỉ email"
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.input}
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
        render={({ field: { onChange, value } }) => (
          <View>
            <TextInput
              value={value}
              onChangeText={onChange}
              placeholder="Nhập mật khẩu"
              secureTextEntry
              style={styles.input}
            />
            {errors.password && (
              <Text style={styles.errorText}>
                {errors.password.message}
              </Text>
            )}
          </View>
        )}
      />

      {/* Confirm Password */}
      <Text style={styles.label}>Nhập lại mật khẩu</Text>
      <Controller
        control={control}
        name="confirmPassword"
        render={({ field: { onChange, value } }) => (
          <View>
            <TextInput
              value={value}
              onChangeText={onChange}
              placeholder="Nhập lại mật khẩu"
              secureTextEntry
              style={styles.input}
            />
            {errors.confirmPassword && (
              <Text style={styles.errorText}>
                {errors.confirmPassword.message}
              </Text>
            )}
          </View>
        )}
      />

      <TouchableOpacity
        style={[styles.submitButton, isLoading && styles.disabledButton]}
        onPress={handleSubmit(onSubmitRegistration)}
        disabled={isLoading}
      >
        <Text style={styles.submitButtonText}>
          {isLoading ? 'Đang gửi OTP...' : 'Gửi mã xác thực'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.linkButton}
        onPress={() => router.replace('/login')}
      >
        <Text style={styles.linkText}>
          Đã có tài khoản? Đăng nhập ngay
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );

  // Render OTP verification form
  const renderOTPForm = () => (
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

      <Text style={styles.title}>Xác thực Email</Text>
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
            style={styles.otpInput}
            value={digit}
            onChangeText={(text) => handleOtpChange(text.slice(-1), index)}
            keyboardType="numeric"
            maxLength={1}
            textAlign="center"
            selectTextOnFocus
          />
        ))}
      </View>

      <Text style={styles.attemptsText}>
        Còn {maxAttempts - otpAttempts} lần thử
      </Text>

      <TouchableOpacity
        style={[
          styles.resendButton,
          (resendCountdown > 0 || isLoading) && styles.disabledButton
        ]}
        onPress={handleResendOTP}
        disabled={resendCountdown > 0 || isLoading}
      >
        <Text style={styles.resendButtonText}>
          {isLoading 
            ? 'Đang gửi...' 
            : resendCountdown > 0 
              ? `Gửi lại sau ${resendCountdown}s`
              : 'Gửi lại mã OTP'
          }
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.backButton}
        onPress={handleBackToInfo}
      >
        <Text style={styles.backButtonText}>← Quay lại</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  // Render completion screen
  const renderCompletionScreen = () => (
    <View style={styles.completionContainer}>
      <View style={styles.logoContainer}>
        <Image
          source={require("@/assets/images/logo.png")}
          style={styles.logo}
        />
      </View>
      <Text style={styles.title}>🎉 Đăng ký thành công!</Text>
      <Text style={styles.subtitle}>
        Tài khoản của bạn đã được tạo và xác thực.{'\n'}
        Đang chuyển đến ứng dụng...
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: currentStep === 'info' ? 'Đăng ký' : 'Xác thực OTP',
          headerShown: true 
        }} 
      />
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        {currentStep === 'info' && renderRegistrationForm()}
        {currentStep === 'otp' && renderOTPForm()}
        {currentStep === 'completed' && renderCompletionScreen()}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "white" 
  },
  keyboardAvoidingView: { 
    flex: 1 
  },
  scrollContent: { 
    flexGrow: 1, 
    padding: 24, 
    justifyContent: "center" 
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  logo: { 
    width: 100, 
    height: 100 
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 20,
  },
  emailText: {
    fontWeight: 'bold',
    color: '#007AFF',
  },
  label: { 
    marginBottom: 8,
    fontSize: 16,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  errorText: { 
    color: "red", 
    fontSize: 12, 
    marginTop: -10, 
    marginBottom: 10 
  },
  submitButton: {
    backgroundColor: "#007AFF",
    borderRadius: 8,
    padding: 16,
    marginTop: 24,
    marginBottom: 16,
  },
  submitButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
  },
  disabledButton: {
    backgroundColor: "#ccc",
  },
  linkButton: {
    marginTop: 16,
  },
  linkText: {
    color: "#007AFF",
    fontSize: 16,
    textAlign: "center",
  },
  // OTP Styles
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  otpInput: {
    width: 45,
    height: 55,
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 8,
    fontSize: 24,
    fontWeight: 'bold',
    backgroundColor: '#f9f9f9',
  },
  attemptsText: {
    textAlign: 'center',
    color: '#666',
    marginBottom: 24,
  },
  resendButton: {
    backgroundColor: '#28a745',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  resendButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  backButton: {
    marginTop: 16,
  },
  backButtonText: {
    color: '#007AFF',
    fontSize: 16,
    textAlign: 'center',
  },
  // Completion Styles
  completionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
});