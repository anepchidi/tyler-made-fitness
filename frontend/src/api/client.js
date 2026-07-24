export const API = import.meta.env.VITE_API_URL;

export const authFetch = (url, options = {}) => {
  const token = localStorage.getItem("workoutToken");
  
  const headers = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };
  
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  
  return fetch(url, {
    ...options,
    headers,
  });
};