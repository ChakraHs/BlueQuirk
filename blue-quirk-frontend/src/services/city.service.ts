"use client";

// Public deliverable-cities list for the checkout ville selector. Fetched once and
// cached at module level (like the shipping config) so the selector is instant. The
// backend returns only the name + CUSTOMER shipping fee — never the internal cost.
import { API_BASE_URL } from "@/lib/config";

export type PublicCity = {
  name: string;
  shippingFee: number;
};

const CITIES_URL = `${API_BASE_URL}/shop/cities`;

let cached: PublicCity[] | null = null;
let inFlight: Promise<PublicCity[]> | null = null;

export async function fetchCities(): Promise<PublicCity[]> {
  if (cached) return cached;
  if (inFlight) return inFlight;

  inFlight = fetch(CITIES_URL, { cache: "no-store" })
    .then((res) => {
      if (!res.ok) throw new Error(`cities ${res.status}`);
      return res.json() as Promise<PublicCity[]>;
    })
    .then((data) => {
      cached = Array.isArray(data) ? data : [];
      return cached;
    })
    .catch(() => [] as PublicCity[])
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
}
