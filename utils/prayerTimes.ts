import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface PrayerTime {
  id: string;
  name: string;
  time: string;
  isNext: boolean;
  isPassed: boolean;
}

export interface LocationData {
  latitude: number;
  longitude: number;
  city?: string;
  country?: string;
  timezone?: string;
}

// Islamic prayer time calculation using accurate astronomical formulas
function calculatePrayerTimes(latitude: number, longitude: number, date: Date = new Date()): PrayerTime[] {
  const times = getIslamicPrayerTimes(latitude, longitude, date);
  const now = new Date();
  
  // Convert current time to minutes for accurate comparison
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  
  // Convert prayer times to minutes and find next prayer
  const prayerMinutes = times.map(prayer => prayer.hour * 60 + prayer.minute);
  let nextPrayerIndex = prayerMinutes.findIndex(time => time > currentMinutes);
  
  if (nextPrayerIndex === -1) {
    nextPrayerIndex = 0; // Next prayer is Fajr tomorrow
  }
  
  return times.map((prayer, index) => {
    const prayerTimeMinutes = prayer.hour * 60 + prayer.minute;
    const isPassed = prayerTimeMinutes <= currentMinutes;
    
    // Format time with proper AM/PM
    const hour12 = prayer.hour === 0 ? 12 : prayer.hour > 12 ? prayer.hour - 12 : prayer.hour;
    const ampm = prayer.hour >= 12 ? 'PM' : 'AM';
    const formattedTime = `${hour12}:${prayer.minute.toString().padStart(2, '0')} ${ampm}`;
    
    return {
      id: prayer.id,
      name: prayer.name,
      time: formattedTime,
      isNext: index === nextPrayerIndex,
      isPassed
    };
  });
}

// Improved Islamic prayer time calculations with accurate algorithms
function getIslamicPrayerTimes(lat: number, lng: number, date: Date) {
  // Get proper timezone offset for the location
  const timezoneOffset = -date.getTimezoneOffset() / 60; // Convert to hours, fix sign
  
  const julianDate = getJulianDate(date);
  const declination = getSolarDeclination(julianDate);
  const equationOfTime = getEquationOfTime(julianDate);
  
  // Standard prayer calculation angles (widely accepted)
  const fajrAngle = -18; // 18 degrees below horizon
  const ishaAngle = -17; // 17 degrees below horizon
  const maghribAngle = -0.833; // Civil twilight
  
  // Calculate accurate prayer times
  const fajrTime = calculatePrayerTime(lat, lng, declination, equationOfTime, fajrAngle, false, timezoneOffset);
  const sunriseTime = calculatePrayerTime(lat, lng, declination, equationOfTime, maghribAngle, true, timezoneOffset);
  const dhuhrTime = getSolarNoon(lng, equationOfTime, timezoneOffset);
  const asrTime = getAsrTime(lat, lng, declination, equationOfTime, timezoneOffset);
  const maghribTime = calculatePrayerTime(lat, lng, declination, equationOfTime, maghribAngle, false, timezoneOffset);
  const ishaTime = calculatePrayerTime(lat, lng, declination, equationOfTime, ishaAngle, false, timezoneOffset);
  
  return [
    { id: 'fajr', name: 'Fajr', ...timeToHourMinute(fajrTime) },
    { id: 'sunrise', name: 'Sunrise', ...timeToHourMinute(sunriseTime) },
    { id: 'dhuhr', name: 'Dhuhr', ...timeToHourMinute(dhuhrTime) },
    { id: 'asr', name: 'Asr', ...timeToHourMinute(asrTime) },
    { id: 'maghrib', name: 'Maghrib', ...timeToHourMinute(maghribTime) },
    { id: 'isha', name: 'Isha', ...timeToHourMinute(ishaTime) }
  ];
}

// More accurate Julian date calculation
function getJulianDate(date: Date): number {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  
  let a = Math.floor((14 - month) / 12);
  let y = year - a;
  let m = month + 12 * a - 3;
  
  let jdn = day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) + 1721119;
  
  // Add time fraction for more accuracy
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();
  const timeFraction = (hours + minutes / 60 + seconds / 3600) / 24;
  
  return jdn + timeFraction - 0.5;
}

