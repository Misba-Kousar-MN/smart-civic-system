const { createClient } = require('@supabase/supabase-js');
const env = require('./env');

const supabaseUrl = env.SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder_service_role_key';
const supabaseAnonKey = env.SUPABASE_ANON_KEY || 'placeholder_anon_key';

if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('[WARN] Supabase URL or Service Role Key missing. Using placeholder values for initialization.');
}

// Privileged Supabase client using Service Role Key for server-side trusted operations
const supabaseService = createClient(supabaseUrl, supabaseServiceKey, {
  global: {
    headers: {
      Authorization: `Bearer ${supabaseServiceKey}`
    }
  },
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

// Create client scoped to user's JWT for RLS-enforced queries
function createUserClient(accessToken) {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}

module.exports = {
  supabaseService,
  createUserClient
};
