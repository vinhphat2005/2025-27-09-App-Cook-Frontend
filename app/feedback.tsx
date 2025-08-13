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
import { Dish } from "@/types";
import { mockDishes1 } from "@/constants/mock-data";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthStore } from "@/store/authStore";               // 🔹 thêm
const API_URL = process.env.EXPO_PUBLIC_API_URL;               // 🔹 thêm

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

  const onSubmit = async () => {                               // 🔹 sửa thành async
    try {
      if (!API_URL) {
        Alert.alert("Lỗi", "Thiếu EXPO_PUBLIC_API_URL");
        return;
      }
      if (!token) {
        Alert.alert("Lỗi", "Bạn cần đăng nhập để gửi đánh giá.");
        return;
      }
      if (!dishId) {
        Alert.alert("Lỗi", "Thiếu dish_id.");
        return;
      }
      if (starValue === null) {
        Alert.alert("Thiếu đánh giá", "Vui lòng chọn số sao.");
        return;
      }

      const body = {
        dish_id: dishId,                   // backend lấy từ params ?id=... bạn đang truyền trên router
        // recipe_id: "",                  // nếu có recipe_id thì thêm vào
        rating: starValue + 1,             // ⭐ chuyển 0–4 -> 1–5
        content: text ?? "",
      };

      const res = await fetch(`${API_URL}/comments/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`, // bắt buộc vì route bảo vệ
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const t = await res.text().catch(() => "");
        console.log("Comment POST error:", res.status, t); // <— log
        throw new Error(`${res.status} ${res.statusText} ${t}`);
      }

      // tuỳ ý: đọc response nếu cần
      // const data = await res.json();

      Alert.alert("Thành công", "Đã gửi đánh giá của bạn!");
      if (typeof navigation !== "undefined" && (navigation as any)?.goBack) {
        (navigation as any).goBack();
      } else if (typeof window !== "undefined" && window.history) {
        window.history.back();
      }
    } catch (err: any) {
      console.error(err);
      Alert.alert("Gửi thất bại", err?.message || "Có lỗi xảy ra.");
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
                  {starValue === null ? (
                    <Ionicons name="staro" size={30} color="#dc502e" />
                  ) : (
                    <Ionicons
                      name={index <= starValue ? "star" : "staro"}
                      size={30}
                      color="#dc502e"
                    />
                  )}
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
