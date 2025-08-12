import { AuthGuard } from "@/components/AuthGuard";
import { Avatar } from "@/components/Profile/Avatar";
import { ProductList } from "@/components/Profile/ProductList";
import { State } from "@/components/Profile/State";
import { mockDishes1 } from "@/constants/mock-data";
import { useAuthStore } from "@/store/authStore";
import EntypoIcon from "@expo/vector-icons/Entypo";
import FontAweSomeIcon from "@expo/vector-icons/FontAwesome";

import { router } from "expo-router";
import {
  Button,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
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
          <View style={styles.editContainer}>
            <Pressable
              style={styles.buttonEditProfile}
              onPress={() => {
                router.push("/editProfile");
              }}
            >
              <FontAweSomeIcon
                name="pencil-square-o"
                size={30}
                color="#dc502e"
              />
            </Pressable>
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
  container: {
    flex: 1,
    paddingTop: StatusBar.currentHeight,
    paddingBottom: 70,
    backgroundColor: "pink",
  },
  scrollView: {
    gap: 10,
    padding: 20,
    paddingBottom: 70,
  },
  emailLabel: {
    fontSize: 16,
    fontWeight: "bold",
  },
  emailValue: {
    fontSize: 16,
  },

  buttonText: {
    color: "white",
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
  usernameLabel: {
    fontSize: 16,
    fontStyle: "italic",
    color: "#2253ff",
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
    fontWeight: "bold",
    color: "white",
    borderRadius: "50%",
    padding: "auto",
    width: 70,
    height: 70,
    zIndex: 10000,
  },
  editContainer: {
    flexDirection: "row",
    gap: 30,
  },
  buttonEditProfile: {},
  button: {},
});
