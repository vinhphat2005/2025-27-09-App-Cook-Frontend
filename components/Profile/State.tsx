import { StyleSheet, Text, View } from "react-native";

export const State = () => {
  return (
    <View style={styles.container}>
      <View style={[styles.stateItem, styles.border]}>
        <Text style={styles.stateItemText}>1tr</Text>
        <Text style={styles.stateItemText}>Followers</Text>
      </View>
      <View style={[styles.stateItem, styles.border]}>
        <Text style={styles.stateItemText}>100</Text>
        <Text style={styles.stateItemText}>Đã theo dõi</Text>
      </View>
      <View style={[styles.stateItem, styles.border]}>
        <Text style={styles.stateItemText}>100</Text>
        <Text style={styles.stateItemText}>Công thức</Text>
      </View>
      <View style={styles.stateItem}>
        <Text style={styles.stateItemText}>2tr</Text>
        <Text style={styles.stateItemText}>Likes</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#ff3131",
    padding: 15,
    borderRadius: 20,
    marginTop: 10
  },
  stateItem: {
    flex: 1,
    alignItems: "center"
  },
  border: {
    borderRightWidth: 1,
    borderColor: "white"
  },
  stateItemText: {
    fontSize: 12,
    color: "white",
    fontWeight: "bold",
    textAlign: "center"
  }
});
