import { Dish } from "@/types/dish"; // ✅ Use dish.ts instead of index.ts
import AntDesign from "@expo/vector-icons/AntDesign";
import { Image } from "expo-image";
import { Pressable, StyleSheet, Text, View, ActivityIndicator } from "react-native";

type Props = {
  dish: Dish;
  itemsPerRow?: number;
  onPress: (dish: Dish) => void;
  onPressFavorite: (id: number) => void;
  isFavoriteLoading?: boolean; // New prop for loading state
};

export const ProductCard = ({
  dish,
  itemsPerRow = 2,
  onPress,
  onPressFavorite,
  isFavoriteLoading = false,
}: Props) => {
  // Safeguard for dish data
  if (!dish || !dish.id) {
    return null;
  }

  const getLevelColor = (level?: string) => {
    switch (level) {
      case "easy": return "#4CAF50";
      case "medium": return "#FF9800";
      case "hard": return "#F44336";
      default: return "#4CAF50";
    }
  };

  const getLevelText = (level?: string) => {
    switch (level) {
      case "easy": return "Dễ";
      case "medium": return "Trung bình";
      case "hard": return "Khó";
      default: return "Dễ";
    }
  };

  // Safe string conversion functions
  const getDishName = () => {
    if (typeof dish.label === 'string' && dish.label.trim()) {
      return dish.label;
    }
    return "Món ăn";
  };

  const getDishTime = () => {
    if (typeof dish.time === 'string' && dish.time.trim()) {
      return dish.time;
    }
    if (typeof dish.time === 'number' && dish.time > 0) {
      return dish.time + " phút";
    }
    return "0 phút";
  };

  const getDishRating = () => {
    const star = dish.star;
    if (typeof star === 'number' && star > 0 && !isNaN(star)) {
      return star.toFixed(1);
    }
    if (typeof star === 'string') {
      const parsed = parseFloat(star);
      if (!isNaN(parsed) && parsed > 0) {
        return parsed.toFixed(1);
      }
    }
    return null;
  };

  const dishName = getDishName();
  const dishTime = getDishTime();
  const dishRating = getDishRating();

  return (
    <View style={[styles.container, { width: `${100 / itemsPerRow}%` }]}>
      <Pressable
        style={styles.card}
        onPress={() => onPress(dish)}
        android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
      >
        {/* Image Section */}
        <View style={styles.imageContainer}>
          <Image 
            source={{ uri: dish.image || "https://via.placeholder.com/300" }} 
            style={styles.image}
            contentFit="cover"
            transition={300}
          />
          
          {/* Favorite Button */}
          <Pressable
            style={[
              styles.favoriteButton,
              isFavoriteLoading && styles.favoriteButtonLoading
            ]}
            onPress={(e) => {
              e.stopPropagation();
              if (!isFavoriteLoading) {
                onPressFavorite(dish.id);
              }
            }}
            disabled={isFavoriteLoading}
            android_ripple={{ 
              color: isFavoriteLoading ? 'transparent' : 'rgba(255,255,255,0.3)', 
              borderless: true 
            }}
          >
            {isFavoriteLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <AntDesign
                name={dish.isFavorite ? "heart" : "hearto"}
                size={20}
                color={dish.isFavorite ? "#FF4757" : "#fff"}
              />
            )}
          </Pressable>

          {/* Rating Badge - only show if rating exists */}
          {dishRating && (
            <View style={styles.ratingBadge}>
              <AntDesign name="star" size={12} color="#FFD700" />
              <Text style={styles.ratingText}>{dishRating}</Text>
            </View>
          )}
        </View>

        {/* Content Section */}
        <View style={styles.content}>
          <Text style={styles.title} numberOfLines={2}>
            {dishName}
          </Text>
          
          <View style={styles.details}>
            <View style={styles.timeContainer}>
              <AntDesign name="clockcircleo" size={14} color="#666" />
              <Text style={styles.timeText}>{dishTime}</Text>
            </View>
            
            <View style={[styles.levelBadge, { backgroundColor: getLevelColor(dish.level) }]}>
              <Text style={styles.levelText}>{getLevelText(dish.level)}</Text>
            </View>
          </View>
        </View>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 6,
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  imageContainer: {
    position: 'relative',
    height: 140,
  },
  image: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f0f0f0',
  },
  favoriteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  favoriteButtonLoading: {
    backgroundColor: 'rgba(0,0,0,0.7)', // Darker background when loading
  },
  ratingBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
    gap: 2,
  },
  ratingText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  content: {
    padding: 12,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    lineHeight: 20,
  },
  details: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  levelBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  levelText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '600',
  },
});