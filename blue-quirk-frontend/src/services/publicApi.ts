import axios from "axios";
import { API_BASE_URL } from "@/lib/config";

const publicApi  = axios.create({
  baseURL: API_BASE_URL,
});

export default publicApi ;