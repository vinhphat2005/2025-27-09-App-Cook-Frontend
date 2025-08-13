import ParallaxScrollView from "@/components/ParallaxScrollView";
import { ProductList } from "@/components/Profile/ProductList";
import { useAuthStore } from "@/store/authStore";
import { useFavoriteStore } from "@/store/favoriteStore"; // Import favorite store
import { Dish } from "@/types";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useEffect, useState, useCallback } from "react";
import { StyleSheet, Text, Alert, RefreshControl } from "react-native";
import { useFocusEffect } from "@react-navigation/native";

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export default function FavoriteScreen() {
  const router = useRouter();
  const [favoriteDishes, setFavoriteDishes] = useState<Dish[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { token } = useAuthStore();
  const { updateFavoriteStatus } = useFavoriteStore(); // Add favorite store

  // Fetch favorite dishes from backend
  const fetchFavoriteDishes = useCallback(async (showRefresh = false) => {
    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      
      const currentToken = useAuthStore.getState().token;
      if (!currentToken) {
        throw new Error("Authentication required");
      }

      const response = await fetch(`${API_URL}/users/me/favorites`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${currentToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch favorites: ${response.status}`);
      }

      const data = await response.json();
      
      // Transform backend data to match frontend Dish type
      const transformedDishes: Dish[] = data.map((dish: any) => ({
        id: dish.id || 0,
        label: dish.name || "",
        // ✅ FIX: Proper image handling like in HomeScreen
        image: dish.image_url || "https://via.placeholder.com/300",
        time: `${dish.cooking_time || 0} phút`,
        level: dish.difficulty_level || dish.difficulty || "easy",
        star: dish.average_rating || 0,
        isFavorite: true, // Always true for favorite screen
        ingredients: dish.ingredients || [],
        steps: dish.instructions || dish.steps || [],
      }));

      setFavoriteDishes(transformedDishes);
    } catch (err: any) {
      console.error("Error fetching favorite dishes:", err);
      setError(err.message || "Không thể tải danh sách món ăn yêu thích");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Toggle favorite status
  const toggleFavorite = useCallback(async (dishId: number) => {
    try {
      const currentToken = useAuthStore.getState().token;
      if (!currentToken) {
        Alert.alert("Lỗi", "Vui lòng đăng nhập lại");
        return;
      }

      // Optimistic update - remove from UI immediately
      setFavoriteDishes(prev => prev.filter(dish => dish.id !== dishId));
      
      // ✅ UPDATE: Sync with global store (set to false since we're removing from favorites)
      updateFavoriteStatus(dishId, false);

      // Call API to toggle favorite
      const response = await fetch(`${API_URL}/dishes/${dishId}/toggle-favorite`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${currentToken}`,
        },
      });

      if (!response.ok) {
        // Revert optimistic update on error
        fetchFavoriteDishes(false);
        // Revert global store update
        updateFavoriteStatus(dishId, true);
        throw new Error("Failed to toggle favorite");
      }
      
    } catch (err: any) {
      console.error("Error toggling favorite:", err);
      Alert.alert("Lỗi", "Không thể cập nhật trạng thái yêu thích");
    }
  }, [fetchFavoriteDishes, updateFavoriteStatus]);

  // Handle dish press - log view history like in search-results
  const handleDishPress = useCallback(async (dish: Dish) => {
    try {
      // Log view history
      const currentToken = useAuthStore.getState().token;
      if (currentToken) {
        await fetch(`${API_URL}/users/activity/viewed/${dish.id}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${currentToken}`,
          },
        });
      }
    } catch (err) {
      console.error("Error logging view history:", err);
    }
    
    // Navigate to detail
    router.push(`/detail?id=${dish.id}`);
  }, [router]);

  // Pull to refresh handler
  const onRefresh = useCallback(() => {
    fetchFavoriteDishes(true);
  }, [fetchFavoriteDishes]);

  // Load data on component mount
  useEffect(() => {
    if (token) {
      fetchFavoriteDishes(false);
    } else {
      setLoading(false);
      setFavoriteDishes([]);
    }
  }, [fetchFavoriteDishes, token]);

  // Refresh when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (token) {
        fetchFavoriteDishes(false);
      }
    }, [fetchFavoriteDishes, token])
  );

  // Error state with retry
  if (error && !loading && !refreshing) {
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
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Text style={styles.title}>Món ăn đã Thích</Text>
        <ProductList
          dishes={[]}
          onPress={handleDishPress}
          onPressFavorite={toggleFavorite}
          loading={false}
          emptyMessage="Đã xảy ra lỗi"
          emptySubMessage={`${error}\n\nKéo xuống để thử lại`}
        />
      </ParallaxScrollView>
    );
  }

  // Not logged in state
  if (!token) {
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
        <ProductList
          dishes={[]}
          onPress={handleDishPress}
          onPressFavorite={toggleFavorite}
          loading={false}
          emptyMessage="Vui lòng đăng nhập"
          emptySubMessage="Để xem danh sách món ăn yêu thích"
        />
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
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <Text style={styles.title}>Món ăn đã Thích</Text>
      
      <ProductList
        dishes={favoriteDishes}
        onPress={handleDishPress}
        onPressFavorite={toggleFavorite}
        loading={loading}
        emptyMessage="Bạn chưa có món ăn yêu thích nào"
        emptySubMessage="Hãy khám phá và thêm những món ăn bạn yêu thích!"
      />
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
    marginBottom: 16,
    color: "#dd3300",
    textAlign: "center",
  },
});