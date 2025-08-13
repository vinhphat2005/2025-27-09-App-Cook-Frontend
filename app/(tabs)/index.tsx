import { Image } from "expo-image";
import { StyleSheet, Text, View, Alert } from "react-native";
import ParallaxScrollView from "@/components/ParallaxScrollView";
import { ProductList } from "@/components/Profile/ProductList";
import { SearchBox } from "@/components/Search/SearchBox";
import { mockDishes1 } from "@/constants/mock-data";
import { useRouter } from "expo-router";
import { useAuthStore } from "@/store/authStore";
import { useFavoriteStore } from "@/store/favoriteStore";
import { useEffect, useState, useCallback } from "react";
import type { Dish } from "@/types";
import { fetchTodaySuggestions } from "@/lib/api";
import { updateDishesWithFavoriteStatus } from "@/lib/favoriteUtils";
import { useFocusEffect } from "@react-navigation/native";

// --- ENV / API ---
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8000";

// --- SIMPLE IN-FILE CACHE (TTL) cho "matches" ---
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

  // Đồng bộ trạng thái yêu thích từ global store vào danh sách hiện tại
  const syncWithFavoriteUpdates = useCallback(
    (dishes: Dish[]) => {
      return dishes.map((dish) => {
        const globalStatus = getFavoriteStatus(dish.id);
        return globalStatus !== undefined ? { ...dish, isFavorite: globalStatus } : dish;
      });
    },
    [getFavoriteStatus]
  );

  // Fetch gợi ý + đồng bộ yêu thích + cache
  const fetchSuggestions = useCallback(async () => {
    try {
      setLoading(true);

      // 1) Dùng cache cho "matches" nếu còn hạn -> hiển thị nhanh
      const now = Date.now();
      if (_cachedMatches.length && now - _cachedAt < MATCHES_TTL_MS) {
        setMatches(syncWithFavoriteUpdates(_cachedMatches));
      }

      // 2) Luôn fetch mới để cập nhật
      const matchData = await fetchTodaySuggestions({ userId: "1" });

      // chuẩn hoá danh sách "today" từ mock + mặc định isFavorite=false
      const transformedTodayDishes = mockDishes1.map((dish) => ({
        ...dish,
        isFavorite: false,
      }));

      if (token) {
        const [updatedMatches, updatedTodayDishes] = await Promise.all([
          updateDishesWithFavoriteStatus(matchData),
          updateDishesWithFavoriteStatus(transformedTodayDishes),
        ]);

        const syncedMatches = syncWithFavoriteUpdates(updatedMatches);
        const syncedToday = syncWithFavoriteUpdates(updatedTodayDishes);

        setMatches(syncedMatches);
        setTodayDishes(syncedToday);

        // 3) Cập nhật cache từ dữ liệu mới nhất (không nên cache theo user)
        _cachedMatches = updatedMatches;
        _cachedAt = Date.now();
      } else {
        // Chưa đăng nhập: giữ isFavorite=false
        const anonymousMatches = matchData.map((d) => ({ ...d, isFavorite: false }));
        setMatches(syncWithFavoriteUpdates(anonymousMatches));
        setTodayDishes(transformedTodayDishes);

        // Cập nhật cache
        _cachedMatches = anonymousMatches;
        _cachedAt = Date.now();
      }
    } catch (err) {
      console.error("Error fetching suggestions:", err);
    } finally {
      setLoading(false);
    }
  }, [token, syncWithFavoriteUpdates]);

  // Sync UI khi favoriteUpdates đổi
  useEffect(() => {
    if (Object.keys(favoriteUpdates).length > 0) {
      setMatches((prev) => syncWithFavoriteUpdates(prev));
      setTodayDishes((prev) => syncWithFavoriteUpdates(prev));
    }
  }, [favoriteUpdates, syncWithFavoriteUpdates]);

  // Refresh khi màn hình focus (đảm bảo đồng bộ yêu thích mới nhất)
  useFocusEffect(
    useCallback(() => {
      setMatches((prev) => syncWithFavoriteUpdates(prev));
      setTodayDishes((prev) => syncWithFavoriteUpdates(prev));
    }, [syncWithFavoriteUpdates])
  );

  // Toggle favorite (optimistic UI + đồng bộ global store)
  const toggleFavorite = useCallback(
    async (dishId: number) => {
      try {
        const currentToken = useAuthStore.getState().token;
        if (!currentToken) {
          Alert.alert("Thông báo", "Vui lòng đăng nhập để sử dụng tính năng này");
          router.push("/login");
          return;
        }

        // Lấy trạng thái hiện tại
        const currentDish = [...matches, ...todayDishes].find((d) => d.id === dishId);
        const newFavoriteStatus = !currentDish?.isFavorite;

        // Optimistic update
        setMatches((prev) =>
          prev.map((dish) => (dish.id === dishId ? { ...dish, isFavorite: newFavoriteStatus } : dish))
        );
        setTodayDishes((prev) =>
          prev.map((dish) => (dish.id === dishId ? { ...dish, isFavorite: newFavoriteStatus } : dish))
        );

        // Cập nhật global store
        updateFavoriteStatus(dishId, newFavoriteStatus);

        // Gọi API
        const response = await fetch(`${API_URL}/dishes/${dishId}/toggle-favorite`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${currentToken}`,
          },
        });

        if (!response.ok) {
          // Revert optimistic khi lỗi
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

  // Khi bấm vào món: log lịch sử xem (nếu đã đăng nhập), sau đó điều hướng
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
