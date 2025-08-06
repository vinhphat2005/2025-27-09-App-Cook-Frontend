import { Image } from "expo-image";
import { StyleSheet, View } from "react-native";

type Props = {
  size: number;
  image: string;
};

export const Avatar = ({ size, image }: Props) => {
  return (
    <View>
      <Image
        source={{ uri: image }}
        style={[styles.container, { width: size, height: size }]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 100,
    height: 100,
    borderRadius: "50%"
  }
});
