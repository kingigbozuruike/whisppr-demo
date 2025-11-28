/**
 * SOS Live Tracking Page - /sos/[shortId]
 * Shows real-time location tracking with WebSocket updates
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { getSOSSession } from '@/lib/api';
import { useSOSWebSocket } from '@/hooks/useSOSWebSocket';
import SOSDetails from '@/components/SOSDetails';
import HealthInfo from '@/components/HealthInfo';
import AreaCaution from '@/components/AreaCaution';
import MovementInfo from '@/components/MovementInfo';
import { SOSData, Location, LocationUpdate, SessionStatus } from '@/types/sos';

// Dynamically import LiveMap to avoid SSR issues with Mapbox
const LiveMap = dynamic(() => import('@/components/LiveMap'), {
	ssr: false,
	loading: () => (
		<div className="w-full h-full flex items-center justify-center bg-gray-100">
			<div className="text-center">
				<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
				<p className="text-gray-600">Loading map...</p>
			</div>
		</div>
	),
});

export default function SOSPage() {
	const params = useParams();
	const shortId = params?.shortId as string;

	const [sosData, setSOSData] = useState<SOSData | null>(null);
	const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
	const [recentLocations, setRecentLocations] = useState<Location[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// Load initial data
	useEffect(() => {
		if (!shortId) return;

		async function loadData() {
			try {
				setLoading(true);
				setError(null);
				
				const data = await getSOSSession(shortId);
				setSOSData(data);
				setCurrentLocation(data.currentLocation);
				setRecentLocations(data.recentLocations);
				
				console.log('[Page] Loaded SOS data:', data.session.userName);
			} catch (err) {
				console.error('[Page] Failed to load SOS data:', err);
				setError(err instanceof Error ? err.message : 'Failed to load SOS data');
			} finally {
				setLoading(false);
			}
		}

		loadData();
	}, [shortId]);

	// Handle location updates from WebSocket
	const handleLocationUpdate = useCallback((update: LocationUpdate) => {
		console.log('[Page] Received location update:', update.location);
		
		setCurrentLocation(update.location);
		setRecentLocations(prev => [update.location, ...prev].slice(0, 100));
		
		// Update session data
		setSOSData(prev => {
			if (!prev) return prev;
			return {
				...prev,
				currentLocation: update.location,
				session: {
					...prev.session,
					updatedAt: update.session.updatedAt,
					durationMinutes: update.session.durationMinutes,
				},
			};
		});
	}, []);

	// Handle session status changes from WebSocket
	const handleSessionStatus = useCallback((status: SessionStatus) => {
		console.log('[Page] Session status changed:', status.status);
		
		setSOSData(prev => {
			if (!prev) return prev;
			return {
				...prev,
				session: {
					...prev.session,
					status: status.status,
					resolvedAt: status.resolvedAt || prev.session.resolvedAt,
				},
			};
		});

		// Show toast notification
		if (status.status === 'resolved') {
			alert('✅ ' + status.message);
		} else if (status.status === 'expired') {
			alert('⏰ ' + status.message);
		}
	}, []);

	// Initialize WebSocket connection
	const { isConnected, isSubscribed, watcherCount, error: wsError } = useSOSWebSocket({
		shortId,
		onLocationUpdate: handleLocationUpdate,
		onSessionStatus: handleSessionStatus,
	});

	// Action handlers
	const handleCallEmergency = () => {
		window.location.href = 'tel:911';
	};

	const handleOpenInMaps = () => {
		if (!currentLocation) return;
		const url = `https://www.google.com/maps?q=${currentLocation.lat},${currentLocation.lng}`;
		window.open(url, '_blank');
	};

	const handleShareLink = async () => {
		const url = window.location.href;
		
		// Try Web Share API first
		if (navigator.share) {
			try {
				await navigator.share({
					title: `🚨 Emergency - ${sosData?.session.userName}`,
					text: 'Live SOS tracking location',
					url,
				});
				return;
			} catch {
				// User cancelled or API not available
				console.log('[Share] Web Share API failed or cancelled');
			}
		}

		// Fallback to clipboard
		try {
			await navigator.clipboard.writeText(url);
			alert('✅ Link copied to clipboard!');
		} catch {
			// Final fallback - show URL
			prompt('Copy this link:', url);
		}
	};

	// Loading state
	if (loading) {
		return (
			<div className="fixed inset-0 flex items-center justify-center bg-[#0A0F1A]">
				<div className="text-center">
					<div className="relative w-16 h-16 mx-auto mb-6">
						<div className="absolute inset-0 rounded-full border-4 border-[#2A3344]"></div>
						<div className="absolute inset-0 rounded-full border-4 border-[#77FF77] border-t-transparent animate-spin"></div>
					</div>
					<h2 className="text-xl font-semibold text-white mb-2">Loading SOS...</h2>
					<p className="text-[#B4BAC8]">Fetching live tracking data</p>
				</div>
			</div>
		);
	}

	// Error state
	if (error) {
		return (
			<div className="fixed inset-0 flex items-center justify-center bg-[#0A0F1A] p-4">
				<div className="text-center max-w-md bg-[#141B2B] rounded-2xl border border-[#2A3344] p-8">
					<div className="text-6xl mb-4">❌</div>
					<h2 className="text-2xl font-bold text-white mb-3">SOS Not Found</h2>
					<p className="text-[#B4BAC8] mb-6">{error}</p>
					<button
						onClick={() => window.location.reload()}
						className="bg-[#77FF77] hover:bg-[#5ACC5A] text-[#0A0F1A] font-semibold py-3 px-8 rounded-xl transition-all active:scale-95"
					>
						Try Again
					</button>
				</div>
			</div>
		);
	}

	// No data state
	if (!sosData || !currentLocation) {
		return (
			<div className="fixed inset-0 flex items-center justify-center bg-[#0A0F1A]">
				<p className="text-[#B4BAC8]">No SOS data available</p>
			</div>
		);
	}

	return (
		<div className="fixed inset-0 bg-[#0A0F1A]">
			{/* Whisppr Logo - Top Left */}
			<div className="absolute top-2 sm:top-4 left-2 sm:left-4 z-50">
				<div className="bg-[#141B2B]/95 backdrop-blur-xl px-3 sm:px-4 py-2 sm:py-3 rounded-xl border border-[#2A3344] shadow-2xl">
					<h1 className="text-lg sm:text-xl font-bold">
						<span className="text-white">Whisppr</span>
						<span className="text-[#77FF77]">.</span>
						<span className="text-[#B4BAC8] text-xs sm:text-sm ml-1 hidden sm:inline">Maps</span>
					</h1>
				</div>
			</div>

			{/* Movement Info - Top Center (hidden on very small screens, shown below logo on mobile) */}
			<div className="absolute top-2 sm:top-4 left-1/2 transform -translate-x-1/2 z-50 hidden xs:block">
				<MovementInfo currentLocation={currentLocation} />
			</div>

			{/* Connection Status - Top Right */}
			<div className="absolute top-2 sm:top-4 right-2 sm:right-4 z-50 flex flex-col gap-2 sm:gap-3">
				{/* Connection Status */}
				<div className="bg-[#141B2B]/95 backdrop-blur-xl px-3 sm:px-4 py-2 sm:py-3 rounded-xl border border-[#2A3344] shadow-2xl">
					<div className="flex items-center gap-2 sm:gap-3">
						<div className="flex items-center gap-1.5 sm:gap-2">
							<span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-[#77FF77] animate-pulse' : 'bg-red-500'}`}></span>
							<span className="text-xs sm:text-sm text-[#B4BAC8]">
								{isConnected ? 'Live' : 'Offline'}
							</span>
						</div>
						{isSubscribed && (
							<span className="text-[10px] sm:text-xs text-[#77FF77] hidden sm:flex items-center gap-1">
								<span className="w-1.5 h-1.5 rounded-full bg-[#77FF77]"></span>
								Live
							</span>
						)}
						{wsError && (
							<span className="text-[10px] sm:text-xs text-yellow-400 hidden sm:inline">⚠️</span>
						)}
					</div>
				</div>

				{/* Area Caution - Hidden on small screens */}
				<div className="hidden sm:block">
					<AreaCaution 
						lat={currentLocation.lat}
						lng={currentLocation.lng}
					/>
				</div>
			</div>

			{/* Health Info - Bottom Left */}
			<div className="absolute bottom-4 left-2 sm:left-4 z-50">
				<HealthInfo 
					userName={sosData.session.userName}
					phoneNumber={sosData.session.phoneNumber}
				/>
			</div>

			{/* Full-Screen Map */}
			<div className="absolute inset-0">
				<LiveMap
					initialLocation={currentLocation}
					recentLocations={recentLocations}
					isActive={sosData.session.status === 'active'}
				/>
			</div>

			{/* Floating Action Buttons - Bottom Right */}
			<SOSDetails
				session={sosData.session}
				currentLocation={currentLocation}
				watcherCount={watcherCount}
				onCallEmergency={handleCallEmergency}
				onOpenInMaps={handleOpenInMaps}
				onShareLink={handleShareLink}
			/>
		</div>
	);
}
