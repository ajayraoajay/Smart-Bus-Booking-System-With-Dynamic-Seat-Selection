import axios from "axios";

const defaultHost = window.location.hostname || "localhost";
const baseURL = import.meta.env.VITE_API_URL || `http://${defaultHost}:8080/api`;

const api = axios.create({
  baseURL,
});

export default api;

