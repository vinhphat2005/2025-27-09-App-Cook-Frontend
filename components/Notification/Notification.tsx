import { Notify } from "@/types";
import { Image, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Feather";

const unreadColor = "#D46A6A";

type Props = {
  notify: Notify;
};

export const Notification = ({ notify }: Props) => {
  return (
    <View style={styles.container}>
      <View
        style={[
          styles.contentContainer,
          {
            borderColor: !notify.isRead ? unreadColor : "transparent",
          },
        ]}
      >
        <View style={styles.aboveContent}>
          <Text style={styles.username}>{notify.user.name}</Text>
          <View style={styles.timeContainer}>
            {!notify.isRead && (
              <Ionicons name="bell" size={15} color={unreadColor} />
            )}
            <Text style={styles.time}>{notify.time}</Text>
          </View>
        </View>

        <View style={styles.belowContent}>
          <Text style={styles.notifyBody}>{notify.content}</Text>
        </View>
      </View>

      <View style={styles.avatarContainer}>
        <Image style={styles.avatar} src={notify.user.avatar} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "relative",
    backgroundColor: "white",
    marginBottom: 5,
    paddingLeft: 25,
  },
  avatarContainer: {
    position: "absolute",
    top: "50%",
    left: 25,
    transform: [{ translateY: "-50%" }, { translateX: "-50%" }],
    zIndex: 1,
  },
  contentContainer: {
    flexDirection: "column",
    gap: 10,
    borderWidth: 2,
    borderRightWidth: 0,
    borderTopLeftRadius: 25,
    borderBottomLeftRadius: 25,
    paddingVertical: 20,
    paddingLeft: 30,
    paddingRight: 10,
  },
  timeContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 8,
    width: 120,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: "50%",
  },
  username: {
    fontWeight: "bold",
    fontSize: 16,
  },
  time: {},
  aboveContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingRight: 10,
  },
  belowContent: {
    paddingRight: 10,
  },
  notifyBody: {
    textAlign: "justify",
  },
});
