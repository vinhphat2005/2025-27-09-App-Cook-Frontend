import { Image } from "expo-image";
import { StyleSheet, Text, View } from "react-native";

import ParallaxScrollView from "@/components/ParallaxScrollView";
import { ProductList } from "@/components/ProductList";
import { SearchBox } from "@/components/Search/SearchBox";
import { mockDishes1 } from "@/constants/mock-data";
import { useRouter } from "expo-router";

export default function HomeScreen() {
  const router = useRouter();

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
          dishes={mockDishes1}
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