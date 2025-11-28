/**
 * API Service for fetching SOS session data
 */

import { SOSData } from '@/types/sos';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000/api';

export async function getSOSSession(shortId: string): Promise<SOSData> {
	const response = await fetch(`${API_BASE_URL}/sos/${shortId}`, {
		cache: 'no-store',
		headers: {
			'Content-Type': 'application/json',
		},
	});

	if (!response.ok) {
		if (response.status === 404) {
			throw new Error('SOS session not found');
		}
		throw new Error('Failed to fetch SOS session');
	}

	const result = await response.json();
	
	if (!result.success) {
		throw new Error(result.message || 'Failed to fetch SOS session');
	}

	return result.data;
}
