// components/WelcomeScreen.tsx
import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Image, Dimensions, TouchableOpacity, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AnimatedBackground from './AnimatedBackground';
import { theme } from '../theme';

const { width, height } = Dimensions.get('window');

interface WelcomeScreenProps {
  onDone: () => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onDone }) => {
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    // Fade in animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  return (
    <AnimatedBackground>
      <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        {/* Mosque silhouette image */}
        <View style={styles.imageContainer}>
          <Image
            source={require('../assets/h2.png')}
            style={styles.mosqueImage}
            resizeMode="contain"
          />
        </View>

        {/* Welcome text */}
        <Animated.View 
          style={[
            styles.textContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <Text style={styles.title}>Welcome to</Text>
          <Text style={styles.title2}>صلاتي</Text>
          <Text style={styles.subtitle}>Your companion for prayer times</Text>
          <Text style={styles.description}>
            Never miss a prayer time with accurate timings, Qibla direction, and beautiful notifications
          </Text>
        </Animated.View>

        {/* Get Started button */}
        <TouchableOpacity
          style={styles.button}
          activeOpacity={0.8}
          onPress={onDone}
        >
          <Text style={styles.buttonText}>Get Started</Text>
        </TouchableOpacity>
      </View>
    </AnimatedBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.xl,
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    maxHeight: height * 0.5,
  },
  mosqueImage: {
    width: width * 0.8,
    height: width * 0.8,
    tintColor: 'rgba(255, 255, 255, 0.9)'
  },
  textContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  title: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 32,
    color: theme.colors.white,
    marginBottom: theme.spacing.sm,
  },
  title2: {
    fontFamily: 'Alkalami_400Regular',
    fontSize: 32,
    color: theme.colors.white,
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: theme.spacing.xl,
  },
  description: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    lineHeight: 24,
  },
  button: {
    width: '100%',
    backgroundColor: theme.colors.white,
    paddingVertical: theme.spacing.lg,
    borderRadius: theme.borderRadius.round,
    alignItems: 'center',
    ...theme.shadows.medium,
    marginBottom: theme.spacing.md,
  },
  buttonText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 18,
    color: theme.colors.primary,
  },
});

export default WelcomeScreen;