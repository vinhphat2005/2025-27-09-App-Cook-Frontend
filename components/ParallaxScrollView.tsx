import type { PropsWithChildren, ReactElement } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import Animated, {
  interpolate,
  useAnimatedRef,
  useAnimatedStyle,
  useScrollViewOffset
} from "react-native-reanimated";

import { ThemedView } from "@/components/ThemedView";
import { useBottomTabOverflow } from "@/components/ui/TabBarBackground";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useNavigation } from "expo-router";

// const HEADER_HEIGHT = 250;

type Props = PropsWithChildren<{
  headerImage: ReactElement;
  headerBackgroundColor: { dark: string; light: string };
  headerHeight?: number;
  includeBottomTab?: boolean;
  showBackButton?: boolean;
}>;

export default function ParallaxScrollView({
  children,
  headerImage,
  headerBackgroundColor,
  headerHeight = 250,
  includeBottomTab = false,
  showBackButton = false
}: Props) {
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
          )
        },
        {
          scale: interpolate(
            scrollOffset.value,
            [-headerHeight, 0, headerHeight],
            [2, 1, 1]
          )
        }
      ]
    };
  });

  return (
    <ThemedView style={styles.container}>
      {showBackButton && (
        <Pressable
          onPress={() => {
            if (typeof navigation !== "undefined" && navigation?.goBack) {
              navigation.goBack();
            } else if (typeof window !== "undefined" && window.history) {
              window.history.back();
            }
          }}
          style={styles.backButton}
        >
          <Text style={{ color: "#fff", fontSize: 22 }}>←</Text>
        </Pressable>
      )}
      <Animated.ScrollView
        ref={scrollRef}
        scrollEventThrottle={16}
        scrollIndicatorInsets={{ bottom }}
        contentContainerStyle={{ paddingBottom: bottom }}
      >
        <Animated.View
          style={[
            styles.header,
            { height: headerHeight },
            { backgroundColor: headerBackgroundColor[colorScheme] },
            headerAnimatedStyle
          ]}
        >
          {headerImage}
        </Animated.View>

        <ThemedView style={styles.content}>{children}</ThemedView>
      </Animated.ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
    flex: 1
  },
  header: {
    overflow: "hidden"
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
    height: "100%"
  },
  backButton: {
    position: "absolute",
    top: 40,
    left: 16,
    zIndex: 10,
    backgroundColor: "rgba(0,0,0,0.4)",
    borderRadius: 20,
    padding: 8,
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center"
  }
});
