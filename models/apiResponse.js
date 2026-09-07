// backend/models/apiResponse.js

export function successResponse({ message = 'OK', data = null } = {}) {
  return data === null
    ? { status: 'success', message }
    : { status: 'success', message, data };
}

export function errorResponse({ message = 'Error' } = {}) {
  return { status: 'error', message };
}