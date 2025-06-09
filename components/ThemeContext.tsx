import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme } from '../theme'; // Import centralized theme

type ThemeContextType = {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  theme: typeof theme;
};

export const ThemeContext = createContext<ThemeContextType>({
  isDarkMode: false,
  toggleDarkMode: () => {},
  theme,
});

export const ThemeProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Load the theme setting on app start
  useEffect(() => {
    const loadThemeSettings = async () => {
      try {
        const settings = await AsyncStorage.getItem('salatiSettings');
        if (settings) {
          const parsedSettings = JSON.parse(settings);
          setIsDarkMode(parsedSettings.isDarkMode);
        }
      } catch (error) {
        console.error('Failed to load theme settings:', error);
      }
    };

    loadThemeSettings();
  }, []);

  // Toggle function that also saves to AsyncStorage
  const toggleDarkMode = async () => {
    try {
      // Get current settings first
      const settingsStr = await AsyncStorage.getItem('salatiSettings');
      let settings = settingsStr ? JSON.parse(settingsStr) : {};
      
      // Update dark mode setting
      const newDarkModeSetting = !isDarkMode;
      settings.isDarkMode = newDarkModeSetting;
      
      // Save updated settings
      await AsyncStorage.setItem('salatiSettings', JSON.stringify(settings));
      
      // Update state
      setIsDarkMode(newDarkModeSetting);
    } catch (error) {
      console.error('Failed to save theme settings:', error);
    }
  };

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleDarkMode, theme }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Custom hook for easier theme access
export const useTheme = () => useContext(ThemeContext);