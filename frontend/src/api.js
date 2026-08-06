import axios from "axios";

export const API =
  import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "http://localhost:8080/api";

// Send httpOnly session cookie on cross-origin API calls (CORS credentials).
axios.defaults.withCredentials = true;
