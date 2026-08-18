import axios from 'axios';
import { env } from '../config/env';
import { supabase } from '../config/supabase';

const client = axios.create({
  baseURL: env.API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor: attach Supabase JWT access token
client.interceptors.request.use(
  async (config) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      config.headers.Authorization = `Bearer ${session.access_token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle standard error responses
client.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response) {
      const { status, data } = error.response;

      const formattedError = {
        status: status,
        code: data?.error?.code || 'UNKNOWN_ERROR',
        message: data?.error?.message || 'An unexpected error occurred.',
        fields: data?.error?.fields || null
      };

      return Promise.reject(formattedError);
    }

    return Promise.reject({
      status: 500,
      code: 'NETWORK_ERROR',
      message: 'Unable to connect to backend API server.'
    });
  }
);

export default client;
