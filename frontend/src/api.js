export const API =
  import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "http://localhost:8000/api";
