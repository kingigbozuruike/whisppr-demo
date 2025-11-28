/**
 * WebSocket hook for real-time SOS updates
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { LocationUpdate, SessionStatus, SubscribedEvent, WatcherCount } from '@/types/sos';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3000';

interface UseSOSWebSocketProps {
	shortId: string;
	onLocationUpdate?: (update: LocationUpdate) => void;
	onSessionStatus?: (status: SessionStatus) => void;
	onWatcherCount?: (count: WatcherCount) => void;
}

interface UseSOSWebSocketReturn {
	isConnected: boolean;
	isSubscribed: boolean;
	watcherCount: number;
	error: string | null;
}

export function useSOSWebSocket({
	shortId,
	onLocationUpdate,
	onSessionStatus,
	onWatcherCount,
}: UseSOSWebSocketProps): UseSOSWebSocketReturn {
	const [isConnected, setIsConnected] = useState(false);
	const [isSubscribed, setIsSubscribed] = useState(false);
	const [watcherCount, setWatcherCount] = useState(0);
	const [error, setError] = useState<string | null>(null);
	const socketRef = useRef<Socket | null>(null);

	useEffect(() => {
		// Create Socket.IO connection
		const socket = io(WS_URL, {
			transports: ['websocket', 'polling'],
			reconnection: true,
			reconnectionDelay: 1000,
			reconnectionAttempts: 5,
		});

		socketRef.current = socket;

		// Connection events
		socket.on('connect', () => {
			console.log('[WS] Connected:', socket.id);
			setIsConnected(true);
			setError(null);

			// Subscribe to SOS session
			socket.emit('subscribe', { shortId });
		});

		socket.on('disconnect', () => {
			console.log('[WS] Disconnected');
			setIsConnected(false);
			setIsSubscribed(false);
		});

		socket.on('connect_error', (err) => {
			console.error('[WS] Connection error:', err);
			setError('Failed to connect to live updates');
			setIsConnected(false);
		});

		// Subscription events
		socket.on('subscribed', (data: SubscribedEvent) => {
			console.log('[WS] Subscribed to session:', data.shortId);
			setIsSubscribed(true);
			setWatcherCount(data.watcherCount);
			setError(null);
		});

		socket.on('subscribe_error', (data: { error: string; message: string }) => {
			console.error('[WS] Subscribe error:', data.message);
			setError(data.message);
			setIsSubscribed(false);
		});

		// Live update events
		socket.on('location_update', (data: LocationUpdate) => {
			console.log('[WS] Location update:', data.location);
			onLocationUpdate?.(data);
		});

		socket.on('session_status', (data: SessionStatus) => {
			console.log('[WS] Session status:', data.status);
			onSessionStatus?.(data);
		});

		socket.on('watcher_count', (data: WatcherCount) => {
			console.log('[WS] Watcher count:', data.count);
			setWatcherCount(data.count);
			onWatcherCount?.(data);
		});

		// Cleanup on unmount
		return () => {
			console.log('[WS] Cleaning up connection');
			socket.emit('unsubscribe', { shortId });
			socket.disconnect();
		};
	}, [shortId, onLocationUpdate, onSessionStatus, onWatcherCount]);

	return {
		isConnected,
		isSubscribed,
		watcherCount,
		error,
	};
}
