// components/QiblaCompass.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Dimensions, 
  Animated, 
  Alert,
  StatusBar,
  ScrollView 
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Magnetometer } from 'expo-sensors';
import * as Location from 'expo-location';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../theme';
import { useTheme } from './ThemeContext';

const { width } = Dimensions.get('window');
const COMPASS_SIZE = Math.min(width * 0.7, 280);

interface LocationData {
  latitude: number;
  longitude: number;
  city?: string;
  country?: string;
}

const QiblaCompass: React.FC = () => {
  const { isDarkMode } = useTheme();
  const insets = useSafeAreaInsets();
  
  const [heading, setHeading] = useState<number>(0);
  const [qiblaDirection, setQiblaDirection] = useState<number>(0);
  const [locationData, setLocationData] = useState<LocationData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [distance, setDistance] = useState<number>(0);

  const compassRotation = useRef(new Animated.Value(0)).current;
  const qiblaRotation = useRef(new Animated.Value(0)).current;
  const magnetometerSubscription = useRef<any>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const KAABA_LOCATION = { latitude: 21.4225, longitude: 39.8262 };

  // Consistent pulsing animation like other screens
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.03,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  const calculateDistance = useCallback((lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }, []);

  const calculateQiblaDirection = useCallback((userLat: number, userLon: number): number => {
    const lat1 = userLat * (Math.PI / 180);
    const lon1 = userLon * (Math.PI / 180);
    const lat2 = KAABA_LOCATION.latitude * (Math.PI / 180);
    const lon2 = KAABA_LOCATION.longitude * (Math.PI / 180);

    const dLon = lon2 - lon1;
    const y = Math.sin(dLon) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
    
    let bearing = Math.atan2(y, x) * (180 / Math.PI);
    bearing = (bearing + 360) % 360;
    
    return bearing;
  }, []);

  const setupQibla = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Location permission required to find Qibla direction');
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.BestForNavigation,
      });

      const { latitude, longitude } = location.coords;

      // Get location details
      try {
        const reverseGeocode = await Location.reverseGeocodeAsync({ latitude, longitude });
        const place = reverseGeocode[0];
        setLocationData({
          latitude,
          longitude,
          city: place?.city || 'Unknown',
          country: place?.country || 'Unknown',
        });
      } catch {
        setLocationData({ latitude, longitude });
      }

      const direction = calculateQiblaDirection(latitude, longitude);
      setQiblaDirection(direction);

      const distanceToMecca = calculateDistance(latitude, longitude, KAABA_LOCATION.latitude, KAABA_LOCATION.longitude);
      setDistance(distanceToMecca);

      startMagnetometer();
      setLoading(false);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to determine your location');
      setLoading(false);
    }
  }, [calculateDistance, calculateQiblaDirection]);

  const startMagnetometer = useCallback(() => {
    if (magnetometerSubscription.current) {
      magnetometerSubscription.current.remove();
    }

    Magnetometer.setUpdateInterval(100);
    
    magnetometerSubscription.current = Magnetometer.addListener((data) => {
      const { x, y } = data;
      let magneticHeading = Math.atan2(y, x) * (180 / Math.PI);
      magneticHeading = (magneticHeading + 360) % 360;
      
      setHeading(magneticHeading);
    });
  }, []);

  useEffect(() => {
    setupQibla();
    
    return () => {
      if (magnetometerSubscription.current) {
        magnetometerSubscription.current.remove();
      }
    };
  }, [setupQibla]);

  const handleRecalibrate = useCallback(() => {
    Alert.alert(
      'Recalibrate Compass',
      'Move your device in a figure-8 pattern several times to improve compass accuracy.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Start Calibration', 
          onPress: () => {
            if (magnetometerSubscription.current) {
              magnetometerSubscription.current.remove();
            }
            setupQibla();
          }
        }
      ]
    );
  }, [setupQibla]);

  // Calculate compass rotation and qibla arrow position
  const compassRotationValue = -heading;
  const qiblaArrowRotation = qiblaDirection - heading;

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: isDarkMode ? theme.colors.darkBackground : theme.colors.background }]}>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
        <View style={[styles.loadingContainer, { paddingTop: insets.top + 20 }]}>
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <View style={[styles.loadingCircle, { backgroundColor: isDarkMode ? theme.colors.cardBackgroundDark : theme.colors.white }]}>
              <MaterialCommunityIcons name="compass-outline" size={40} color={theme.colors.primary} />
            </View>
          </Animated.View>
          <Text style={[styles.loadingText, { color: isDarkMode ? theme.colors.white : theme.colors.text }]}>
            Finding your location...
          </Text>
          <Text style={[styles.loadingSubtext, { color: isDarkMode ? theme.colors.lightText : theme.colors.darkGray }]}>
            Please wait while we determine your position
          </Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: isDarkMode ? theme.colors.darkBackground : theme.colors.background }]}>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
        <View style={[styles.errorContainer, { paddingTop: insets.top + 20 }]}>
          <View style={[styles.errorIcon, { backgroundColor: isDarkMode ? theme.colors.cardBackgroundDark : theme.colors.white }]}>
            <Ionicons name="location-outline" size={40} color={theme.colors.error} />
          </View>
          <Text style={[styles.errorTitle, { color: isDarkMode ? theme.colors.white : theme.colors.text }]}>
            Location Access Required
          </Text>
          <Text style={[styles.errorMessage, { color: isDarkMode ? theme.colors.lightText : theme.colors.darkGray }]}>
            {error}
          </Text>
          <TouchableOpacity 
            style={[styles.retryButton, { backgroundColor: theme.colors.primary }]}
            onPress={setupQibla}
          >
            <Text style={styles.retryButtonText}>Allow Location Access</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: isDarkMode ? theme.colors.darkBackground : theme.colors.background }]}
      contentContainerStyle={[styles.contentContainer, { paddingTop: insets.top + theme.spacing.md }]}
      showsVerticalScrollIndicator={false}
    >
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      
      {/* Header - consistent with other screens */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.arabicTitle, { color: isDarkMode ? theme.colors.white : theme.colors.primary }]}>
            اتجاه القبلة
          </Text>
          <Text style={[styles.englishTitle, { color: isDarkMode ? theme.colors.lightText : theme.colors.primaryDark }]}>
            Qibla Direction
          </Text>
        </View>
        <TouchableOpacity 
          style={[styles.calibrateButton, { backgroundColor: isDarkMode ? theme.colors.cardBackgroundDark : theme.colors.white }]}
          onPress={handleRecalibrate}
        >
          <Ionicons name="refresh-outline" size={20} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Location Info Card - consistent with app style */}
      {locationData && (
        <View style={[styles.locationCard, { backgroundColor: isDarkMode ? theme.colors.cardBackgroundDark : theme.colors.white }]}>
          <View style={styles.locationContent}>
            <View style={styles.locationIconContainer}>
              <Ionicons name="location" size={20} color={theme.colors.primary} />
            </View>
            <View style={styles.locationInfo}>
              <Text style={[styles.locationText, { color: isDarkMode ? theme.colors.white : theme.colors.text }]}>
                {locationData.city}, {locationData.country}
              </Text>
              <Text style={[styles.distanceText, { color: isDarkMode ? theme.colors.lightText : theme.colors.darkGray }]}>
                {distance.toLocaleString()} km to Mecca
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Compass Section */}
      <View style={styles.compassSection}>
        <Animated.View 
          style={[
            styles.compassContainer,
            { transform: [{ scale: pulseAnim }] }
          ]}
        >
          {/* Compass Outer Ring */}
          <View style={[styles.compassOuter, { 
            backgroundColor: isDarkMode ? theme.colors.cardBackgroundDark : theme.colors.white,
            borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(93, 113, 226, 0.1)'
          }]}>
            
            {/* Rotating Compass Face */}
            <View
              style={[
                styles.compassFace,
                { transform: [{ rotate: `${compassRotationValue}deg` }] }
              ]}
            >
              
              {/* Compass Marks */}
              {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((angle) => (
                <View
                  key={angle}
                  style={[
                    styles.compassMark,
                    { 
                      transform: [{ rotate: `${angle}deg` }],
                      height: angle % 90 === 0 ? 20 : angle % 30 === 0 ? 12 : 8,
                      backgroundColor: angle % 90 === 0 ? theme.colors.primary : 
                                     isDarkMode ? 'rgba(255, 255, 255, 0.4)' : 'rgba(93, 113, 226, 0.4)'
                    }
                  ]}
                />
              ))}
              
              {/* Cardinal Directions */}
              <View style={[styles.cardinalN, { backgroundColor: theme.colors.primary }]}>
                <Text style={styles.cardinalText}>N</Text>
              </View>
              <View style={[styles.cardinalE, { backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(93, 113, 226, 0.2)' }]}>
                <Text style={[styles.cardinalTextSecondary, { color: isDarkMode ? theme.colors.lightText : theme.colors.primary }]}>E</Text>
              </View>
              <View style={[styles.cardinalS, { backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(93, 113, 226, 0.2)' }]}>
                <Text style={[styles.cardinalTextSecondary, { color: isDarkMode ? theme.colors.lightText : theme.colors.primary }]}>S</Text>
              </View>
              <View style={[styles.cardinalW, { backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(93, 113, 226, 0.2)' }]}>
                <Text style={[styles.cardinalTextSecondary, { color: isDarkMode ? theme.colors.lightText : theme.colors.primary }]}>W</Text>
              </View>
              
            </View>
            
            {/* Fixed Qibla Arrow pointing to calculated direction */}
            <View
              style={[
                styles.qiblaArrow,
                { transform: [{ rotate: `${qiblaArrowRotation}deg` }] }
              ]}
            >
              <View style={[styles.arrowBody, { backgroundColor: theme.colors.primary }]} />
              <View style={[styles.arrowHead, { borderBottomColor: theme.colors.primary }]} />
            </View>
            
            {/* Center Point */}
            <View style={[styles.centerPoint, { backgroundColor: theme.colors.primary }]}>
              <View style={[styles.centerInner, { backgroundColor: isDarkMode ? theme.colors.darkBackground : theme.colors.white }]} />
            </View>
            
          </View>
        </Animated.View>
        
        {/* Qibla Label with Arabic */}
        <View style={[styles.qiblaLabel, { backgroundColor: theme.colors.primary }]}>
          <MaterialCommunityIcons name="mosque" size={16} color="white" style={{ marginRight: 8 }} />
          <Text style={styles.qiblaLabelArabic}>قبلة</Text>
        </View>
      </View>

      {/* Info Cards Row - consistent with app style */}
      <View style={styles.infoRow}>
        <View style={[styles.infoCard, { backgroundColor: isDarkMode ? theme.colors.cardBackgroundDark : theme.colors.white }]}>
          <MaterialCommunityIcons name="compass-outline" size={24} color={theme.colors.primary} />
          <Text style={[styles.infoLabel, { color: isDarkMode ? theme.colors.lightText : theme.colors.darkGray }]}>
            Current Heading
          </Text>
          <Text style={[styles.infoValue, { color: isDarkMode ? theme.colors.white : theme.colors.text }]}>
            {Math.round(heading)}°
          </Text>
        </View>
        
        <View style={[styles.infoCard, { backgroundColor: isDarkMode ? theme.colors.cardBackgroundDark : theme.colors.white }]}>
          <MaterialCommunityIcons name="mosque" size={24} color={theme.colors.primary} />
          <Text style={[styles.infoLabel, { color: isDarkMode ? theme.colors.lightText : theme.colors.darkGray }]}>
            Qibla Direction
          </Text>
          <Text style={[styles.infoValue, { color: isDarkMode ? theme.colors.white : theme.colors.text }]}>
            {Math.round(qiblaDirection)}°
          </Text>
        </View>
      </View>

      {/* Usage Tip - consistent with app messaging */}
      <View style={[styles.tipContainer, { backgroundColor: isDarkMode ? theme.colors.cardBackgroundDark : theme.colors.white }]}>
        <View style={styles.tipIcon}>
          <Ionicons name="information-circle-outline" size={20} color={theme.colors.primary} />
        </View>
        <View style={styles.tipContent}>
          <Text style={[styles.tipTitle, { color: isDarkMode ? theme.colors.white : theme.colors.text }]}>
            For Best Accuracy
          </Text>
          <Text style={[styles.tipText, { color: isDarkMode ? theme.colors.lightText : theme.colors.darkGray }]}>
            Hold your device flat and away from magnetic objects like metal furniture or electronics
          </Text>
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
    paddingBottom: 100, // Account for tab bar
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  loadingCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    ...theme.shadows.medium,
  },
  loadingText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 8,
  },
  loadingSubtext: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    ...theme.shadows.medium,
  },
  errorTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 20,
    textAlign: 'center',
    marginBottom: 12,
  },
  errorMessage: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 32,
  },
  retryButton: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: theme.borderRadius.round,
    ...theme.shadows.medium,
  },
  retryButtonText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
    color: 'white',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.lg,
  },
  arabicTitle: {
    fontFamily: 'Alkalami_400Regular',
    fontSize: 28,
    textAlign: 'right',
    marginBottom: 4,
  },
  englishTitle: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 16,
    textAlign: 'right',
  },
  calibrateButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.small,
  },
  locationCard: {
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.xl,
    ...theme.shadows.small,
  },
  locationContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(93, 113, 226, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  locationInfo: {
    flex: 1,
  },
  locationText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
    marginBottom: 2,
  },
  distanceText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
  },
  compassSection: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  compassContainer: {
    marginBottom: theme.spacing.lg,
  },
  compassOuter: {
    width: COMPASS_SIZE,
    height: COMPASS_SIZE,
    borderRadius: COMPASS_SIZE / 2,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    ...theme.shadows.medium,
  },
  compassFace: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  compassMark: {
    position: 'absolute',
    width: 2,
    top: 8,
    left: '50%',
    marginLeft: -1,
    borderRadius: 1,
  },
  cardinalN: {
    position: 'absolute',
    top: 15,
    left: '50%',
    marginLeft: -16,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.small,
  },
  cardinalE: {
    position: 'absolute',
    right: 15,
    top: '50%',
    marginTop: -16,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardinalS: {
    position: 'absolute',
    bottom: 15,
    left: '50%',
    marginLeft: -16,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardinalW: {
    position: 'absolute',
    left: 15,
    top: '50%',
    marginTop: -16,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardinalText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 14,
    color: 'white',
  },
  cardinalTextSecondary: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12,
  },
  qiblaArrow: {
    position: 'absolute',
    alignItems: 'center',
    width: COMPASS_SIZE,
    height: COMPASS_SIZE,
    justifyContent: 'flex-start',
  },
  arrowBody: {
    width: 4,
    height: COMPASS_SIZE / 2 - 25,
    borderRadius: 2,
    marginTop: 8,
  },
  arrowHead: {
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderBottomWidth: 15,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -1,
  },
  centerPoint: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.small,
  },
  centerInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    position: 'absolute',
  },
  qiblaLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: theme.borderRadius.round,
    ...theme.shadows.small,
  },
  qiblaLabelArabic: {
    fontFamily: 'Alkalami_400Regular',
    fontSize: 16,
    color: 'white',
  },
  infoRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  infoCard: {
    flex: 1,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    ...theme.shadows.small,
  },
  infoLabel: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    marginTop: 8,
    marginBottom: 4,
    textAlign: 'center',
  },
  infoValue: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 20,
  },
  tipContainer: {
    flexDirection: 'row',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    ...theme.shadows.small,
  },
  tipIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    marginBottom: 4,
  },
  tipText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    lineHeight: 18,
  },
});

export default QiblaCompass;