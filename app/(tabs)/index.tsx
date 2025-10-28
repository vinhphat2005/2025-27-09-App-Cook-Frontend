import { Image } from "react-native";
import { StyleSheet, Text, View, Alert, RefreshControl } from "react-native";
import ParallaxScrollView from "@/components/ParallaxScrollView";
import { ProductList } from "@/components/Profile/ProductList";
import { SearchBox } from "@/components/Search/SearchBox";
import { useRouter } from "expo-router";
import { useAuthStore } from "@/store/authStore";
import { useFavoriteStore } from "@/store/favoriteStore";
import { useEffect, useState, useCallback } from "react";
import type { Dish } from "@/types/dish"; // ✅ Use dish.ts instead of index.ts
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
  const [refreshing, setRefreshing] = useState(false);
  const { token } = useAuthStore(); 
  const { favoriteUpdates, updateFavoriteStatus, getFavoriteStatus, setAllFavorites } = useFavoriteStore();

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
  const fetchSuggestions = useCallback(async (showRefresh = false) => {
    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      // 1) Use cache for "matches" if still valid -> display faster
      const now = Date.now();
      if (_cachedMatches.length && now - _cachedAt < MATCHES_TTL_MS && !showRefresh) {
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
      setRefreshing(false);
    }
  }, [token, syncWithFavoriteUpdates]);

  // ✅ Sync UI when favoriteUpdates change
  useEffect(() => {
    if (Object.keys(favoriteUpdates).length > 0) {
      setMatches((prev) => syncWithFavoriteUpdates(prev));
      setTodayDishes((prev) => syncWithFavoriteUpdates(prev));
    }
  }, [favoriteUpdates, syncWithFavoriteUpdates]);

  // ✅ Fetch user favorites from API to sync global store
  const fetchUserFavorites = useCallback(async () => {
    if (!token || token === "null" || token === "undefined") return;

    try {
      const res = await fetch(`${API_URL}/users/me/favorites`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const favoriteDishes = await res.json();
        console.log(`📥 [Index] Fetched ${favoriteDishes.length} favorites from API`);
        
        // ✅ Replace global store with fresh favorites from API (as strings)
        const favoriteIds = favoriteDishes.map((dish: any) => String(dish.id));
        
        setAllFavorites(favoriteIds);
        console.log(`📝 [Index] Updated global store with ${favoriteIds.length} favorites:`, favoriteIds);
        
        // Sync UI with updated global store
        setMatches((prev) => syncWithFavoriteUpdates(prev));
        setTodayDishes((prev) => syncWithFavoriteUpdates(prev));
      }
    } catch (err) {
      console.log("Failed to fetch favorites:", err);
    }
  }, [token, setAllFavorites, syncWithFavoriteUpdates]);

  // ✅ Refresh when screen comes into focus (fetch latest favorites + sync)
  useFocusEffect(
    useCallback(() => {
      console.log("🔄 [Index] Screen focused - fetching latest favorites");
      fetchUserFavorites(); // Fetch from API to sync global store
    }, [fetchUserFavorites])
  );

  // ✅ Toggle favorite (optimistic UI + sync global store)
  const toggleFavorite = useCallback(
    async (dishId: number | string) => { // ✅ Accept both types
      try {
        const currentToken = useAuthStore.getState().token;
        if (!currentToken) {
          Alert.alert("Thông báo", "Vui lòng đăng nhập để sử dụng tính năng này");
          router.push("/login");
          return;
        }

        const dishStringId = String(dishId); // ✅ Convert to string for consistency

        // Get current favorite status
        const currentDish = [...matches, ...todayDishes].find((d) => String(d.id) === dishStringId);
        const newFavoriteStatus = !currentDish?.isFavorite;

        console.log(`🎯 [Index] Toggling favorite for dish ${dishStringId}: ${currentDish?.isFavorite} → ${newFavoriteStatus}`);

        // Optimistic update
        setMatches((prev) =>
          prev.map((dish) => (String(dish.id) === dishStringId ? { ...dish, isFavorite: newFavoriteStatus } : dish))
        );
        setTodayDishes((prev) =>
          prev.map((dish) => (String(dish.id) === dishStringId ? { ...dish, isFavorite: newFavoriteStatus } : dish))
        );

        // Update global store with string key
        updateFavoriteStatus(dishStringId, newFavoriteStatus);
        console.log(`📝 [Index] Updated global store: dish ${dishStringId} = ${newFavoriteStatus}`);

        // Call API
        const response = await fetch(`${API_URL}/dishes/${dishStringId}/toggle-favorite`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${currentToken}`,
          },
        });

        if (!response.ok) {
          // Revert optimistic update on error
          setMatches((prev) =>
            prev.map((dish) => (String(dish.id) === dishStringId ? { ...dish, isFavorite: !newFavoriteStatus } : dish))
          );
          setTodayDishes((prev) =>
            prev.map((dish) => (String(dish.id) === dishStringId ? { ...dish, isFavorite: !newFavoriteStatus } : dish))
          );
          updateFavoriteStatus(dishStringId, !newFavoriteStatus);
          throw new Error("Failed to toggle favorite");
        }

        console.log(`✅ [Index] Successfully toggled favorite for dish ${dishStringId}`);
      } catch (err: any) {
        console.error("❌ [Index] Error toggling favorite:", err);
        Alert.alert("Lỗi", "Không thể cập nhật trạng thái yêu thích");
      }
    },
    [router, matches, todayDishes, updateFavoriteStatus]
  );

  // ✅ Handle dish press: navigate to detail (view logging handled by detail screen)
  const handleDishPress = useCallback(
    async (dish: Dish) => {
      router.push(`/detail?id=${dish.id}`);
    },
    [router]
  );

  // ✅ Initial data fetch
  useEffect(() => {
    fetchSuggestions();
  }, [fetchSuggestions]);

  // ✅ Pull to refresh handler
  const onRefresh = useCallback(() => {
    fetchSuggestions(true);
  }, [fetchSuggestions]);

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: "#f5b402", dark: "#f5b402" }}
      includeBottomTab={true}
      headerImage={<Image source={require("@/assets/images/logo.png")} style={styles.reactLogo} />}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
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