export const DEFAULT_COORDINATES = {
  lat: 14.467389,
  lng: 75.924080
};

export function parseCoordinates(location) {
  if (!location) return DEFAULT_COORDINATES;

  if (typeof location === 'string') {
    const wktMatch = location.match(/POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i);
    if (wktMatch) {
      return {
        lng: parseFloat(wktMatch[1]),
        lat: parseFloat(wktMatch[2])
      };
    }
  }

  if (typeof location === 'object') {
    if (location.lat !== undefined && location.lng !== undefined) {
      return { lat: parseFloat(location.lat), lng: parseFloat(location.lng) };
    }
    if (location.latitude !== undefined && location.longitude !== undefined) {
      return { lat: parseFloat(location.latitude), lng: parseFloat(location.longitude) };
    }
    if (location.coordinates && Array.isArray(location.coordinates) && location.coordinates.length >= 2) {
      return {
        lng: parseFloat(location.coordinates[0]),
        lat: parseFloat(location.coordinates[1])
      };
    }
  }

  return DEFAULT_COORDINATES;
}

export function formatCoordinates(lat, lng) {
  if (lat === undefined || lng === undefined) return '14.4674° N, 75.9241° E';
  const latDir = lat >= 0 ? 'N' : 'S';
  const lngDir = lng >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(4)}° ${latDir}, ${Math.abs(lng).toFixed(4)}° ${lngDir}`;
}
