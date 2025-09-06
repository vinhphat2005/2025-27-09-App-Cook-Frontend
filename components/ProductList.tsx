import { Dish } from "@/types/dish"; // ✅ Use dish.ts instead of index.ts
import { Image } from "expo-image";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

type Props = {
  title: string;
  dishes: Dish[];
  onPress?: (dish: Dish) => void;
};

export const ProductList = ({ title, dishes, onPress }: Props) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>

      <View style={{ height: 180 }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={true}
          contentContainerStyle={{ paddingLeft: 8, paddingRight: 8 }}
        >
          {dishes.map((dish, idx) => (
            <Pressable
              key={idx}
              style={styles.card}
              onPress={() => onPress?.(dish)}
            >
              <View style={styles.imageContainer}>
                <Image source={{ uri: dish.image }} style={styles.image} />
              </View>
              <Text style={styles.label}>{dish.label}</Text>
              <Text style={styles.time}>{dish.time}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "white"
  },
  title: {
    fontSize: 24,
    marginBottom: 10,
    textAlign: "center"
  },
  card: {
    position: "relative",
    width: 140,
    marginRight: 16,
    padding: 10,
    borderRadius: 12,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2
  },
  imageContainer: {
    width: 120,
    height: 90,
    borderRadius: 10,
    overflow: "hidden",
    marginBottom: 8,
    backgroundColor: "#eee"
  },
  image: {
    width: "100%",
    height: "100%",
    objectFit: "cover"
  },
  label: {
    fontWeight: "bold",
    fontSize: 16,
    marginBottom: 4
  },
  time: {
    color: "#888",
    position: "absolute",
    bottom: 10,
    left: 10,
    right: 10
  }
});
