import { Notify } from "@/types";
import { StyleSheet, Text, View } from "react-native";

type Props = {
  notify: Notify;
};

export const Notification = ({ notify }: Props) => {
  return (
    <View>
      <Text>asd</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "white"
  }
});
