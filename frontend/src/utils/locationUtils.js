/**
 * Utility functions for parsing and formatting spatial location coordinates
 */

const DEFAULT_CENTER = { lat: 14.4673, lng: 75.9241 }; // Davanagere center

/**
 * Extract clean numeric { lat, lng } from any location format:
 * - { latitude, longitude }
 * - { lat, lng }
 * - WKT string 'POINT(75.9241 14.4673)' (Note: PostGIS WKT is POINT(lng lat))
 * - Address string containing coordinates 'Location (14.4673, 75.9241)'
 */
export function parseCoordinates(locInput) {
  if (!locInput) return DEFAULT_CENTER;

  // 1. Direct object format
  if (typeof locInput === 'object') {
    const lat = parseFloat(locInput.latitude ?? locInput.lat);
    const lng = parseFloat(locInput.longitude ?? locInput.lng);

    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { lat, lng };
    }
  }

  // 2. String format
  if (typeof locInput === 'string') {
    const trimmed = locInput.trim();

    // WKT Format: POINT(longitude latitude)
    if (trimmed.toUpperCase().startsWith('POINT')) {
      const match = trimmed.match(/POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i);
      if (match) {
        const lng = parseFloat(match[1]);
        const lat = parseFloat(match[2]);
        if (!isNaN(lat) && !isNaN(lng)) {
          return { lat, lng };
        }
      }
    }

    // Address string format: Location (lat, lng)
    const matchLoc = trimmed.match(/\(([-\d.]+),\s*([-\d.]+)\)/);
    if (matchLoc) {
      const lat = parseFloat(matchLoc[1]);
      const lng = parseFloat(matchLoc[2]);
      if (!isNaN(lat) && !isNaN(lng)) {
        return { lat, lng };
      }
    }
  }

  return DEFAULT_CENTER;
}

/**
 * Format coordinates as readable string
 */
export function formatCoordinates(lat, lng) {
  const parsed = parseCoordinates({ lat, lng });
  return `${parsed.lat.toFixed(6)}, ${parsed.lng.toFixed(6)}`;
}
