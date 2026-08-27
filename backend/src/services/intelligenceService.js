/**
 * Smart Civic System — Core Intelligence Service
 * Handles AI Severity, 5-Factor Priority Scoring, SLA calculation, and Department/Zone routing.
 */

// Category Severity Matrix
const SEVERITY_MATRIX = {
  'Manhole Uncovered': 'CRITICAL',
  'Tree Fall': 'HIGH',
  'Water Leakage': 'HIGH',
  'Drainage Blockage': 'HIGH',
  'Pothole': 'MEDIUM',
  'Road Damage': 'MEDIUM',
  'Garbage Dump': 'MEDIUM',
  'Streetlight Failure': 'MEDIUM',
  'Broken Footpath': 'LOW',
  'Encroachment': 'LOW',
  'Other': 'MEDIUM'
};

// Severity Scale Weights (0-100)
const SEVERITY_SCORE_MAP = {
  CRITICAL: 100,
  HIGH: 75,
  MEDIUM: 50,
  LOW: 25
};

// Category to Department Code Mapping
const CATEGORY_DEPARTMENT_MAP = {
  'Pothole': 'ROADS',
  'Road Damage': 'ROADS',
  'Broken Footpath': 'ROADS',
  'Encroachment': 'ROADS',
  'Tree Fall': 'ROADS',
  'Garbage': 'SANITATION',
  'Garbage Dump': 'SANITATION',
  'Drainage': 'UGD',
  'Drainage Blockage': 'UGD',
  'Water Leakage': 'UGD',
  'Manhole Uncovered': 'UGD',
  'Street Light': 'ELECTRICAL',
  'Streetlight Failure': 'ELECTRICAL'
};

// SLA Resolution Hours by Priority Level
const SLA_HOURS_MAP = {
  CRITICAL: 12,
  HIGH: 24,
  MEDIUM: 72,
  LOW: 168 // 7 Days
};

/**
 * Determine AI Severity from AI Category
 */
function determineSeverity(aiCategory) {
  if (!aiCategory) return 'MEDIUM';
  return SEVERITY_MATRIX[aiCategory] || 'MEDIUM';
}

/**
 * Calculate 5-Factor Priority Score and Level
 *
 * Formula:
 *   priority_score = (severity_score * 0.40)
 *                  + (related_reports_score * 0.25)
 *                  + (location_impact_score * 0.15)
 *                  + (age_score * 0.10)
 *                  + (trust_score * 0.10)
 */
function calculatePriorityScore({
  severity = 'MEDIUM',
  relatedReportsCount = 1,
  locationImpact = 50,
  createdAt = new Date(),
  trustScore = 100
}) {
  // 1. Severity Score (40%)
  const severityScore = SEVERITY_SCORE_MAP[severity.toUpperCase()] || 50;

  // 2. Related Reports Score (25%) -> 1=20, 2=40, 3=60, 4=80, >=5=100
  const count = Math.max(1, parseInt(relatedReportsCount, 10) || 1);
  const relatedReportsScore = Math.min(100, count * 20);

  // 3. Location Impact Score (15%) -> 0-100 scale (default 50)
  const locImpactScore = Math.min(100, Math.max(0, parseFloat(locationImpact) || 50));

  // 4. Age Score (10%) -> elapsed hours / 72 hours * 100 (capped at 100)
  const createdTime = new Date(createdAt).getTime();
  const nowTime = Date.now();
  const elapsedHours = Math.max(0, (nowTime - createdTime) / (1000 * 60 * 60));
  const ageScore = Math.min(100, (elapsedHours / 72.0) * 100.0);

  // 5. Citizen Trust Score (10%) -> 0-100 scale (default 100)
  const citizenTrustScore = Math.min(100, Math.max(0, parseFloat(trustScore) || 100));

  // Calculate Weighted Sum
  const rawScore =
    (severityScore * 0.40) +
    (relatedReportsScore * 0.25) +
    (locImpactScore * 0.15) +
    (ageScore * 0.10) +
    (citizenTrustScore * 0.10);

  const priorityScore = parseFloat(Math.min(100, Math.max(0, rawScore)).toFixed(2));

  // Priority Level Ranges (Exact boundaries: 81-100 CRITICAL, 61-80 HIGH, 41-60 MEDIUM, 0-40 LOW)
  let priorityLevel = 'LOW';
  if (priorityScore >= 81) {
    priorityLevel = 'CRITICAL';
  } else if (priorityScore >= 61) {
    priorityLevel = 'HIGH';
  } else if (priorityScore >= 41) {
    priorityLevel = 'MEDIUM';
  } else {
    priorityLevel = 'LOW';
  }

  return {
    priorityScore,
    priorityLevel,
    components: {
      severityScore,
      relatedReportsScore,
      locImpactScore,
      ageScore: parseFloat(ageScore.toFixed(2)),
      citizenTrustScore
    }
  };
}

