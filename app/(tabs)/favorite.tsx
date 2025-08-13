import ParallaxScrollView from "@/components/ParallaxScrollView";
import { ProductCard } from "@/components/Recipe/ProductCard";
import { useAuthStore } from "@/store/authStore";
import { Dish } from "@/types";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View, ActivityIndicator, Alert } from "react-native";

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export default function FavoriteScreen() {
  const router = useRouter();
  const [favoriteDishes, setFavoriteDishes] = useState<Dish[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch favorite dishes from backend
  const fetchFavoriteDishes = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = useAuthStore.getState().token;
      if (!token) {
        throw new Error("Authentication required");
      }

      const response = await fetch(`${API_URL}/users/me/favorites`, {
  method: "GET",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  },
});
      if (!response.ok) {
        throw new Error(`Failed to fetch favorites: ${response.status}`);
      }

      const data = await response.json();
      
      // Transform backend data to match frontend Dish type
      const transformedDishes: Dish[] = data.map((dish: any) => ({
    id: dish.id || "",
        label: dish.name || "",
        image: dish.image_url || dish.image_b64 ? 
          `data:${dish.image_mime || 'image/jpeg'};base64,${dish.image_b64}` : 
          "https://via.placeholder.com/300",
        time: `${dish.cooking_time || 0} phút`,
        level: dish.difficulty_level || "Dễ",
        star: dish.average_rating || 0,
        isFavorite: true, // Always true for favorite screen
      }));

      setFavoriteDishes(transformedDishes);
    } catch (err: any) {
      console.error("Error fetching favorite dishes:", err);
      setError(err.message || "Không thể tải danh sách món ăn yêu thích");
    } finally {
      setLoading(false);
    }
  };

  // Toggle favorite status
  const toggleFavorite = async (dishId: number) => {
    try {
      const token = useAuthStore.getState().token;
      if (!token) {
        Alert.alert("Lỗi", "Vui lòng đăng nhập lại");
        return;
      }

      // Call API to toggle favorite (you might need to implement this endpoint)
      const response = await fetch(`${API_URL}/dishes/${dishId}/toggle-favorite`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to toggle favorite");
      }

      // Remove from local state since we're unfavoriting
      setFavoriteDishes(prev => prev.filter(dish => dish.id !== dishId));
      
    } catch (err: any) {
      console.error("Error toggling favorite:", err);
      Alert.alert("Lỗi", "Không thể cập nhật trạng thái yêu thích");
    }
  };

  // Load data on component mount
  useEffect(() => {
    fetchFavoriteDishes();
  }, []);

  // Handle dish press - log view history like in search-results
  const handleDishPress = async (dish: Dish) => {
    try {
      // Log view history
      const token = useAuthStore.getState().token;
      if (token) {
        await fetch(`${API_URL}/users/activity/viewed/${dish.id}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
      }
    } catch (err) {
      console.error("Error logging view history:", err);
    }
    
    // Navigate to detail
    router.push(`/detail?id=${dish.id}`);
  };

  // Loading state
  if (loading) {
    return (
      <ParallaxScrollView
        headerHeight={100}
        headerBackgroundColor={{ light: "#f5b402", dark: "#f5b402" }}
        includeBottomTab={true}
        headerImage={
          <Image
            source={require("@/assets/images/logo.png")}
            style={styles.reactLogo}
          />
        }
      >
        <Text style={styles.title}>Món ăn đã Thích</Text>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#f5b402" />
          <Text style={styles.loadingText}>Đang tải món ăn yêu thích...</Text>
        </View>
      </ParallaxScrollView>
    );
  }

  // Error state
  if (error) {
    return (
      <ParallaxScrollView
        headerHeight={100}
        headerBackgroundColor={{ light: "#f5b402", dark: "#f5b402" }}
        includeBottomTab={true}
        headerImage={
          <Image
            source={require("@/assets/images/logo.png")}
            style={styles.reactLogo}
          />
        }
      >
        <Text style={styles.title}>Món ăn đã Thích</Text>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <Text 
            style={styles.retryText}
            onPress={fetchFavoriteDishes}
          >
            Thử lại
          </Text>
        </View>
      </ParallaxScrollView>
    );
  }

  return (
    <ParallaxScrollView
      headerHeight={100}
      headerBackgroundColor={{ light: "#f5b402", dark: "#f5b402" }}
      includeBottomTab={true}
      headerImage={
        <Image
          source={require("@/assets/images/logo.png")}
          style={styles.reactLogo}
        />
      }
    >
      <Text style={styles.title}>Món ăn đã Thích</Text>

      {favoriteDishes.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            Bạn chưa có món ăn yêu thích nào
          </Text>
          <Text style={styles.emptySubtext}>
            Hãy khám phá và thêm những món ăn bạn yêu thích!
          </Text>
        </View>
      ) : (
        <View style={styles.dishList}>
          {favoriteDishes.map((dish) => (
            <ProductCard
              key={dish.id}
              dish={dish}
              itemsPerRow={2}
              onPress={() => handleDishPress(dish)}
              onPressFavorite={toggleFavorite}
            />
          ))}
        </View>
      )}
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: "absolute",
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#dd3300",
  },
  dishList: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 50,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#666",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 50,
  },
  errorText: {
    fontSize: 16,
    color: "#ff4444",
    textAlign: "center",
    marginBottom: 10,
  },
  retryText: {
    fontSize: 16,
    color: "#f5b402",
    fontWeight: "bold",
    textDecorationLine: "underline",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 50,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#666",
    textAlign: "center",
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
  },
});