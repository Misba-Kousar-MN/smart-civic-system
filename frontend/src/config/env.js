export const env = {
  SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL || 'https://wtadxeanbmtnocjermcf.supabase.co',
  SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api/v1',
  APP_ENV: import.meta.env.VITE_APP_ENV || 'development'
};
