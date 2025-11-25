// styles/responsive.ts - Responsive utilities
import { Platform, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

export const isWeb = Platform.OS === 'web';
export const isMobile = Platform.OS === 'ios' || Platform.OS === 'android';

// Breakpoints
export const breakpoints = {
  mobile: 480,
  tablet: 768,
  desktop: 1024,
};

export const getResponsiveValue = <T,>(
  mobileValue: T,
  tabletValue: T,
  desktopValue: T
): T => {
  if (!isWeb) return mobileValue;
  
  if (width >= breakpoints.desktop) return desktopValue;
  if (width >= breakpoints.tablet) return tabletValue;
  return mobileValue;
};

export const responsive = {
  // Spacing
  spacing: {
    xs: getResponsiveValue(4, 6, 8),
    sm: getResponsiveValue(8, 12, 16),
    md: getResponsiveValue(16, 20, 24),
    lg: getResponsiveValue(24, 32, 40),
    xl: getResponsiveValue(32, 48, 64),
  },
  
  // Font sizes
  fontSize: {
    xs: getResponsiveValue(10, 11, 12),
    sm: getResponsiveValue(12, 13, 14),
    md: getResponsiveValue(14, 15, 16),
    lg: getResponsiveValue(16, 18, 20),
    xl: getResponsiveValue(20, 24, 28),
    xxl: getResponsiveValue(24, 32, 40),
  },
  
  // Container widths
  containerWidth: getResponsiveValue('100%', '600px', '800px'),
  
  // Border radius
  borderRadius: {
    sm: getResponsiveValue(4, 6, 8),
    md: getResponsiveValue(8, 10, 12),
    lg: getResponsiveValue(12, 16, 20),
    full: 9999,
  },
};

export const webStyles = isWeb ? {
  cursor: 'pointer' as const,
  userSelect: 'none' as const,
  transition: 'all 0.2s ease',
} : {};
