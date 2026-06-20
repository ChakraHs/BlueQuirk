import axios from "axios";

const publicApi  = axios.create({
  baseURL: "http://localhost:9090/api",
});

export default publicApi ;