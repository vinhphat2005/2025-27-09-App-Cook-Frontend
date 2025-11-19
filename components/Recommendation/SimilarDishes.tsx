// components/Recommendations/SimilarDishes.tsx
import { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import ProductCard from "@/components/Profile/ProductCard";
import { fetchSimilarDishes } from "@/lib/recommendationApi";
import { updateDishesWithFavoriteStatus } from "@/lib/favoriteUtils";
import { useFavoriteStore } from "@/store/favoriteStore";
import { useAuthStore } from "@/store/authStore";
import type { Dish } from "@/types/dish";

interface SimilarDishesProps {
  dishId: string | number;
  onDishPress: (dish: Dish) => void;
  onPressFavorite: (dishId: string | number) => void;
  limit?: number;
}

export function SimilarDishes({
  dishId,
  onDishPress,
  onPressFavorite,
  limit = 6,
}: SimilarDishesProps) {
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { token } = useAuthStore();
  const { getFavoriteStatus, favoriteUpdates } = useFavoriteStore();

  // Sync with favorite updates
  const syncWithFavorites = (dishList: Dish[]) => {
    return dishList.map((dish) => {
      const globalStatus = getFavoriteStatus(String(dish.id));
      return globalStatus !== undefined
        ? { ...dish, isFavorite: globalStatus }
        : dish;
    });
  };

  useEffect(() => {
    const loadSimilarDishes = async () => {
      try {
        setLoading(true);
        setError(null);

        const similarDishes = await fetchSimilarDishes(dishId, limit);

        // Update favorite status if logged in
        let updatedDishes = similarDishes;
        if (token) {
          updatedDishes = await updateDishesWithFavoriteStatus(similarDishes);
        }

        setDishes(syncWithFavorites(updatedDishes));
      } catch (err) {
        console.error("Error loading similar dishes:", err);
        setError("Không thể tải món ăn tương tự");
      } finally {
        setLoading(false);
      }
    };

    loadSimilarDishes();
  }, [dishId, limit, token]);

  // Sync when favorites change
  useEffect(() => {
    if (Object.keys(favoriteUpdates).length > 0) {
      setDishes((prev) => syncWithFavorites(prev));
    }
  }, [favoriteUpdates]);

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>🔗 Món ăn tương tự</Text>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#f5b402" />
        </View>
      </View>
    );
  }

  if (error || dishes.length === 0) {
    return null; // Don't show section if no similar dishes
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🔗 Món ăn tương tự</Text>
      <Text style={styles.subtitle}>Có thể bạn cũng thích</Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {dishes.map((dish) => (
          <View key={dish.id} style={styles.cardWrapper}>
            <ProductCard
              dish={dish}
              onPress={() => onDishPress(dish)}
              onPressFavorite={onPressFavorite}
              width={160}
            />
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
    paddingHorizontal: 16,
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  loadingContainer: {
    height: 240,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  cardWrapper: {
    marginRight: 12,
  },
});