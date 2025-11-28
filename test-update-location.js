/**
 * Send location updates to an existing SOS session
 * Usage: node test-update-location.js <shortId>
 */

const API_BASE = 'http://localhost:3000/api';
const API_KEY = 'demo-secret-key';

async function updateLocation(shortId) {
	console.log(`📍 Sending location updates to SOS session: ${shortId}\n`);

	// San Francisco Bay Area coordinates (simulating movement)
	const locations = [
		{ lat: 37.7749, lng: -122.4194, accuracy: 10, name: 'Start - Market St' },
		{ lat: 37.7755, lng: -122.4185, accuracy: 8, name: 'Moving NE' },
		{ lat: 37.7762, lng: -122.4175, accuracy: 7, name: 'Continuing NE' },
		{ lat: 37.7770, lng: -122.4165, accuracy: 9, name: 'Near Union Square' },
		{ lat: 37.7880, lng: -122.4070, accuracy: 8, name: 'North Beach' },
	];

	for (let i = 0; i < locations.length; i++) {
		const loc = locations[i];
		
		console.log(`   → Update ${i + 1}/$ {locations.length}: ${loc.name}`);
		
		const updateResponse = await fetch(`${API_BASE}/sos/${shortId}/location`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'X-API-Key': API_KEY,
			},
			body: JSON.stringify({
				lat: loc.lat,
				lng: loc.lng,
				accuracy: loc.accuracy,
				timestamp: new Date().toISOString(),
				speed: 1.5 + (Math.random() * 2), // 1.5-3.5 m/s
				heading: 45 + (i * 10), // Rotating heading
				altitude: 10 + (i * 2),
				batteryLevel: 0.95 - (i * 0.05),
			}),
		});

		if (updateResponse.ok) {
			const result = await updateResponse.json();
			console.log(`      ✓ Success - ${result.data?.watcherCount || 0} watchers`);
		} else {
			const error = await updateResponse.json();
			console.log(`      ✗ Failed: ${error.message}`);
		}

		// Wait 3 seconds between updates to see the animation
		if (i < locations.length - 1) {
			await new Promise(resolve => setTimeout(resolve, 3000));
		}
	}

	console.log('\n✅ All location updates sent!\n');
}

const shortId = process.argv[2] || 'P8T3LUTAH';
updateLocation(shortId).catch(error => {
	console.error('❌ Error:', error.message);
	process.exit(1);
});
