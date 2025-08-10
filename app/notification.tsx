import { AuthGuard } from "@/components/AuthGuard";
import { GroupNotification } from "@/components/Notification/GroupNotification";
import { mockNotifies } from "@/constants/mock-data";
import { Notify } from "@/types";
import { useEffect, useState } from "react";
import { ScrollView, StatusBar, StyleSheet } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

export default function NotificationScreen() {
  const [notifies, setNotifies] = useState<Notify[]>([]);

  useEffect(() => {
    setNotifies(mockNotifies);
  }, []);

  return (
    <AuthGuard>
      <SafeAreaProvider>
        <SafeAreaView style={styles.container} edges={["top"]}>
          <ScrollView contentContainerStyle={styles.scrollView}>
            <GroupNotification label="Hôm nay" notifications={notifies} />
            <GroupNotification label="Hôm qua" notifications={notifies} />
          </ScrollView>
        </SafeAreaView>
      </SafeAreaProvider>
    </AuthGuard>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: StatusBar.currentHeight,
  },
  scrollView: {
    paddingTop: 20,
    paddingLeft: 20,
  },
});
