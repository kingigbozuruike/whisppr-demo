/**
 * Type definitions for Whisppr Live SOS Maps
 */

export interface SOSSession {
	sosId: string;
	shortId: string;
	status: 'active' | 'resolved' | 'cancelled' | 'expired';
	userName: string;
	phoneNumber: string;
	platform: string;
	deviceInfo: string;
	createdAt: string;
	updatedAt: string;
	expiresAt: string;
	resolvedAt: string | null;
	isExpired: boolean;
	durationMinutes: number;
}

export interface Location {
	lat: number;
	lng: number;
	timestamp: string;
	accuracy?: number | null;
	batteryLevel?: number | null;
	speed?: number | null;
	heading?: number | null;
	isMoving?: boolean | null;
}

export interface SOSData {
	session: SOSSession;
	currentLocation: Location;
	recentLocations: Location[];
	statistics: {
		totalLocations: number;
		distanceTraveled: number | null;
		averageSpeed: number | null;
		lastUpdateSeconds: number;
	};
	message?: string;
}

export interface LocationUpdate {
	type: 'location_update';
	shortId: string;
	location: Location;
	session: {
		status: string;
		updatedAt: string;
		durationMinutes: number;
	};
}

export interface SessionStatus {
	type: 'session_status';
	shortId: string;
	status: 'resolved' | 'cancelled' | 'expired';
	resolvedAt?: string;
	message: string;
}

export interface SubscribedEvent {
	type: 'subscribed';
	shortId: string;
	status: string;
	currentLocation: Location;
	expiresAt: string;
	watcherCount: number;
}

export interface WatcherCount {
	type: 'watcher_count';
	shortId: string;
	count: number;
	change: number;
}
