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
      const userCredential = await signInWithEmailAndPassword(
        auth,
        data.email,
        data.password
      );

      const user = userCredential.user;
      const token = await user.getIdToken();

      console.log("token: ", token);
      ``;

      // Gọi login để lưu thông tin vào context của bạn
      login(token, {
        email: user.email ?? "",
        id: user.uid,
        name: "",
        address: "",
        username: "",
        avatar: "",
      });
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
          errorMessage = `Lỗi đăng nhập: ${error.message}`;
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
      <Stack.Screen
      // options={{
      //   headerShown: false
      // }}
      />
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
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
  submitButton: {
    marginTop: 24,
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