// Accurate solar declination calculation
function getSolarDeclination(julianDate: number): number {
  const n = julianDate - 2451545.0;
  const L = (280.460 + 0.9856474 * n) % 360;
  const g = (357.528 + 0.9856003 * n) % 360;
  const lambda = L + 1.915 * Math.sin(g * Math.PI / 180) + 0.020 * Math.sin(2 * g * Math.PI / 180);
  
  return Math.asin(Math.sin(23.439 * Math.PI / 180) * Math.sin(lambda * Math.PI / 180)) * 180 / Math.PI;
}

// Equation of time for accurate solar noon calculation
function getEquationOfTime(julianDate: number): number {
  const n = julianDate - 2451545.0;
  const L = (280.460 + 0.9856474 * n) % 360;
  const g = (357.528 + 0.9856003 * n) % 360;
  const lambda = L + 1.915 * Math.sin(g * Math.PI / 180) + 0.020 * Math.sin(2 * g * Math.PI / 180);
  
  const alpha = Math.atan2(Math.cos(23.439 * Math.PI / 180) * Math.sin(lambda * Math.PI / 180), Math.cos(lambda * Math.PI / 180)) * 180 / Math.PI;
  
  return 4 * (L - alpha);
}

// Accurate solar noon calculation with timezone
function getSolarNoon(longitude: number, equationOfTime: number, timezoneOffset: number): number {
  return 12 - longitude / 15 - equationOfTime / 60 + timezoneOffset;
}

// General prayer time calculation function with timezone handling
function calculatePrayerTime(lat: number, lng: number, declination: number, equationOfTime: number, angle: number, isSunrise: boolean, timezoneOffset: number): number {
  const latRad = lat * Math.PI / 180;
  const decRad = declination * Math.PI / 180;
  const angleRad = angle * Math.PI / 180;
  
  const cosHourAngle = (Math.sin(angleRad) - Math.sin(latRad) * Math.sin(decRad)) / (Math.cos(latRad) * Math.cos(decRad));
  
  // Check if the calculation is valid (for extreme latitudes)
  if (Math.abs(cosHourAngle) > 1) {
    // Handle extreme latitudes with fallback times
    return isSunrise ? (6 + timezoneOffset) : (18 + timezoneOffset);
  }
  
  const hourAngle = Math.acos(cosHourAngle) * 180 / Math.PI / 15;
  const solarNoon = getSolarNoon(lng, equationOfTime, timezoneOffset);
  
  return isSunrise ? solarNoon - hourAngle : solarNoon + hourAngle;
}

// Accurate Asr time calculation using shadow ratio method
function getAsrTime(lat: number, lng: number, declination: number, equationOfTime: number, timezoneOffset: number): number {
  const latRad = lat * Math.PI / 180;
  const decRad = declination * Math.PI / 180;
  
  // Standard method (Shafi'i, Maliki, Hanbali): shadow length = object length
  const shadowFactor = 1;
  // For Hanafi method, use shadowFactor = 2
  
  // Calculate noon sun elevation
  const noonElevation = Math.asin(Math.sin(latRad) * Math.sin(decRad) + Math.cos(latRad) * Math.cos(decRad));
  
  // Calculate Asr elevation angle
  const asrElevation = Math.atan(1 / (shadowFactor + Math.tan(Math.PI / 2 - noonElevation)));
  
  const cosHourAngle = (Math.sin(asrElevation) - Math.sin(latRad) * Math.sin(decRad)) / (Math.cos(latRad) * Math.cos(decRad));
  
  if (Math.abs(cosHourAngle) > 1) {
    return 15 + timezoneOffset; // Fallback Asr time
  }
  
  const hourAngle = Math.acos(cosHourAngle) * 180 / Math.PI / 15;
  const solarNoon = getSolarNoon(lng, equationOfTime, timezoneOffset);
  
  return solarNoon + hourAngle;
}

function timeToHourMinute(time: number) {
  // Ensure time is positive and within 24-hour range
  while (time < 0) time += 24;
  while (time >= 24) time -= 24;
  
  const hour = Math.floor(time);
  const minute = Math.round((time - hour) * 60);
  
  // Handle minute overflow
  if (minute >= 60) {
    return { hour: (hour + 1) % 24, minute: 0 };
  }
  
  return { hour, minute: Math.max(0, Math.min(59, minute)) };
}

