export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
  'ngrok-skip-browser-warning': 'true'
};

export async function apiClient(endpoint, options = {}) {
  try {
    const url = `${API_BASE_URL}${endpoint}`;
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('avsr_jwt_token') : null;
    
    const headers = {
      ...DEFAULT_HEADERS,
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...(options.headers || {})
    };

    const config = {
      ...options,
      headers
    };

    const res = await fetch(url, config);
    
    if (res.status === 401 || res.status === 403) {
      // Handle unauthorized (maybe logout user)
      // Optional: dispatch event or clear storage
    }

    if (!res.ok) {
      const errorText = await res.text();
      let errorJson;
      try {
        errorJson = JSON.parse(errorText);
      } catch (e) {
        // Not JSON
      }

      let displayError = errorJson?.message || errorJson?.error || errorJson?.title;

      if (!displayError && errorJson?.errors && typeof errorJson.errors === 'object') {
        const firstKey = Object.keys(errorJson.errors)[0];
        if (firstKey && Array.isArray(errorJson.errors[firstKey])) {
          displayError = errorJson.errors[firstKey][0];
        }
      }

      if (!displayError) {
        if (errorText.includes('Microsoft.AspNetCore') || errorText.includes('System.') || errorText.includes('Exception')) {
          displayError = `Backend Server Error (500): Unhandled exception in backend controller. Check server logs.`;
        } else if (errorText.length > 200) {
          displayError = `Server Error (${res.status}): ${errorText.substring(0, 150)}...`;
        } else {
          displayError = errorText || `HTTP Error ${res.status}`;
        }
      }

      console.error(`[API Error ${res.status}] ${endpoint}:`, errorText);

      return { 
        success: false, 
        error: displayError,
        rawError: errorText,
        status: res.status
      };
    }
    
    // Some endpoints might return empty response (like 204 No Content)
    const text = await res.text();
    if (!text) {
      return { success: true, data: null };
    }
    
    const data = JSON.parse(text);
    return { success: true, data };
  } catch (err) {
    console.error(`[API Error] Failed request to ${endpoint}:`, err);
    let errorMsg = err.message || 'Network error occurred';
    if (errorMsg === 'Failed to fetch' || errorMsg.toLowerCase().includes('fetch')) {
      errorMsg = 'Failed to connect to backend server. The server or network tunnel may be offline or slow to respond.';
    }
    return { success: false, error: errorMsg };
  }
}
