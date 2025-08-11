import { useAuth } from "@/hooks/useAuth";
import { auth } from "@/utils/firebaseConfig"; // đúng đường dẫn bạn tạo
import { yupResolver } from "@hookform/resolvers/yup";
import { Image } from "expo-image";
import { Stack, useRouter } from "expo-router";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  Button,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as yup from "yup";

// Define validation schema
const loginSchema = yup.object({
  email: yup
    .string()
    .email("Please enter a valid email")
    .required("Email is required"),
  password: yup
    .string()
    .min(6, "Password must be at least 6 characters")
    .required("Password is required"),
});

type LoginFormData = yup.InferType<typeof loginSchema>;
const API_URL = process.env.EXPO_PUBLIC_API_URL;
// ⚠️ Chọn baseURL đúng môi trường:
const getBaseURL = () => {
  if (__DEV__) {
    if (Platform.OS === 'ios') {
      // Dùng IP thực của máy để kết nối từ thiết bị/simulator
      // Nếu 192.168.100.208 không work, thử localhost cho simulator
      return API_URL;
    } else {
      // Android emulator
      return "http://10.0.2.2:8000";
    }
  }
  // Production
  return "https://your-production-api.com";
};

// Danh sách URL backup để thử nếu main URL fail
const getBackupURLs = () => {
  if (__DEV__ && Platform.OS === 'ios') {
    return [
      "http://localhost:8000",           // iOS Simulator
      "http://127.0.0.1:8000",          // Localhost alternative
      "http://192.168.100.208:8000"     // Real IP
    ];
  }
  return [];
};

const BASE_URL = getBaseURL(); 

