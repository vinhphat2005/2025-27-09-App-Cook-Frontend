import { Image, StyleSheet, Text, View } from "react-native";

export default function AddDish() {
  return (
    <View style={styles.container}>
      <Image style={styles.image}></Image>
      <Text style={styles.nameDish}>Tên món ăn</Text>
      <Text style={styles.nameDish}>Thành phần</Text>
      <Text style={styles.nameDish}>Công thức</Text>
      <Text style={styles.nameDish}>Thời gian nấu</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "column",
    backgroundColor: "white",
    marginBottom: 5,
    padding: 25,
    gap: 10,
  },
  image: {
    width: 50,
    height: 50,
  },
  nameDish: {
    fontSize: 30,
  },
});
