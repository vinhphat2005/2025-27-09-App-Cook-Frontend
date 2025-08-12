import ParallaxScrollView from "@/components/ParallaxScrollView";
import { ProductCard } from "@/components/Recipe/ProductCard";
import { mockDishes1 } from "@/constants/mock-data";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

export default function FavoriteScreen() {
  const router = useRouter();
  const [filteredDishes, setFilteredDishes] = useState(mockDishes1);
  const onPressFavorite = () => {};
  useEffect(() => {
    setFilteredDishes(
      mockDishes1.filter((dish) => {
        return dish.isFavorite == true;
      })
    );
  }, []);
  return (
    <ParallaxScrollView
      headerHeight={100}
      headerBackgroundColor={{ light: "#f5b402", dark: "#f5b402" }}
      includeBottomTab={true}
      headerImage={
        <Image
          source={require("@/assets/images/logo.png")}
          style={styles.reactLogo}
        />
      }
    >
      <Text style={styles.title}>Món ăn đã Thích</Text>

      <View style={styles.dishList}>
        {filteredDishes.map((dish) => (
          <ProductCard
            key={dish.id}
            dish={dish}
            itemsPerRow={2}
            onPress={() => router.push(`/detail?id=${dish.id}`)}
            onPressFavorite={onPressFavorite}
          />
        ))}
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
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#dd3300",
  },
  dishList: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 5,
  },
});