export default function Login() {
  const router = useRouter();
  const { login, isAuthenticated } = useAuth();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: yupResolver(loginSchema),
  });

  // Handle redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.replace("/(tabs)");
    }
  }, [isAuthenticated, router]);

  const onSubmit = async (data: LoginFormData) => {
    try {
      console.log("Attempting login with email:", data.email);
      
      
      // Test backend connectivity with multiple URLs
      const testBackend = async () => {
        const urlsToTest = [BASE_URL, ...getBackupURLs()];
        
        for (const url of urlsToTest) {
          try {
            console.log(`🔍 Testing connection to: ${url}`);
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000); // Increase to 8 seconds
            
            const res = await fetch(`${url}/health`, { 
              method: 'GET',
              signal: controller.signal
              });
            clearTimeout(timeoutId);
            
            if (res.ok) {
              console.log(`✅ Backend connected: ${url} (status: ${res.status})`);
              return url; // Return working URL
            } else {
              console.log(`❌ Backend responded with error: ${url} (status: ${res.status})`);
            }
          } catch (e: any) {
            console.log(`❌ Failed to connect to ${url}:`, e.message);
          }
        }
        console.log("❌ No backend URL is reachable");
        return null;
      };
      
      // Run test in background, don't wait
      testBackend();

      // ==== BẮT ĐẦU LOGIN FIREBASE ====
    const userCredential = await signInWithEmailAndPassword(
      auth,
      data.email,
      data.password
    );

    // ... phần xử lý sau login của bạn giữ nguyên ...


      const user = userCredential.user;
      let token = await user.getIdToken();

      // Lưu token + info vào context của bạn
      login(token, {
        email: user.email ?? "",
        id: user.uid,
        name: "",
        address: "",
        username: "",
        avatar: "",
      });

      // ====== TRY CALL BACKEND (OPTIONAL) ======
      // Nếu backend fail, vẫn cho login thành công
      try {
        const callProtected = async (path: string, jwt: string) => {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
          
          const res = await fetch(`${BASE_URL}${path}`, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${jwt}`,
            },
            signal: controller.signal
          });
          clearTimeout(timeoutId);
          return res;
        };

        // Lần 1: dùng token hiện tại
        let res = await callProtected("/users/me", token);

        // Nếu 401 => token có thể hết hạn/bị revoke -> refresh rồi thử lại 1 lần
        if (res.status === 401) {
          console.log("Token 401, trying refresh...");
          token = await user.getIdToken(true);
          res = await callProtected("/users/me", token);
        }

        if (res.ok) {
          const userData = await res.json();
          console.log("✅ User data from backend:", userData);
          
          // Update context với data từ backend
          login(token, {
            email: userData.email,
            id: userData.id,
            name: userData.name || "",
            address: "", // Backend không có field này
            username: userData.display_id || "",
            avatar: userData.avatar || "",
          });
        } else if (res.status === 404) {
          // User chưa tồn tại trong backend, backend sẽ tự động tạo
          console.log("ℹ️ User not found in backend, backend will handle user creation");
        } else {const text = await res.text();
          console.log("⚠️ Backend error:", res.status, text);
        }
      } catch (backendError: any) {
        // Backend fail nhưng không làm crash login
        console.log("⚠️ Backend call failed (but login still success):", backendError.message);
      }

      // Ví dụ: gọi update profile (tùy nhu cầu)
      // const upd = await fetch(`${BASE_URL}/profile/update`, {
      //   method: "POST",
      //   headers: {
      //     "Content-Type": "application/json",
      //     Authorization: `Bearer ${token}`,
      //   },
      //   body: JSON.stringify({ name: "Giang Giang" }),
      // });
      // console.log("Update profile:", await upd.json());

      router.replace("/(tabs)");
    } catch (error: any) {
      console.error("Firebase login error:", error);
      console.error("Error code:", error.code);
      console.error("Error message:", error.message);

      // Handle specific Firebase error codes
      let errorMessage = "Đăng nhập thất bại.";

      switch (error.code) {
        case "auth/invalid-credential":
          errorMessage = "Email hoặc mật khẩu không đúng.";
          break;
        case "auth/user-not-found":
          errorMessage = "Tài khoản không tồn tại. Vui lòng đăng ký trước.";
          break;
        case "auth/wrong-password":
          errorMessage = "Mật khẩu không đúng.";
          break;
        case "auth/invalid-email":
          errorMessage = "Email không hợp lệ.";
          break;
        case "auth/user-disabled":
          errorMessage = "Tài khoản đã bị vô hiệu hóa.";
          break;
        case "auth/too-many-requests":
          errorMessage = "Quá nhiều lần thử đăng nhập. Vui lòng thử lại sau.";
          break;
        case "auth/network-request-failed":
          errorMessage =
            "Lỗi kết nối mạng. Vui lòng kiểm tra kết nối internet.";
          break;
        default:
          // Chỉ log backend error, không hiện cho user
          if (typeof error.message === "string" && error.message.startsWith("Backend error")) {
            console.log("Backend error (ignored):", error.message);
            errorMessage = "Đăng nhập thành công nhưng không kết nối được server.";
          } else {
            errorMessage = `Lỗi đăng nhập: ${error.message}`;
          }
      }

      alert(errorMessage);
    }
  };

  // Don't render if already authenticated
  if (isAuthenticated) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen />
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        ><View style={styles.logoContainer}>
            <Image
              source={require("@/assets/images/logo.png")}
              style={styles.logo}
            />
          </View>
          <Text style={styles.title}>Đăng nhập</Text>
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
                  placeholder=""
                  keyboardType="email-address"
                  autoCapitalize="none"
                  style={[styles.input, errors.email && styles.inputError]}
                />
                {errors.email && (
                  <Text style={styles.errorText}>{errors.email.message}</Text>
                )}
              </View>
            )}
          />

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
                  placeholder=""
                  secureTextEntry
                  style={[styles.input, errors.password && styles.inputError]}
                />
                {errors.password && (
                  <Text style={styles.errorText}>
                    {errors.password.message}
                  </Text>
                )}
              </View>
            )}
          />
          <View style={styles.submitButton}>
            <Button
              color="white"
              title="Đăng nhập"
              onPress={handleSubmit(onSubmit)}
            />
          </View>
          <View style={styles.registerButton}>
            <Button
              color="black"
              title="Chưa có tài khoản? Đăng ký ngay"
              onPress={() => router.replace("/register")}
            />
          </View>
<View style={styles.debugButton}>
            <Button
              color="gray"
              title="Debug Auth"
              onPress={() => router.push("/debug-auth")}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  backgroundColor: "white",
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    justifyContent: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 24,
    textAlign: "center",
  },
  label: {
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    marginBottom: 5,
  },
  submitButton: {marginTop: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ccc",
    backgroundColor: "#007AFF",
  },
  inputError: {
    borderColor: "red",
  },
  errorText: {
    color: "red",
    fontSize: 12,
    marginBottom: 20,
  },
  registerButton: {
    marginTop: 24,
    borderColor: "#ccc",
  },
  debugButton: {
    marginTop: 12,
    borderColor: "#ccc",
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  logo: {
    width: 100,
    height: 100,
  },
});