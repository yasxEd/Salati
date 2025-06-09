// components/HomeScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Image, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import PrayerCard from './PrayerCard';
import { getPrayerTimes, getNextPrayer, getTimeUntilNextPrayer, getCurrentLocation, LocationData, PrayerTime } from '../utils/prayerTimes';
import { theme } from '../theme';
import { useTheme } from '../components/ThemeContext';
import NotificationService from '../services/NotificationService';

const HomeScreen: React.FC = () => {
  const { isDarkMode, theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [prayers, setPrayers] = useState<PrayerTime[]>([]);
  const [nextPrayer, setNextPrayer] = useState<PrayerTime | null>(null);
  const [timeUntilNext, setTimeUntilNext] = useState<string>('');
  const [refreshing, setRefreshing] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [location, setLocation] = useState<LocationData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadPrayerData = async (userLocation?: LocationData) => {
    try {
      const locationToUse = userLocation || location;
      
      // Ensure we have valid location data before making calculations
      if (!locationToUse || !locationToUse.latitude || !locationToUse.longitude) {
        console.error('Invalid location data for prayer calculations');
        return;
      }

      console.log('Calculating prayer times for:', {
        lat: locationToUse.latitude,
        lng: locationToUse.longitude,
        city: locationToUse.city,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      });

      const [prayerTimes, nextPrayerData, timeUntil] = await Promise.all([
        getPrayerTimes(locationToUse),
        getNextPrayer(locationToUse),
        getTimeUntilNextPrayer(locationToUse)
      ]);
      
      // Log the received prayer times for debugging
      console.log('Received prayer times:', prayerTimes);
      
      setPrayers(prayerTimes);
      setNextPrayer(nextPrayerData);
      setTimeUntilNext(timeUntil);

      // Update notifications with new location
      const notificationService = NotificationService.getInstance();
      await notificationService.scheduleAllPrayerNotifications(locationToUse);
    } catch (error) {
      console.error('Error loading prayer data:', error);
      Alert.alert('Error', 'Failed to load prayer times. Please check your location settings.');
    }
  };

  const loadLocation = async () => {
    try {
      setLoading(true);
      const currentLocation = await getCurrentLocation();
      setLocation(currentLocation);
      await loadPrayerData(currentLocation);
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert(
        'Location Required', 
        'This app needs location access to show accurate prayer times for your area.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Retry', onPress: loadLocation }
        ]
      );
      // Load mock data as fallback
      await loadPrayerData();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLocation();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentDate(new Date());
      if (location) {
        loadPrayerData();
      }
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [location]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadLocation();
    setRefreshing(false);
  };

  const handleLocationPress = () => {
    Alert.alert(
      'Update Location',
      'Refresh your current location to get accurate prayer times?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Update', onPress: loadLocation }
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer, { backgroundColor: isDarkMode ? theme.colors.darkBackground : theme.colors.background }]}>
        <View style={styles.loadingContent}>
          <Ionicons name="location-outline" size={48} color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: isDarkMode ? theme.colors.white : theme.colors.text }]}>
            Getting your location...
          </Text>
          <Text style={[styles.loadingSubtext, { color: isDarkMode ? theme.colors.lightText : theme.colors.darkGray }]}>
            Please allow location access for accurate prayer times
          </Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: isDarkMode ? theme.colors.darkBackground : theme.colors.background }]}
      contentContainerStyle={[styles.contentContainer, { paddingTop: insets.top + theme.spacing.md }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />
      }
    >
      {/* Header with current date and location */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.greeting, { color: isDarkMode ? theme.colors.white : theme.colors.primary }]}>السلام عليكم</Text>
          <Text style={[styles.date, { color: isDarkMode ? theme.colors.lightText : theme.colors.primaryDark }]}>
            {currentDate.toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })} • {currentDate.toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
              hour12: true
            })}
          </Text>
        </View>
        <View style={styles.locationContainer}>
          <TouchableOpacity style={[
            styles.locationButton,
            { backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(63, 81, 181, 0.1)' } // Added solid background
          ]} onPress={handleLocationPress}>
            <View style={styles.locationTextContainer}>
              <Text style={[styles.locationText, { color: isDarkMode ? theme.colors.white : theme.colors.primary }]}>
                {location ? `${location.city}, ${location.country}` : 'Getting location...'}
              </Text>
              {location && (
                <Text style={[styles.coordinatesText, { color: isDarkMode ? theme.colors.lightText : theme.colors.primaryDark }]}>
                  {location.latitude.toFixed(2)}°, {location.longitude.toFixed(2)}°
                </Text>
              )}
            </View>
            <Ionicons name="location" size={18} color={isDarkMode ? theme.colors.white : theme.colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Next prayer card - Fixed shadow */}
      {nextPrayer && (
        <View style={[
          styles.nextPrayerCardContainer,
          { backgroundColor: isDarkMode ? theme.colors.cardBackgroundDark : theme.colors.primary }
        ]}>
          <View style={[
            styles.nextPrayerContainer,
            { backgroundColor: isDarkMode ? theme.colors.cardBackgroundDark : theme.colors.primary }
          ]}>
            <View style={styles.nextPrayerInfo}>
              <Text style={[styles.nextPrayerTitle, { color: isDarkMode ? theme.colors.lightText : 'rgba(255, 255, 255, 0.8)' }]}>Next Prayer</Text>
              <Text style={[styles.nextPrayerName, { color: theme.colors.white }]}>{nextPrayer.name}</Text>
              <Text style={[styles.nextPrayerTime, { color: theme.colors.white }]}>
                {new Date(`2000-01-01 ${nextPrayer.time}`).toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true
                })}
              </Text>
              <View style={styles.timeRemainingContainer}>
                <Ionicons name="time-outline" size={16} color={theme.colors.white} />
                <Text style={[styles.timeRemaining, {color: isDarkMode ? theme.colors.lightText : 'rgba(255, 255, 255, 0.8)'}]}>{timeUntilNext} remaining</Text>
              </View>
            </View>
            <View style={styles.prayerMatContainer}>
              <Image
                source={require('../assets/h2.png')}
                style={styles.prayerMatImage}
                resizeMode="contain"
              />
            </View>
          </View>
        </View>
      )}

      {/* Today's Prayers */}
      <View style={styles.todaysPrayersContainer}>
        <Text style={[styles.sectionTitle, { color: isDarkMode ? theme.colors.lightText : theme.colors.text }]}>Today's Prayers</Text>
        <View style={styles.prayersList}>
          {prayers.map((prayer) => (
            <PrayerCard key={prayer.id} prayer={prayer} />
          ))}
        </View>
      </View>

      {/* Location accuracy info - Fixed shadow */}
      {location && (
        <View style={[
          styles.locationInfoCardContainer,
          { backgroundColor: isDarkMode ? theme.colors.cardBackgroundDark : theme.colors.white }
        ]}>
          <View style={styles.locationInfoCard}>
            <View style={styles.locationInfoContent}>
              <Ionicons name="information-circle-outline" size={20} color={theme.colors.primary} />
              <Text style={[styles.locationInfoText, { color: isDarkMode ? theme.colors.lightText : theme.colors.darkGray }]}>
                Prayer times calculated for your current location. Tap location to update.
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Additional Features - Fixed shadow */}
      <View style={styles.featuresContainer}>
        <Text style={[styles.sectionTitle, { color: isDarkMode ? theme.colors.lightText : theme.colors.text }]}>Features</Text>
        <View style={styles.featureCardsContainer}>
          <TouchableOpacity style={[
            styles.featureCard,
            { backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.9)' } // Added solid background
          ]}>
            <View style={[styles.featureIconContainer, { backgroundColor: 'rgba(63, 81, 181, 0.1)' }]}>
              <Ionicons name="compass" size={24} color={theme.colors.primary} />
            </View>
            <Text style={[styles.featureTitle, { color: isDarkMode ? theme.colors.white : theme.colors.text }]}>Qibla Finder</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[
            styles.featureCard,
            { backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.9)' } // Added solid background
          ]}>
            <View style={[styles.featureIconContainer, { backgroundColor: 'rgba(76, 175, 80, 0.1)' }]}>
              <Ionicons name="calendar" size={24} color={theme.colors.success} />
            </View>
            <Text style={[styles.featureTitle, { color: isDarkMode ? theme.colors.white : theme.colors.text }]}>Islamic Calendar</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[
            styles.featureCard,
            { backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.9)' } // Added solid background
          ]}>
            <View style={[styles.featureIconContainer, { backgroundColor: 'rgba(83, 109, 254, 0.1)' }]}>
              <Ionicons name="book" size={24} color={theme.colors.accent} />
            </View>
            <Text style={[styles.featureTitle, { color: isDarkMode ? theme.colors.white : theme.colors.text}]}>Daily Duas</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: theme.spacing.lg,
  },
  header: {
    marginBottom: theme.spacing.lg,
    flexDirection: 'column', // Ensure vertical stacking
  },
  greeting: {
    fontFamily: 'Alkalami_400Regular',
    fontSize: 35,
    marginBottom: theme.spacing.xs,
    textAlign: 'right',
    width: '100%',
  },
  date: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    marginBottom: theme.spacing.sm,
    textAlign: 'right',
    width: '100%',
  },
  locationContainer: {
    alignItems: 'flex-end', // Align children (location button) to the right
  },
  locationButton: {
    marginTop: theme.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(63, 81, 181, 0.2)',
  },
  
  nextPrayerCardContainer: {
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.xl,
    ...theme.shadows.medium,
  },
  nextPrayerContainer: {
    flexDirection: 'row',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
  },
  nextPrayerInfo: {
    flex: 3,
  },
  nextPrayerTitle: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 14,
    marginBottom: theme.spacing.sm,
  },
  nextPrayerName: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 28,
    marginBottom: theme.spacing.xs,
  },
  nextPrayerTime: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 22,
    marginBottom: theme.spacing.md,
  },
  timeRemainingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignSelf: 'flex-start',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.round,
  },
  timeRemaining: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 12,
    marginLeft: theme.spacing.sm,
  },
  prayerMatContainer: {
    flex: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prayerMatImage: {
    width: 300,           // Set a fixed width (adjust this value as needed)
    height: 150,  
    tintColor: 'white', // Adjust the tint color if needed
  },
  todaysPrayersContainer: {
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 20,
    marginBottom: theme.spacing.sm,
  },
  prayersList: {
    // Style for the list of prayer cards
  },
  featuresContainer: {
    marginBottom: theme.spacing.xxxl,
  },
  featureCardsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-start',
  },
  featureCard: {
    flex: 1,
    alignItems: 'center',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    margin: theme.spacing.sm,
    ...theme.shadows.small, // Added shadow back with solid background
  },
  featureIconContainer: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: theme.borderRadius.round,
    marginBottom: theme.spacing.sm,
  },
  featureTitle: {
    fontFamily: 'Poppins_500Medium',
    textAlign: 'center',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContent: {
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  loadingText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 18,
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  loadingSubtext: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  locationTextContainer: {
    marginRight: theme.spacing.xs,
    flex: 1,
    alignItems: 'flex-end',
  },
  locationText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 12,
    textAlign: 'right',
  },
  coordinatesText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 10,
    marginTop: 1,
  },
  locationInfoCardContainer: {
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.lg,
    ...theme.shadows.small,
  },
  locationInfoCard: {
    padding: theme.spacing.md,
  },
  locationInfoContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  locationInfoText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    marginLeft: 8,
    flex: 1,
    lineHeight: 18,
  },
});

export default HomeScreen;