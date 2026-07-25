export const API = import.meta.env.VITE_API_URL;

export const authFetch = async (url, options = {}) => {
  const token = localStorage.getItem("workoutToken");
  
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };
  
  if (options.body instanceof FormData) {
    delete headers["Content-Type"];
  }

  const response = await fetch(url, { ...options, headers });
  
  return response
};