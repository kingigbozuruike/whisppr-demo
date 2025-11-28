/**
 * Movement Info Card - Shows heading direction and speed
 */

'use client';

import { Location } from '@/types/sos';

interface MovementInfoProps {
	currentLocation: Location | null;
	previousLocation?: Location | null;
}

// Convert heading degrees to cardinal direction
function getDirection(heading: number | null | undefined): string {
	if (heading === null || heading === undefined) return 'Unknown';
	
	const directions = [
		'North', 'North-East', 'East', 'South-East',
		'South', 'South-West', 'West', 'North-West'
	];
	
	// Normalize heading to 0-360
	const normalized = ((heading % 360) + 360) % 360;
	const index = Math.round(normalized / 45) % 8;
	return directions[index];
}

// Get direction arrow based on heading
function getDirectionArrow(heading: number | null | undefined): string {
	if (heading === null || heading === undefined) return '•';
	
	const arrows = ['↑', '↗', '→', '↘', '↓', '↙', '←', '↖'];
	const normalized = ((heading % 360) + 360) % 360;
	const index = Math.round(normalized / 45) % 8;
	return arrows[index];
}

// Format speed (m/s to mph or km/h)
function formatSpeed(speedMs: number | null | undefined): string {
	if (speedMs === null || speedMs === undefined || speedMs < 0) return '0';
	
	// Convert m/s to mph
	const mph = speedMs * 2.237;
	return mph.toFixed(1);
}

// Determine movement status
function getMovementStatus(speedMs: number | null | undefined): { status: string; color: string } {
	if (speedMs === null || speedMs === undefined || speedMs < 0.5) {
		return { status: 'Stationary', color: 'text-[#B4BAC8]' };
	} else if (speedMs < 1.5) {
		return { status: 'Walking', color: 'text-[#77FF77]' };
	} else if (speedMs < 4) {
		return { status: 'Running', color: 'text-yellow-400' };
	} else if (speedMs < 15) {
		return { status: 'Driving', color: 'text-blue-400' };
	} else {
		return { status: 'High Speed', color: 'text-red-400' };
	}
}

export default function MovementInfo({ currentLocation, previousLocation }: MovementInfoProps) {
	const heading = currentLocation?.heading;
	const speed = currentLocation?.speed;
	
	const direction = getDirection(heading);
	const arrow = getDirectionArrow(heading);
	const speedMph = formatSpeed(speed);
	const { status, color } = getMovementStatus(speed);
	
	return (
		<div className="bg-[#141B2B]/95 backdrop-blur-xl px-5 py-3 rounded-xl border border-[#2A3344] shadow-2xl">
			<div className="flex items-center gap-6">
				{/* Direction */}
				<div className="flex items-center gap-3">
					<div className="w-10 h-10 rounded-full bg-[#1E2738] flex items-center justify-center">
						<span className="text-2xl text-[#77FF77]">{arrow}</span>
					</div>
					<div>
						<p className="text-xs text-[#B4BAC8] uppercase tracking-wide">Heading</p>
						<p className="text-white font-semibold">{direction}</p>
					</div>
				</div>
				
				{/* Divider */}
				<div className="w-px h-10 bg-[#2A3344]"></div>
				
				{/* Speed */}
				<div className="flex items-center gap-3">
					<div className="w-10 h-10 rounded-full bg-[#1E2738] flex items-center justify-center">
						<svg className="w-5 h-5 text-[#77FF77]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
						</svg>
					</div>
					<div>
						<p className="text-xs text-[#B4BAC8] uppercase tracking-wide">Speed</p>
						<p className="text-white font-semibold">
							{speedMph} <span className="text-xs text-[#B4BAC8]">mph</span>
						</p>
					</div>
				</div>
				
				{/* Divider */}
				<div className="w-px h-10 bg-[#2A3344]"></div>
				
				{/* Movement Status */}
				<div>
					<p className="text-xs text-[#B4BAC8] uppercase tracking-wide">Status</p>
					<p className={`font-semibold ${color}`}>{status}</p>
				</div>
			</div>
		</div>
	);
}
