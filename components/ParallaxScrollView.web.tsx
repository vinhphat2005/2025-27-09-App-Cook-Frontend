// components/ParallaxScrollView.web.tsx - Web version without animations
import type { PropsWithChildren, ReactElement } from 'react';
import { StyleSheet, ScrollView, View, Pressable } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Feather';
import type { RefreshControlProps } from 'react-native';

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
  showBackButton = false,
  refreshControl,
}: Props) {
  const router = useRouter();

  return (
    <ThemedView style={styles.container}>
      {/* Back Button */}
      {showBackButton && (
        <Pressable
          onPress={() => {
            console.log('🔙 Back button pressed (web)');
            if (router.canGoBack()) {
              router.back();
            } else {
              router.push('/(tabs)');
            }
          }}
          style={styles.backButton}
        >
          <Ionicons name="arrow-left" size={24} color="#fff" />
        </Pressable>
      )}

      <ScrollView refreshControl={refreshControl}>
        {/* Static header for web */}
        <View style={[styles.header, { height: headerHeight, backgroundColor: headerBackgroundColor.light }]}>
          {headerImage}
        </View>
        <ThemedView style={styles.content}>{children}</ThemedView>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  header: {
    height: 250,
    overflow: 'hidden',
  },
  content: {
    flex: 1,
    padding: 32,
    gap: 16,
    overflow: 'hidden',
    backgroundColor: 'white',
    marginTop: -50,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  backButton: {
    position: 'absolute',
    top: 20,
    left: 20,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: 10,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    cursor: 'pointer',
  },
});
