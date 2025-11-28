'use client';

import { useState, useEffect, useRef } from 'react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://whisppr-demo.onrender.com/api';
const API_KEY = process.env.NEXT_PUBLIC_API_KEY || 'demo-secret-key';

type SOSState = 'idle' | 'getting-location' | 'sending' | 'active' | 'error';

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  altitude: number | null;
  speed: number | null;
  heading: number | null;
}

export default function TriggerPage() {
  const [state, setState] = useState<SOSState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [shortId, setShortId] = useState<string | null>(null);
  const [location, setLocation] = useState<LocationData | null>(null);
  const [updateCount, setUpdateCount] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const watchIdRef = useRef<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Timer for elapsed time
  useEffect(() => {
    if (state === 'active') {
      timerRef.current = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      setElapsedTime(0);
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [state]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const sendLocationUpdate = async (loc: LocationData, sosShortId: string) => {
    try {
      await fetch(`${API_BASE_URL}/sos/${sosShortId}/location`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY,
        },
        body: JSON.stringify({
          latitude: loc.latitude,
          longitude: loc.longitude,
          accuracy: loc.accuracy,
          altitude: loc.altitude,
          speed: loc.speed,
          heading: loc.heading,
          batteryLevel: null,
          isMoving: (loc.speed ?? 0) > 0.5,
        }),
      });
      setUpdateCount(prev => prev + 1);
    } catch (err) {
      console.error('Failed to send location update:', err);
    }
  };

  const triggerSOS = async () => {
    setState('getting-location');
    setError(null);

    // Check if geolocation is available
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      setState('error');
      return;
    }

    try {
      // Get initial location
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        });
      });

      const initialLocation: LocationData = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        altitude: position.coords.altitude,
        speed: position.coords.speed,
        heading: position.coords.heading,
      };
      setLocation(initialLocation);

      // Send SOS to backend
      setState('sending');
      const response = await fetch(`${API_BASE_URL}/sos`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY,
        },
        body: JSON.stringify({
          name: 'John Doe',
          phoneNumber: '+1234567890',
          lat: initialLocation.latitude,
          lng: initialLocation.longitude,
          accuracy: initialLocation.accuracy,
          platform: 'web',
          deviceInfo: navigator.userAgent,
        }),
      });

      const data = await response.json();
      
      if (data.status !== 'ok' && !data.success) {
        throw new Error(data.message || data.error || 'Failed to create SOS');
      }

      const newShortId = data.data?.shortId || data.shortId;
      setShortId(newShortId);
      setState('active');

      // Start watching location
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const newLoc: LocationData = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            altitude: pos.coords.altitude,
            speed: pos.coords.speed,
            heading: pos.coords.heading,
          };
          setLocation(newLoc);
          sendLocationUpdate(newLoc, newShortId);
        },
        (err) => {
          console.error('Location watch error:', err);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );

    } catch (err) {
      console.error('SOS Error:', err);
      setError(err instanceof GeolocationPositionError 
        ? getGeolocationErrorMessage(err)
        : (err as Error).message
      );
      setState('error');
    }
  };

  const cancelSOS = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setState('idle');
    setShortId(null);
    setLocation(null);
    setUpdateCount(0);
  };

  const getGeolocationErrorMessage = (error: GeolocationPositionError) => {
    switch (error.code) {
      case error.PERMISSION_DENIED:
        return 'Location permission denied. Please enable location access.';
      case error.POSITION_UNAVAILABLE:
        return 'Location unavailable. Please try again.';
      case error.TIMEOUT:
        return 'Location request timed out. Please try again.';
      default:
        return 'Failed to get location.';
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <header className="p-4 border-b border-gray-800">
        <h1 className="text-xl font-bold text-center">
          <span className="text-[#77FF77]">Whisppr</span> SOS
        </h1>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-6">
        {state === 'idle' && (
          <>
            <p className="text-gray-400 text-center mb-8 max-w-xs">
              Press the button below to trigger an emergency SOS alert
            </p>
            <button
              onClick={triggerSOS}
              className="w-48 h-48 rounded-full bg-red-600 hover:bg-red-700 active:bg-red-800 
                         flex items-center justify-center shadow-lg shadow-red-600/30
                         transition-all duration-150 active:scale-95"
            >
              <span className="text-2xl font-bold">SOS</span>
            </button>
            <p className="text-gray-500 text-sm mt-6">
              Tap to send emergency alert
            </p>
          </>
        )}

        {state === 'getting-location' && (
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 border-4 border-[#77FF77] border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-lg">Getting your location...</p>
          </div>
        )}

        {state === 'sending' && (
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 border-4 border-[#77FF77] border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-lg">Sending SOS alert...</p>
          </div>
        )}

        {state === 'active' && (
          <div className="flex flex-col items-center w-full max-w-sm">
            {/* Pulsing indicator */}
            <div className="relative mb-6">
              <div className="w-24 h-24 rounded-full bg-red-600 flex items-center justify-center">
                <span className="text-lg font-bold">LIVE</span>
              </div>
              <div className="absolute inset-0 w-24 h-24 rounded-full bg-red-600 animate-ping opacity-30" />
            </div>

            <h2 className="text-xl font-bold mb-2">SOS Active</h2>
            <p className="text-gray-400 mb-6">Emergency contacts notified</p>

            {/* Stats */}
            <div className="w-full bg-gray-900 rounded-lg p-4 mb-4">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-[#77FF77]">{formatTime(elapsedTime)}</p>
                  <p className="text-xs text-gray-500">Duration</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#77FF77]">{updateCount}</p>
                  <p className="text-xs text-gray-500">Updates Sent</p>
                </div>
              </div>
            </div>

            {/* Location info */}
            {location && (
              <div className="w-full bg-gray-900 rounded-lg p-4 mb-4">
                <p className="text-xs text-gray-500 mb-1">Current Location</p>
                <p className="text-sm font-mono">
                  {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                </p>
                {location.accuracy && (
                  <p className="text-xs text-gray-500 mt-1">
                    Accuracy: ±{Math.round(location.accuracy)}m
                  </p>
                )}
              </div>
            )}

            {/* Map link */}
            {shortId && (
              <a
                href={`/sos/${shortId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-gray-800 hover:bg-gray-700 rounded-lg p-4 mb-4 text-center transition-colors"
              >
                <p className="text-[#77FF77] font-medium">View Live Map →</p>
                <p className="text-xs text-gray-500 mt-1">maps.whisppr.us/sos/{shortId}</p>
              </a>
            )}

            {/* Cancel button */}
            <button
              onClick={cancelSOS}
              className="w-full py-4 bg-gray-800 hover:bg-gray-700 rounded-lg font-medium transition-colors"
            >
              End SOS
            </button>

            {/* Keep open warning */}
            <p className="text-xs text-gray-600 mt-4 text-center">
              ⚠️ Keep this page open for continuous tracking
            </p>
          </div>
        )}

        {state === 'error' && (
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-red-900 flex items-center justify-center mb-4">
              <span className="text-2xl">!</span>
            </div>
            <h2 className="text-xl font-bold mb-2">Error</h2>
            <p className="text-red-400 mb-6 max-w-xs">{error}</p>
            <button
              onClick={() => setState('idle')}
              className="px-8 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg font-medium transition-colors"
            >
              Try Again
            </button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="p-4 text-center text-gray-600 text-xs">
        <p>Add to Home Screen for quick access</p>
        {/* v1.0.1 */}
      </footer>
    </div>
  );
}
