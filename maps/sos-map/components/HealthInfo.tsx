/**
 * Health Info Panel - Emergency Medical Information
 * Expandable panel with critical health data
 */

'use client';

import { useState } from 'react';

interface HealthInfoProps {
	userName: string;
	phoneNumber: string;
}

export default function HealthInfo({ userName, phoneNumber }: HealthInfoProps) {
	const [isExpanded, setIsExpanded] = useState(false);

	// Mock health data - in production, this would come from user profile/API
	const healthData = {
		bloodType: 'O+',
		allergies: ['Penicillin', 'Peanuts'],
		medications: ['Lisinopril 10mg', 'Metformin 500mg'],
		conditions: ['Type 2 Diabetes', 'Hypertension'],
		emergencyContact: {
			name: 'Jane Doe',
			relation: 'Spouse',
			phone: '+1 (555) 123-4567',
		},
		insuranceProvider: 'Blue Cross Blue Shield',
		insuranceNumber: 'BCBS-123456789',
		age: 45,
		height: '5\'10"',
		weight: '180 lbs',
	};

	return (
		<div className="relative">
			{/* Collapsed State - Health Button */}
			{!isExpanded && (
				<button
					onClick={() => setIsExpanded(true)}
					className="bg-[#141B2B]/95 backdrop-blur-xl px-4 py-3 rounded-xl border border-[#2A3344] shadow-2xl hover:bg-[#1A2332] transition-all flex items-center gap-2"
					title="View Health Information"
				>
					<svg className="w-5 h-5 text-[#77FF77]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
					</svg>
					<span className="text-sm font-semibold text-white">Health Info</span>
				</button>
			)}

			{/* Expanded State - Full Panel */}
			{isExpanded && (
				<div className="absolute bottom-0 left-0 bg-[#141B2B]/98 backdrop-blur-xl rounded-2xl border border-[#2A3344] shadow-2xl overflow-hidden w-80 animate-in slide-in-from-bottom duration-300">
					{/* Header */}
					<div className="px-5 py-4 border-b border-[#2A3344] flex items-center justify-between">
						<div className="flex items-center gap-2">
							<svg className="w-5 h-5 text-[#77FF77]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
							</svg>
							<h3 className="text-lg font-bold text-white">Health Information</h3>
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

					{/* Content */}
					<div className="px-5 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
						{/* Patient Info */}
						<div>
							<p className="text-xs text-[#B4BAC8] uppercase tracking-wide mb-2">Patient</p>
							<p className="text-white font-semibold">{userName}</p>
							<p className="text-sm text-[#B4BAC8]">{phoneNumber}</p>
							<div className="mt-2 grid grid-cols-3 gap-2 text-sm">
								<div>
									<p className="text-[#B4BAC8]">Age</p>
									<p className="text-white font-medium">{healthData.age}</p>
								</div>
								<div>
									<p className="text-[#B4BAC8]">Height</p>
									<p className="text-white font-medium">{healthData.height}</p>
								</div>
								<div>
									<p className="text-[#B4BAC8]">Weight</p>
									<p className="text-white font-medium">{healthData.weight}</p>
								</div>
							</div>
						</div>

						{/* Blood Type - Prominent */}
						<div className="bg-red-600/20 border border-red-600/40 rounded-xl p-3">
							<p className="text-xs text-red-300 uppercase tracking-wide mb-1">Blood Type</p>
							<p className="text-2xl font-bold text-red-400">{healthData.bloodType}</p>
						</div>

						{/* Allergies */}
						<div>
							<p className="text-xs text-[#B4BAC8] uppercase tracking-wide mb-2">⚠️ Allergies</p>
							<div className="space-y-1">
								{healthData.allergies.map((allergy, i) => (
									<div key={i} className="bg-yellow-600/20 border border-yellow-600/40 rounded-lg px-3 py-2">
										<p className="text-sm text-yellow-300 font-medium">{allergy}</p>
									</div>
								))}
							</div>
						</div>

						{/* Current Medications */}
						<div>
							<p className="text-xs text-[#B4BAC8] uppercase tracking-wide mb-2">💊 Medications</p>
							<div className="space-y-1">
								{healthData.medications.map((med, i) => (
									<div key={i} className="bg-[#0A0F1A]/50 rounded-lg px-3 py-2">
										<p className="text-sm text-white">{med}</p>
									</div>
								))}
							</div>
						</div>

						{/* Medical Conditions */}
						<div>
							<p className="text-xs text-[#B4BAC8] uppercase tracking-wide mb-2">🏥 Conditions</p>
							<div className="space-y-1">
								{healthData.conditions.map((condition, i) => (
									<div key={i} className="bg-[#0A0F1A]/50 rounded-lg px-3 py-2">
										<p className="text-sm text-white">{condition}</p>
									</div>
								))}
							</div>
						</div>

						{/* Emergency Contact */}
						<div className="bg-[#77FF77]/10 border border-[#77FF77]/30 rounded-xl p-3">
							<p className="text-xs text-[#77FF77] uppercase tracking-wide mb-2">👤 Emergency Contact</p>
							<p className="text-white font-semibold">{healthData.emergencyContact.name}</p>
							<p className="text-sm text-[#B4BAC8]">{healthData.emergencyContact.relation}</p>
							<p className="text-sm text-[#77FF77] font-medium mt-1">{healthData.emergencyContact.phone}</p>
						</div>

						{/* Insurance */}
						<div>
							<p className="text-xs text-[#B4BAC8] uppercase tracking-wide mb-2">🏛️ Insurance</p>
							<div className="bg-[#0A0F1A]/50 rounded-lg px-3 py-2">
								<p className="text-sm text-white font-medium">{healthData.insuranceProvider}</p>
								<p className="text-xs text-[#B4BAC8] font-mono mt-1">{healthData.insuranceNumber}</p>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
