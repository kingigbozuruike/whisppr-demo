/**
 * Whisppr Demo - Emergency SOS Mobile App
 * Optimized for speed and reliability
 * 
 * BACKEND_URL CONFIGURATION:
 * -------------------------
 * Option 1: Edit mobile-app/.env file (recommended)
 *   EXPO_PUBLIC_API_URL=http://localhost:3000
 * 
 * Option 2: Change BACKEND_URL constant below
 *   const BACKEND_URL = 'https://your-backend.vercel.app';
 * 
 * Option 3: Use default localhost (development only)
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  Animated,
  Dimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Location from 'expo-location';
import Constants from 'expo-constants';

// ============================================================================
// CONFIGURATION - CHANGE BACKEND URL HERE
// ============================================================================

// Backend URL - Replace with your deployed backend URL
// IMPORTANT: Use your computer's local IP address (not localhost) for physical devices
// Your current IP: 10.90.32.50 (updated Nov 26, 2025)
const BACKEND_URL = 'http://10.90.32.50:3000';
const API_KEY = Constants.expoConfig?.extra?.apiKey || 'demo-secret-key';

// User's name (in production, this would come from user profile)
const USER_NAME = 'Demo User';

// Location fetch timeout (milliseconds)
const LOCATION_TIMEOUT = 3000;

// API request timeout (milliseconds)
const API_TIMEOUT = 10000;

// ============================================================================
// UI CONFIGURATION
// ============================================================================

const { width } = Dimensions.get('window');
const BUTTON_SIZE = width * 0.6;

export default function App() {
  const [loading, setLoading] = useState(false);
  const [locationStatus, setLocationStatus] = useState('Initializing...');
  const [hasLocationPermission, setHasLocationPermission] = useState(false);
  const [lastLocation, setLastLocation] = useState(null);
  const [isWarmedUp, setIsWarmedUp] = useState(false);
  
  // Animation values
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  /**
   * Initialize app: request permissions and warm up location services
   */
  useEffect(() => {
    initializeApp();
  }, []);

  /**
   * Pulse animation for SOS button
   */
  useEffect(() => {
    if (!loading) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [loading]);

  /**
   * Initialize app: request permissions and warm up location services
   */
  const initializeApp = async () => {
    console.log('='.repeat(50));
    console.log('Whisppr Demo - Initializing');
    console.log('Backend URL:', BACKEND_URL);
    console.log('='.repeat(50));
    
    try {
      setLocationStatus('Requesting location permission...');
      
      // Step 1: Request location permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        setHasLocationPermission(false);
        setLocationStatus('Location permission denied');
        Alert.alert(
          'Permission Required',
          'Whisppr needs location permission to send emergency alerts with your coordinates.',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Grant Permission', 
              onPress: () => initializeApp() // Retry
            },
          ]
        );
        return;
      }
      
      setHasLocationPermission(true);
      console.log('✓ Location permission granted');
      
      // Step 2: Warm up location services by fetching last known location
      setLocationStatus('Warming up location services...');
      console.log('Warming up location services...');
      
      try {
        const lastKnown = await Location.getLastKnownPositionAsync();
        if (lastKnown) {
          setLastLocation(lastKnown);
          const { latitude, longitude } = lastKnown.coords;
          console.log(`✓ Last known location cached: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
          setLocationStatus('Ready - Location cached');
        } else {
          console.log('⚠ No last known location available');
          setLocationStatus('Ready - Will fetch fresh location');
        }
      } catch (warmupError) {
        console.log('⚠ Could not fetch last known location:', warmupError.message);
        setLocationStatus('Ready - Will fetch fresh location');
      }
      
      setIsWarmedUp(true);
      
      // Step 3: Show ready state
      setTimeout(() => {
        setLocationStatus('Ready to send SOS');
      }, 500);
      
      console.log('✓ App initialized successfully');
      
    } catch (error) {
      console.error('✗ Initialization error:', error);
      setLocationStatus('Initialization error');
      Alert.alert(
        'Initialization Error',
        'Failed to initialize Whisppr. Please restart the app.',
        [{ text: 'OK' }]
      );
    }
  };

  /**
   * Get location with fast fallback strategy
   * Priority: Last Known → Current (with timeout) → Cached
   */
  const getLocationFast = async () => {
    const startTime = Date.now();
    
    try {
      // Strategy 1: Try getLastKnownPositionAsync() first (instant, < 100ms)
      console.log('Strategy 1: Attempting last known location...');
      const lastKnown = await Location.getLastKnownPositionAsync();
      
      if (lastKnown) {
        const elapsed = Date.now() - startTime;
        const { latitude, longitude } = lastKnown.coords;
        console.log(`✓ Last known location retrieved in ${elapsed}ms`);
        console.log(`  Coordinates: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
        return lastKnown.coords;
      }
      
      console.log('⚠ No last known location available');

    } catch (error) {
      console.log('⚠ Last known location failed:', error.message);
    }

    try {
      // Strategy 2: Get current location with timeout
      console.log(`Strategy 2: Fetching current location (timeout: ${LOCATION_TIMEOUT}ms)...`);
      
      const locationPromise = Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced, // Balance speed vs accuracy
        maximumAge: 10000, // Accept 10-second-old location
      });

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Location timeout')), LOCATION_TIMEOUT)
      );

      const location = await Promise.race([locationPromise, timeoutPromise]);
      const elapsed = Date.now() - startTime;
      const { latitude, longitude } = location.coords;
      
      console.log(`✓ Current location retrieved in ${elapsed}ms`);
      console.log(`  Coordinates: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
      
      return location.coords;

    } catch (error) {
      console.log('⚠ Current location failed:', error.message);
      
      // Strategy 3: Use cached last location if available
      if (lastLocation) {
        const elapsed = Date.now() - startTime;
        const { latitude, longitude } = lastLocation.coords;
        console.log(`✓ Using cached location (${elapsed}ms)`);
        console.log(`  Coordinates: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
        return lastLocation.coords;
      }
      
      const elapsed = Date.now() - startTime;
      console.log(`✗ All location strategies failed (${elapsed}ms)`);
      throw new Error('Unable to get location. Please ensure location services are enabled.');
    }
  };

  /**
   * Send SOS alert to backend
   * POST /api/sos with { name, lat, lng }
   */
  const sendSOSAlert = async (latitude, longitude) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);
    const startTime = Date.now();

    try {
      console.log('Sending SOS to backend...');
      console.log(`  URL: ${BACKEND_URL}/api/sos`);
      console.log(`  Payload: { name: "${USER_NAME}", lat: ${latitude}, lng: ${longitude} }`);
      
      const response = await fetch(`${BACKEND_URL}/api/sos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY,
        },
        body: JSON.stringify({
          name: USER_NAME,
          latitude: latitude,
          longitude: longitude,
          lat: latitude, // Some backends might expect "lat/lng" format
          lng: longitude,
          timestamp: Date.now(),
          userId: Constants.deviceId || 'demo-user',
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const elapsed = Date.now() - startTime;

      const data = await response.json();

      if (response.ok) {
        console.log(`✓ SOS sent successfully in ${elapsed}ms`);
        console.log('  Response:', data);
        return { success: true, data, responseTime: elapsed };
      } else {
        console.log(`✗ SOS failed with status ${response.status}`);
        console.log('  Error:', data);
        throw new Error(data.error || `Server error (${response.status})`);
      }
    } catch (error) {
      clearTimeout(timeoutId);
      const elapsed = Date.now() - startTime;
      
      if (error.name === 'AbortError') {
        console.log(`✗ Request timeout after ${elapsed}ms`);
        throw new Error('Request timeout - Please check your internet connection');
      }
      
      if (error.message.includes('Network request failed')) {
        console.log(`✗ Network error after ${elapsed}ms`);
        throw new Error('Network error - Cannot reach backend. Check BACKEND_URL in code.');
      }
      
      console.log(`✗ Request failed after ${elapsed}ms:`, error.message);
      throw error;
    }
  };

  /**
   * Handle SOS button press
   * Main emergency flow: Get Location → Send to Backend → Show Result
   */
  const handleSOSPress = async () => {
    console.log('\n' + '='.repeat(50));
    console.log('SOS BUTTON PRESSED');
    console.log('='.repeat(50));
    
    // Prevent double-press
    if (loading) {
      console.log('⚠ Already sending SOS, ignoring duplicate press');
      return;
    }

    // Check permission
    if (!hasLocationPermission) {
      console.log('✗ No location permission');
      Alert.alert(
        'Permission Required',
        'Whisppr needs location permission to send emergency alerts with your coordinates.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Grant Permission', onPress: () => initializeApp() },
        ]
      );
      return;
    }

    // Animate button press
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    setLoading(true);
    const startTime = Date.now();

    try {
      // Step 1: Get location
      setLocationStatus('Getting your location...');
      const coords = await getLocationFast();
      const locationTime = Date.now() - startTime;
      console.log(`\n✓ Location obtained in ${locationTime}ms`);

      // Step 2: Send alert to backend
      setLocationStatus('Sending SOS to backend...');
      const result = await sendSOSAlert(coords.latitude, coords.longitude);
      const totalTime = Date.now() - startTime;
      
      console.log(`\n✓ SOS COMPLETE - Total time: ${totalTime}ms`);
      console.log('='.repeat(50));

      // Step 3: Success feedback
      setLocationStatus('✓ Alert sent successfully!');
      
      const contactCount = result.data?.contacts || 'unknown';
      const responseTime = (totalTime / 1000).toFixed(2);
      
      Alert.alert(
        '✅ Emergency Alert Sent',
        `Your emergency contacts have been notified with your location.\n\n` +
        `⏱ Response time: ${responseTime}s\n` +
        `📱 Contacts notified: ${contactCount}\n` +
        `📍 Location: ${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`,
        [{ text: 'OK' }]
      );

    } catch (error) {
      const totalTime = Date.now() - startTime;
      console.error(`\n✗ SOS FAILED after ${totalTime}ms`);
      console.error('Error:', error.message);
      console.log('='.repeat(50));
      
      setLocationStatus('✗ Failed to send alert');
      
      // Provide helpful error messages
      let errorMessage = error.message || 'Failed to send emergency alert. Please try again.';
      
      if (error.message?.includes('Network request failed') || error.message?.includes('Cannot reach backend')) {
        errorMessage = 
          'Cannot connect to backend server.\n\n' +
          `Current URL: ${BACKEND_URL}\n\n` +
          '1. Make sure backend is running\n' +
          '2. Check BACKEND_URL in App.js\n' +
          '3. If using localhost, try your IP address';
      }
      
      Alert.alert(
        '❌ Error',
        errorMessage,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Retry', onPress: handleSOSPress },
        ]
      );
    } finally {
      setLoading(false);
      
      // Reset status after delay
      setTimeout(() => {
        if (hasLocationPermission && isWarmedUp) {
          setLocationStatus('Ready to send SOS');
        }
      }, 3000);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Whisppr Demo</Text>
        <Text style={styles.subtitle}>Tap once to send an SOS SMS with your location</Text>
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        {/* SOS Button */}
        <Animated.View
          style={{
            transform: [
              { scale: loading ? scaleAnim : pulseAnim },
            ],
          }}
        >
          <TouchableOpacity
            style={[
              styles.sosButton,
              !hasLocationPermission && styles.sosButtonDisabled,
            ]}
            onPress={handleSOSPress}
            disabled={loading || !hasLocationPermission}
            activeOpacity={0.8}
          >
            {loading ? (
              <>
                <ActivityIndicator size="large" color="#FFFFFF" />
                <Text style={styles.sosButtonSubtext}>SENDING...</Text>
              </>
            ) : (
              <>
                <Text style={styles.sosButtonText}>SOS</Text>
                <Text style={styles.sosButtonSubtext}>SEND SOS</Text>
              </>
            )}
          </TouchableOpacity>
        </Animated.View>

        {/* Status */}
        <View style={styles.statusContainer}>
          <Text style={styles.statusText}>{locationStatus}</Text>
        </View>
      </View>

      {/* Footer Info */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Press the SOS button to send an emergency alert with your location to your emergency contacts via SMS.
        </Text>
        <Text style={styles.footerSubtext}>
          {hasLocationPermission
            ? isWarmedUp
              ? '✓ Ready - Location services warmed up'
              : '⏳ Warming up location services...'
            : '⚠ Location permissions required'}
        </Text>
        {lastLocation && (
          <Text style={styles.footerSubtext}>
            📍 Last location cached for faster SOS
          </Text>
        )}
      </View>

      {/* Debug info (development only) */}
      {__DEV__ && (
        <View style={styles.debugInfo}>
          <Text style={styles.debugText}>Backend: {BACKEND_URL}</Text>
          <Text style={styles.debugText}>User: {USER_NAME}</Text>
          <Text style={styles.debugText}>
            Location: {lastLocation 
              ? `✓ Cached (${lastLocation.coords.latitude.toFixed(4)}, ${lastLocation.coords.longitude.toFixed(4)})` 
              : '✗ Not cached'}
          </Text>
          <Text style={styles.debugText}>
            Status: {isWarmedUp ? '✓ Warmed up' : '⏳ Initializing'}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    paddingTop: 20,
  },
  title: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 8,
    letterSpacing: 1,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sosButton: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 12,
  },
  sosButtonDisabled: {
    backgroundColor: '#64748B',
    shadowColor: '#64748B',
  },
  sosButtonText: {
    fontSize: 72,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: 4,
  },
  sosButtonSubtext: {
    fontSize: 14,
    color: '#FFFFFF',
    marginTop: 8,
    letterSpacing: 2,
    opacity: 0.9,
  },
  statusContainer: {
    marginTop: 40,
    paddingHorizontal: 20,
  },
  statusText: {
    fontSize: 16,
    color: '#94A3B8',
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: 40,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
  },
  footerSubtext: {
    fontSize: 12,
    color: '#475569',
    marginTop: 12,
    textAlign: 'center',
  },
  debugInfo: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 8,
    borderRadius: 4,
  },
  debugText: {
    fontSize: 10,
    color: '#10B981',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
});
