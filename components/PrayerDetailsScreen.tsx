// components/PrayerDetailScreen.tsx
import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../theme';
import { useTheme } from './ThemeContext';
import { getPrayerTimes, getNextPrayer, getTimeUntilNextPrayer } from '../utils/prayerTimes';

// Define the type for route params
type PrayerDetailRouteParams = {
  prayerName: string;
};

type PrayerDetailRouteProp = RouteProp<Record<string, PrayerDetailRouteParams>, string>;

// Prayer information mapping
const prayerDetailsMap = {
  Fajr: {
    arabicName: "الفجر",
    rakats: "2",
    timePeriod: "Dawn until sunrise",
    virtues: "The Prophet ﷺ said: 'Whoever prays the dawn prayer in congregation, it is as if he had prayed the whole night.'",
    icon: "weather-sunset-up"
  },
  Dhuhr: {
    arabicName: "الظهر",
    rakats: "4",
    timePeriod: "Midday until mid-afternoon",
    virtues: "The Prophet ﷺ said: 'Whoever maintains the prayers at their proper times, these prayers will be a light, evidence, and salvation for him on the Day of Judgment.'",
    icon: "weather-sunny"
  },
  Asr: {
    arabicName: "العصر",
    rakats: "4",
    timePeriod: "Mid-afternoon until sunset",
    virtues: "The Prophet ﷺ said: 'Whoever prays the afternoon prayer, it is as if he has prayed until sunset.'",
    icon: "weather-sunset"
  },
  Maghrib: {
    arabicName: "المغرب",
    rakats: "3",
    timePeriod: "After sunset until twilight",
    virtues: "The Prophet ﷺ said: 'Whoever prays Maghrib at its proper time will enter Paradise.'",
    icon: "weather-night"
  },
  Isha: {
    arabicName: "العشاء",
    rakats: "4",
    timePeriod: "Nightfall until midnight",
    virtues: "The Prophet ﷺ said: 'Whoever prays Isha in congregation, it is as if he has prayed half the night.'",
    icon: "moon-waning-crescent"
  },
  Sunrise: {
    arabicName: "الشروق",
    rakats: "2 (optional)",
    timePeriod: "After sunrise until mid-morning",
    virtues: "The Prophet ﷺ encouraged praying Duha (mid-morning) prayer after sunrise, saying it equals the reward of charity for each joint in one's body.",
    icon: "white-balance-sunny"
  }
};

