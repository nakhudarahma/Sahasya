/**
 * API utility for Sahasya frontend
 * Handles communication with the Node.js/Supabase backend
 * 
 * Backend wraps all responses in: { success: boolean, message: string, data: T }
 * This utility automatically unwraps the .data field.
 */

// Ensure we point to the actual local backend server or live server
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

export const api = {
  async request(endpoint, options = {}) {
    const token = localStorage.getItem('sahasya_token');
    const headers = { ...options.headers };

    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config = { ...options, headers };

    try {
      const response = await fetch(`${BASE_URL}${endpoint}`, config);
      const json = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          const refreshToken = localStorage.getItem('sahasya_refresh_token');
          
          if (refreshToken && endpoint !== '/auth/refresh') {
            if (isRefreshing) {
              return new Promise((resolve, reject) => {
                failedQueue.push({ resolve, reject });
              })
                .then(newToken => {
                  config.headers['Authorization'] = `Bearer ${newToken}`;
                  return fetch(`${BASE_URL}${endpoint}`, config).then(res => res.json()).then(j => this.unwrapJSON(j));
                })
                .catch(err => {
                  throw err;
                });
            }

            isRefreshing = true;

            try {
              const refreshRes = await fetch(`${BASE_URL}/auth/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refresh_token: refreshToken })
              });

              if (refreshRes.ok) {
                const refreshData = await refreshRes.json();
                const { access_token, refresh_token } = refreshData.data?.session || {};
                
                if (access_token) {
                  localStorage.setItem('sahasya_token', access_token);
                  if (refresh_token) localStorage.setItem('sahasya_refresh_token', refresh_token);
                  
                  processQueue(null, access_token);
                  
                  // Retry the original request with the new token
                  config.headers['Authorization'] = `Bearer ${access_token}`;
                  const retryRes = await fetch(`${BASE_URL}${endpoint}`, config);
                  const retryJson = await retryRes.json();
                  return this.unwrapJSON(retryJson);
                }
              }
            } catch (refreshErr) {
              console.error('Token refresh failed:', refreshErr);
            } finally {
              isRefreshing = false;
            }
          }

          processQueue(new Error('Session Expired'));
          localStorage.removeItem('sahasya_token');
          localStorage.removeItem('sahasya_session');
          localStorage.removeItem('sahasya_refresh_token');
          window.dispatchEvent(new Event('auth_unauthorized'));
        }

        let errorMessage = typeof json.error === 'object' && json.error?.message
          ? json.error.message
          : (json.error || json.message || `Request failed with status ${response.status}`);
        
        if (response.status === 401) {
          errorMessage = 'Your session has expired. Please log in again to continue.';
        }
        
        throw new Error(errorMessage);
      }

      return this.unwrapJSON(json);
    } catch (error) {
      console.error(`API Error [${endpoint}]:`, error);
      throw error;
    }
  },

  unwrapJSON(json) {
    if (json && typeof json === 'object' && ('data' in json || json.success)) {
      return json.data !== undefined ? json.data : json;
    }
    return json;
  },

  get(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'GET' });
  },

  post(endpoint, body, options = {}) {
    return this.request(endpoint, { ...options, method: 'POST', body: JSON.stringify(body) });
  },

  put(endpoint, body, options = {}) {
    return this.request(endpoint, { ...options, method: 'PUT', body: JSON.stringify(body) });
  },

  patch(endpoint, body, options = {}) {
    return this.request(endpoint, { ...options, method: 'PATCH', body: JSON.stringify(body) });
  },

  delete(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'DELETE' });
  },

  /**
   * Upload a file (multipart/form-data) — skips JSON stringification
   */
  upload(endpoint, formData, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'POST',
      body: formData, // FormData instance — Content-Type set automatically by browser
    });
  }
};
