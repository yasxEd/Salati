import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

// Responsive breakpoints
const breakpoints = {
  small: 360,
  medium: 400,
  large: 480,
};

// Responsive helper function
export const responsive = (small: number, medium?: number, large?: number) => {
  if (width >= breakpoints.large && large !== undefined) return large;
  if (width >= breakpoints.medium && medium !== undefined) return medium;
  return small;
};

export const theme = {
  spacing: {
    xs: responsive(4, 6, 8),
    sm: responsive(8, 10, 12),
    md: responsive(16, 18, 20),
    lg: responsive(24, 26, 28),
    xl: responsive(32, 36, 40),
    xxl: responsive(48, 52, 56),
    xxxl: responsive(64, 68, 72),
  },
  colors: {
    primary: '#5D71E2',
    primaryLight: '#8A97F3',
    primaryDark: '#4555C7',
    secondary: '#F9AE42',
    accent: '#F9AE42',
    background: '#F7F8FC',
    darkBackground: '#121A2E',
    cardBackground: '#FFFFFF',
    cardBackgroundDark: '#1E2746',
    white: '#FFFFFF',
    darkGray: '#555555',
    lightGray: '#E1E3EF',
    lightText: '#B8C5D6',
    text: '#333333',
    error: '#FF5252',
    success: '#4CAF50',
    warning: '#FF9800',
    // Enhanced gradient colors with fallback
    gradient: ['#5D71E2', '#8A97F3', '#4555C7'],
    gradientDark: ['#1a2151', '#2d3a80', '#4a5ab8'],
    // Compass-specific colors
    compass: {
      ring: 'rgba(255, 255, 255, 0.3)',
      marks: 'rgba(255, 255, 255, 0.6)',
      needle: '#FF6B6B',
      center: '#FFFFFF',
      background: 'rgba(255, 255, 255, 0.1)',
    },
  },
  borderRadius: {
    sm: responsive(8, 10, 12),
    md: responsive(12, 14, 16),
    lg: responsive(16, 18, 20),
    xl: responsive(20, 22, 24),
    round: responsive(25, 30, 35),
  },
  shadows: {
    small: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    medium: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 5,
    },
    large: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.2,
      shadowRadius: 12,
      elevation: 8,
    },
  },
  typography: {
    sizes: {
      xs: responsive(10, 11, 12),
      sm: responsive(12, 13, 14),
      md: responsive(14, 15, 16),
      lg: responsive(16, 17, 18),
      xl: responsive(18, 20, 22),
      xxl: responsive(24, 26, 28),
      xxxl: responsive(32, 36, 40),
    },
  },
};
