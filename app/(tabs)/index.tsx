import { Image } from "expo-image";
import { StyleSheet, Text, View } from "react-native";

import ParallaxScrollView from "@/components/ParallaxScrollView";
import { ProductList } from "@/components/ProductList";
import { SearchBox } from "@/components/Search/SearchBox";
import { mockDishes1 } from "@/constants/mock-data";
import { useRouter } from "expo-router";


import { useEffect, useState } from "react";
import type { Dish } from "@/types";
import { fetchTodaySuggestions } from "@/lib/api";



export default function HomeScreen() {
  const router = useRouter();
  const [matches, setMatches] = useState<Dish[]>([]); // ADD: dữ liệu "Gợi ý món phù hợp"
  useEffect(() => {
  (async () => {
    try {
      const data = await fetchTodaySuggestions({ userId: "1" });
      setMatches(data); // đây mới là chỗ "lưu" vào matches
    } catch (err) {
      console.error(err);
    }
  })();
}, []);
  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: "#f5b402", dark: "#f5b402" }}
      includeBottomTab={true}
      headerImage={
        <Image
          source={require("@/assets/images/logo.png")}
          style={styles.reactLogo}
        />
      }
    >
      <Text style={styles.title}>Nhập nguyên liệu bạn có:</Text>
      
      <SearchBox />

      <View style={styles.productListContainer}>
        <ProductList
          title="Gợi ý món phù hợp"
          dishes={matches}
          onPress={(dish) => {
            router.push(`/detail?id=${dish.id}`);
          }}
        />
      </View>

      <View style={styles.productListContainer}>
        <ProductList
          title="Gợi ý món ăn hôm nay"
          dishes={mockDishes1}
          onPress={(dish) => {
            router.push(`/detail?id=${dish.id}`);
          }}
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
    position: "absolute"
  },
  title: {
    fontSize: 32
  },
  productListContainer: {
    marginTop: 20
  }
});