const PrayerDetailScreen: React.FC = () => {
  const { isDarkMode } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute<PrayerDetailRouteProp>();
  const { prayerName } = route.params;
  
  // Get all prayer times
  const [prayers, setPrayers] = useState<any[]>([]);
  const thisPrayer = useMemo(() => 
    prayers.find(prayer => prayer.name === prayerName), 
    [prayerName, prayers]
  );

  useEffect(() => {
    getPrayerTimes().then(setPrayers);
  }, []);
  
  // Get prayer additional details
  const prayerDetails = prayerDetailsMap[prayerName as keyof typeof prayerDetailsMap] || {
    arabicName: prayerName,
    rakats: "4",
    timePeriod: "Standard time",
    virtues: `The ${prayerName} prayer is one of the prayers prescribed in Islam. Performing this prayer brings great rewards.`,
    icon: "clock-outline"
  };
  
  // Calculate time until next prayer if this is the next prayer
  const [timeUntil, setTimeUntil] = useState<string | null>(null);
  
  useEffect(() => {
    if (thisPrayer?.isNext) {
      getTimeUntilNextPrayer().then(setTimeUntil);
    } else {
      setTimeUntil(null);
    }
  }, [thisPrayer]);
  
  // Colors based on theme
  const backgroundColor = isDarkMode ? theme.colors.darkBackground : '#F9FAFE';
  const textColor = isDarkMode ? 'white' : theme.colors.primary;
  const subtitleColor = isDarkMode ? 'rgba(255, 255, 255, 0.7)' : theme.colors.primary;
  const cardBg = isDarkMode ? 'rgba(30, 35, 45, 0.8)' : 'rgba(255, 255, 255, 0.9)';
  const cardBorderColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)';
  const dividerColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.06)';
  const accentColor = theme.colors.primary;
  const gradientColors = isDarkMode 
    ? [theme.colors.primary, theme.colors.primary] as const
    : [theme.colors.primary, theme.colors.lightText] as const;
  const quoteColor = isDarkMode ? 'rgba(33, 150, 243, 0.3)' : 'rgba(33, 150, 243, 0.2)';
  const heroTextColor = 'white'; // Hero section text stays white in both modes
  
  return (
    <View style={[styles.container, { backgroundColor }]}>
      <StatusBar 
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent
      />
      
      {/* Hero Section with Gradient */}
      <LinearGradient
        colors={gradientColors}
        style={[styles.heroSection, { paddingTop: insets.top + 4 }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Header with back button */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={[styles.backButton, { backgroundColor: 'rgba(255, 255, 255, 0.2)' }]}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={heroTextColor} />
          </TouchableOpacity>
        </View>

        {/* Prayer Title */}
        <View style={styles.prayerTitleContainer}>
          <MaterialCommunityIcons 
            name={prayerDetails.icon as any} 
            size={40} 
            color={heroTextColor} 
            style={styles.prayerIcon} 
          />
          <View>
            <Text style={[styles.prayerTitle, { color: heroTextColor }]}>{prayerName}</Text>
            <Text style={[styles.prayerArabicTitle, { color: 'rgba(255, 255, 255, 0.9)' }]}>
              {prayerDetails.arabicName}
            </Text>
          </View>
        </View>

        {/* Time Display */}
        <View style={styles.timeDisplay}>
          <Text style={[styles.timeValue, { color: heroTextColor }]}>
            {thisPrayer?.time || "00:00"}
          </Text>
          
          {thisPrayer?.isNext && timeUntil && (
            <View style={[styles.timeUntilContainer, { backgroundColor: 'rgba(255, 255, 255, 0.2)' }]}>
              <Ionicons name="time-outline" size={18} color={heroTextColor} />
              <Text style={[styles.timeUntilText, { color: heroTextColor }]}>in {timeUntil}</Text>
            </View>
          )}
        </View>
      </LinearGradient>

      <ScrollView 
        style={styles.scrollContainer}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Prayer Status */}
        <View style={[styles.statusCard, { backgroundColor: cardBg, borderColor: cardBorderColor }]}>
          <View style={styles.statusHeader}>
            <Text style={[styles.cardTitle, { color: textColor }]}>Prayer Status</Text>
          </View>
          
          <View style={styles.statusContainer}>
            {thisPrayer?.isNext && (
              <View style={[styles.statusBadge, { backgroundColor: 'rgba(33, 150, 243, 0.15)' }]}>
                <Ionicons name="time-outline" size={18} color={theme.colors.primary} />
                <Text style={[styles.statusText, { color: theme.colors.primary }]}>Next Prayer</Text>
              </View>
            )}
            
            {thisPrayer?.isPassed && (
              <View style={[styles.statusBadge, { backgroundColor: 'rgba(76, 175, 80, 0.15)' }]}>
                <Ionicons name="checkmark-circle-outline" size={18} color="#4CAF50" />
                <Text style={[styles.statusText, { color: "#4CAF50" }]}>Completed</Text>
              </View>
            )}
            
            {!thisPrayer?.isNext && !thisPrayer?.isPassed && (
              <View style={[styles.statusBadge, { backgroundColor: 'rgba(255, 152, 0, 0.15)' }]}>
                <Ionicons name="calendar-outline" size={18} color="#FF9800" />
                <Text style={[styles.statusText, { color: "#FF9800" }]}>Upcoming</Text>
              </View>
            )}
          </View>
        </View>
        
        {/* Prayer Details Section */}
        <View style={[styles.detailCard, { backgroundColor: cardBg, borderColor: cardBorderColor }]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: textColor }]}>Prayer Details</Text>
          </View>
          
          <View style={styles.detailItem}>
            <View style={styles.detailIconContainer}>
              <Ionicons name="fitness-outline" size={18} color={accentColor} />
            </View>
            <View style={styles.detailContent}>
              <Text style={[styles.detailLabel, { color: subtitleColor }]}>Number of Rakats</Text>
              <Text style={[styles.detailValue, { color: textColor }]}>{prayerDetails.rakats}</Text>
            </View>
          </View>
          
          <View style={[styles.divider, { backgroundColor: dividerColor }]} />
          
          <View style={styles.detailItem}>
            <View style={styles.detailIconContainer}>
              <Ionicons name="time-outline" size={18} color={accentColor} />
            </View>
            <View style={styles.detailContent}>
              <Text style={[styles.detailLabel, { color: subtitleColor }]}>Time Period</Text>
              <Text style={[styles.detailValue, { color: textColor }]}>{prayerDetails.timePeriod}</Text>
            </View>
          </View>
        </View>
        
        {/* Virtues Section */}
        <View style={[styles.virtuesCard, { backgroundColor: cardBg, borderColor: cardBorderColor }]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: textColor }]}>Virtues & Benefits</Text>
          </View>
          
          <View style={styles.virtuesContent}>
            <View style={styles.quoteMarkContainer}>
              <Text style={[styles.quoteMark, { color: quoteColor }]}>"</Text>
            </View>
            <Text style={[styles.virtuesText, { color: textColor }]}>
              {prayerDetails.virtues}
            </Text>
          </View>
        </View>
        
        {/* Notification Settings */}
        <View style={[styles.notificationCard, { backgroundColor: cardBg, borderColor: cardBorderColor }]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: textColor }]}>Notification Settings</Text>
          </View>
          
          <View style={styles.notificationItem}>
            <View style={styles.notificationContent}>
              <Text style={[styles.notificationTitle, { color: textColor }]}>Prayer Reminder</Text>
              <Text style={[styles.notificationSubtitle, { color: subtitleColor }]}>
                15 minutes before {prayerName}
              </Text>
            </View>
            <TouchableOpacity 
              style={[styles.toggleButton, { backgroundColor: theme.colors.primary }]}
            >
              <Ionicons name="notifications" size={18} color="white" />
            </TouchableOpacity>
          </View>
          
          <View style={[styles.divider, { backgroundColor: dividerColor }]} />
          
          <View style={styles.notificationItem}>
            <View style={styles.notificationContent}>
              <Text style={[styles.notificationTitle, { color: textColor }]}>Adhan</Text>
              <Text style={[styles.notificationSubtitle, { color: subtitleColor }]}>
                Play adhan at prayer time
              </Text>
            </View>
            <TouchableOpacity 
              style={[styles.toggleButton, { backgroundColor: 'rgba(158, 158, 158, 0.2)' }]}
            >
              <Ionicons name="notifications-off" size={18} color={subtitleColor} />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  heroSection: {
    paddingHorizontal: 20,
    paddingBottom: 36,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  prayerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  prayerIcon: {
    marginRight: 16,
  },
  prayerTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 28,
  },
  prayerArabicTitle: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 18,
    marginTop: -4,
  },
  timeDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeValue: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 42,
  },
  timeUntilContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  timeUntilText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 14,
    marginLeft: 4,
  },
  scrollContainer: {
    flex: 1,
    marginTop: -1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  statusCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  detailCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  virtuesCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  notificationCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statusHeader: {
    marginBottom: 12,
  },
  cardHeader: {
    marginBottom: 16,
  },
  cardTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 18,
  },
  statusContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 8,
  },
  statusText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 14,
    marginLeft: 6,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  detailIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    marginBottom: 2,
  },
  detailValue: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
  },
  divider: {
    height: 1,
    marginVertical: 8,
  },
  virtuesContent: {
    position: 'relative',
    paddingLeft: 8,
  },
  quoteMarkContainer: {
    position: 'absolute',
    top: -12,
    left: 0,
  },
  quoteMark: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 48,
  },
  virtuesText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 15,
    lineHeight: 24,
    paddingLeft: 18,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
    marginBottom: 2,
  },
  notificationSubtitle: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
  },
  toggleButton: {
    width: 48,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default PrayerDetailScreen;