/**
 * Calculate SLA Deadline timestamp based on Priority Level
 */
function calculateSlaDeadline(priorityLevel, startTime = new Date()) {
  const levelUpper = (priorityLevel || 'MEDIUM').toUpperCase();
  const resolutionHours = SLA_HOURS_MAP[levelUpper] || 72;
  const start = new Date(startTime);
  const deadline = new Date(start.getTime() + resolutionHours * 60 * 60 * 1000);
  return {
    resolutionHours,
    slaDeadline: deadline.toISOString()
  };
}

/**
 * Resolve Department Code from AI Category
 */
function resolveDepartmentCode(aiCategory) {
  if (!aiCategory) return null;
  if (CATEGORY_DEPARTMENT_MAP[aiCategory]) return CATEGORY_DEPARTMENT_MAP[aiCategory];

  const catLower = aiCategory.toLowerCase();
  if (catLower.includes('garbage') || catLower.includes('waste') || catLower.includes('dump')) return 'SANITATION';
  if (catLower.includes('pothole') || catLower.includes('road') || catLower.includes('footpath') || catLower.includes('tree')) return 'ROADS';
  if (catLower.includes('drain') || catLower.includes('water') || catLower.includes('manhole') || catLower.includes('sewage')) return 'UGD';
  if (catLower.includes('light') || catLower.includes('street') || catLower.includes('electrical')) return 'ELECTRICAL';

  return null;
}

/**
 * Calculate 2D Haversine Distance in meters between two lat/lon pairs
 */
function haversineDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Radius of Earth in meters
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Parse location formats (GeoJSON Object, WKT String, or PostGIS EWKB Hex String)
 */
function parseLocationPoint(location) {
  if (!location) return null;

  if (typeof location === 'object') {
    if (typeof location.latitude === 'number' && typeof location.longitude === 'number') {
      return location;
    }
    if (location.type === 'Point' && Array.isArray(location.coordinates) && location.coordinates.length >= 2) {
      return { longitude: location.coordinates[0], latitude: location.coordinates[1] };
    }
  }

  if (typeof location === 'string') {
    const str = location.trim();

    // 1. Check for PostGIS EWKB Hex format (e.g., 0101000020E6100000...)
    if (str.length >= 50 && /^[0-9a-fA-F]+$/.test(str)) {
      try {
        const buf = Buffer.from(str, 'hex');
        const lon = buf.readDoubleLE(9);
        const lat = buf.readDoubleLE(17);
        if (!isNaN(lon) && !isNaN(lat)) {
          return { longitude: lon, latitude: lat };
        }
      } catch (e) {
        // Fall through to WKT parsing
      }
    }

    // 2. Check for WKT POINT format (e.g., POINT(77.5946 12.9716))
    const wktMatch = str.match(/POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i);
    if (wktMatch) {
      return {
        longitude: parseFloat(wktMatch[1]),
        latitude: parseFloat(wktMatch[2])
      };
    }
  }

  return null;
}

module.exports = {
  determineSeverity,
  calculatePriorityScore,
  calculateSlaDeadline,
  resolveDepartmentCode,
  haversineDistanceMeters,
  parseLocationPoint,
  SEVERITY_MATRIX,
  SLA_HOURS_MAP,
  CATEGORY_DEPARTMENT_MAP
};
