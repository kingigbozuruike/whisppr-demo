/**
 * LiveMap Component - Displays interactive map with live tracking
 * Uses Mapbox GL JS for smooth animations and performance
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { Location } from '@/types/sos';

// Set Mapbox access token
mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || '';

interface LiveMapProps {
	initialLocation: Location;
	recentLocations: Location[];
	isActive: boolean;
	onMapReady?: () => void;
}

export default function LiveMap({
	initialLocation,
	recentLocations,
	isActive,
	onMapReady,
}: LiveMapProps) {
	const mapContainerRef = useRef<HTMLDivElement>(null);
	const mapRef = useRef<mapboxgl.Map | null>(null);
	const markerRef = useRef<mapboxgl.Marker | null>(null);
	const [isMapLoaded, setIsMapLoaded] = useState(false);
	const [followUser, setFollowUser] = useState(true);
	const lastLocationRef = useRef<Location>(initialLocation);

	// Initialize map
	useEffect(() => {
		if (!mapContainerRef.current || mapRef.current) return;

	const map = new mapboxgl.Map({
		container: mapContainerRef.current,
		style: 'mapbox://styles/mapbox/dark-v11',
		center: [initialLocation.lng, initialLocation.lat],
		zoom: 18,  // Closer zoom for better visibility of movement
		attributionControl: false,
	});		mapRef.current = map;

		// Add navigation controls
		map.addControl(new mapboxgl.NavigationControl(), 'top-right');

		// Add scale
		map.addControl(new mapboxgl.ScaleControl(), 'bottom-right');

		// Disable follow mode when user drags map
		map.on('dragstart', () => {
			setFollowUser(false);
		});

		// Wait for map to load
		map.on('load', () => {
			console.log('[Map] Map loaded');
			setIsMapLoaded(true);
			onMapReady?.();
		});

		return () => {
			map.remove();
			mapRef.current = null;
		};
	}, []);  // Only run once on mount

	// Update marker position smoothly when location changes
	useEffect(() => {
		if (!mapRef.current || !isMapLoaded) return;

		const map = mapRef.current;
		const newLngLat: [number, number] = [initialLocation.lng, initialLocation.lat];

		// Create marker if it doesn't exist
		if (!markerRef.current) {
			const el = document.createElement('div');
			el.className = 'custom-marker';
			el.innerHTML = `
				<div class="marker-wrapper">
					${isActive ? '<div class="pulse-ring"></div>' : ''}
					<div class="marker-dot"></div>
				</div>
			`;

			const marker = new mapboxgl.Marker({
				element: el,
				anchor: 'center',
			})
				.setLngLat(newLngLat)
				.addTo(map);

			markerRef.current = marker;
			console.log('[Map] Marker created');
		} else {
			// Smoothly animate marker to new position
			markerRef.current.setLngLat(newLngLat);
			console.log(`[Map] Marker moved to ${initialLocation.lat.toFixed(6)}, ${initialLocation.lng.toFixed(6)}`);
		}

		// Pan map to follow user if enabled
		if (followUser) {
			map.easeTo({
				center: newLngLat,
				duration: 1000,  // Smooth 1 second animation
			});
		}

		lastLocationRef.current = initialLocation;
	}, [initialLocation, isActive, isMapLoaded, followUser]);

	// Draw breadcrumb trail
	useEffect(() => {
		if (!mapRef.current || !isMapLoaded || recentLocations.length < 2) return;

		const map = mapRef.current;
		const sourceId = 'sos-trail';
		const layerId = 'sos-trail-layer';

		// Remove existing trail if any
		if (map.getLayer(layerId)) {
			map.removeLayer(layerId);
		}
		if (map.getSource(sourceId)) {
			map.removeSource(sourceId);
		}

		// Smooth the coordinates using a simple moving average
		const rawCoordinates = recentLocations
			.slice()
			.reverse() // Oldest to newest
			.map(loc => [loc.lng, loc.lat]);

		// Apply smoothing (average of neighboring points)
		const smoothedCoordinates = rawCoordinates.map((coord, i, arr) => {
			if (i === 0 || i === arr.length - 1) return coord;
			
			// Average with neighbors (window of 3)
			const prevCoord = arr[i - 1];
			const nextCoord = arr[i + 1];
			return [
				(prevCoord[0] + coord[0] + nextCoord[0]) / 3,
				(prevCoord[1] + coord[1] + nextCoord[1]) / 3,
			];
		});

		map.addSource(sourceId, {
			type: 'geojson',
			data: {
				type: 'Feature',
				properties: {},
				geometry: {
					type: 'LineString',
					coordinates: smoothedCoordinates,
				},
			},
		});

		map.addLayer({
			id: layerId,
			type: 'line',
			source: sourceId,
			layout: {
				'line-join': 'round',
				'line-cap': 'round',
			},
			paint: {
				'line-color': isActive ? '#77FF77' : '#5ACC5A',
				'line-width': 3,
				'line-opacity': 0.9,
				'line-dasharray': [2, 4],  // Dotted line: 2px dash, 4px gap
			},
		});

		// Move trail below markers
		try {
			map.moveLayer(layerId);
		} catch (e) {
			// Layer ordering may fail if reference layer doesn't exist
		}

		return () => {
			if (map.getLayer(layerId)) {
				map.removeLayer(layerId);
			}
			if (map.getSource(sourceId)) {
				map.removeSource(sourceId);
			}
		};
	}, [recentLocations, isActive, isMapLoaded]);

	// Function to re-center map on user
	const handleRecenter = () => {
		if (mapRef.current) {
			setFollowUser(true);
			mapRef.current.flyTo({
				center: [initialLocation.lng, initialLocation.lat],
				zoom: 18,
				duration: 1000,
			});
		}
	};

	return (
		<>
			<div ref={mapContainerRef} className="w-full h-full" />
			
			{/* Re-center button - shows when not following */}
			{!followUser && (
				<button
					onClick={handleRecenter}
					className="absolute bottom-24 right-4 z-50 bg-[#77FF77] hover:bg-[#5ACC5A] text-[#0A0F1A] font-semibold px-4 py-2 rounded-xl shadow-lg flex items-center gap-2 transition-all"
				>
					<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
						<path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
					</svg>
					Follow
				</button>
			)}
			
			<style jsx global>{`
				.custom-marker {
					width: 40px;
					height: 40px;
					display: flex;
					align-items: center;
					justify-content: center;
				}

				.marker-wrapper {
					position: relative;
					width: 100%;
					height: 100%;
					display: flex;
					align-items: center;
					justify-content: center;
				}

			.marker-dot {
				width: 16px;
				height: 16px;
				background-color: #77FF77;
				border: 3px solid #0A0F1A;
				border-radius: 50%;
				box-shadow: 0 0 20px rgba(119, 255, 119, 0.6), 0 2px 8px rgba(0, 0, 0, 0.5);
				position: relative;
				z-index: 2;
			}

			.pulse-ring {
				position: absolute;
				width: 40px;
				height: 40px;
				border: 3px solid #77FF77;
				border-radius: 50%;
				animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
				z-index: 1;
			}				@keyframes pulse {
					0%, 100% {
						opacity: 1;
						transform: scale(0.5);
					}
					50% {
						opacity: 0;
						transform: scale(1.2);
					}
				}

				.mapboxgl-popup-content {
					background-color: #141B2B !important;
					padding: 0;
					border-radius: 12px;
					border: 1px solid #2A3344;
					box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
				}

				.mapboxgl-popup-tip {
					border-top-color: #141B2B !important;
				}
				
				.mapboxgl-popup-close-button {
					color: #77FF77;
					font-size: 20px;
					padding: 4px 8px;
				}
				
				.mapboxgl-popup-close-button:hover {
					background-color: #1A2332;
				}
			`}</style>
		</>
	);
}
