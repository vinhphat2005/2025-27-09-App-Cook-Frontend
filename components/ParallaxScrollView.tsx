import type { PropsWithChildren, ReactElement } from "react";
import { Pressable, StyleSheet, Text, View, Platform } from "react-native";
import Animated, {
  interpolate,
  useAnimatedRef,
  useAnimatedStyle,
  useScrollViewOffset,
} from "react-native-reanimated";
import Ionicons from "@expo/vector-icons/Feather";
import { ThemedView } from "@/components/ThemedView";
import { useBottomTabOverflow } from "@/components/ui/TabBarBackground";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useNavigation, useRouter } from "expo-router";
import { Notification } from "./Notification/Notification";
import type { RefreshControlProps } from "react-native";
import { isWeb } from "@/styles/responsive";
type Props = PropsWithChildren<{
  headerImage: ReactElement;
  headerBackgroundColor: { dark: string; light: string };
  headerHeight?: number;
  includeBottomTab?: boolean;
  showBackButton?: boolean;
  refreshControl?: React.ReactElement<RefreshControlProps>;
}>;

export default function ParallaxScrollView({
  children,
  headerImage,
  headerBackgroundColor,
  headerHeight = 250,
  includeBottomTab = false,
  showBackButton = false,
  refreshControl,
}: Props) {
  const router = useRouter();
  const navigation = useNavigation();
  const colorScheme = useColorScheme() ?? "light";
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const scrollOffset = useScrollViewOffset(scrollRef);
  const bottom = useBottomTabOverflow(includeBottomTab);
  const headerAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateY: interpolate(
            scrollOffset.value,
            [-headerHeight, 0, headerHeight],
            [-headerHeight / 2, 0, headerHeight * 0.75]
          ),
        },
        {
          scale: interpolate(
            scrollOffset.value,
            [-headerHeight, 0, headerHeight],
            [2, 1, 1]
          ),
        },
      ],
    };
  });

  return (
    <ThemedView style={styles.container}>
      {showBackButton && (
        <Pressable
          onPress={() => {
            console.log('🔙 Back button pressed');
            if (isWeb) {
              // On web, use router
              if (router.canGoBack()) {
                router.back();
              } else {
                router.push('/(tabs)');
              }
            } else {
              // On mobile, use navigation
              if (navigation.canGoBack()) {
                navigation.goBack();
              } else {
                router.push('/(tabs)');
              }
            }
          }}
          style={styles.backButton}
        >
          <Ionicons name="arrow-left" size={24} color="#fff" />
        </Pressable>
      )}

      <Pressable
        onPress={() => {
          router.push("/notification");
        }}
        style={styles.notificationIcon}
      >
        <Ionicons name="bell" size={30} color="green" />
      </Pressable>

      <Animated.ScrollView
        ref={scrollRef}
        scrollEventThrottle={16}
        scrollIndicatorInsets={{ bottom }}
        contentContainerStyle={{ paddingBottom: bottom }}
        refreshControl={refreshControl}
      >
        <Animated.View
          style={[
            styles.header,
            { height: headerHeight },
            { backgroundColor: headerBackgroundColor[colorScheme] },
            headerAnimatedStyle,
          ]}
        >
          {headerImage}
        </Animated.View>

        <View style={styles.content}>{children}</View>
      </Animated.ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
    flex: 1,
  },
  header: {
    overflow: "hidden",
  },
  content: {
    flex: 1,
    padding: 32,
    gap: 16,
    position: "relative",
    top: -50,
    overflow: "hidden",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: "100%",
    backgroundColor: "white",
  },
  backButton: {
    position: "absolute",
    top: isWeb ? 20 : 40,
    left: isWeb ? 20 : 16,
    zIndex: 10,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 20,
    padding: isWeb ? 10 : 8,
    width: isWeb ? 44 : 40,
    height: isWeb ? 44 : 40,
    justifyContent: 'center',
    alignItems: 'center',
    ...(isWeb && {
      cursor: 'pointer' as any,
    }),
  },
  notificationIcon: {
    position: "absolute",
    top: 45,
    right: 16,
    zIndex: 10,
  },
});