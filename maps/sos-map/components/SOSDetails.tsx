/**
 * SOS Session Details Card - Floating UI Component
 * Dark theme with #77FF77 primary color
 */

'use client';

import { useEffect, useState } from 'react';
import { SOSSession, Location } from '@/types/sos';

interface SOSDetailsProps {
	session: SOSSession;
	currentLocation: Location | null;
	watcherCount: number;
	onCallEmergency: () => void;
	onOpenInMaps: () => void;
	onShareLink: () => void;
}

export default function SOSDetails({
	session,
	currentLocation,
	watcherCount,
	onCallEmergency,
	onOpenInMaps,
	onShareLink,
}: SOSDetailsProps) {
	const [lastUpdated, setLastUpdated] = useState<string>('');
	const [tick, setTick] = useState(0);

	// Force update every second to keep "last updated" text fresh
	useEffect(() => {
		const interval = setInterval(() => setTick(t => t + 1), 1000);
		return () => clearInterval(interval);
	}, []);

	// Calculate "last updated" text based on current location timestamp
	useEffect(() => {
		if (!currentLocation?.timestamp) {
			setLastUpdated('');
			return;
		}
		
		const locationTime = new Date(currentLocation.timestamp).getTime();
		const diff = Date.now() - locationTime;
		const seconds = Math.floor(diff / 1000);
		
		if (seconds < 5) setLastUpdated('just now');
		else if (seconds < 60) setLastUpdated(`${seconds}s ago`);
		else setLastUpdated(`${Math.floor(seconds / 60)}m ago`);
	}, [currentLocation?.timestamp, tick]);

	const getStatusColor = () => {
		switch (session.status) {
			case 'active': return 'bg-[#77FF77] text-[#0A0F1A]';
			case 'resolved': return 'bg-blue-500 text-white';
			case 'expired': return 'bg-gray-500 text-white';
			case 'cancelled': return 'bg-red-500 text-white';
			default: return 'bg-gray-500 text-white';
		}
	};

	return (
		<div className="absolute bottom-4 right-4 z-40 pointer-events-none">
			{/* Compact Action Buttons - Vertical Stack */}
			<div className="flex flex-col gap-3 pointer-events-auto">
				{/* Status & Info Card */}
				<div className="bg-[#141B2B]/95 backdrop-blur-xl rounded-xl border border-[#2A3344] shadow-2xl px-4 py-3 min-w-[200px]">
					<div className="flex items-center justify-between mb-2">
						<span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${getStatusColor()}`}>
							{session.status}
						</span>
						{watcherCount > 0 && (
							<div className="flex items-center gap-1.5 text-[#77FF77]">
								<svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
									<path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
									<path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"/>
								</svg>
								<span className="text-sm font-semibold">{watcherCount}</span>
							</div>
						)}
					</div>
					<p className="text-white font-semibold text-sm">{session.userName}</p>
					{currentLocation && (
						<p className="text-xs text-[#77FF77] font-medium mt-1">Updated {lastUpdated}</p>
					)}
				</div>

				{/* Action Buttons */}
				<div className="flex flex-col gap-2">
					{/* Call 911 */}
					<button
						onClick={onCallEmergency}
						className="flex items-center justify-center gap-2 px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition-all active:scale-95 shadow-lg"
					>
						<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
						</svg>
						Call 911
					</button>

					{/* Open in Maps */}
					<button
						onClick={onOpenInMaps}
						className="flex items-center justify-center gap-2 px-4 py-3 bg-[#77FF77] hover:bg-[#5ACC5A] text-[#0A0F1A] font-semibold rounded-xl transition-all active:scale-95 shadow-lg"
					>
						<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
						</svg>
						Open in Maps
					</button>

					{/* Share */}
					<button
						onClick={onShareLink}
						className="flex items-center justify-center gap-2 px-4 py-3 bg-[#141B2B] hover:bg-[#1A2332] text-white border border-[#2A3344] font-semibold rounded-xl transition-all active:scale-95 shadow-lg"
					>
						<svg className="w-5 h-5 text-[#77FF77]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
						</svg>
						Share Link
					</button>
				</div>
			</div>
		</div>
	);
}