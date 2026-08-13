// Shared REST client helpers — centralizes the API base URL, default headers,
// and network-error normalization so individual API modules stay declarative.

export const BASE_URL = process.env.PLB_API_BASE_URL || '/api';

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

// Wraps fetch so a network failure (offline, DNS, CORS, etc. — surfaced by the
// Fetch API as a rejected promise, typically a TypeError) becomes a catchable
// ApiError instead of an unnormalized rejection. HTTP-level errors (4xx/5xx)
// are left to the caller, since 404 vs. other statuses is handled differently
// per endpoint.
export async function apiFetch(path, options = {}) {
  try {
    return await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: {
        Accept: 'application/json',
        ...options.headers,
      },
    });
  } catch (err) {
    throw new ApiError(`Network error while fetching ${path}: ${err.message}`, 0);
  }
}
