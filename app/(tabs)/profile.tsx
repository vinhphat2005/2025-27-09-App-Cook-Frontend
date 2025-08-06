import { AuthGuard } from "@/components/AuthGuard";
import { Avatar } from "@/components/Profile/Avatar";
import { ProductList } from "@/components/Profile/ProductList";
import { State } from "@/components/Profile/State";
import { mockDishes1 } from "@/constants/mock-data";
import { useAuthStore } from "@/store/authStore";
import { router } from "expo-router";
import {
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

export default function PersonalScreen() {
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

  return (
    <AuthGuard>
      <SafeAreaProvider>
        <SafeAreaView style={styles.container} edges={["top"]}>
          <ScrollView contentContainerStyle={styles.scrollView}>
            <View style={styles.userInfoContainer}>
              <Avatar
                size={100}
                image={user?.avatar || "https://picsum.photos/200/300"}
              />
              <View style={styles.nameContainer}>
                <Text style={styles.nameLabel}>{user?.email}</Text>
                {/* <Text style={styles.usernameLabel}>@{user?.username}</Text> */}
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

            <Pressable onPress={handleLogout} style={styles.button}>
              <Text style={styles.buttonText}>Thoát</Text>
            </Pressable>
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
    paddingBottom: 70
  },
  scrollView: {
    gap: 10,
    padding: 20
  },
  emailLabel: {
    fontSize: 16,
    fontWeight: "bold"
  },
  emailValue: {
    fontSize: 16
  },
  button: {
    backgroundColor: "red",
    padding: 10,
    borderRadius: 10,
    marginTop: 20,
    alignItems: "center",
    fontWeight: "bold",
    color: "white"
  },
  buttonText: {
    color: "white"
  },
  nameLabel: {
    fontSize: 20,
    fontWeight: "bold"
  },
  address: {
    fontSize: 16
  },
  nameContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5
  },
  usernameLabel: {
    fontSize: 16,
    fontStyle: "italic",
    color: "#2253ff"
  },
  userInfoContainer: {
    flexDirection: "column",
    alignItems: "center",
    gap: 10
  }
});
