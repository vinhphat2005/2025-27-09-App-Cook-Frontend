import { AuthGuard } from "@/components/AuthGuard";
import { Notification } from "@/components/Notification/Notification";
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
            {notifies.map((notify) => (
              <Notification key={notify.id} notify={notify} />
            ))}
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
    gap: 10,
    paddingLeft: 40,
  },
});
