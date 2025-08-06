import { Dish } from "@/types";
import { StyleSheet, View } from "react-native";
import { ProductCard } from "../Recipe/ProductCard";

type Props = {
  dishes: Dish[];
  onPressFavorite: (id: number) => void;
  onPress: (id: number) => void;
};

export const ProductList = ({ dishes, onPressFavorite, onPress }: Props) => {
  return (
    <View style={styles.dishList}>
      {dishes.map((dish) => (
        <ProductCard
          key={dish.id}
          dish={dish}
          itemsPerRow={2}
          onPress={() => onPress(dish.id)}
          onPressFavorite={onPressFavorite}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  dishList: {
    marginTop: 20,
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 5
  }
});
