import { useEffect, useState } from "react";
import {
  Button,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Alert,
} from "react-native";
import Ionicons from "@expo/vector-icons/AntDesign";
import {
  router,
  Stack,
  useLocalSearchParams,
  useNavigation,
} from "expo-router";
import { Dish } from "@/types/dish"; // ✅ Use dish.ts instead of index.ts
import Toast from 'react-native-toast-message';
import { mockDishes1 } from "@/constants/mock-data";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthStore } from "@/store/authStore";               // 🔹 thêm
import { AppConfig } from "@/lib/config";
const API_URL = AppConfig.api.url;               // 🔹 thêm

export default function FeedBackScreen() {
  const { id } = useLocalSearchParams();
  const [dishData, setDishData] = useState<Dish | null>(null);

  useEffect(() => {
    try {
      const dishData = mockDishes1.find((dish) => dish.id === Number(id));
      setDishData(dishData ?? null);
    } catch (error) {
      console.error(error);
    }
  }, []);
  const [text, setText] = useState("");
  const navigation = useNavigation();
  const [starValue, setStarValue] = useState<number | null>(null);

  const token = useAuthStore.getState().token;                 // 🔹 thêm
  const dishId = String(id ?? "");                             // 🔹 thêm

  const onPressStar = (index: number) => {
    setStarValue(index);
  };

  const onSubmit = async () => {
  if (!API_URL) {
    Alert.alert("Lỗi hệ thống", "Thiếu cấu hình máy chủ. Vui lòng thử lại sau.");
    return;
  }
  if (!token) {
    Alert.alert("Thông báo", "Bạn cần đăng nhập để gửi đánh giá.");
    return;
  }
  if (!dishId) {
    Alert.alert("Lỗi", "Không tìm thấy ID món ăn.");
    return;
  }
  if (starValue === null) {
    Alert.alert("Thiếu đánh giá", "Vui lòng chọn số sao trước khi gửi.");
    return;
  }

  try {
    const body = {
      dish_id: dishId,
      rating: starValue + 1, // ⭐ 0–4 → 1–5
      content: text ?? "",
    };

    const res = await fetch(`${API_URL}/comments/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      let errorMessage = "Có lỗi xảy ra khi gửi đánh giá.";
      try {
        const errText = await res.text();
        if (errText) errorMessage = errText;
      } catch {}
      Alert.alert("Gửi thất bại", errorMessage);
      return;
    }

    Alert.alert("Thành công", "Cảm ơn bạn đã gửi đánh giá của mình!", [
      {
        text: "OK",
        onPress: () => {
          if (typeof navigation !== "undefined" && (navigation as any)?.goBack) {
            (navigation as any).goBack();
          } else if (typeof window !== "undefined" && window.history) {
            window.history.back();
          }
        },
      },
    ]);
  } catch {
    Alert.alert("Gửi thất bại", "Vui lòng kiểm tra kết nối mạng và thử lại.");
  }
};


  return (
    <SafeAreaView
      style={styles.safeViewContainer}
      mode="padding"
      edges={{
        top: "off",
      }}
    >
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 120 : 20}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Image style={styles.image} src={dishData?.image} />
          <View>
            <Text style={styles.name}>{dishData?.label}</Text>
          </View>
          <View>
            <Text style={styles.content1}>
              Chúng tôi rất muốn biết bạn nghĩ gì về món ăn này
            </Text>
          </View>
          <View style={styles.starContainer}>
            {new Array(5).fill(0).map((_, index) => {
              return (
                <Pressable
                  key={index}
                  onPress={() => onPressStar(index)}
                  style={styles.star}
                >
                  <Ionicons
                    name="star"
                    size={30}
                    color={starValue !== null && index <= starValue ? "#dc502e" : "#d8d8d8"}
                  />
                </Pressable>
              );
            })}
          </View>

          <View>
            <Text style={styles.content2}>
              Hãy cho chúng tôi biết ý kiến của bạn!
            </Text>
          </View>

          <TextInput
            style={styles.input}
            multiline
            numberOfLines={4}
            value={text}
            onChangeText={setText}
            placeholder="Nhập bình luận ..."
          />
          <View style={styles.buttonContainer}>
            <View style={styles.cancle}>
              <Button
                color="#e67f5e"
                title="Huỷ"
                onPress={() => {
                  if (typeof navigation !== "undefined" && (navigation as any)?.goBack) {
                    (navigation as any).goBack();
                  } else if (typeof window !== "undefined" && window.history) {
                    window.history.back();
                  }
                }}
              />
            </View>
            <View style={styles.submit}>
              <Button color="white" title="Xong" onPress={onSubmit} />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  safeViewContainer: {
    flexDirection: "column",
    flex: 1,
    padding: 0,
  },
  container: {
    flexDirection: "column",
    alignItems: "center",
    padding: 25,
    gap: 10,
    flexGrow: 1,
  },
  image: {
    width: 150,
    height: 150,
    borderRadius: "20%",
  },
  name: {
    fontSize: 35,
    fontWeight: "bold",
  },
  content1: {
    fontSize: 25,
    fontWeight: "300",
  },
  star: {},
  starContainer: {
    flexDirection: "row",
    gap: 5,
  },
  content2: {
    fontSize: 30,
    fontWeight: "300",
  },
  input: {
    height: 100,
    borderColor: "gray",
    width: "100%",
    paddingHorizontal: 10,
    marginBottom: 20,
    borderRadius: 10,
    backgroundColor: "#f3e9b6",
  },

  buttonContainer: {
    flexDirection: "row",
    gap: 20,
  },
  cancle: {
    alignItems: "center",
    backgroundColor: "#ffdecf",
    fontWeight: "bold",
    color: "white",
    borderRadius: 10,
    paddingLeft: 20,
    paddingRight: 20,
  },
  submit: {
    alignItems: "center",
    backgroundColor: "#e95120",
    fontWeight: "bold",
    color: "white",
    borderRadius: 10,
    paddingLeft: 20,
    paddingRight: 20,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    justifyContent: "center",
  },
});
