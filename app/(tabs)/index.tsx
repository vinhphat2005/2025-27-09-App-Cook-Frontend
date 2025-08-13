import { Image } from "react-native";
import { StyleSheet, Text, View, Alert } from "react-native";
import ParallaxScrollView from "@/components/ParallaxScrollView";
import { ProductList } from "@/components/Profile/ProductList";
import { SearchBox } from "@/components/Search/SearchBox";
import { useRouter } from "expo-router";
import { useAuthStore } from "@/store/authStore";
import { useFavoriteStore } from "@/store/favoriteStore";
import { useEffect, useState, useCallback } from "react";
import type { Dish } from "@/types";
import { fetchTodaySuggestions } from "@/lib/api";
import { updateDishesWithFavoriteStatus } from "@/lib/favoriteUtils";
import { useFocusEffect } from "@react-navigation/native";

const API_URL = process.env.EXPO_PUBLIC_API_URL 

// ✅ Simple cache for "matches" with TTL (5 minutes)
let _cachedMatches: Dish[] = [];
let _cachedAt = 0;
const MATCHES_TTL_MS = 5 * 60 * 1000; // 5 phút

export default function HomeScreen() {
  const router = useRouter();
  const [matches, setMatches] = useState<Dish[]>([]);
  const [todayDishes, setTodayDishes] = useState<Dish[]>([]);
  const [loading, setLoading] = useState(true);
  const { token } = useAuthStore(); 
  const { favoriteUpdates, updateFavoriteStatus, getFavoriteStatus } = useFavoriteStore();

  // ✅ Sync dishes with global favorite updates
  const syncWithFavoriteUpdates = useCallback(
    (dishes: Dish[]) => {
      return dishes.map((dish) => {
        const globalStatus = getFavoriteStatus(dish.id);
        return globalStatus !== undefined ? { ...dish, isFavorite: globalStatus } : dish;
      });
    },
    [getFavoriteStatus]
  );

  // ✅ Fetch suggestions with caching + sync favorites
  const fetchSuggestions = useCallback(async () => {
    try {
      setLoading(true);

      // 1) Use cache for "matches" if still valid -> display faster
      const now = Date.now();
      if (_cachedMatches.length && now - _cachedAt < MATCHES_TTL_MS) {
        console.log("Using cached matches data");
        setMatches(syncWithFavoriteUpdates(_cachedMatches));
      }

      // 2) Always fetch new data for updates
      const matchData = await fetchTodaySuggestions({ userId: "1" });
      
      // ✅ Use same data for "today suggestions" but slice/shuffle for variety
      const todayDishesData = [...matchData]
        .sort(() => Math.random() - 0.5) // Shuffle for variety
        .slice(0, 6); // Take first 6 items

      if (token) {
        // Update favorite status for logged in users
        const [updatedMatches, updatedTodayDishes] = await Promise.all([
          updateDishesWithFavoriteStatus(matchData),
          updateDishesWithFavoriteStatus(todayDishesData),
        ]);

        const syncedMatches = syncWithFavoriteUpdates(updatedMatches);
        const syncedToday = syncWithFavoriteUpdates(updatedTodayDishes);

        setMatches(syncedMatches);
        setTodayDishes(syncedToday);

        // 3) Update cache with latest data (don't cache user-specific data)
        _cachedMatches = updatedMatches;
        _cachedAt = Date.now();
      } else {
        // Not logged in: keep isFavorite=false
        const anonymousMatches = matchData.map((d) => ({ ...d, isFavorite: false }));
        const anonymousTodayDishes = todayDishesData.map((d) => ({ ...d, isFavorite: false }));
        
        setMatches(syncWithFavoriteUpdates(anonymousMatches));
        setTodayDishes(syncWithFavoriteUpdates(anonymousTodayDishes));

        // Update cache
        _cachedMatches = anonymousMatches;
        _cachedAt = Date.now();
      }
    } catch (err) {
      console.error("Error fetching suggestions:", err);
    } finally {
      setLoading(false);
    }
  }, [token, syncWithFavoriteUpdates]);

  // ✅ Sync UI when favoriteUpdates change
  useEffect(() => {
    if (Object.keys(favoriteUpdates).length > 0) {
      setMatches((prev) => syncWithFavoriteUpdates(prev));
      setTodayDishes((prev) => syncWithFavoriteUpdates(prev));
    }
  }, [favoriteUpdates, syncWithFavoriteUpdates]);

  // ✅ Refresh when screen comes into focus (ensure latest favorite sync)
  useFocusEffect(
    useCallback(() => {
      setMatches((prev) => syncWithFavoriteUpdates(prev));
      setTodayDishes((prev) => syncWithFavoriteUpdates(prev));
    }, [syncWithFavoriteUpdates])
  );

  // ✅ Toggle favorite (optimistic UI + sync global store)
  const toggleFavorite = useCallback(
    async (dishId: number) => {
      try {
        const currentToken = useAuthStore.getState().token;
        if (!currentToken) {
          Alert.alert("Thông báo", "Vui lòng đăng nhập để sử dụng tính năng này");
          router.push("/login");
          return;
        }

        // Get current favorite status
        const currentDish = [...matches, ...todayDishes].find((d) => d.id === dishId);
        const newFavoriteStatus = !currentDish?.isFavorite;

        // Optimistic update
        setMatches((prev) =>
          prev.map((dish) => (dish.id === dishId ? { ...dish, isFavorite: newFavoriteStatus } : dish))
        );
        setTodayDishes((prev) =>
          prev.map((dish) => (dish.id === dishId ? { ...dish, isFavorite: newFavoriteStatus } : dish))
        );

        // Update global store
        updateFavoriteStatus(dishId, newFavoriteStatus);

        // Call API
        const response = await fetch(`${API_URL}/dishes/${dishId}/toggle-favorite`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${currentToken}`,
          },
        });

        if (!response.ok) {
          // Revert optimistic update on error
          setMatches((prev) =>
            prev.map((dish) => (dish.id === dishId ? { ...dish, isFavorite: !newFavoriteStatus } : dish))
          );
          setTodayDishes((prev) =>
            prev.map((dish) => (dish.id === dishId ? { ...dish, isFavorite: !newFavoriteStatus } : dish))
          );
          updateFavoriteStatus(dishId, !newFavoriteStatus);
          throw new Error("Failed to toggle favorite");
        }
      } catch (err: any) {
        console.error("Error toggling favorite:", err);
        Alert.alert("Lỗi", "Không thể cập nhật trạng thái yêu thích");
      }
    },
    [router, matches, todayDishes, updateFavoriteStatus]
  );

  // ✅ Handle dish press: log view history (if logged in) then navigate
  const handleDishPress = useCallback(
    async (dish: Dish) => {
      try {
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
      router.push(`/detail?id=${dish.id}`);
    },
    [router]
  );

  // ✅ Initial data fetch
  useEffect(() => {
    fetchSuggestions();
  }, [fetchSuggestions]);

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: "#f5b402", dark: "#f5b402" }}
      includeBottomTab={true}
      headerImage={<Image source={require("@/assets/images/logo.png")} style={styles.reactLogo} />}
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
          loading={loading}
          emptyMessage="Không có gợi ý món ăn hôm nay"
          emptySubMessage="Hãy thử nhập nguyên liệu để tìm món ăn!"
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
    position: "absolute",
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