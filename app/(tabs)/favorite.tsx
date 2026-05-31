import ParallaxScrollView from "@/components/ParallaxScrollView";
import { ProductList } from "@/components/Profile/ProductList";
import { useAuthStore } from "@/store/authStore";
import { useFavoriteStore } from "@/store/favoriteStore";
import { Dish } from "@/types/dish"; // ✅ Use dish.ts instead of index.ts
import { normalizeDishList } from "@/types/dish";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useEffect, useState, useCallback } from "react";
import { StyleSheet, Text, Alert, RefreshControl, Platform } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { isWeb } from "@/styles/responsive";
import { AppConfig } from "@/lib/config";

const API_URL = AppConfig.api.url;

export default function FavoriteScreen() {
  const router = useRouter();
  const [favoriteDishes, setFavoriteDishes] = useState<Dish[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { token } = useAuthStore();
  const { updateFavoriteStatus, getFavoriteStatus, favoriteUpdates } = useFavoriteStore();

  // ✅ Fetch favorite dishes - simplified version
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

      __DEV__ && console.debug("🔄 Fetching favorite dishes...");

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
      __DEV__ && console.debug("📋 Raw favorite dishes data:", data.length);

      // ✅ Use normalizeDishList for consistent data structure
      const normalizedDishes = normalizeDishList(data);

      // Set all dishes as favorite and sync with global store
      const processedDishes = normalizedDishes.map(dish => {
        const globalStatus = getFavoriteStatus(dish.id);
        return {
          ...dish,
          isFavorite: globalStatus !== undefined ? globalStatus : true
        };
      });

      __DEV__ && console.debug("✅ Processed favorite dishes:", processedDishes.length);
      __DEV__ && console.debug("🔍 Sample dish:", {
        id: processedDishes[0]?.id,
        name: processedDishes[0]?.label,
        level: processedDishes[0]?.level,
        difficulty: processedDishes[0]?.level, // This should now be correct
        isFavorite: processedDishes[0]?.isFavorite
      });

      setFavoriteDishes(processedDishes);
    } catch (err: any) {
      console.error("❌ Error fetching favorite dishes:", err);
      setError(err.message || "Không thể tải danh sách món ăn yêu thích");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getFavoriteStatus]); // ✅ Only depend on getFavoriteStatus

  // ✅ Toggle favorite - simplified
  const toggleFavorite = useCallback(async (dishId: string | number) => {
    try {
      const currentToken = useAuthStore.getState().token;
      if (!currentToken) {
        Alert.alert("Lỗi", "Vui lòng đăng nhập lại");
        return;
      }

      // Find current dish
      const dishIndex = favoriteDishes.findIndex(d => d.id === dishId);
      if (dishIndex === -1) return;

      const currentDish = favoriteDishes[dishIndex];

      // Optimistic update - remove from favorites list
      const updatedDishes = favoriteDishes.filter(dish => dish.id !== dishId);
      setFavoriteDishes(updatedDishes);

      // Update global store
      updateFavoriteStatus(dishId, false);

      __DEV__ && console.debug(`❤️ Removing dish ${dishId} from favorites`);

      // API call
      const response = await fetch(`${API_URL}/dishes/${dishId}/toggle-favorite`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${currentToken}`,
        },
      });

      if (!response.ok) {
        console.error(`❌ API call failed: ${response.status}`);

        // Revert on error - sort by string comparison
        setFavoriteDishes(prev => [...prev, currentDish].sort((a, b) =>
          String(a.id).localeCompare(String(b.id))
        ));
        updateFavoriteStatus(dishId, true);
        throw new Error("Failed to toggle favorite");
      }

      __DEV__ && console.debug(`✅ Successfully removed dish ${dishId} from favorites`);

    } catch (err: any) {
      console.error("❌ Error toggling favorite:", err);
      Alert.alert("Lỗi", "Không thể cập nhật trạng thái yêu thích");
    }
  }, [favoriteDishes, updateFavoriteStatus]);

  // ✅ Handle dish press (view logging handled by detail screen)
  const handleDishPress = useCallback(async (dish: Dish) => {
    router.push(`/detail?id=${dish.id}`);
  }, [router]);

  // ✅ Pull to refresh
  const onRefresh = useCallback(() => {
    fetchFavoriteDishes(true);
  }, [fetchFavoriteDishes]);

  // ✅ Initial load - only when token changes
  useEffect(() => {
    if (token) {
      fetchFavoriteDishes(false);
    } else {
      setLoading(false);
      setFavoriteDishes([]);
    }
  }, [token]); // ✅ Remove fetchFavoriteDishes from dependencies

  // ✅ Web: Listen to favoriteUpdates changes and refetch
  useEffect(() => {
    if (isWeb && token && Object.keys(favoriteUpdates).length > 0) {
      __DEV__ && console.debug("🌐 Web: Favorite updates detected, refetching...");
      __DEV__ && console.debug("📊 Updated favorites:", favoriteUpdates);

      // Delay a bit to ensure backend is updated
      const timer = setTimeout(() => {
        __DEV__ && console.debug("🔄 Refetching favorite dishes from API...");
        fetchFavoriteDishes(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [favoriteUpdates, token, isWeb, fetchFavoriteDishes]);

  // ✅ Mobile: Focus effect - only sync with global store, don't refetch
  useFocusEffect(
    useCallback(() => {
      if (!isWeb && token && favoriteDishes.length > 0) {
        __DEV__ && console.debug("📱 Mobile: FavoriteScreen came into focus - syncing favorite status");

        // Only sync favorite status from global store, don't refetch
        setFavoriteDishes(prev =>
          prev.map(dish => {
            const globalStatus = getFavoriteStatus(dish.id);
            return globalStatus !== undefined
              ? { ...dish, isFavorite: globalStatus }
              : dish;
          }).filter(dish => dish.isFavorite) // Remove dishes that are no longer favorites
        );
      }
    }, [token, getFavoriteStatus, favoriteDishes.length, isWeb]) // ✅ Remove loading/refreshing dependencies
  );

  // ✅ Debug log - only when dishes change
  useEffect(() => {
    if (favoriteDishes.length > 0) {
      __DEV__ && console.debug("🔍 Current favorite dishes:",
        favoriteDishes.slice(0, 3).map(d => ({
          id: d.id,
          name: d.label,
          level: d.level,
          isFavorite: d.isFavorite
        }))
      );
    }
  }, [favoriteDishes]);

  // Error state
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
    height: isWeb ? 150 : 178,
    width: isWeb ? 240 : 290,
    bottom: 0,
    left: 0,
    position: "absolute",
  },
  title: {
    fontSize: isWeb ? 40 : 32,
    fontWeight: "bold",
    marginBottom: isWeb ? 24 : 16,
    color: "#dd3300",
    textAlign: "center",
  },
});
