import { AuthGuard } from "@/components/AuthGuard";
import { GroupNotification } from "@/components/Notification/GroupNotification";
import { mockNotifies } from "@/constants/mock-data";
import { emailVerificationService } from "@/lib/emailVerification";
import { auth } from "@/utils/firebaseConfig";
import { AppConfig } from "@/lib/config";
import { Notify } from "@/types";
import { Image } from "expo-image";
import { Stack, useRouter, useLocalSearchParams } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";
import { useEffect, useState, useRef } from "react";
import {
  Alert,
  Button,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

export default function NotificationScreen() {
  const [notifies, setNotifies] = useState<Notify[]>([]);
  const router = useRouter();
  const params = useLocalSearchParams();
  
  // Notification states
  const type = params.type as string;
  const email = params.email as string;
  const data = params.data as string;
  
  // Email verification states
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [verificationCode, setVerificationCode] = useState(['', '', '', '', '', '']);
  const [currentUser, setCurrentUser] = useState(auth.currentUser);
  
  // Login OTP states
  const [otpData, setOtpData] = useState<any>(null);
  
  // Refs cho các TextInput
  const inputRefs = useRef<TextInput[]>([]);

  useEffect(() => {
    setNotifies(mockNotifies);
    
    // Parse OTP data if type is login-otp
    if (type === 'login-otp' && data) {
      try {
        const parsedData = JSON.parse(decodeURIComponent(data));
        setOtpData(parsedData);
      } catch (error) {
        console.error('Error parsing OTP data:', error);
        Alert.alert('Lỗi', 'Dữ liệu không hợp lệ', [
          { text: 'OK', onPress: () => router.replace('/login') }
        ]);
      }
    }
  }, [type, data]);

  // Email verification logic
  useEffect(() => {
    if (type === 'email-verification') {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        setCurrentUser(user);
        if (!user && type === 'email-verification') {
          router.replace('/login');
        }
      });

      return unsubscribe;
    }
  }, [type]);

  // Auto-check verification status for email verification
  useEffect(() => {
    if (type !== 'email-verification' || !currentUser) return;

    const checkInterval = setInterval(async () => {
      try {
        const isVerified = await emailVerificationService.checkEmailVerified(currentUser);
        if (isVerified) {
          clearInterval(checkInterval);
          Alert.alert(
            'Xác thực thành công!',
            'Email của bạn đã được xác thực. Bạn có thể sử dụng ứng dụng.',
            [
              {
                text: 'OK',
                onPress: () => router.replace('/(tabs)')
              }
            ]
          );
        }
      } catch (error) {
        console.error('Error checking verification:', error);
      }
    }, 3000); // Check every 3 seconds

    return () => clearInterval(checkInterval);
  }, [currentUser, type]);

  // Countdown for resend button
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Email verification functions
  const handleCodeChange = (text: string, index: number) => {
    const newCode = [...verificationCode];
    newCode[index] = text;
    setVerificationCode(newCode);

    // Auto focus next input
    if (text && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto verify when all 6 digits are entered
    if (newCode.every(digit => digit !== '') && text) {
      handleVerifyCode(newCode.join(''));
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !verificationCode[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyCode = async (code: string) => {
    if (!currentUser) return;

    setIsVerifying(true);
    try {
      // Kiểm tra lại trạng thái verification
      const isVerified = await emailVerificationService.checkEmailVerified(currentUser);
      
      if (isVerified) {
        Alert.alert(
          'Xác thực thành công!',
          'Email của bạn đã được xác thực.',
          [
            {
              text: 'OK',
              onPress: () => router.replace('/(tabs)')
            }
          ]
        );
      } else {
        Alert.alert(
          'Chưa xác thực',
          'Vui lòng kiểm tra email và click vào link xác thực, sau đó quay lại ứng dụng.',
          [{ text: 'OK' }]
        );
      }
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Có lỗi xảy ra khi xác thực');
    } finally {
      setIsVerifying(false);
      setVerificationCode(['', '', '', '', '', '']);
    }
  };

  const handleResendEmail = async () => {
    if (!currentUser || countdown > 0) return;

    setIsResending(true);
    try {
      await emailVerificationService.resendVerificationEmail(currentUser);
      setCountdown(60); // 1 minute cooldown
      Alert.alert(
        'Email đã được gửi',
        'Vui lòng kiểm tra email và click vào link xác thực.',
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Không thể gửi lại email');
    } finally {
      setIsResending(false);
    }
  };

  const handleManualCheck = async () => {
    if (!currentUser) return;

    setIsVerifying(true);
    try {
      const isVerified = await emailVerificationService.checkEmailVerified(currentUser);
      
      if (isVerified) {
        Alert.alert(
          'Xác thực thành công!',
          'Email của bạn đã được xác thực.',
          [
            {
              text: 'OK',
              onPress: () => router.replace('/(tabs)')
            }
          ]
        );
      } else {
        Alert.alert(
          'Chưa xác thực',
          'Email chưa được xác thực. Vui lòng kiểm tra email và click vào link xác thực.',
          [{ text: 'OK' }]
        );
      }
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Có lỗi xảy ra khi kiểm tra xác thực');
    } finally {
      setIsVerifying(false);
    }
  };

  // ===== LOGIN OTP HANDLERS =====
  const handleLoginOTPVerify = async (otpCode: string) => {
    if (!otpData) return;

    setIsVerifying(true);
    try {
      console.log("Verifying login OTP:", otpCode);
      
      const response = await fetch(`${AppConfig.api.url}/api/otp/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: otpData.email,
          otp: otpCode,
          otp_id: otpData.otp_id
        })
      });

      const result = await response.json();

      if (!response.ok) {
        setVerificationCode(['', '', '', '', '', '']);
        throw new Error(result.detail || 'Xác thực OTP thất bại');
      }

      if (result.success) {
        // OTP verified successfully
        console.log("✅ Login OTP verified successfully");
        
        // Get Firebase user token
        const user = auth.currentUser;
        if (user) {
          const idToken = await user.getIdToken();
          
          // Here you would update auth context if needed
          // login(idToken, userData);
          
          Alert.alert(
            'Đăng nhập thành công!',
            'Xác thực OTP hoàn tất.',
            [
              {
                text: 'OK',
                onPress: () => router.replace('/(tabs)')
              }
            ]
          );
        } else {
          throw new Error('Không tìm thấy thông tin người dùng');
        }
      } else {
        throw new Error('Phản hồi không hợp lệ từ server');
      }
    } catch (error: any) {
      console.error("Login OTP verification error:", error);
      Alert.alert('Lỗi', error.message || 'Có lỗi xảy ra khi xác thực OTP');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleLoginOTPResend = async () => {
    if (!otpData || countdown > 0) return;

    setIsResending(true);
    try {
      const response = await fetch(`${AppConfig.api.url}/api/otp/resend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: otpData.email,
          otp_id: otpData.otp_id
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.detail || 'Không thể gửi lại OTP');
      }

      if (result.success) {
        setCountdown(60);
        setVerificationCode(['', '', '', '', '', '']);
        Alert.alert('Thành công', result.message);
      }
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Không thể gửi lại OTP');
    } finally {
      setIsResending(false);
    }
  };

  // ===== RENDER SCREENS =====

  // Render login OTP screen
  if (type === 'login-otp' && otpData) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen 
          options={{ 
            title: 'Xác thực đăng nhập',
            headerShown: true 
          }} 
        />
        <KeyboardAvoidingView
          style={styles.keyboardAvoidingView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            contentContainerStyle={styles.emailVerificationContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.logoContainer}>
              <Image
                source={require('@/assets/images/logo.png')}
                style={styles.logo}
              />
            </View>

            <Text style={styles.title}>Xác thực đăng nhập</Text>
            
            <Text style={styles.description}>
              Nhập mã 6 số đã được gửi đến{'\n'}
              <Text style={styles.email}>{otpData.email}</Text>
            </Text>

            <Text style={styles.instruction}>
              Vui lòng kiểm tra email và nhập mã OTP để hoàn tất đăng nhập.
            </Text>

            {/* OTP Input */}
            <View style={styles.codeContainer}>
              {verificationCode.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(ref) => {
                    if (ref) inputRefs.current[index] = ref;
                  }}
                  style={[
                    styles.codeInput,
                    digit && styles.codeInputFilled
                  ]}
                  value={digit}
                  onChangeText={(text) => handleCodeChange(text.slice(-1), index)}
                  onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
                  keyboardType="numeric"
                  maxLength={1}
                  textAlign="center"
                  selectTextOnFocus
                  editable={!isVerifying}
                />
              ))}
            </View>

            {/* Verify Button */}
            <TouchableOpacity
              style={[styles.checkButton, isVerifying && styles.disabledButton]}
              onPress={() => handleLoginOTPVerify(verificationCode.join(''))}
              disabled={isVerifying || verificationCode.some(digit => digit === '')}
            >
              <Text style={styles.checkButtonText}>
                {isVerifying ? 'Đang xác thực...' : 'Xác thực và đăng nhập'}
              </Text>
            </TouchableOpacity>

            {/* Resend Button */}
            <TouchableOpacity
              style={[
                styles.resendButton,
                (isResending || countdown > 0) && styles.disabledButton
              ]}
              onPress={handleLoginOTPResend}
              disabled={isResending || countdown > 0}
            >
              <Text style={styles.resendButtonText}>
                {isResending 
                  ? 'Đang gửi...' 
                  : countdown > 0 
                    ? `Gửi lại sau ${countdown}s`
                    : 'Gửi lại mã OTP'
                }
              </Text>
            </TouchableOpacity>

            {/* Back to Login */}
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.replace('/login')}
            >
              <Text style={styles.backButtonText}>← Quay lại đăng nhập</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // Render email verification screen
  if (type === 'email-verification') {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen 
          options={{ 
            title: 'Xác thực Email',
            headerShown: true 
          }} 
        />
        <KeyboardAvoidingView
          style={styles.keyboardAvoidingView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            contentContainerStyle={styles.emailVerificationContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.logoContainer}>
              <Image
                source={require('@/assets/images/logo.png')}
                style={styles.logo}
              />
            </View>

            <Text style={styles.title}>Xác thực Email</Text>
            
            <Text style={styles.description}>
              Chúng tôi đã gửi email xác thực đến{'\n'}
              <Text style={styles.email}>{email}</Text>
            </Text>

            <Text style={styles.instruction}>
              Vui lòng kiểm tra email và click vào link xác thực,{'\n'}
              sau đó nhấn "Kiểm tra xác thực" bên dưới.
            </Text>

            {/* Code Input (Optional - for future OTP implementation) */}
            <Text style={styles.codeLabel}>
              Hoặc nhập mã xác thực (nếu có):
            </Text>
            
            <View style={styles.codeContainer}>
              {verificationCode.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(ref) => {
                    if (ref) inputRefs.current[index] = ref;
                  }}
                  style={styles.codeInput}
                  value={digit}
                  onChangeText={(text) => handleCodeChange(text.slice(-1), index)}
                  onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
                  keyboardType="numeric"
                  maxLength={1}
                  textAlign="center"
                  selectTextOnFocus
                />
              ))}
            </View>

            {/* Manual Check Button */}
            <TouchableOpacity
              style={[styles.checkButton, isVerifying && styles.disabledButton]}
              onPress={handleManualCheck}
              disabled={isVerifying}
            >
              <Text style={styles.checkButtonText}>
                {isVerifying ? 'Đang kiểm tra...' : 'Kiểm tra xác thực'}
              </Text>
            </TouchableOpacity>

            {/* Resend Email Button */}
            <TouchableOpacity
              style={[
                styles.resendButton,
                (isResending || countdown > 0) && styles.disabledButton
              ]}
              onPress={handleResendEmail}
              disabled={isResending || countdown > 0}
            >
              <Text style={styles.resendButtonText}>
                {isResending 
                  ? 'Đang gửi...' 
                  : countdown > 0 
                    ? `Gửi lại sau ${countdown}s`
                    : 'Gửi lại email xác thực'
                }
              </Text>
            </TouchableOpacity>

            {/* Back to Login */}
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.replace('/login')}
            >
              <Text style={styles.backButtonText}>Quay lại đăng nhập</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // Render normal notification screen
  return (
    <AuthGuard>
      <SafeAreaProvider>
        <SafeAreaView style={styles.container} edges={["top"]}>
          <ScrollView contentContainerStyle={styles.scrollView}>
            <GroupNotification label="Hôm nay" notifications={notifies} />
            <GroupNotification label="Hôm qua" notifications={notifies} />
          </ScrollView>
        </SafeAreaView>
      </SafeAreaProvider>
    </AuthGuard>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: StatusBar.currentHeight,
    backgroundColor: 'white',
  },
  scrollView: {
    paddingTop: 20,
    paddingLeft: 20,
  },
  // Email verification styles
  keyboardAvoidingView: {
    flex: 1,
  },
  emailVerificationContent: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logo: {
    width: 100,
    height: 100,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 24,
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
    color: '#666',
  },
  email: {
    fontWeight: 'bold',
    color: '#007AFF',
  },
  instruction: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 32,
    color: '#666',
    lineHeight: 20,
  },
  codeLabel: {
    fontSize: 16,
    marginBottom: 16,
    textAlign: 'center',
    color: '#333',
  },
  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  codeInput: {
    width: 45,
    height: 55,
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 8,
    fontSize: 24,
    fontWeight: 'bold',
    backgroundColor: '#f9f9f9',
  },
  codeInputFilled: {
    borderColor: '#007AFF',
    backgroundColor: '#f0f8ff',
  },
  checkButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  checkButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
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
  disabledButton: {
    backgroundColor: '#ccc',
  },
  backButton: {
    marginTop: 16,
  },
  backButtonText: {
    color: '#007AFF',
    fontSize: 16,
    textAlign: 'center',
  },
});
