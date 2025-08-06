import ParallaxScrollView from "@/components/ParallaxScrollView";
import { ProductCard } from "@/components/Recipe/ProductCard";
import { mockDishes1 } from "@/constants/mock-data";
import AntDesign from "@expo/vector-icons/AntDesign";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

export default function RecipeScreen() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [filteredDishes, setFilteredDishes] = useState(mockDishes1);

  const onPressFavorite = (id: number) => {
    console.log("onPressFavorite", id);
  };

  useEffect(() => {
    setFilteredDishes(
      mockDishes1.filter((dish) =>
        dish.label.toLowerCase().includes(search.toLocaleLowerCase())
      )
    );
  }, [search]);

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
      <Text style={styles.title}>Công thức của tôi</Text>

      <View style={styles.searchContainer}>
        <View style={styles.searchIconContainer}>
          <AntDesign name="search1" size={24} color="black" />
        </View>
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm kiếm"
          placeholderTextColor="gray"
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <Pressable
            onPress={() => setSearch("")}
            style={styles.searchClearButton}
            hitSlop={10}
          >
            <Text style={{ fontSize: 18, color: "red" }}>✕</Text>
          </Pressable>
        )}
      </View>

      {/* Render list mockDishes1 */}
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
    position: "absolute"
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#dd3300"
  },
  searchInput: {
    flex: 1,

    borderRadius: 10,
    padding: 10,
    backgroundColor: "white"
  },
  searchContainer: {
    position: "relative",
    width: "100%",
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    borderWidth: 1,
    borderColor: "gray",
    borderRadius: 30,
    overflow: "hidden"
  },
  searchClearButton: {
    position: "absolute",
    right: 10,
    top: "50%",
    transform: [{ translateY: -7 }],
    padding: 4,
    zIndex: 10
  },
  searchIconContainer: {
    padding: 4
  },
  dishList: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 5
  }
});
