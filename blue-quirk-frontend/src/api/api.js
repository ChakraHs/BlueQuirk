import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:8080", // ton backend Spring Boot
  headers: {
    "Content-Type": "application/json",
  },
});

export default api;
