const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

export async function apiFetch(url: string, options: RequestInit = {}) {
  if (typeof window === 'undefined') {
    throw new Error('apiFetch must be called on client side');
  }

  const token = localStorage.getItem('token'); // ✅ FIX

  /* ===== SAFE URL NORMALIZATION ===== */

  let safeUrl = url;

  if (!safeUrl.startsWith('/')) {
    safeUrl = `/${safeUrl}`;
  }

  const fullUrl = safeUrl.startsWith('http')
    ? safeUrl
    : `${BASE_URL}${safeUrl}`;

  /* ===== SMART HEADER HANDLING ===== */

  const headers: Record<string, string> = {
    ...((options.headers as Record<string, string>) || {}),
  };

  /* prevent duplicate content-type */
  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  /* ===== REQUEST TIMEOUT SUPPORT ===== */

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 180000);

  let response: Response;

  try {
    response = await fetch(fullUrl, {
      ...options,
      headers,
      signal: controller.signal,
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      console.error('API request timeout:', fullUrl);
      throw new Error('Request timeout — backend took too long');
    }

    console.error('Network error while calling API:', fullUrl, err);

    throw new Error('Backend not reachable');
  } finally {
    clearTimeout(timeout);
  }

  /* ===== HANDLE UNAUTHORIZED ===== */

  if (response.status === 401) {
    console.warn('Unauthorized — token removed');

    localStorage.removeItem('access_token');

    if (window.location.pathname !== '/login') {
      window.location.replace('/login');
    }

    throw new Error('Unauthorized');
  }

  /* ===== HANDLE SERVER ERRORS ===== */

  if (!response.ok) {
    console.warn(`API Error ${response.status} for ${fullUrl}`);

    let errorText = '';

    try {
      errorText = await response.text();
    } catch {}

    console.error('API error response:', errorText);

    throw new Error(errorText || 'API request failed');
  }

  /* ===== RETURN JSON SAFELY ===== */

  const contentType = response.headers.get('content-type');

  if (contentType && contentType.includes('application/json')) {
    try {
      return await response.json();
    } catch (err) {
      console.warn('JSON parse failed:', err);
      return {};
    }
  }

  try {
    return await response.text();
  } catch {
    return {};
  }
}

// ================= PAGINATED LOGS =================

export const getLogs = (page = 1, limit = 100) =>
  apiFetch(`/api/soc/logs?page=${page}&limit=${limit}`);
