// components/PrayerCard.tsx
import React, { useMemo, useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { theme } from '../theme';
import { useTheme } from './ThemeContext';

interface PrayerInfo {
  id: string; // Added id for better React key management
  name: string;
  time: string;
  isNext: boolean;
  isPassed: boolean;
}

interface PrayerCardProps {
  prayer: PrayerInfo;
  onNotificationToggle?: (id: string, isEnabled: boolean) => void; // Added callback for notification changes
}

type RootStackParamList = {
  PrayerDetail: { prayerName: string; prayerId: string }; // Enhanced navigation params
};

type NavigationProp = StackNavigationProp<RootStackParamList, 'PrayerDetail'>;

const PrayerCard: React.FC<PrayerCardProps> = ({ prayer, onNotificationToggle }) => {
  const [isNotificationOn, setIsNotificationOn] = useState(true);
  const { isDarkMode } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  
  // Memoized styles to prevent recalculation on every render
  const cardStyle = useMemo(() => {
    if (prayer.isNext) {
      return isDarkMode 
        ? [styles.card, styles.nextPrayerCard, { backgroundColor: theme.colors.cardBackgroundDark }] 
        : [styles.card, styles.nextPrayerCard];
    } else if (prayer.isPassed) {
      return isDarkMode 
        ? [styles.card, styles.passedPrayerCard, { backgroundColor: 'rgba(50, 50, 50, 0.3)' }] 
        : [styles.card, styles.passedPrayerCard];
    } 
    return isDarkMode 
      ? [styles.card, { backgroundColor: 'rgba(255, 255, 255, 0.05)' }] 
      : [styles.card, styles.upcomingPrayerCard];
  }, [prayer.isNext, prayer.isPassed, isDarkMode]);
  
  const textStyle = useMemo(() => {
    if (prayer.isNext) {
      return [styles.prayerName, styles.nextPrayerText];
    } else if (prayer.isPassed) {
      return [styles.prayerName, styles.passedPrayerText];
    }
    return [
      styles.prayerName, 
      { color: isDarkMode ? theme.colors.white : theme.colors.text }
    ];
  }, [prayer.isNext, prayer.isPassed, isDarkMode]);
  
  const timeStyle = useMemo(() => [
    styles.prayerTime, 
    prayer.isNext 
      ? styles.nextPrayerText 
      : prayer.isPassed 
        ? styles.passedPrayerText 
        : { color: isDarkMode ? theme.colors.lightText : theme.colors.text }
  ], [prayer.isNext, prayer.isPassed, isDarkMode]);
  
  // Use useCallback to prevent recreating functions on every render
  const handlePress = useCallback(() => {
    navigation.navigate('PrayerDetail', { 
      prayerName: prayer.name,
      prayerId: prayer.id
    });
  }, [navigation, prayer.name, prayer.id]);

  const toggleNotification = useCallback(() => {
    const newState = !isNotificationOn;
    setIsNotificationOn(newState);
    if (onNotificationToggle) {
      onNotificationToggle(prayer.id, newState);
    }
  }, [isNotificationOn, prayer.id, onNotificationToggle]);

  // Calculate the notification icon color once
  const notificationIconColor = prayer.isNext 
    ? theme.colors.primary 
    : prayer.isPassed 
      ? theme.colors.lightText 
      : theme.colors.accent;

  return (
    <Pressable 
      onPress={handlePress} 
      style={({pressed}) => [
        {opacity: pressed ? 0.8 : 1},
        styles.container
      ]}
    >
      <Animated.View style={cardStyle}>
        <View style={styles.prayerInfo}>
          <Text style={textStyle}>
            {prayer.name}
            {prayer.isNext && (
              <Text style={styles.nextLabel}> (Next)</Text>
            )}
          </Text>
          <Text style={timeStyle}>{prayer.time}</Text>
        </View>
        
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={[
              styles.notificationToggle,
              { backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(240, 240, 240, 0.7)' }
            ]}
            onPress={toggleNotification}
            hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
          >
            <Ionicons
              name={isNotificationOn ? "notifications" : "notifications-off"}
              size={22}
              color={notificationIconColor}
            />
          </TouchableOpacity>
          
          <View style={styles.arrowContainer}>
            <Ionicons 
              name="chevron-forward" 
              size={20} 
              color={prayer.isNext 
                ? theme.colors.primary 
                : prayer.isPassed 
                  ? theme.colors.lightText 
                  : isDarkMode ? theme.colors.lightText : theme.colors.text
              } 
            />
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: theme.spacing.sm,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.white, // Added solid background for shadow efficiency
    ...theme.shadows.medium,
  },
  nextPrayerCard: {
    backgroundColor: theme.colors.white,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
    elevation: 4,
  },
  passedPrayerCard: {
    backgroundColor: 'rgba(240, 240, 240, 0.8)',
    opacity: 0.8,
  },
  upcomingPrayerCard: {
    backgroundColor: theme.colors.cardBackground,
  },
  prayerInfo: {
    flex: 1,
    paddingRight: theme.spacing.md,
  },
  prayerName: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
    marginBottom: 4,
  },
  nextPrayerText: {
    color: theme.colors.primary,
  },
  passedPrayerText: {
    color: theme.colors.lightText,
  },
  nextLabel: {
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
    color: theme.colors.accent,
  },
  prayerTime: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 14,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notificationToggle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.sm,
  },
  arrowContainer: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default React.memo(PrayerCard);