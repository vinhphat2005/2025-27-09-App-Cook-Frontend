import { AuthGuard } from "@/components/AuthGuard";
import { Avatar } from "@/components/Profile/Avatar";
import { ProductList } from "@/components/Profile/ProductList";
import { State } from "@/components/Profile/State";
import { mockDishes1 } from "@/constants/mock-data";
import { useAuthStore } from "@/store/authStore";
import EntypoIcon from "@expo/vector-icons/Entypo";
import FontAweSomeIcon from "@expo/vector-icons/FontAwesome";
import { Ionicons } from "@expo/vector-icons"; // ⬅️ thêm icon thời gian

import { router } from "expo-router";
import {
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";

export default function PersonalScreen() {
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

  return (
    <AuthGuard>
      <ScrollView contentContainerStyle={styles.scrollView}>
        <View style={styles.userInfoContainer}>
          <Avatar
            size={100}
            image={user?.avatar || "https://picsum.photos/200/300"}
          />
          <View style={styles.nameContainer}>
            <Text style={styles.nameLabel}>{user?.email}</Text>
          </View>
          <View style={styles.editContainer}>
            {/* Nút sửa hồ sơ */}
            <Pressable
              style={styles.buttonEditProfile}
              onPress={() => router.push("/editProfile")}
            >
              <FontAweSomeIcon
                name="pencil-square-o"
                size={30}
                color="#dc502e"
              />
            </Pressable>

            {/* Nút xem lịch sử */}
            <Pressable
              style={styles.buttonHistory}
              onPress={() => router.push("/view_history")}
            >
              <Ionicons name="time-outline" size={30} color="#dc502e" />
            </Pressable>

            {/* Nút đăng xuất */}
            <Pressable onPress={handleLogout} style={styles.button}>
              <FontAweSomeIcon name="sign-out" size={30} color="#dc502e" />
            </Pressable>
          </View>
          <Text style={styles.address}>{user?.address}</Text>
        </View>

        <State />
        <ProductList
          dishes={mockDishes1}
          onPressFavorite={() => {}}
          onPress={(id) => {
            router.push(`/detail?id=${id}`);
          }}
        />
      </ScrollView>

      <View style={{ position: "absolute", bottom: 120, right: 25 }}>
        <Pressable
          onPress={() => {
            router.push("/addDish");
          }}
          style={styles.addDish}
        >
          <EntypoIcon name="plus" size={30} color="white" />
        </Pressable>
      </View>
    </AuthGuard>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    gap: 10,
    padding: 20,
    paddingBottom: 70,
  },
  nameLabel: {
    fontSize: 20,
    fontWeight: "bold",
  },
  address: {
    fontSize: 16,
  },
  nameContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  userInfoContainer: {
    flexDirection: "column",
    alignItems: "center",
    gap: 10,
  },
  addDish: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ff211c",
    borderRadius: 35,
    width: 70,
    height: 70,
    zIndex: 10000,
  },
  editContainer: {
    flexDirection: "row",
    gap: 30,
  },
  buttonEditProfile: {},
  buttonHistory: {}, // để style riêng nếu muốn
  button: {},
});
