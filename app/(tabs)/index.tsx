import { Image } from "expo-image";
import { StyleSheet, Text, View, Alert } from "react-native";
import ParallaxScrollView from "@/components/ParallaxScrollView";
import { ProductList } from "@/components/Profile/ProductList";
import { SearchBox } from "@/components/Search/SearchBox";
import { mockDishes1 } from "@/constants/mock-data";
import { useRouter } from "expo-router";
import { useAuthStore } from "@/store/authStore";
import { useFavoriteStore } from "@/store/favoriteStore"; // Add favorite store
import { useEffect, useState, useCallback } from "react";
import type { Dish } from "@/types";
import { fetchTodaySuggestions } from "@/lib/api";
import { updateDishesWithFavoriteStatus } from "@/lib/favoriteUtils";
import { useFocusEffect } from "@react-navigation/native"; // Add this import

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export default function HomeScreen() {
  const router = useRouter();
  const [matches, setMatches] = useState<Dish[]>([]);
  const [todayDishes, setTodayDishes] = useState<Dish[]>([]);
  const [loading, setLoading] = useState(true);
  const { token } = useAuthStore();
  const { favoriteUpdates, updateFavoriteStatus, getFavoriteStatus } = useFavoriteStore(); // Add favorite store

  // ✅ NEW: Sync dishes with global favorite updates
  const syncWithFavoriteUpdates = useCallback((dishes: Dish[]) => {
    return dishes.map(dish => {
      const globalStatus = getFavoriteStatus(dish.id);
      return globalStatus !== undefined 
        ? { ...dish, isFavorite: globalStatus }
        : dish;
    });
  }, [getFavoriteStatus]);

  // Fetch today suggestions
  const fetchSuggestions = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch gợi ý món phù hợp
      const matchData = await fetchTodaySuggestions({ userId: "1" });
      
      // Transform mockDishes1 to include default isFavorite status
      const transformedTodayDishes = mockDishes1.map(dish => ({
        ...dish,
        isFavorite: false, // Default false, sẽ được cập nhật từ API
      }));
      
      // Update with correct favorite status if user is logged in
      if (token) {
        const [updatedMatches, updatedTodayDishes] = await Promise.all([
          updateDishesWithFavoriteStatus(matchData),
          updateDishesWithFavoriteStatus(transformedTodayDishes),
        ]);
        
        // ✅ SYNC with global favorite updates
        setMatches(syncWithFavoriteUpdates(updatedMatches));
        setTodayDishes(syncWithFavoriteUpdates(updatedTodayDishes));
      } else {
        // User not logged in, use default status
        setMatches(matchData.map(dish => ({ ...dish, isFavorite: false })));
        setTodayDishes(transformedTodayDishes);
      }
      
    } catch (err) {
      console.error("Error fetching suggestions:", err);
    } finally {
      setLoading(false);
    }
  }, [token, syncWithFavoriteUpdates]);

  // ✅ NEW: Sync when favoriteUpdates change
  useEffect(() => {
    if (Object.keys(favoriteUpdates).length > 0) {
      setMatches(prev => syncWithFavoriteUpdates(prev));
      setTodayDishes(prev => syncWithFavoriteUpdates(prev));
    }
  }, [favoriteUpdates, syncWithFavoriteUpdates]);

  // ✅ REFRESH when screen comes into focus (sync with favorite changes)
  useFocusEffect(
    useCallback(() => {
      // Sync with any favorite changes from other screens
      setMatches(prev => syncWithFavoriteUpdates(prev));
      setTodayDishes(prev => syncWithFavoriteUpdates(prev));
    }, [syncWithFavoriteUpdates])
  );

  // Toggle favorite status
  const toggleFavorite = useCallback(async (dishId: number) => {
    try {
      const currentToken = useAuthStore.getState().token;
      if (!currentToken) {
        Alert.alert("Thông báo", "Vui lòng đăng nhập để sử dụng tính năng này");
        router.push("/login");
        return;
      }

      // Get current favorite status
      const currentDish = [...matches, ...todayDishes].find(d => d.id === dishId);
      const newFavoriteStatus = !currentDish?.isFavorite;

      // Optimistic update for matches
      setMatches(prev => 
        prev.map(dish => 
          dish.id === dishId 
            ? { ...dish, isFavorite: newFavoriteStatus }
            : dish
        )
      );

      // Optimistic update for today dishes
      setTodayDishes(prev => 
        prev.map(dish => 
          dish.id === dishId 
            ? { ...dish, isFavorite: newFavoriteStatus }
            : dish
        )
      );

      // ✅ UPDATE: Sync with global store
      updateFavoriteStatus(dishId, newFavoriteStatus);

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
        setMatches(prev => 
          prev.map(dish => 
            dish.id === dishId 
              ? { ...dish, isFavorite: !newFavoriteStatus }
              : dish
          )
        );
        setTodayDishes(prev => 
          prev.map(dish => 
            dish.id === dishId 
              ? { ...dish, isFavorite: !newFavoriteStatus }
              : dish
          )
        );
        // Revert global store update
        updateFavoriteStatus(dishId, !newFavoriteStatus);
        throw new Error("Failed to toggle favorite");
      }
      
    } catch (err: any) {
      console.error("Error toggling favorite:", err);
      Alert.alert("Lỗi", "Không thể cập nhật trạng thái yêu thích");
    }
  }, [router, matches, todayDishes, updateFavoriteStatus]);

  // Handle dish press - log view history
  const handleDishPress = useCallback(async (dish: Dish) => {
    try {
      // Log view history if user is logged in
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

  useEffect(() => {
    fetchSuggestions();
  }, [fetchSuggestions]);

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: "#f5b402", dark: "#f5b402" }}
      includeBottomTab={true}
      headerImage={
        <Image
          source={require("@/assets/images/logo.png")}
          style={styles.reactLogo}
        />
      }
    >
      <Text style={styles.title}>Nhập nguyên liệu bạn có:</Text>
      
      <SearchBox />

      {/* Gợi ý món phù hợp */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Gợi ý món phù hợp</Text>
        <ProductList
          dishes={matches}
          onPress={handleDishPress}
          onPressFavorite={toggleFavorite}
          itemsPerRow={2}
          loading={loading}
          emptyMessage="Không có gợi ý món ăn phù hợp"
          emptySubMessage="Hãy thử nhập nguyên liệu để tìm món ăn!"
        />
      </View>

      {/* Gợi ý món ăn hôm nay */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Gợi ý món ăn hôm nay</Text>
        <ProductList
          dishes={todayDishes}
          onPress={handleDishPress}
          onPressFavorite={toggleFavorite}
          itemsPerRow={2}
          loading={false}
          emptyMessage="Không có gợi ý món ăn hôm nay"
          emptySubMessage="Hãy quay lại sau để xem gợi ý mới!"
        />
      </View>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: "absolute"
  },
  title: {
    fontSize: 28,
    fontWeight: "600",
    color: "#333",
    marginBottom: 16,
    textAlign: "center",
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
    marginLeft: 12,
  },
});