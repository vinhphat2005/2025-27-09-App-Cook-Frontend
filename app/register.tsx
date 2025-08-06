import { useAuth } from "@/hooks/useAuth";
import { auth } from "@/utils/firebaseConfig";
import { yupResolver } from "@hookform/resolvers/yup";
import * as AuthSession from "expo-auth-session";
import * as Google from "expo-auth-session/providers/google";
import { Image } from "expo-image";
import { Stack, useRouter } from "expo-router";
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithCredential
} from "firebase/auth";
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
  View
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
    .required("Bắt buộc")
});

type RegisterFormData = yup.InferType<typeof registerSchema>;

export default function Register() {
  const router = useRouter();
  const { redirectIfAuthenticated } = useAuth();

  const [request, response, promptAsync] = Google.useAuthRequest({
    // Sử dụng cùng 1 client ID cho cả iOS và Android
    clientId:
      "958260087451-tl9gsb01ig373i7nakkb91817cjrlqj5.apps.googleusercontent.com",
    iosClientId:
      "958260087451-tl9gsb01ig373i7nakkb91817cjrlqj5.apps.googleusercontent.com",
    androidClientId:
      "958260087451-tl9gsb01ig373i7nakkb91817cjrlqj5.apps.googleusercontent.com",

    // Để mặc định để Expo tự generate redirect URI
    redirectUri: AuthSession.makeRedirectUri(),

    scopes: ["profile", "email", "openid"],
    responseType: AuthSession.ResponseType.IdToken
  });

  // Debug redirect URI - cập nhật
  useEffect(() => {
    console.log("=== GOOGLE OAUTH DEBUG ===");
    console.log("Request:", request);
    console.log("Default Redirect URI:", AuthSession.makeRedirectUri());
    console.log(
      "Custom Redirect URI:",
      AuthSession.makeRedirectUri({
        scheme: "com.easycook.app",
        path: "auth"
      })
    );

    // Log để check
    if (request) {
      console.log("Request URL:", request.url);
      let redirectUri: string | null = null;
      if (request.url) {
        redirectUri = new URL(request.url).searchParams.get("redirect_uri");
      }
      if (redirectUri) {
        console.log("Request redirect_uri from URL:", redirectUri);
      } else {
        console.log("Request redirect_uri from URL: not found");
      }
    }
  }, [request]);

  // Nếu đã đăng nhập thì redirect
  useEffect(() => {
    redirectIfAuthenticated();
  }, [redirectIfAuthenticated]);

  // Google OAuth response handler
  useEffect(() => {
    console.log("Google OAuth Response:", response);

    if (response?.type === "success") {
      const { id_token } = response.params;
      console.log("Got ID token:", id_token);

      const credential = GoogleAuthProvider.credential(id_token);
      signInWithCredential(auth, credential)
        .then((userCredential) => {
          console.log("Google đăng ký thành công:", userCredential.user.email);
          router.replace("/(tabs)");
        })
        .catch((err) => {
          console.error("Lỗi đăng ký bằng Google:", err.message);
          alert("Không thể đăng ký bằng Google: " + err.message);
        });
    } else if (response?.type === "error") {
      console.error("Google OAuth Error:", response.error);
      alert("Lỗi Google OAuth: " + response.error?.message);
    }
  }, [response]);

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm<RegisterFormData>({
    resolver: yupResolver(registerSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: ""
    }
  });

  const onClear = () => reset();

  // Xử lý submit form đăng ký
  const onSubmit = async (data: RegisterFormData) => {
    try {
      console.log("Attempting registration with email:", data.email);
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        data.email,
        data.password
      );
      console.log(
        "Registration successful - User ID:",
        userCredential.user.uid
      );
      console.log("User email:", userCredential.user.email);
      router.replace("/(tabs)");
    } catch (error: any) {
      console.error("Firebase registration error:", error);
      console.error("Error code:", error.code);
      console.error("Error message:", error.message);

      // Handle specific Firebase error codes
      let errorMessage = "Đăng ký thất bại.";

      switch (error.code) {
        case "auth/email-already-in-use":
          errorMessage =
            "Email đã được sử dụng. Vui lòng đăng nhập hoặc sử dụng email khác.";
          break;
        case "auth/invalid-email":
          errorMessage = "Email không hợp lệ.";
          break;
        case "auth/weak-password":
          errorMessage = "Mật khẩu quá yếu. Vui lòng chọn mật khẩu mạnh hơn.";
          break;
        case "auth/operation-not-allowed":
          errorMessage =
            "Đăng ký bằng email/mật khẩu không được bật. Vui lòng liên hệ admin.";
          break;
        case "auth/network-request-failed":
          errorMessage =
            "Lỗi kết nối mạng. Vui lòng kiểm tra kết nối internet.";
          break;
        default:
          errorMessage = `Lỗi đăng ký: ${error.message}`;
      }

      alert(errorMessage);
    }
  };

  // Handle Google Sign-In
  const handleGoogleSignIn = async () => {
    console.log("Starting Google Sign-In...");
    try {
      const result = await promptAsync();
      console.log("PromptAsync result:", result);
    } catch (error) {
      console.error("Google Sign-In Error:", error);
    }
  };

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
        >
          <View style={styles.logoContainer}>
            <Image
              source={require("@/assets/images/logo.png")}
              style={styles.logo}
            />
          </View>

          <Text style={styles.title}>Đăng ký</Text>

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
                  placeholder="Email"
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
                  placeholder="Mật khẩu"
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
                  placeholder="Xác nhận mật khẩu"
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

          {/* Đăng ký bằng form */}
          <View style={styles.submitButton}>
            <Button
              color="white"
              title="Đăng ký"
              onPress={handleSubmit(onSubmit)}
            />
          </View>

          {/* Google Sign-In */}
          <View style={{ marginTop: 20 }}>
            <Button
              color="#DB4437"
              title="Đăng ký bằng Google"
              onPress={handleGoogleSignIn}
              disabled={!request}
            />
          </View>

          {/* Xoá và chuyển sang đăng nhập */}
          <View style={styles.cancelButton}>
            <Button color="white" title="Xoá" onPress={onClear} />
          </View>
          <View style={styles.loginButton}>
            <Button
              color="black"
              title="Đã có tài khoản? Đăng nhập ngay"
              onPress={() => router.replace("/login")}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "white" },
  keyboardAvoidingView: { flex: 1 },
  scrollContent: { flexGrow: 1, padding: 24, justifyContent: "center" },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 24,
    textAlign: "center"
  },
  label: { marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16
  },
  submitButton: {
    marginTop: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ccc",
    backgroundColor: "#007AFF"
  },
  errorText: { color: "red", fontSize: 12, marginTop: -10, marginBottom: 10 },
  cancelButton: {
    marginTop: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ccc",
    backgroundColor: "grey"
  },
  loginButton: { marginTop: 24 },
  logoContainer: { alignItems: "center", marginBottom: 24 },
  logo: { width: 100, height: 100 }
});
