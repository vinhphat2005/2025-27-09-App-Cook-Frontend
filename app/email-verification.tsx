import { emailVerificationService } from '@/lib/emailVerification';
import { auth } from '@/utils/firebaseConfig';
import { Image } from 'expo-image';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import { useEffect, useState, useRef } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function EmailVerification() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const email = params.email as string;
  
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [verificationCode, setVerificationCode] = useState(['', '', '', '', '', '']);
  const [currentUser, setCurrentUser] = useState(auth.currentUser);
  
  // Refs cho các TextInput
  const inputRefs = useRef<TextInput[]>([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (!user) {
        router.replace('/login');
      }
    });

    return unsubscribe;
  }, []);

  // Auto-check verification status
  useEffect(() => {
    if (!currentUser) return;

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
  }, [currentUser]);

  // Countdown for resend button
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

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
          contentContainerStyle={styles.scrollContent}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContent: {
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