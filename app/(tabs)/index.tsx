import { Image } from "expo-image";
import { Button, StyleSheet, Text, TextInput, View } from "react-native";

import ParallaxScrollView from "@/components/ParallaxScrollView";
import { ProductList } from "@/components/ProductList";
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
      {/* multiline text input */}
      <TextInput multiline numberOfLines={4} style={styles.input} />

      <View style={styles.buttonContainer}>
        <View style={styles.searchButton}>
          <Button color="black" title="Tìm kiếm" onPress={() => {}} />
        </View>
      </View>

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
  input: {
    borderWidth: 1,
    borderColor: "gray",
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
    height: 60
  },
  searchButton: {
    alignItems: "center",
    backgroundColor: "#f5a002",
    fontWeight: "bold",
    color: "white",
    borderRadius: 10,
    paddingLeft: 20,
    paddingRight: 20
  },
  buttonContainer: {
    alignItems: "center"
  },
  productListContainer: {
    marginTop: 20
  }
});
