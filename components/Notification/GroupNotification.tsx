import { Notify } from "@/types";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Notification } from "@/components/Notification/Notification";

type Props = {
  label: string;
  notifications: Notify[];
  onClickClearAll?: () => {};
};

export const GroupNotification = ({
  label,
  notifications,
  onClickClearAll,
}: Props) => {
  return (
    <>
      <View style={styles.container}>
        <View style={styles.actionBar}>
          <Text style={styles.label}>{label}</Text>
          <Pressable onPress={onClickClearAll}>
            <Text style={styles.clearAllLabel}>Xem tất cả</Text>
          </Pressable>
        </View>

        <View>
          {notifications.map((n) => {
            return <Notification notify={n} key={n.id} />;
          })}
        </View>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 10,
  },
  actionBar: {
    paddingRight: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  label: {
    fontSize: 20,
  },
  clearAllLabel: {
    fontSize: 20,
    fontWeight: "600",
    textDecorationLine: "underline",
    color: "#FF5858",
    opacity: 0.5,
  },
});