// Updated main functions to use location
export async function getPrayerTimes(location?: LocationData, date: Date = new Date()): Promise<PrayerTime[]> {
  try {
    if (!location) {
      // Try to get current location
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Location permission denied');
      }
      
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      
      location = {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude
      };
    }
    
    return calculatePrayerTimes(location.latitude, location.longitude, date);
  } catch (error) {
    console.error('Error calculating prayer times:', error);
    // Fallback to mock times
    return getMockPrayerTimes();
  }
}

// Enhanced mock function with timezone-aware times
function getMockPrayerTimes(): PrayerTime[] {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  
  // Use more realistic times based on general coordinates (adjust for your region)
  const prayers = [
    { id: 'fajr', name: 'Fajr', hour: 5, minute: 30 },
    { id: 'sunrise', name: 'Sunrise', hour: 6, minute: 55 },
    { id: 'dhuhr', name: 'Dhuhr', hour: 12, minute: 25 },
    { id: 'asr', name: 'Asr', hour: 15, minute: 40 },
    { id: 'maghrib', name: 'Maghrib', hour: 18, minute: 15 },
    { id: 'isha', name: 'Isha', hour: 19, minute: 35 }
  ];
  
  const prayerMinutes = prayers.map(prayer => prayer.hour * 60 + prayer.minute);
  let nextPrayerIndex = prayerMinutes.findIndex(time => time > currentMinutes);
  
  if (nextPrayerIndex === -1) {
    nextPrayerIndex = 0;
  }
  
  return prayers.map((prayer, index) => {
    const prayerTimeMinutes = prayer.hour * 60 + prayer.minute;
    const isPassed = prayerTimeMinutes <= currentMinutes;
    
    // Format with AM/PM
    const hour12 = prayer.hour === 0 ? 12 : prayer.hour > 12 ? prayer.hour - 12 : prayer.hour;
    const ampm = prayer.hour >= 12 ? 'PM' : 'AM';
    const formattedTime = `${hour12}:${prayer.minute.toString().padStart(2, '0')} ${ampm}`;
    
    return {
      id: prayer.id,
      name: prayer.name,
      time: formattedTime,
      isNext: index === nextPrayerIndex,
      isPassed
    };
  });
}

export async function getNextPrayer(location?: LocationData): Promise<PrayerTime> {
  const prayers = await getPrayerTimes(location);
  return prayers.find(prayer => prayer.isNext) || prayers[0];
}

export async function getTimeUntilNextPrayer(location?: LocationData): Promise<string> {
  const prayers = await getPrayerTimes(location);
  const nextPrayer = prayers.find(prayer => prayer.isNext);
  
  if (!nextPrayer) return 'Soon';
  
  const now = new Date();
  
  // Parse the time string properly
  const timeRegex = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i;
  const match = nextPrayer.time.match(timeRegex);
  
  if (!match) {
    console.error('Invalid time format in getTimeUntilNextPrayer:', nextPrayer.time);
    return 'Soon';
  }
  
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3].toUpperCase();
  
  // Convert to 24-hour format
  if (period === 'PM' && hours !== 12) {
    hours += 12;
  } else if (period === 'AM' && hours === 12) {
    hours = 0;
  }
  
  const prayerTime = new Date();
  prayerTime.setHours(hours, minutes, 0, 0);
  
  // If prayer time has passed today, it's tomorrow
  if (prayerTime <= now) {
    prayerTime.setDate(prayerTime.getDate() + 1);
  }
  
  const diffMs = prayerTime.getTime() - now.getTime();
  const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  
  if (diffHrs > 0) {
    return `${diffHrs}h ${diffMins}m`;
  } else {
    return `${diffMins}m`;
  }
}

