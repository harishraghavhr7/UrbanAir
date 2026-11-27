// API base URL — change to your backend IP/URL in production
export const API_BASE_URL = "http://localhost:8000/api/v1";

// Default location (New Delhi, India) — used when location permission is denied
export const DEFAULT_LOCATION = {
  lat: 28.6139,
  lng: 77.2090,
  city: "New Delhi",
};

// Popular cities presets for quick location changing
export const CITY_PRESETS = [
  { city: "New Delhi", lat: 28.6139, lng: 77.2090, tag: "NCR" },
  { city: "Noida", lat: 28.5355, lng: 77.3910, tag: "NCR" },
  { city: "Gurugram", lat: 28.4595, lng: 77.0266, tag: "NCR" },
  { city: "Mumbai", lat: 19.0760, lng: 72.8777, tag: "West" },
  { city: "Kolkata", lat: 22.5726, lng: 88.3639, tag: "East" },
  { city: "Bengaluru", lat: 12.9716, lng: 77.5946, tag: "South" },
  { city: "Hyderabad", lat: 17.3850, lng: 78.4867, tag: "South" },
  { city: "Chennai", lat: 13.0827, lng: 80.2707, tag: "South" },
  { city: "Patna", lat: 25.5941, lng: 85.1376, tag: "East" },
  { city: "Lucknow", lat: 26.8467, lng: 80.9462, tag: "North" },
  { city: "London", lat: 51.5074, lng: -0.1278, tag: "Global" },
  { city: "New York", lat: 40.7128, lng: -74.0060, tag: "Global" },
];

// Daily low-emission & health protection habits
export const DEFAULT_HABITS = [
  { id: "mask", label: "Wore N95 mask outdoors", cigarettesSaved: 4.0, icon: "😷" },
  { id: "purifier", label: "Ran HEPA purifier in bedroom", cigarettesSaved: 5.0, icon: "🌬️" },
  { id: "car_recirc", label: "Car AC set to recirculation", cigarettesSaved: 2.5, icon: "🚗" },
  { id: "exhaust", label: "Used exhaust fan / closed lids while cooking", cigarettesSaved: 2.0, icon: "🍳" },
  { id: "windows_sealed", label: "Kept windows sealed 6 AM – 10 AM", cigarettesSaved: 3.0, icon: "🏠" },
  { id: "hydration", label: "Stayed hydrated & took antioxidants", cigarettesSaved: 1.5, icon: "💧" },
];

// AQI modern jewel-tone color scale
export const AQI_COLORS = {
  Good: "#10B981",                             // Vibrant Emerald
  Moderate: "#F59E0B",                         // Warm Amber
  "Unhealthy for Sensitive Groups": "#F97316", // Coral Orange
  Unhealthy: "#EF4444",                        // Crimson Rose
  "Very Unhealthy": "#8B5CF6",                 // Deep Purple
  Hazardous: "#881337",                        // Deep Wine Maroon
};

export const AQI_BG_COLORS = {
  Good: "#ECFDF5",
  Moderate: "#FFFBEB",
  "Unhealthy for Sensitive Groups": "#FFF7ED",
  Unhealthy: "#FEF2F2",
  "Very Unhealthy": "#F5F3FF",
  Hazardous: "#FFF1F2",
};

export const CATEGORY_ICONS = {
  "Low-Emission Routine": "🏃",
  "Indoor Air Quality": "🏠",
  "Sustainable Alternative": "🌱",
  "Health Impact": "❤️",
  Alert: "🚨",
};
