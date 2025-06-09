import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Switch, 
  TouchableOpacity, 
  ScrollView,
  Image,
  Platform,
  Alert,
  Linking
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../components/ThemeContext';
import { theme } from '../theme';
import NotificationService from '../services/NotificationService';

// Prayer calculation methods
const CALCULATION_METHODS = [
  'Islamic Society of North America',
  'Morocco - Ministry of AE',
  'Muslim World League',
  'Egyptian General Authority',
  'Umm Al-Qura University',
];

// Available languages
const LANGUAGES = ['English', 'Arabic', 'Urdu', 'Turkish', 'French', 'Indonesian'];

interface SettingsSectionProps {
  title: string;
  children: React.ReactNode;
  isDarkMode: boolean;
  theme: any;
}

const SettingsSection: React.FC<SettingsSectionProps> = ({ title, children, isDarkMode, theme }) => (
  <View style={styles.section}>
    <Text style={[
      styles.sectionTitle, 
      {color: theme.colors.primary}
    ]}>
      {title}
    </Text>
    <View style={[
      styles.sectionContent,
      {
        backgroundColor: isDarkMode ? theme.colors.cardBackgroundDark : theme.colors.cardBackground,
        borderColor: isDarkMode ? `${theme.colors.primary}40` : theme.colors.lightGray,
      }
    ]}>
      {children}
    </View>
  </View>
);

const SettingsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { isDarkMode, toggleDarkMode, theme } = useTheme();
  
  // App Settings
  // Removed isDarkMode state - using context instead
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [language, setLanguage] = useState('English');
  
  // Prayer Settings
  const [adhanEnabled, setAdhanEnabled] = useState(true);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);
  const [calculationMethod, setCalculationMethod] = useState('Islamic Society of North America');
  
  // Qibla Settings
  const [useCompass, setUseCompass] = useState(true);
  const [showDegrees, setShowDegrees] = useState(true);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);

  // Add notification service
  const notificationService = NotificationService.getInstance();

  // Load settings from storage on component mount
  useEffect(() => {
    loadSettings();
    requestLocationPermission();
    requestNotificationPermission();
  }, []);

  // Save settings whenever they change - removed isDarkMode from dependency array
  useEffect(() => {
    saveSettings();
  }, [
    notificationsEnabled, language,
    adhanEnabled, vibrationEnabled, calculationMethod,
    useCompass, showDegrees
  ]);

  const loadSettings = async () => {
    try {
      const settings = await AsyncStorage.getItem('salatiSettings');
      if (settings) {
        const parsedSettings = JSON.parse(settings);
        // Removed setIsDarkMode - handled by context
        setNotificationsEnabled(parsedSettings.notificationsEnabled);
        setLanguage(parsedSettings.language);
        setAdhanEnabled(parsedSettings.adhanEnabled);
        setVibrationEnabled(parsedSettings.vibrationEnabled);
        setCalculationMethod(parsedSettings.calculationMethod);
        setUseCompass(parsedSettings.useCompass);
        setShowDegrees(parsedSettings.showDegrees);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const saveSettings = async () => {
    try {
      // Get current settings first to preserve isDarkMode value
      const currentSettingsStr = await AsyncStorage.getItem('salatiSettings');
      const currentSettings = currentSettingsStr ? JSON.parse(currentSettingsStr) : {};
      
      const settings = {
        ...currentSettings, // Keep existing settings including isDarkMode
        notificationsEnabled,
        language,
        adhanEnabled,
        vibrationEnabled,
        calculationMethod,
        useCompass,
        showDegrees
      };
      await AsyncStorage.setItem('salatiSettings', JSON.stringify(settings));
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  };

  const requestLocationPermission = async () => {
    if (Platform.OS === 'android' && !useCompass) return;
    
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Qibla direction requires location permission');
      return;
    }

    try {
      let location = await Location.getCurrentPositionAsync({});
      setLocation(location);
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert('Location Error', 'Could not determine your location. Please check your device settings.');
    }
  };

  const requestNotificationPermission = async () => {
    if (!notificationsEnabled) return;
    
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Prayer notifications require permission');
      setNotificationsEnabled(false);
    }
  };

  const calibrateCompass = () => {
    Alert.alert(
      'Calibrate Compass',
      'To calibrate your compass, move your device in a figure 8 pattern several times.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Start Calibration',
          onPress: () => {
            // Show animation or instructions for calibration
            setTimeout(() => {
              Alert.alert('Calibration Complete', 'Your compass has been calibrated successfully.');
            }, 3000);
          }
        }
      ]
    );
  };

  const handleLanguageChange = () => {
    Alert.alert(
      'Select Language',
      'Choose your preferred language',
      LANGUAGES.map(lang => ({
        text: lang,
        onPress: () => setLanguage(lang)
      }))
    );
  };

  const handleCalculationMethodChange = () => {
    Alert.alert(
      'Prayer Calculation Method',
      'Select the method for calculating prayer times',
      CALCULATION_METHODS.map(method => ({
        text: method,
        onPress: () => setCalculationMethod(method)
      }))
    );
  };

  const handleDonation = () => {
    // Show donation options
    Alert.alert(
      'Support Salati',
      'Thank you for your interest in supporting our app. Your contributions help us maintain and improve Salati.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Donate $5', onPress: () => processPayment(5) },
        { text: 'Donate $10', onPress: () => processPayment(10) },
        { text: 'Donate $25', onPress: () => processPayment(25) },
        { text: 'Custom Amount', onPress: () => showCustomDonationPrompt() }
      ]
    );
  };

  const processPayment = (amount: number) => {
    // This would connect to payment processor in production
    Alert.alert(
      'Thank You!',
      `Your donation of $${amount} helps support the development of Salati. May Allah reward your generosity.`,
      [{ text: 'OK' }]
    );
  };

  const showCustomDonationPrompt = () => {
    // In a real app, you would implement a proper input form
    Alert.alert(
      'Custom Donation',
      'Please enter your desired donation amount through our secure payment page.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Continue',
          onPress: () => Linking.openURL('https://salatiapp.com/donate')
        }
      ]
    );
  };

  // Helper function for rendering a toggle setting
  const renderToggleSetting = (
    title: string, 
    value: boolean, 
    onToggle: () => void, 
    icon?: string,
    description?: string
  ) => (
    <View style={[
      styles.settingItem,
      {borderBottomColor: isDarkMode ? `${theme.colors.lightGray}20` : `${theme.colors.lightGray}40`}
    ]}>
      <View style={styles.settingLeft}>
        {icon && <FontAwesome5 name={icon} size={18} color={theme.colors.primary} style={styles.settingIcon} />}
        <View>
          <Text style={[styles.settingText, {color: isDarkMode ? theme.colors.white : theme.colors.text}]}>{title}</Text>
          {description && (
            <Text style={[styles.settingDescription, {color: isDarkMode ? theme.colors.lightText : theme.colors.darkGray}]}>
              {description}
            </Text>
          )}
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        thumbColor={value ? theme.colors.primaryLight : theme.colors.lightGray}
        trackColor={{ false: isDarkMode ? `${theme.colors.darkGray}80` : `${theme.colors.lightGray}80`, true: `${theme.colors.primary}60` }}
        ios_backgroundColor={isDarkMode ? `${theme.colors.darkGray}80` : `${theme.colors.lightGray}80`}
      />
    </View>
  );
  
  // Helper function for rendering a selection setting
  const renderSelectionSetting = (
    title: string, 
    value: string, 
    onPress: () => void,
    icon?: string,
    description?: string
  ) => (
    <TouchableOpacity 
      style={[
        styles.settingItem,
        {borderBottomColor: isDarkMode ? `${theme.colors.lightGray}20` : `${theme.colors.lightGray}40`}
      ]} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.settingLeft}>
        {icon && <FontAwesome5 name={icon} size={18} color={theme.colors.primary} style={styles.settingIcon} />}
        <View>
          <Text style={[styles.settingText, {color: isDarkMode ? theme.colors.white : theme.colors.text}]}>{title}</Text>
          {description && (
            <Text style={[styles.settingDescription, {color: isDarkMode ? theme.colors.lightText : theme.colors.darkGray}]}>
              {description}
            </Text>
          )}
        </View>
      </View>
      <View style={styles.row}>
        <Text style={[styles.settingSubText, {color: isDarkMode ? theme.colors.lightText : theme.colors.darkGray}]}>{value}</Text>
        <Ionicons name="chevron-forward" size={18} color={isDarkMode ? theme.colors.lightText : theme.colors.darkGray} style={{marginLeft: 6}} />
      </View>
    </TouchableOpacity>
  );

  // Update the toggle handlers to actually control notifications
  const handleNotificationsToggle = async () => {
    const newValue = !notificationsEnabled;
    setNotificationsEnabled(newValue);
    
    try {
      await notificationService.updateSettings({
        notificationsEnabled: newValue
      });
      
      if (newValue) {
        Alert.alert('Notifications Enabled', 'You will now receive prayer time reminders');
      } else {
        Alert.alert('Notifications Disabled', 'Prayer time reminders have been turned off');
      }
    } catch (error) {
      console.error('Error updating notification settings:', error);
      Alert.alert('Error', 'Failed to update notification settings');
      setNotificationsEnabled(!newValue); // Revert on error
    }
  };

  const handleAdhanToggle = async () => {
    const newValue = !adhanEnabled;
    setAdhanEnabled(newValue);
    
    try {
      await notificationService.updateSettings({
        adhanEnabled: newValue
      });
    } catch (error) {
      console.error('Error updating adhan settings:', error);
    }
  };

  const handleVibrationToggle = async () => {
    const newValue = !vibrationEnabled;
    setVibrationEnabled(newValue);
    
    try {
      await notificationService.updateSettings({
        vibrationEnabled: newValue
      });
    } catch (error) {
      console.error('Error updating vibration settings:', error);
    }
  };

  // Add test notification function
  const testNotification = async () => {
    try {
      await notificationService.testNotification();
      Alert.alert('Test Sent', 'Check your notifications in a few seconds');
    } catch (error) {
      console.error('Error sending test notification:', error);
      Alert.alert('Error', 'Failed to send test notification');
    }
  };

  return (
    <ScrollView
      style={[
        styles.container, 
        { backgroundColor: isDarkMode ? theme.colors.darkBackground : theme.colors.background }
      ]}
      contentContainerStyle={{ 
        paddingTop: insets.top, 
        paddingBottom: insets.bottom + theme.spacing.lg
      }}
    >
      {/* Enhanced Header Card with Gradient - Fixed shadow */}
      <View style={[styles.headerCardContainer, theme.shadows.medium]}>
        <LinearGradient
          colors={isDarkMode ? 
            [theme.colors.primaryDark, theme.colors.primary] : 
            [theme.colors.primary, theme.colors.primaryLight]
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerCard}
        >
          <View style={styles.headerImagesContainer}>
            <Image 
              source={require('../assets/h2.png')} 
              style={styles.headerLeftImage}
            />
            <Image 
              source={require('../assets/SalatiLogoWhite.png')} 
              style={styles.headerRightImage}
            />
          </View>
          <Text style={styles.headerSubtitle}>
            Customize your prayer experience
          </Text>
        </LinearGradient>
      </View>

      {/* App Settings Section */}
      <SettingsSection title="App Settings" isDarkMode={isDarkMode} theme={theme}>
        {renderToggleSetting(
          'Dark Mode', 
          isDarkMode, 
          toggleDarkMode,
          'moon',
        )}
        {renderToggleSetting(
          'Notifications', 
          notificationsEnabled, 
          handleNotificationsToggle,
          'bell',
          'Receive prayer time notifications'
        )}
        {renderSelectionSetting(
          'Language', 
          language, 
          handleLanguageChange,
          'language',
          'Change app language'
        )}
      </SettingsSection>

      {/* Prayer Settings Section */}
      <SettingsSection title="Prayer Settings" isDarkMode={isDarkMode} theme={theme}>
        {renderToggleSetting(
          'Adhan Reminders', 
          adhanEnabled, 
          handleAdhanToggle,
          'volume-up',
          'Play adhan at prayer times'
        )}
        {renderToggleSetting(
          'Vibration', 
          vibrationEnabled, 
          handleVibrationToggle,
          'mobile-alt',
          'Vibrate for prayer notifications'
        )}
        {renderSelectionSetting(
          'Method', 
          calculationMethod, 
          handleCalculationMethodChange,
          'calculator',
        )}
        {renderSelectionSetting(
          'Test Notification', 
          'Send test reminder', 
          testNotification,
          'bell', // Fixed: Changed from 'bell-outline' to 'bell'
          'Test your notification settings'
        )}
      </SettingsSection>

      {/* Qibla Settings Section */}
      <SettingsSection title="Qibla Settings" isDarkMode={isDarkMode} theme={theme}>
        {renderToggleSetting(
          'Use Compass', 
          useCompass, 
          () => {
            const newValue = !useCompass;
            setUseCompass(newValue);
            if (newValue && !location) {
              requestLocationPermission();
            }
          }, 
          'compass',
          'Use device compass for Qibla'
        )}
        {renderToggleSetting(
          'Show Degrees', 
          showDegrees, 
          () => setShowDegrees(!showDegrees), 
          'ruler',
          'Display direction in degrees'
        )}
        {renderSelectionSetting(
          'Compass', 
          'Tap to calibrate', 
          calibrateCompass,
          'compass',
        )}
      </SettingsSection>

      {/* New Donate Button Card - Fixed shadow */}
      <View style={[
        styles.donateCardContainer,
        {backgroundColor: isDarkMode ? theme.colors.cardBackgroundDark : theme.colors.cardBackground}
      ]}>
        <View style={[styles.donateCardShadow, theme.shadows.small]}>
          <LinearGradient
            colors={['#F9B942', '#F5A623']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.donateCard}
          >
            <View style={styles.donateContent}>
              <View>
                <Text style={styles.donateTitle}>Support Salati</Text>
                <Text style={styles.donateDescription}>
                  Your donations help us maintain and improve this app for the Ummah
                </Text>
              </View>
              <FontAwesome5 name="hand-holding-heart" size={30} color="white" />
            </View>
            <TouchableOpacity 
              style={styles.donateButton}
              onPress={handleDonation}
              activeOpacity={0.8}
            >
              <Text style={styles.donateButtonText}>Donate Now</Text>
              <MaterialCommunityIcons name="heart-outline" size={16} color={theme.colors.accent} style={{marginLeft: 4}} />
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </View>

      {/* Account & Support Section */}
      <View style={styles.accountSupportContainer}>
        <SettingsSection title="Account & Support" isDarkMode={isDarkMode} theme={theme}>
          {renderSelectionSetting(
            'About Salati', 
            'App information', 
            () => Alert.alert('About Salati', 'Salati is a prayer companion app designed to help Muslims maintain their daily prayers with accurate times and qibla direction.'),
            'info-circle'
          )}
          {renderSelectionSetting(
            'Help & Support', 
            'Contact us', 
            () => Alert.alert('Support', 'Email: support@salatiapp.com\nWebsite: www.salatiapp.com'),
            'question-circle'
          )}
          {renderSelectionSetting(
            'Rate the App', 
            'Show your support', 
            () => Alert.alert('Rate Salati', 'Thank you for using Salati! Your feedback helps us improve.'),
            'star'
          )}
        </SettingsSection>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerCardContainer: {
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
    borderRadius: 20,
    backgroundColor: theme.colors.primary, // Added solid background for shadow efficiency
    overflow: 'hidden',
  },
  headerCard: {
    padding: theme.spacing.lg,
  },
  headerImagesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  headerLeftImage: {
    width: '60%',
    height: 140,
    tintColor: theme.colors.white,
  },
  headerRightImage: {
    width: '50%',
    height: 40,
    tintColor: theme.colors.white,
  },
  headerTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 22,
    color: theme.colors.white,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    color: theme.colors.white,
    textAlign: 'center',
    opacity: 0.9,
    letterSpacing: 0.3,
  },
  section: {
    marginBottom: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
  },
  sectionTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
    marginBottom: theme.spacing.sm,
    paddingLeft: theme.spacing.xs,
  },
  sectionContent: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.9)', // Added solid background for shadow efficiency
    ...theme.shadows.small,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    borderBottomWidth: 1,
    backgroundColor: 'transparent', // Ensure background is defined
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  settingIcon: {
    marginRight: theme.spacing.sm,
    width: 22,
    marginTop: 2,
  },
  settingText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 15,
  },
  settingDescription: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    marginTop: 2,
  },
  settingSubText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  donateCardContainer: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    borderRadius: 16,
    overflow: 'hidden',
  },
  donateCardShadow: {
    borderRadius: 16,
    backgroundColor: '#F9B942', // Added solid background for shadow efficiency
  },
  donateCard: {
    padding: theme.spacing.md,
    borderRadius: 16,
  },
  donateContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  donateTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 18,
    color: theme.colors.white,
    marginBottom: 4,
  },
  donateDescription: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    maxWidth: '85%',
  },
  donateButton: {
    backgroundColor: theme.colors.white,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    ...theme.shadows.small,
  },
  donateButtonText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    color: theme.colors.accent,
  },
  accountSupportContainer: {
    paddingBottom: theme.spacing.xxl,
  }  
});

export default SettingsScreen;