import axios from "axios";
import { mockProperties, mockReport, mockWeather, type Property } from "./mock";

export const API_BASE = "http://localhost:8000";

export const api = axios.create({ baseURL: API_BASE, timeout: 30000 });

api.interceptors.request.use((cfg) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("propiq_token");
    if (token) cfg.headers.Authorization = `Bearer ${token}`;
  }
  return cfg;
});

let demoMode = false;
export const isDemoMode = () => demoMode;
const setDemo = () => {
  demoMode = true;
  if (typeof window !== "undefined") window.dispatchEvent(new Event("propiq:demo"));
};

async function withFallback<T>(p: Promise<T>, fb: T): Promise<T> {
  try { return await p; } catch { setDemo(); return fb; }
}

export async function login(email: string, _password: string) {
  const token = `mock.${btoa(email)}.${Date.now()}`;
  localStorage.setItem("propiq_token", token);
  localStorage.setItem("propiq_user", email);
  return { token, email };
}

export function logout() {
  localStorage.removeItem("propiq_token");
  localStorage.removeItem("propiq_user");
}

export function getUser() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("propiq_user");
}

export async function searchListings(query: string): Promise<Property[]> {
  return withFallback(
    api.get(`/api/listings/${query}`).then((r) => {
      const data = r.data;
      const listings = Array.isArray(data) ? data : data.listings ?? [];
      return listings.map((l: Record<string, unknown>) => ({
        id: l.id ?? "",
        address: l.full_address ?? l.address ?? "",
        city: l.city ?? "",
        state: l.state ?? "",
        zip: l.zip_code ?? l.zip ?? "",
        price: l.price ?? 0,
        beds: l.beds ?? 0,
        baths: l.baths ?? 0,
        sqft: l.sqft ?? 0,
        type: l.property_type ?? l.type ?? "",
        photo: l.photo_url ?? l.photo ?? "",
        photos: l.photo_urls ?? l.photos ?? [],
        aqi: l.aqi_value ?? l.aqi ?? 0,
        score: l.propiq_score ?? l.score ?? 50,
        recommendation: l.recommendation ?? "HOLD",
      })) as Property[];
    }),
    mockProperties,
  );
}

export async function getProperty(id: string): Promise<Property> {
  return withFallback(
    api.get(`/api/property/${id}`).then((r) => {
      const l = r.data?.listing ?? r.data ?? {};
      return {
        id: l.id ?? id,
        address: l.full_address ?? l.address ?? "",
        city: l.city ?? "",
        state: l.state ?? "",
        zip: l.zip_code ?? l.zip ?? "",
        price: l.price ?? 0,
        beds: l.beds ?? 0,
        baths: l.baths ?? 0,
        sqft: l.sqft ?? 0,
        type: l.property_type ?? l.type ?? "",
        photo: l.photo_url ?? l.photo ?? "",
        photos: l.photo_urls ?? l.photos ?? [],
        aqi: l.aqi_value ?? l.aqi ?? 0,
        score: l.propiq_score ?? l.score ?? 50,
        recommendation: l.recommendation ?? "HOLD",
      } as Property;
    }),
    mockProperties.find((p) => p.id === id) ?? mockProperties[0],
  );
}

export async function getWeather(zip: string) {
  return withFallback(
    api.get(`/api/weather/${zip}`).then((r) => {
      const d = r.data ?? {};
      return {
        temp: d.temp ?? d.temperature ?? mockWeather.temp,
        condition: d.condition ?? d.description ?? mockWeather.condition,
        aqi: d.aqi ?? d.aqi_value ?? mockWeather.aqi,
        pollen: {
          tree: d.pollen?.tree ?? d.tree_pollen ?? mockWeather.pollen.tree,
          grass: d.pollen?.grass ?? d.grass_pollen ?? mockWeather.pollen.grass,
          weed: d.pollen?.weed ?? d.weed_pollen ?? mockWeather.pollen.weed,
        },
      };
    }),
    mockWeather,
  );
}

export async function getReport(zip: string): Promise<string> {
  return withFallback(
    api.post(`/api/analyze`, { zip_code: zip }).then((r) => r.data?.report_text ?? r.data?.report ?? mockReport),
    mockReport,
  );
}

const SAVED_KEY = "propiq_saved";
export function getSaved(): string[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(SAVED_KEY) ?? "[]"); } catch { return []; }
}
export function toggleSaved(id: string) {
  const cur = new Set(getSaved());
  cur.has(id) ? cur.delete(id) : cur.add(id);
  localStorage.setItem(SAVED_KEY, JSON.stringify([...cur]));
  window.dispatchEvent(new Event("propiq:saved"));
}