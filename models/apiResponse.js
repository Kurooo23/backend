export function successResponse({ message = "OK", data = null } = {}) {
  const response = {
    status: "success",
    message,
  };
  if (data !== null) {
    response.data = data;
  }
  return response;
}

export function errorResponse({
  message = "Error",
} = {}) {
  return {
    status: "error",
    message
  };
}