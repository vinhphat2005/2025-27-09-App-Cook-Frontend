import { Dish } from "@/types";
import AntDesign from "@expo/vector-icons/AntDesign";
import { Image } from "expo-image";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

type Props = {
  dish: Dish;
  itemsPerRow?: number;
  onPress: (dish: Dish) => void;
  onPressFavorite: (id: number) => void;
};

export const ProductCard = ({
  dish,
  itemsPerRow = 1,
  onPress,
  onPressFavorite,
}: Props) => {
  return (
    <Pressable
      key={dish.id}
      style={[
        styles.dishContainer,
        {
          width: `${100 / itemsPerRow}%`,
          height: 200,
          paddingHorizontal: 5,
        },
      ]}
      onPress={() => onPress(dish)}
    >
      <Image source={{ uri: dish.image }} style={styles.dishImage} />

      <View style={styles.socialContainer}>
        <View style={styles.starContainer}>
          <AntDesign name="star" size={20} color="#fd3a41" />
          <Text style={styles.dishStarText}>{dish.star}</Text>
        </View>

        <Pressable onPress={() => onPressFavorite(dish.id)}>
          <AntDesign
            name={dish.isFavorite ? "heart" : "hearto"}
            size={24}
            color="#fd3a41"
          />
        </Pressable>
      </View>
      <View style={styles.dishInfo}>
        <Text style={styles.dishLabel}>{dish.label}</Text>
        <View style={styles.dishDescription}>
          <View style={styles.dishTimeContainer}>
            <AntDesign name="clockcircleo" size={16} color="black" />
            <Text style={styles.dishTime}>{dish.time}</Text>
          </View>
          <Text style={styles.dishLevel}>{dish.level}</Text>
        </View>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  dishContainer: {
    flexDirection: "column",
    position: "relative",
    alignItems: "center",
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 10,
  },
  dishImage: {
    width: "100%",
    height: 130,
    backgroundColor: "gray",
  },
  dishInfo: {
    flex: 1,
    flexDirection: "column",
    backgroundColor: "#e6e6e6",
    width: "100%",
    padding: 10,
  },
  dishLabel: {
    fontSize: 16,
    fontWeight: "bold",
  },
  dishTimeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  dishTime: {
    fontSize: 12,
    color: "gray",
  },
  dishLevel: {
    fontSize: 12,
    color: "gray",
  },
  socialContainer: {
    position: "absolute",
    left: 10,
    right: 10,
    top: 10,
    zIndex: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 10,
  },
  dishStarText: {
    fontSize: 16,
    color: "black",
  },
  starContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "white",
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
  dishDescription: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 15,
  },
});
