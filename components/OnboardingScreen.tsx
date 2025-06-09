import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ScrollView,
  Animated,
  Image,
  Alert,
  Switch,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme } from '../theme';
import { geocodeLocation, getCurrentLocation, LocationData } from '../utils/prayerTimes';
import NotificationService from '../services/NotificationService';

const { width, height } = Dimensions.get('window');

interface OnboardingScreenProps {
  onComplete: () => void;
}

interface OnboardingData {
  userName: string;
  location: LocationData | null;
  notificationsEnabled: boolean;
  adhanEnabled: boolean;
  reminderMinutes: number;
  calculationMethod: string;
  language: string;
}

const CALCULATION_METHODS = [
  { id: 'isna', name: 'Islamic Society of North America' },
  { id: 'mwl', name: 'Muslim World League' },
  { id: 'egypt', name: 'Egyptian General Authority' },
  { id: 'makkah', name: 'Umm Al-Qura University' },
  { id: 'morocco', name: 'Morocco - Ministry of AE' },
];

const REMINDER_OPTIONS = [
  { value: 5, label: '5 minutes' },
  { value: 10, label: '10 minutes' },
  { value: 15, label: '15 minutes' },
  { value: 30, label: '30 minutes' },
];

const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onComplete }) => {
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  
  // Form data
  const [onboardingData, setOnboardingData] = useState<OnboardingData>({
    userName: '',
    location: null,
    notificationsEnabled: true,
    adhanEnabled: true,
    reminderMinutes: 15,
    calculationMethod: 'isna',
    language: 'English',
  });
  
  const [citySearch, setCitySearch] = useState('');
  const [locationMethod, setLocationMethod] = useState<'auto' | 'manual'>('auto');

  const steps = [
    { id: 'welcome', title: 'Welcome to Salati', subtitle: 'Your Islamic companion' },
    { id: 'name', title: 'What\'s your name?', subtitle: 'Personalize your experience' },
    { id: 'location', title: 'Set your location', subtitle: 'For accurate prayer times' },
    { id: 'notifications', title: 'Prayer notifications', subtitle: 'Stay connected with Allah' },
    { id: 'preferences', title: 'Prayer preferences', subtitle: 'Customize your settings' },
    { id: 'complete', title: 'All set!', subtitle: 'Let\'s begin your journey' },
  ];

  useEffect(() => {
    // Animate in on mount
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  useEffect(() => {
    // Update progress animation
    Animated.timing(progressAnim, {
      toValue: currentStep / (steps.length - 1),
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [currentStep]);

  const handleNext = async () => {
    if (currentStep === steps.length - 1) {
      await handleComplete();
      return;
    }

    // Validation for each step
    if (currentStep === 1 && !onboardingData.userName.trim()) {
      Alert.alert('Name Required', 'Please enter your name to continue');
      return;
    }

    if (currentStep === 2 && !onboardingData.location) {
      Alert.alert('Location Required', 'Please set your location to get accurate prayer times');
      return;
    }

    setCurrentStep(prev => prev + 1);
    
    // Scroll to next section
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({
        x: (currentStep + 1) * width,
        animated: true,
      });
    }, 100);
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
      scrollViewRef.current?.scrollTo({
        x: (currentStep - 1) * width,
        animated: true,
      });
    }
  };

  const handleLocationAuto = async () => {
    setLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Location permission is needed for accurate prayer times');
        setLoading(false);
        return;
      }

      const location = await getCurrentLocation();
      setOnboardingData(prev => ({ ...prev, location }));
      setLocationMethod('auto');
    } catch (error) {
      Alert.alert('Error', 'Could not get your location. Please try manual entry.');
      setLocationMethod('manual');
    } finally {
      setLoading(false);
    }
  };

  const handleLocationManual = async () => {
    if (!citySearch.trim()) {
      Alert.alert('City Required', 'Please enter a city name');
      return;
    }

    setLoading(true);
    try {
      const location = await geocodeLocation(citySearch);
      setOnboardingData(prev => ({ ...prev, location }));
      setLocationMethod('manual');
    } catch (error) {
      Alert.alert('Error', 'Could not find the specified location. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    try {
      setLoading(true);

      // Save onboarding data
      await AsyncStorage.setItem('salatiOnboarding', JSON.stringify({
        completed: true,
        timestamp: new Date().toISOString(),
        ...onboardingData,
      }));

      // Save settings for the app
      const settings = {
        userName: onboardingData.userName,
        location: onboardingData.location,
        notificationsEnabled: onboardingData.notificationsEnabled,
        adhanEnabled: onboardingData.adhanEnabled,
        reminderMinutes: onboardingData.reminderMinutes,
        calculationMethod: onboardingData.calculationMethod,
        language: onboardingData.language,
        isDarkMode: false, // Default to light mode
        vibrationEnabled: true,
        useCompass: true,
        showDegrees: true,
      };

      await AsyncStorage.setItem('salatiSettings', JSON.stringify(settings));

      // Initialize notifications if enabled
      if (onboardingData.notificationsEnabled) {
        const notificationService = NotificationService.getInstance();
        await notificationService.initialize();
        await notificationService.updateSettings({
          notificationsEnabled: onboardingData.notificationsEnabled,
          adhanEnabled: onboardingData.adhanEnabled,
          reminderMinutes: onboardingData.reminderMinutes,
          vibrationEnabled: true,
        });
      }

      onComplete();
    } catch (error) {
      console.error('Error completing onboarding:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderWelcomeStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.welcomeImageContainer}>
        <Image
          source={require('../assets/h2.png')}
          style={styles.welcomeLogo}
          resizeMode="contain"
        />
      </View>
      <View style={styles.welcomeContent}>
        <Text style={styles.welcomeTitle}>Welcome to <Text style={styles.welcomeAppName}>صلاتي</Text></Text>
        
        <Text style={styles.welcomeSubtitle}>
          Your companion for prayer times, Qibla direction, and Islamic guidance
        </Text>
        <View style={styles.welcomeFeatures}>
          <View style={styles.featureItem}>
            <MaterialCommunityIcons name="clock-outline" size={20} color="rgba(255,255,255,0.9)" />
            <Text style={styles.featureText}>Accurate prayer times</Text>
          </View>
          <View style={styles.featureItem}>
            <MaterialCommunityIcons name="compass-outline" size={20} color="rgba(255,255,255,0.9)" />
            <Text style={styles.featureText}>Qibla direction</Text>
          </View>
          <View style={styles.featureItem}>
            <MaterialCommunityIcons name="bell-outline" size={20} color="rgba(255,255,255,0.9)" />
            <Text style={styles.featureText}>Prayer reminders</Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderNameStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeader}>
        <MaterialCommunityIcons name="account-outline" size={60} color={theme.colors.white} />
        <Text style={styles.stepTitle}>What's your name?</Text>
        <Text style={styles.stepSubtitle}>We'd love to personalize your experience</Text>
      </View>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          placeholder="Enter your name"
          placeholderTextColor="rgba(255,255,255,0.6)"
          value={onboardingData.userName}
          onChangeText={(text) => setOnboardingData(prev => ({ ...prev, userName: text }))}
          autoFocus
        />
      </View>
    </View>
  );

  const renderLocationStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeader}>
        <MaterialCommunityIcons name="map-marker-outline" size={60} color={theme.colors.white} />
        <Text style={styles.stepTitle}>Set your location</Text>
        <Text style={styles.stepSubtitle}>For accurate prayer times in your area</Text>
      </View>
      
      {!onboardingData.location ? (
        <View style={styles.locationOptions}>
          <TouchableOpacity
            style={[styles.locationButton, styles.primaryLocationButton]}
            onPress={handleLocationAuto}
            disabled={loading}
          >
            <MaterialCommunityIcons name="crosshairs-gps" size={29} color="white" />
            <Text style={styles.locationButtonText}>Use Current Location</Text>
            {loading && locationMethod === 'auto' && (
              <Ionicons name="refresh" size={20} color="white" style={styles.loadingIcon} />
            )}
          </TouchableOpacity>
          
          <View style={styles.dividerContainer}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.divider} />
          </View>
          
          <View style={styles.manualLocationContainer}>
            <TextInput
              style={styles.textInput}
              placeholder="Enter city name"
              placeholderTextColor="rgba(255,255,255,0.6)"
              value={citySearch}
              onChangeText={setCitySearch}
            />
            <TouchableOpacity
              style={styles.searchButton}
              onPress={handleLocationManual}
              disabled={loading}
            >
              <MaterialCommunityIcons name="magnify" size={24} color={theme.colors.white} />
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.locationConfirmed}>
          <View style={styles.locationCard}>
            <MaterialCommunityIcons name="check-circle" size={30} color={theme.colors.success} />
            <View style={styles.locationInfo}>
              <Text style={styles.locationText}>
                {onboardingData.location.city}, {onboardingData.location.country}
              </Text>
              <Text style={styles.coordinatesText}>
                {onboardingData.location.latitude.toFixed(2)}°, {onboardingData.location.longitude.toFixed(2)}°
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.changeLocationButton}
            onPress={() => setOnboardingData(prev => ({ ...prev, location: null }))}
          >
            <Text style={styles.changeLocationText}>Change location</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderNotificationsStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeader}>
        <MaterialCommunityIcons name="bell-outline" size={60} color={theme.colors.white} />
        <Text style={styles.stepTitle}>Prayer notifications</Text>
        <Text style={styles.stepSubtitle}>Never miss a prayer with timely reminders</Text>
      </View>
      
      <View style={styles.settingsContainer}>
        <View style={styles.settingItem}>
          <View style={styles.settingLeft}>
            <MaterialCommunityIcons name="bell" size={24} color={theme.colors.white} />
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingTitle}>Enable Notifications</Text>
              <Text style={styles.settingDescription}>Get reminded before prayer times</Text>
            </View>
          </View>
          <Switch
            value={onboardingData.notificationsEnabled}
            onValueChange={(value) => setOnboardingData(prev => ({ ...prev, notificationsEnabled: value }))}
            thumbColor={onboardingData.notificationsEnabled ? theme.colors.white : '#f4f3f4'}
            trackColor={{ false: '#767577', true: theme.colors.primary }}
          />
        </View>
        
        {onboardingData.notificationsEnabled && (
          <>
            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <MaterialCommunityIcons name="music" size={24} color={theme.colors.white} />
                <View style={styles.settingTextContainer}>
                  <Text style={styles.settingTitle}>Adhan Sound</Text>
                  <Text style={styles.settingDescription}>Play adhan at prayer times</Text>
                </View>
              </View>
              <Switch
                value={onboardingData.adhanEnabled}
                onValueChange={(value) => setOnboardingData(prev => ({ ...prev, adhanEnabled: value }))}
                thumbColor={onboardingData.adhanEnabled ? theme.colors.white : '#f4f3f4'}
                trackColor={{ false: '#767577', true: theme.colors.primary }}
              />
            </View>
            
            <View style={styles.reminderSection}>
              <Text style={styles.reminderTitle}>Reminder Time</Text>
              <View style={styles.reminderOptions}>
                {REMINDER_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.reminderOption,
                      onboardingData.reminderMinutes === option.value && styles.reminderOptionSelected
                    ]}
                    onPress={() => setOnboardingData(prev => ({ ...prev, reminderMinutes: option.value }))}
                  >
                    <Text style={[
                      styles.reminderOptionText,
                      onboardingData.reminderMinutes === option.value && styles.reminderOptionTextSelected
                    ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </>
        )}
      </View>
    </View>
  );

  const renderPreferencesStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeader}>
        <MaterialCommunityIcons name="cog-outline" size={60} color={theme.colors.white} />
        <Text style={styles.stepTitle}>Prayer preferences</Text>
        <Text style={styles.stepSubtitle}>Customize your prayer calculation method</Text>
      </View>
      
      <View style={styles.settingsContainer}>
        <Text style={styles.sectionTitle}>Calculation Method</Text>
        <View style={styles.methodsContainer}>
          {CALCULATION_METHODS.map((method) => (
            <TouchableOpacity
              key={method.id}
              style={[
                styles.methodOption,
                onboardingData.calculationMethod === method.id && styles.methodOptionSelected
              ]}
              onPress={() => setOnboardingData(prev => ({ ...prev, calculationMethod: method.id }))}
            >
              <View style={styles.methodOptionContent}>
                <View style={[
                  styles.radioButton,
                  onboardingData.calculationMethod === method.id && styles.radioButtonSelected
                ]}>
                  {onboardingData.calculationMethod === method.id && (
                    <View style={styles.radioButtonInner} />
                  )}
                </View>
                <Text style={[
                  styles.methodOptionText,
                  onboardingData.calculationMethod === method.id && styles.methodOptionTextSelected
                ]}>
                  {method.name}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );

  const renderCompleteStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.completeContainer}>
        <View style={styles.successIcon}>
          <MaterialCommunityIcons name="check-circle" size={80} color={theme.colors.white} />
        </View>
        <Text style={styles.completeTitle}>All set!</Text>
        <Text style={styles.completeSubtitle}>
          Welcome to Salati, {onboardingData.userName}! Your personalized prayer companion is ready.
        </Text>
        <View style={styles.summaryContainer}>
          <View style={styles.summaryItem}>
            <MaterialCommunityIcons name="map-marker" size={20} color="rgba(255,255,255,0.8)" />
            <Text style={styles.summaryText}>
              {onboardingData.location?.city}, {onboardingData.location?.country}
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <MaterialCommunityIcons name="bell" size={20} color="rgba(255,255,255,0.8)" />
            <Text style={styles.summaryText}>
              {onboardingData.notificationsEnabled ? 'Notifications enabled' : 'Notifications disabled'}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderStep = () => {
    switch (currentStep) {
      case 0: return renderWelcomeStep();
      case 1: return renderNameStep();
      case 2: return renderLocationStep();
      case 3: return renderNotificationsStep();
      case 4: return renderPreferencesStep();
      case 5: return renderCompleteStep();
      default: return renderWelcomeStep();
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient
        colors={[theme.colors.primary, theme.colors.primaryLight]}
        style={styles.background}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Decorative elements */}
        <View style={styles.decorativeCircle1} />
        <View style={styles.decorativeCircle2} />
        
        {/* Progress bar */}
        <View style={[styles.progressContainer, { paddingTop: insets.top + 20 }]}>
          <View style={styles.progressBar}>
            <Animated.View
              style={[
                styles.progressFill,
                {
                  width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {currentStep + 1} of {steps.length}
          </Text>
        </View>

        {/* Content */}
        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <ScrollView
            ref={scrollViewRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            scrollEnabled={false}
            contentContainerStyle={styles.scrollContent}
          >
            {renderStep()}
          </ScrollView>
        </Animated.View>

        {/* Navigation buttons */}
        <View style={[styles.navigation, { paddingBottom: insets.bottom + 20 }]}>
          {currentStep > 0 && (
            <TouchableOpacity style={styles.backButton} onPress={handleBack}>
              <Ionicons name="chevron-back" size={24} color="rgba(255,255,255,0.8)" />
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={[styles.nextButton, loading && styles.nextButtonDisabled]}
            onPress={handleNext}
            disabled={loading}
          >
            {loading ? (
              <Ionicons name="refresh" size={24} color="white" style={styles.loadingIcon} />
            ) : (
              <>
                <Text style={styles.nextButtonText}>
                  {currentStep === steps.length - 1 ? 'Get Started' : 'Continue'}
                </Text>
                <Ionicons name="chevron-forward" size={24} color="white" />
              </>
            )}
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    flex: 1,
  },
  decorativeCircle1: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  decorativeCircle2: {
    position: 'absolute',
    bottom: -80,
    left: -80,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  progressContainer: {
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: 'white',
    borderRadius: 2,
  },
  progressText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 18,
    fontFamily: 'Poppins_500Medium',
    textAlign: 'center',
    marginTop: 8,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  stepContainer: {
    width: width,
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  welcomeImageContainer: {
    alignItems: 'center',
  },
  welcomeLogo: {
    width: width * 0.8,
    height: 200,
    tintColor: 'white',
    marginBottom: 20,

  },
  welcomeContent: {
    alignItems: 'center',
  },
  welcomeTitle: {
    fontSize: 26,
    fontFamily: 'Poppins_600SemiBold',
    color: 'white',
    marginBottom: 8,
  },
  welcomeAppName: {
    fontSize: 32,
    fontFamily: 'Alkalami_400Regular',
    color: 'white',
    marginBottom: 16,
  },
  welcomeSubtitle: {
    fontSize: 16,
    fontFamily: 'Poppins_400Regular',
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  welcomeFeatures: {
    alignSelf: 'stretch',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  featureText: {
    fontSize: 16,
    fontFamily: 'Poppins_500Medium',
    color: 'rgba(255, 255, 255, 0.9)',
    marginLeft: 16,
  },
  stepHeader: {
    alignItems: 'center',
    marginBottom: 40,
  },
  stepTitle: {
    fontSize: 28,
    fontFamily: 'Poppins_700Bold',
    color: 'white',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 16,
    fontFamily: 'Poppins_400Regular',
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    lineHeight: 24,
  },
  inputContainer: {
    marginBottom: 20,
  },
  textInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 16,
    fontFamily: 'Poppins_500Medium',
    color: 'white',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  locationOptions: {
    gap: 20,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 16,
    gap: 12,
  },
  primaryLocationButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  locationButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: 'white',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  dividerText: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  manualLocationContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  searchButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 16,
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  locationConfirmed: {
    alignItems: 'center',
    gap: 20,
  },
  locationCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    alignSelf: 'stretch',
  },
  locationInfo: {
    flex: 1,
  },
  locationText: {
    fontSize: 18,
    fontFamily: 'Poppins_600SemiBold',
    color: 'white',
    marginBottom: 4,
  },
  coordinatesText: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  changeLocationButton: {
    padding: 12,
  },
  changeLocationText: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: 'rgba(255, 255, 255, 0.8)',
    textDecorationLine: 'underline',
  },
  settingsContainer: {
    gap: 24,
  },
  settingItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 16,
  },
  settingTextContainer: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: 'white',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  reminderSection: {
    gap: 16,
  },
  reminderTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_600SemiBold',
    color: 'white',
  },
  reminderOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  reminderOption: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  reminderOptionSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderColor: 'white',
  },
  reminderOptionText: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  reminderOptionTextSelected: {
    color: 'white',
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_600SemiBold',
    color: 'white',
    marginBottom: 8,
  },
  methodsContainer: {
    gap: 12,
  },
  methodOption: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  methodOptionSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderColor: 'white',
  },
  methodOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonSelected: {
    borderColor: 'white',
  },
  radioButtonInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'white',
  },
  methodOptionText: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: 'rgba(255, 255, 255, 0.8)',
    flex: 1,
  },
  methodOptionTextSelected: {
    color: 'white',
  },
  completeContainer: {
    alignItems: 'center',
  },
  successIcon: {
    marginBottom: 32,
  },
  completeTitle: {
    fontSize: 32,
    fontFamily: 'Poppins_700Bold',
    color: 'white',
    marginBottom: 16,
  },
  completeSubtitle: {
    fontSize: 16,
    fontFamily: 'Poppins_400Regular',
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  summaryContainer: {
    alignSelf: 'stretch',
    gap: 16,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
  },
  summaryText: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: 'rgba(255, 255, 255, 0.8)',
    flex: 1,
  },
  navigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
  },
  backButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins_500Medium',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  nextButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    minWidth: 140,
    justifyContent: 'center',
  },
  nextButtonDisabled: {
    opacity: 0.5,
  },
  nextButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: 'white',
  },
  loadingIcon: {
    // Animation will be handled by React Native
  },
});

export default OnboardingScreen;
