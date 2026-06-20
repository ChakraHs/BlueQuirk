import simpleRestProvider from "ra-data-simple-rest";

const fetchJsonWithAuth = async (url: string, options: any = {}) => {
  const token = localStorage.getItem("access_token");
  options.headers = {
    ...options.headers,
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
  "http://localhost:8080/api",
  fetchJsonWithAuth
);
