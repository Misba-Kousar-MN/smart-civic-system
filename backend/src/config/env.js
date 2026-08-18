const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from backend/.env
dotenv.config({ path: path.join(__dirname, '../../.env') });

const requiredEnvVars = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY'
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.warn(`[WARNING] Missing required environment variable: ${envVar}`);
  }
}

module.exports = {
  PORT: parseInt(process.env.PORT || '4000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  SUPABASE_URL: process.env.SUPABASE_URL || '',
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || '',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  SUPABASE_JWT_SECRET: process.env.SUPABASE_JWT_SECRET || '',
  ML_SERVICE_URL: process.env.ML_SERVICE_URL || 'http://127.0.0.1:8008/ml/v1',
  ML_INTERNAL_API_KEY: process.env.ML_INTERNAL_API_KEY || '',
  ML_TIMEOUT_MS: parseInt(process.env.ML_TIMEOUT_MS || '30000', 10),
  SUPABASE_STORAGE_BUCKET_REPORTS: process.env.SUPABASE_STORAGE_BUCKET_REPORTS || 'civic-reports',
  SUPABASE_STORAGE_BUCKET_EVIDENCE: process.env.SUPABASE_STORAGE_BUCKET_EVIDENCE || 'resolution-evidence',
  CORS_ALLOWED_ORIGINS: (process.env.CORS_ALLOWED_ORIGINS || 'http://localhost:3000,http://localhost:5173').split(','),
  SPATIAL_DEDUPLICATION_RADIUS_METERS: parseFloat(process.env.SPATIAL_DEDUPLICATION_RADIUS_METERS || '50'),
  SLA_TIMEZONE: process.env.SLA_TIMEZONE || 'Asia/Kolkata'
};