// Add geocoding function for manual location setup
export async function geocodeLocation(city: string, country?: string): Promise<LocationData> {
  try {
    // This is a simplified version. In production, you'd use a geocoding service
    const searchString = country ? `${city}, ${country}` : city;
    
    // For demo purposes, return some default coordinates
    // In production, you'd call a geocoding API like Google Maps, OpenStreetMap, etc.
    const mockCoordinates = {
      'London': { latitude: 51.5074, longitude: -0.1278 },
      'New York': { latitude: 40.7128, longitude: -74.0060 },
      'Dubai': { latitude: 25.2048, longitude: 55.2708 },
      'Cairo': { latitude: 30.0444, longitude: 31.2357 },
      'Istanbul': { latitude: 41.0082, longitude: 28.9784 },
      'Mecca': { latitude: 21.4225, longitude: 39.8262 },
      'Medina': { latitude: 24.5247, longitude: 39.5692 },
    };

    const lowerCity = city.toLowerCase();
    for (const [name, coords] of Object.entries(mockCoordinates)) {
      if (name.toLowerCase().includes(lowerCity) || lowerCity.includes(name.toLowerCase())) {
        return {
          latitude: coords.latitude,
          longitude: coords.longitude,
          city: city,
          country: country || 'Unknown'
        };
      }
    }

    // Default to a central location if not found
    return {
      latitude: 0,
      longitude: 0,
      city: city,
      country: country || 'Unknown'
    };
  } catch (error) {
    console.error('Error geocoding location:', error);
    throw new Error('Could not find location coordinates');
  }
}

// Enhanced location function that uses stored onboarding data
export async function getCurrentLocation(): Promise<LocationData> {
  try {
    // First, check if we have onboarding location data
    const onboardingData = await AsyncStorage.getItem('salatiOnboarding');
    if (onboardingData) {
      const parsed = JSON.parse(onboardingData);
      if (parsed.location && parsed.location.latitude !== 0) {
        return parsed.location;
      }
    }

    // Fallback to GPS location
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Location permission denied');
    }
    
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });
    
    try {
      const reverseGeocode = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
      
      const place = reverseGeocode[0];
      
      let timezone = 'UTC';
      try {
        timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      } catch (error) {
        console.warn('Could not determine timezone, using UTC');
      }
      
      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        city: place?.city || place?.district || place?.subregion || 'Unknown',
        country: place?.country || 'Unknown',
        timezone: timezone,
      };
    } catch (error) {
      console.error('Error getting address:', error);
      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        city: 'Unknown',
        country: 'Unknown',
        timezone: 'UTC',
      };
    }
  } catch (error) {
    console.error('Error getting location:', error);
    throw error;
  }
}

// Additional utility functions for enhanced functionality
export async function getCurrentPrayerStatus(): Promise<'before_fajr' | 'after_fajr' | 'after_sunrise' | 'after_dhuhr' | 'after_asr' | 'after_maghrib' | 'after_isha'> {
  const prayers = await getPrayerTimes();
  const now = new Date();
  const currentTime = now.getHours() * 60 + now.getMinutes();
  
  // Convert prayer times to minutes, handling AM/PM format
  const prayerTimes = prayers.map(prayer => {
    const timeRegex = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i;
    const match = prayer.time.match(timeRegex);
    
    if (!match) return 0; // fallback
    
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const period = match[3].toUpperCase();
    
    // Convert to 24-hour format
    if (period === 'PM' && hours !== 12) {
      hours += 12;
    } else if (period === 'AM' && hours === 12) {
      hours = 0;
    }
    
    return hours * 60 + minutes;
  });
  
  if (currentTime < prayerTimes[0]) return 'before_fajr';
  if (currentTime < prayerTimes[1]) return 'after_fajr';
  if (currentTime < prayerTimes[2]) return 'after_sunrise';
  if (currentTime < prayerTimes[3]) return 'after_dhuhr';
  if (currentTime < prayerTimes[4]) return 'after_asr';
  if (currentTime < prayerTimes[5]) return 'after_maghrib';
  return 'after_isha';
}

export function formatTimeRemaining(timeString: string): { hours: number; minutes: number } {
  const match = timeString.match(/(\d+)h\s*(\d+)m|(\d+)m/);
  if (!match) return { hours: 0, minutes: 0 };
  
  if (match[1] && match[2]) {
    return { hours: parseInt(match[1]), minutes: parseInt(match[2]) };
  } else if (match[3]) {
    return { hours: 0, minutes: parseInt(match[3]) };
  }
  
  return { hours: 0, minutes: 0 };
}