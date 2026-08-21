const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/api/v1';

export class ApiError extends Error {
  constructor({ code, details, message, status }) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.details = details;
    this.status = status;
  }
}

export const apiRequest = async (path, options = {}) => {
  const headers = new Headers(options.headers);
  let body = options.body;

  if (body && !(body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
    body = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    body,
    credentials: 'include',
    headers,
  });

  if (response.status === 204) return null;

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError({
      code: payload?.error?.code ?? 'REQUEST_FAILED',
      details: payload?.error?.details,
      message: payload?.error?.message ?? 'The request could not be completed.',
      status: response.status,
    });
  }

  return payload?.data;
};
