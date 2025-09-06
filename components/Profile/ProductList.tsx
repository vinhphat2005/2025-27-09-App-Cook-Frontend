import { Dish } from "@/types/dish"; // ✅ Use dish.ts instead of index.ts
import { StyleSheet, View, Text, ActivityIndicator } from "react-native";
import { ProductCard } from "../Recipe/ProductCard";

type Props = {
  dishes: Dish[];
  onPressFavorite: (id: number) => void;
  onPress: (dish: Dish) => void;
  itemsPerRow?: number;
  loading?: boolean;
  emptyMessage?: string;
  emptySubMessage?: string;
};

export const ProductList = ({
  dishes,
  onPressFavorite,
  onPress,
  itemsPerRow = 2,
  loading = false,
  emptyMessage = "Không có món ăn nào",
  emptySubMessage = "Hãy thử tìm kiếm món ăn khác!",
}: Props) => {
  // Ensure dishes is always an array
  const safeDishes = Array.isArray(dishes) ? dishes : [];

  // Loading state
  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#f5b402" />
        <Text style={styles.loadingText}>Đang tải...</Text>
      </View>
    );
  }

  // Empty state
  if (safeDishes.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyText}>{emptyMessage}</Text>
        <Text style={styles.emptySubText}>{emptySubMessage}</Text>
      </View>
    );
  }

  // Success state with dishes
  return (
    <View style={styles.container}>
      <View style={styles.dishGrid}>
        {safeDishes.map((dish) => {
          if (!dish || typeof dish.id === "undefined") {
            return null;
          }
          return (
            <ProductCard
              key={`dish-${dish.id}`}
              dish={dish}
              itemsPerRow={itemsPerRow}
              onPress={onPress}
              onPressFavorite={onPressFavorite}
            />
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  dishGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 6,
    paddingTop: 8,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
    fontWeight: "500",
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#666",
    textAlign: "center",
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    lineHeight: 20,
  },
});