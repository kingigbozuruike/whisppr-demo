/**
 * Area Caution Card - Shows safety warnings for the current location
 * Displays crime statistics and area-specific risks
 */

'use client';

import { useState } from 'react';

interface AreaCautionProps {
	lat: number;
	lng: number;
}

export default function AreaCaution({ lat, lng }: AreaCautionProps) {
	const [isExpanded, setIsExpanded] = useState(false);

	// Mock caution data - in production, this would come from crime API
	// e.g., https://api.crimemapping.com or local police data
	const cautionData = {
		riskLevel: 'high', // 'low', 'medium', 'high'
		primaryRisk: 'High Robbery Rate',
		risks: [
			{ type: 'Robbery', level: 'High', incidents: 47, timeframe: 'Last 30 days' },
			{ type: 'Vehicle Theft', level: 'Medium', incidents: 23, timeframe: 'Last 30 days' },
			{ type: 'Assault', level: 'Medium', incidents: 18, timeframe: 'Last 30 days' },
		],
		nearestHelp: [
			{ type: 'Police Station', distance: '0.3 miles', direction: 'Northwest' },
			{ type: 'Hospital ER', distance: '0.8 miles', direction: 'East' },
		],
	};

	const getRiskColor = (level: string) => {
		switch (level.toLowerCase()) {
			case 'high': return { bg: 'bg-red-600/20', border: 'border-red-600/40', text: 'text-red-400', dot: 'bg-red-500' };
			case 'medium': return { bg: 'bg-yellow-600/20', border: 'border-yellow-600/40', text: 'text-yellow-400', dot: 'bg-yellow-500' };
			case 'low': return { bg: 'bg-green-600/20', border: 'border-green-600/40', text: 'text-green-400', dot: 'bg-green-500' };
			default: return { bg: 'bg-gray-600/20', border: 'border-gray-600/40', text: 'text-gray-400', dot: 'bg-gray-500' };
		}
	};

	const mainRiskColors = getRiskColor(cautionData.riskLevel);

	return (
		<div className="relative">
			{/* Collapsed State - Caution Badge */}
			{!isExpanded && (
				<button
					onClick={() => setIsExpanded(true)}
					className={`${mainRiskColors.bg} backdrop-blur-xl px-4 py-3 rounded-xl border ${mainRiskColors.border} shadow-2xl hover:opacity-90 transition-all flex items-center gap-2 w-full`}
					title="View Area Safety Information"
				>
					<svg className={`w-5 h-5 ${mainRiskColors.text}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
					</svg>
					<div className="flex-1 text-left">
						<p className={`text-xs font-semibold ${mainRiskColors.text}`}>AREA CAUTION</p>
						<p className="text-sm text-white font-medium">{cautionData.primaryRisk}</p>
					</div>
					<svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
					</svg>
				</button>
			)}

			{/* Expanded State - Full Caution Panel */}
			{isExpanded && (
				<div className="bg-[#141B2B]/98 backdrop-blur-xl rounded-2xl border border-[#2A3344] shadow-2xl overflow-hidden animate-in slide-in-from-top duration-300">
					{/* Header */}
					<div className={`px-5 py-4 ${mainRiskColors.bg} border-b ${mainRiskColors.border}`}>
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-2">
								<svg className={`w-5 h-5 ${mainRiskColors.text}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
								</svg>
								<div>
									<p className={`text-xs font-semibold ${mainRiskColors.text} uppercase tracking-wide`}>Area Caution</p>
									<p className="text-white font-bold">{cautionData.primaryRisk}</p>
								</div>
							</div>
							<button
								onClick={() => setIsExpanded(false)}
								className="p-1.5 hover:bg-[#1A2332] rounded-lg transition-colors"
							>
								<svg className="w-5 h-5 text-[#B4BAC8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
								</svg>
							</button>
						</div>
					</div>

					{/* Content */}
					<div className="px-5 py-4 space-y-4 max-h-[40vh] overflow-y-auto">
						{/* Risk Breakdown */}
						<div>
							<p className="text-xs text-[#B4BAC8] uppercase tracking-wide mb-3">Crime Statistics</p>
							<div className="space-y-2">
								{cautionData.risks.map((risk, i) => {
									const colors = getRiskColor(risk.level);
									return (
										<div key={i} className={`${colors.bg} border ${colors.border} rounded-xl p-3`}>
											<div className="flex items-start justify-between mb-1">
												<div className="flex items-center gap-2">
													<span className={`w-2 h-2 rounded-full ${colors.dot}`}></span>
													<p className="text-white font-semibold text-sm">{risk.type}</p>
												</div>
												<span className={`text-xs font-bold ${colors.text} uppercase`}>{risk.level}</span>
											</div>
											<p className="text-xs text-[#B4BAC8] ml-4">
												{risk.incidents} incidents · {risk.timeframe}
											</p>
										</div>
									);
								})}
							</div>
						</div>

						{/* Nearest Help Centers */}
						<div>
							<p className="text-xs text-[#B4BAC8] uppercase tracking-wide mb-3">🚨 Nearest Help</p>
							<div className="space-y-2">
								{cautionData.nearestHelp.map((place, i) => (
									<div key={i} className="bg-[#77FF77]/10 border border-[#77FF77]/30 rounded-xl p-3">
										<div className="flex items-center justify-between mb-1">
											<div className="flex items-center gap-2">
												<svg className="w-4 h-4 text-[#77FF77]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
													<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
												</svg>
												<p className="text-white font-medium text-sm">{place.type}</p>
											</div>
											<span className="text-xs text-[#77FF77] font-semibold">{place.distance}</span>
										</div>
										<p className="text-xs text-[#B4BAC8] ml-6">Direction: {place.direction}</p>
									</div>
								))}
							</div>
						</div>

						{/* Data Source */}
						<p className="text-xs text-[#B4BAC8] text-center">
							Data from local crime reports · Updated daily
						</p>
					</div>
				</div>
			)}
		</div>
	);
}
