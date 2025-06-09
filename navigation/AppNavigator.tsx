// navigation/AppNavigator.tsx
import React, { useRef, useEffect, useCallback } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { View, Platform, Animated, Dimensions, Pressable, StyleSheet, Text } from 'react-native';
import HomeScreen from '../components/HomeScreen';
import QiblaCompass from '../components/QiblaCompass';
import SettingsScreen from '../components/SettingsScreen';
import PrayerDetailScreen from '../components/PrayerDetailsScreen';
import { theme } from '../theme';
import { useTheme } from '../components/ThemeContext';
import { RouteProp, ParamListBase } from '@react-navigation/native';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const { width } = Dimensions.get('window');

// Define types for props
type FloatingTabBarProps = {
  state: any;
  descriptors: any;
  navigation: any;
};

// Floating animated tab bar component
function FloatingTabBar({ state, descriptors, navigation }: FloatingTabBarProps) {
  const { isDarkMode } = useTheme();
  const tabWidth = width / state.routes.length;

  // Animation values
  const translateX = useRef(new Animated.Value(0)).current;
  const iconScale = useRef(state.routes.map(() => new Animated.Value(1))).current;

  const animateTabBar = useCallback(() => {
    Animated.spring(translateX, {
      toValue: state.index * tabWidth,
      useNativeDriver: true,
      tension: 120,
      friction: 8,
    }).start();

    state.routes.forEach((_: unknown, i: number) => {
      Animated.spring(iconScale[i], {
        toValue: i === state.index ? 1.2 : 1,
        useNativeDriver: true,
        tension: 300,
        friction: 10,
      }).start();
    });
  }, [state.index, tabWidth, translateX, iconScale]);

  useEffect(() => {
    animateTabBar();
  }, [animateTabBar]);

  const tabBarBackground = isDarkMode ? theme.colors.white : theme.colors.darkBackground;
  const inactiveColor = isDarkMode ? theme.colors.lightText : theme.colors.white;

  // Set the color of the indicator based on dark mode
  const indicatorColor = isDarkMode ? theme.colors.primary : theme.colors.white; // Adjust this to your desired light mode color

  return (
    <View style={styles.tabBarContainer}>
      <View
        style={[
          styles.floatingTabBar,
          {
            backgroundColor: tabBarBackground,
            ...theme.shadows.large, // Shadow added for the tab bar
          },
        ]}
      >
        {/* Animated indicator */}
        <Animated.View
          style={{
            position: 'absolute',
            top: 0,
            width: tabWidth * 0.65, // Adjusted width of the line to 80% of tab width
            height: 2, // Adjusted height of the line to make it smaller
            backgroundColor: indicatorColor, // Change color based on dark mode
            transform: [{ translateX }],
            borderBottomLeftRadius: 2,
            borderBottomRightRadius: 2,
          }}
        />

        {state.routes.map((route: RouteProp<ParamListBase, string>, index: number) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;

          let iconName: keyof typeof Ionicons.glyphMap = 'home-outline';
          if (route.name === 'Home') {
            iconName = isFocused ? 'home' : 'home-outline';
          } else if (route.name === 'Qibla') {
            iconName = isFocused ? 'compass' : 'compass-outline';
          } else if (route.name === 'Settings') {
            iconName = isFocused ? 'settings' : 'settings-outline';
          }

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          // Individual tab button
          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              onPress={onPress}
              style={({ pressed }) => ({
                flex: 1,
                justifyContent: 'center',
                alignItems: 'center',
                paddingTop: 10,
                opacity: pressed ? 0.8 : 1,
              })}
            >
              <Animated.View
                style={{
                  transform: [{ scale: iconScale[index] }],
                  alignItems: 'center',
                }}
              >
                <Ionicons name={iconName} size={20} color={isFocused ? theme.colors.primary : (isDarkMode ? theme.colors.primary : inactiveColor)} />
                <Text
                  style={{
                    color: isFocused ? theme.colors.primary : (isDarkMode ? theme.colors.primary : inactiveColor),
                    fontFamily: 'Poppins_500Medium',
                    fontSize: 12,
                    marginTop: 4,
                    opacity: isFocused ? 1 : 0.8,
                  }}
                >
                  {route.name}
                </Text>
              </Animated.View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function HomeTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: 'Home' }} />
      <Tab.Screen name="Qibla" component={QiblaCompass} options={{ tabBarLabel: 'Qibla' }} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ tabBarLabel: 'Settings' }} />
    </Tab.Navigator>
  );
}

// Enhanced screen transitions
const screenOptions = {
  gestureEnabled: true,
  cardStyleInterpolator: ({ current, layouts }: { current: any; layouts: any }) => {
    return {
      cardStyle: {
        transform: [
          {
            translateX: current.progress.interpolate({
              inputRange: [0, 1],
              outputRange: [layouts.screen.width, 0],
            }),
          },
          {
            scale: current.progress.interpolate({
              inputRange: [0, 1],
              outputRange: [0.95, 1],
            }),
          },
        ],
        opacity: current.progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0.8, 1],
        }),
      },
      overlayStyle: {
        opacity: current.progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 0.5],
        }),
      },
    };
  },
};

// Styles for the floating tab bar
const styles = StyleSheet.create({
  tabBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingBottom: Platform.OS === 'ios' ? 0 : 10,
  },
  floatingTabBar: {
    flexDirection: 'row',
    height: Platform.OS === 'ios' ? 80 : 60,
    width: '89%',
    marginBottom: 20,
    borderRadius: 30,
    overflow: 'hidden',
    // Shadow added for the tab bar
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5, // For Android
  },
});

export default function AppNavigator() {
  const { isDarkMode } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: isDarkMode ? theme.colors.darkBackground : theme.colors.background,
        },
        ...screenOptions,
      }}
    >
      <Stack.Screen 
        name="Main" 
        component={HomeTabs}
      />
      <Stack.Screen 
        name="PrayerDetail" 
        component={PrayerDetailScreen}
        options={{
          animation: 'slide_from_right'
        }}
      />
    </Stack.Navigator>
  );
}