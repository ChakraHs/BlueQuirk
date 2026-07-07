import simpleRestProvider from "ra-data-simple-rest";
import { API_BASE_URL } from "@/lib/config";

const fetchJsonWithAuth = async (url: string, options: RequestInit = {}) => {
  const token = localStorage.getItem("access_token");
  options.headers = {
    ...(options.headers as Record<string, string>),
    Authorization: token ? `Bearer ${token}` : "",
  };

  const response = await fetch(url, options);
  const json = await response.json(); // parse JSON
  const text = await response.text().catch(() => ""); // fallback if empty body

  return {
    status: response.status,
    headers: response.headers,
    body: text,
    json, // this is what RA will use internally
  };
};

export const dataProvider = simpleRestProvider(
  API_BASE_URL,
  fetchJsonWithAuth
);
