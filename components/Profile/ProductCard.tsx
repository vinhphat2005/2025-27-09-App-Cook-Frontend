// components/Profile/ProductCard.tsx
import React from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Dish } from "@/types/dish";
import { getDifficultyDisplay } from "@/types/dish";

const screenWidth = Dimensions.get("window").width;

type Props = {
  dish: Dish;
  onPress: () => void;
  onPressFavorite: (dishId: string | number) => void;
  width?: number;
};

export function ProductCard({ dish, onPress, onPressFavorite, width }: Props) {
  const cardWidth = width || screenWidth * 0.45;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.9}
      style={[styles.card, { width: cardWidth }]}
    >
      {/* Ảnh món ăn */}
      <Image source={{ uri: dish.image }} style={styles.image} />

      {/* Nút yêu thích */}
      <TouchableOpacity
        style={styles.favoriteBtn}
        onPress={() => onPressFavorite(dish.id)}
        activeOpacity={0.7}
      >
        <Ionicons
          name={dish.isFavorite ? "heart" : "heart-outline"}
          size={20}
          color={dish.isFavorite ? "#e63946" : "#666"}
        />
      </TouchableOpacity>

      {/* Thông tin món */}
      <View style={styles.infoContainer}>
        <Text numberOfLines={1} style={styles.label}>
          {dish.label}
        </Text>

        <View style={styles.row}>
          <Ionicons name="time-outline" size={14} color="#555" />
          <Text style={styles.timeText}>{dish.time}</Text>
        </View>

        <View style={styles.row}>
          <Ionicons name="barbell-outline" size={14} color="#555" />
          <Text style={styles.levelText}>
            {getDifficultyDisplay(dish.level)}
          </Text>
        </View>

        {dish.star !== undefined && (
          <View style={styles.starRow}>
            {Array.from({ length: 5 }).map((_, i) => (
              <Ionicons
                key={i}
                name={i < Math.round(dish.star || 0) ? "star" : "star-outline"}
                size={14}
                color="#f1c40f"
              />
            ))}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 8,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
  },
  image: {
    width: "100%",
    height: 120,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  favoriteBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(255,255,255,0.8)",
    borderRadius: 20,
    padding: 4,
  },
  infoContainer: {
    padding: 10,
    gap: 4,
  },
  label: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  timeText: {
    fontSize: 13,
    color: "#555",
  },
  levelText: {
    fontSize: 13,
    color: "#777",
  },
  starRow: {
    flexDirection: "row",
    marginTop: 4,
  },
});

export default ProductCard;
