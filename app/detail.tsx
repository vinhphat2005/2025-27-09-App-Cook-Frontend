import { StyleSheet, Text, View } from "react-native";

import { AuthGuard } from "@/components/AuthGuard";
import ParallaxScrollView from "@/components/ParallaxScrollView";
import { mockDishes1 } from "@/constants/mock-data";
import { Dish } from "@/types";
import { Image } from "expo-image";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";

export default function TabTwoScreen() {
  const { id } = useLocalSearchParams();
  const [dishData, setDishData] = useState<Dish | null>(null);

  useEffect(() => {
    try {
      const dishData = mockDishes1.find((dish) => dish.id === Number(id));
      setDishData(dishData ?? null);
    } catch (error) {
      console.error(error);
    }
  }, []);

  return (
    <AuthGuard>
      <ParallaxScrollView
        showBackButton
        headerHeight={320}
        includeBottomTab={false}
        headerBackgroundColor={{ light: "#D0D0D0", dark: "#353636" }}
        headerImage={
          <Image source={{ uri: dishData?.image }} style={styles.headerImage} />
        }
      >
        <Text style={styles.title}>{dishData?.label}</Text>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 8
          }}
        >
          <Text style={{ fontSize: 18, marginRight: 6 }}>🕒</Text>
          <Text style={{ fontSize: 16 }}>{dishData?.time}</Text>
        </View>

        <Text style={styles.title}>Nguyên liệu</Text>
        <View>
          {dishData?.ingredients?.map((ingredient, index) => (
            <Text key={index} style={styles.ingredient}>
              <Text style={{ marginRight: 8 }}>•</Text> {ingredient}
            </Text>
          ))}
        </View>

        <Text style={styles.title}>Cách nấu</Text>
        <View>
          {dishData?.steps?.map((step, index) => (
            <Text key={index} style={styles.step}>
              <Text style={{ marginRight: 8 }}>{index + 1}.</Text> {step}
            </Text>
          ))}
        </View>
      </ParallaxScrollView>
    </AuthGuard>
  );
}

const styles = StyleSheet.create({
  headerImage: {
    position: "absolute",
    width: "100%",
    height: "100%",
    borderRadius: 20,
    resizeMode: "cover",
    backgroundColor: "white"
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginTop: 20
  },
  time: {
    fontSize: 16,
    marginTop: 10
  },
  ingredient: {
    fontSize: 16,
    marginBottom: 8
  },
  step: {
    fontSize: 16,
    marginBottom: 8
  }
});
