import axios from 'axios';

const API_URL = 'http://localhost:8080'; // ton backend Spring

export const getProducts = async () => {
  const response = await axios.get(`${API_URL}/api/products`);
  return response.data;
};
