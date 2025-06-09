// App.tsx - Main entry point
import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  useFonts,
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from '@expo-google-fonts/poppins';
import { Alkalami_400Regular } from '@expo-google-fonts/alkalami';
import * as SplashScreen from 'expo-splash-screen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, StyleSheet } from 'react-native';

import AppNavigator from './navigation/AppNavigator';
import WelcomeScreen from './components/WelcomeScreen';
import OnboardingScreen from './components/OnboardingScreen';
import { ThemeProvider } from './components/ThemeContext';
import { theme } from './theme';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function App() {
  const [appState, setAppState] = useState<'loading' | 'welcome' | 'onboarding' | 'main'>('loading');
  
  let [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
    Alkalami_400Regular,
  });

  useEffect(() => {
    if (fontsLoaded) {
      checkAppState();
    }
  }, [fontsLoaded]);

  const checkAppState = async () => {
    try {
      // Check if user has seen welcome screen
      const hasSeenWelcome = await AsyncStorage.getItem('hasSeenWelcome');
      
      // Check if onboarding is completed
      const onboardingData = await AsyncStorage.getItem('salatiOnboarding');
      const parsedOnboarding = onboardingData ? JSON.parse(onboardingData) : null;
      
      if (!hasSeenWelcome) {
        setAppState('welcome');
      } else if (!parsedOnboarding?.completed) {
        setAppState('onboarding');
      } else {
        setAppState('main');
      }
    } catch (error) {
      console.error('Error checking app state:', error);
      setAppState('welcome');
    } finally {
      await SplashScreen.hideAsync();
    }
  };

  const handleWelcomeDone = async () => {
    try {
      await AsyncStorage.setItem('hasSeenWelcome', 'true');
      setAppState('onboarding');
    } catch (error) {
      console.error('Error saving welcome state:', error);
      setAppState('onboarding');
    }
  };

  const handleOnboardingComplete = () => {
    setAppState('main');
  };

  if (!fontsLoaded || appState === 'loading') {
    return <View style={styles.loadingContainer} />;
  }

  if (appState === 'welcome') {
    return (
      <SafeAreaProvider>
        <WelcomeScreen onDone={handleWelcomeDone} />
      </SafeAreaProvider>
    );
  }

  if (appState === 'onboarding') {
    return (
      <SafeAreaProvider>
        <OnboardingScreen onComplete={handleOnboardingComplete} />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <NavigationContainer>
          <StatusBar style="auto" />
          <AppNavigator />
        </NavigationContainer>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: theme.colors.primary,
  },
});
