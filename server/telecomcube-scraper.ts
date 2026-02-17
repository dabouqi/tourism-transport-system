/**
 * Telecomcube GPS Scraper
 * Fetches real-time vehicle tracking data from Telecomcube
 */

import axios from 'axios';

interface TelecomcubeVehicleData {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  speed: number;
  heading?: number;
  accuracy?: number;
  lastUpdate: string;
  status: 'active' | 'idle' | 'offline';
}

// Telecomcube credentials
const TELECOMCUBE_USERNAME = process.env.TELECOMCUBE_USERNAME || 'hijazi1@tc.com';
const TELECOMCUBE_PASSWORD = process.env.TELECOMCUBE_PASSWORD || '123456';
const TELECOMCUBE_URL = 'https://gpsr.telecomcube.com';

// Cache for session cookies
let sessionCookie: string | null = null;
let lastLoginTime = 0;
const LOGIN_CACHE_DURATION = 3600000; // 1 hour

/**
 * Login to Telecomcube and get session cookie
 */
async function loginToTelecomcube(): Promise<string> {
  try {
    // Check if we have a valid cached session
    if (sessionCookie && Date.now() - lastLoginTime < LOGIN_CACHE_DURATION) {
      console.log('[Telecomcube] Using cached session');
      return sessionCookie;
    }

    console.log('[Telecomcube] Logging in...');

    const response = await axios.post(
      `${TELECOMCUBE_URL}/index.php`,
      {
        username: TELECOMCUBE_USERNAME,
        password: TELECOMCUBE_PASSWORD,
        action: 'login',
      },
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        withCredentials: true,
        maxRedirects: 5,
      }
    );

    // Extract session cookie from response headers
    const setCookieHeader = response.headers['set-cookie'];
    if (setCookieHeader) {
      const cookies = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
      const sessionCookieStr = cookies
        .find((cookie) => cookie.includes('PHPSESSID'))
        ?.split(';')[0];

      if (sessionCookieStr) {
        sessionCookie = sessionCookieStr;
        lastLoginTime = Date.now();
        console.log('[Telecomcube] Login successful');
        return sessionCookie;
      }
    }

    throw new Error('No session cookie found in login response');
  } catch (error) {
    console.error('[Telecomcube] Login failed:', error instanceof Error ? error.message : error);
    throw error;
  }
}

/**
 * Fetch vehicle data from Telecomcube
 */
async function fetchVehicleFromTelecomcube(vehicleId: string): Promise<TelecomcubeVehicleData | null> {
  try {
    // Ensure we have a valid session
    const cookie = await loginToTelecomcube();

    console.log(`[Telecomcube] Fetching data for vehicle ${vehicleId}...`);

    // Fetch the tracking page
    const response = await axios.get(`${TELECOMCUBE_URL}/tracking.php`, {
      headers: {
        'Cookie': cookie,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      withCredentials: true,
    });

    // Parse the HTML response to extract vehicle data
    // Look for vehicle data in JavaScript or JSON format
    const html = response.data;

    // Try to find vehicle data in the page
    // Telecomcube typically embeds data in JavaScript variables or JSON
    const vehicleDataMatch = html.match(new RegExp(`"${vehicleId}"[^}]*}`, 'i'));
    
    if (vehicleDataMatch) {
      console.log(`[Telecomcube] Found vehicle ${vehicleId} in response`);
      
      // Extract coordinates and other data
      // This is a simplified extraction - adjust based on actual HTML structure
      const coordMatch = html.match(/lat["\s:]+([0-9.]+)[^0-9]*lon["\s:]+([0-9.]+)/i);
      const speedMatch = html.match(/speed["\s:]+([0-9.]+)/i);
      
      if (coordMatch) {
        return {
          id: vehicleId,
          name: vehicleId,
          latitude: parseFloat(coordMatch[1]),
          longitude: parseFloat(coordMatch[2]),
          speed: speedMatch ? parseFloat(speedMatch[1]) : 0,
          lastUpdate: new Date().toISOString(),
          status: 'active',
        };
      }
    }

    console.log(`[Telecomcube] Vehicle ${vehicleId} not found in response`);
    return null;
  } catch (error) {
    console.error(`[Telecomcube] Error fetching vehicle ${vehicleId}:`, error instanceof Error ? error.message : error);
    return null;
  }
}

/**
 * Fetch multiple vehicles from Telecomcube
 */
async function fetchVehiclesFromTelecomcube(vehicleIds: string[]): Promise<TelecomcubeVehicleData[]> {
  try {
    const results = await Promise.all(
      vehicleIds.map((id) => fetchVehicleFromTelecomcube(id).catch(() => null))
    );
    return results.filter((v): v is TelecomcubeVehicleData => v !== null);
  } catch (error) {
    console.error('[Telecomcube] Error fetching vehicles:', error);
    return [];
  }
}

export { fetchVehicleFromTelecomcube, fetchVehiclesFromTelecomcube, TelecomcubeVehicleData };
