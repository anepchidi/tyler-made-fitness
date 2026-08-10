export const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const TOKEN_KEY = 'workoutToken';

const STATUS_MESSAGES = {
  401: 'Your session has expired. Please sign in again.',
  403: "You don't have permission to do that.",
  422: 'The data you submitted is invalid.',
};

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function buildHeaders(options) {
  const token = getToken();
  const isFormData = options.body instanceof FormData;

  const headers = {
    Accept: 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  if (isFormData) {
    delete headers['Content-Type'];
  } else if (options.body !== undefined && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  return headers;
}

function serializeBody(body) {
  if (body === undefined || body === null) return undefined;
  if (body instanceof FormData || typeof body === 'string') return body;
  return JSON.stringify(body);
}

async function parseResponseBody(response) {
  if (response.status === 204) return null;
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return response.json().catch(() => null);
  }
  return response.text().catch(() => null);
}

/**
 * Core request function. Injects the auth token, serializes the body,
 * parses the response, and throws a meaningful ApiError on any non-2xx
 * response. On 401, clears the stored token and dispatches a global
 * "auth:unauthorized" event so the app can sign the user out.
 */
async function request(path, options = {}) {
  const url = path.startsWith('http') ? path : `${API}${path}`;
  const headers = buildHeaders(options);
  const body = serializeBody(options.body);

  let response;
  try {
    response = await fetch(url, { ...options, headers, body });
  } catch (err) {
    throw new ApiError('Network error: unable to reach the server.', 0, null);
  }

  if (response.status === 401) {
    localStorage.removeItem(TOKEN_KEY);
    window.dispatchEvent(new CustomEvent('auth:unauthorized'));
  }

  const data = await parseResponseBody(response);

  if (!response.ok) {
    const message =
      (data && typeof data === 'object' && data.detail) ||
      STATUS_MESSAGES[response.status] ||
      `Request failed with status ${response.status}`;
    throw new ApiError(message, response.status, data);
  }

  return data;
}

export const client = {
  get: (path, options = {}) => request(path, { ...options, method: 'GET' }),
  post: (path, body, options = {}) => request(path, { ...options, method: 'POST', body }),
  put: (path, body, options = {}) => request(path, { ...options, method: 'PUT', body }),
  patch: (path, body, options = {}) => request(path, { ...options, method: 'PATCH', body }),
  delete: (path, options = {}) => request(path, { ...options, method: 'DELETE' }),
};

export default client;