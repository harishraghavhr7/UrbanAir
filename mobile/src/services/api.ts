import axios from "axios";
import { API_BASE_URL } from "../constants";

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
  headers: { "Content-Type": "application/json" },
});

// ── Auth ─────────────────────────────────────────────────
export const loginUser = async (data: { email: string; password: string }) =>
  api.post("/auth/login", data).then((r) => r.data);

export const registerUser = async (data: {
  email: string;
  password: string;
  name: string;
  city?: string;
}) => api.post("/auth/register", data).then((r) => r.data);

export const guestLogin = async () =>
  api.post("/auth/guest").then((r) => r.data);

// ── AQI ──────────────────────────────────────────────────
export const getAQI = async (lat: number, lng: number, city: string) =>
  api.get("/aqi/current", { params: { lat, lng, city } }).then((r) => r.data);

export const getForecast = async (lat: number, lng: number) =>
  api.get("/aqi/forecast", { params: { lat, lng } }).then((r) => r.data);

export const getSuggestions = async (
  lat: number,
  lng: number,
  city: string,
  userId?: string
) =>
  api
    .get("/aqi/suggestions", { params: { lat, lng, city, user_id: userId } })
    .then((r) => r.data);

// ── Daily Routine ─────────────────────────────────────────
export const getDailyRoutine = async (
  lat: number,
  lng: number,
  city: string,
  userId?: string,
  habits?: any,
  commuteMode?: string
) => {
  const params: any = { lat, lng, city };
  if (userId) params.user_id = userId;
  if (habits) {
    if (habits.wakeTime) params.wake_time = habits.wakeTime;
    if (habits.exerciseType) params.exercise_type = habits.exerciseType;
    if (habits.exerciseTime) params.exercise_time = habits.exerciseTime;
    if (habits.commuteDeparture) params.commute_departure = habits.commuteDeparture;
    if (habits.commuteReturn) params.commute_return = habits.commuteReturn;
    if (habits.hasSchoolRun !== undefined) params.has_school_run = habits.hasSchoolRun;
    if (habits.schoolRunTime) params.school_run_time = habits.schoolRunTime;
    if (habits.cookingTime) params.cooking_time = habits.cookingTime;
    if (habits.sleepTime) params.sleep_time = habits.sleepTime;
  }
  if (commuteMode) params.commute_mode = commuteMode;
  return api.get("/routine/daily", { params }).then((r) => r.data);
};

// ── Profile ───────────────────────────────────────────────
export const createProfile = async (data: any) =>
  api.post("/profile/", data).then((r) => r.data);

export const getProfile = async (userId: string) =>
  api.get(`/profile/${userId}`).then((r) => r.data);

export const updateProfile = async (userId: string, data: any) =>
  api.put(`/profile/${userId}`, data).then((r) => r.data);

// ── RAG Chat ──────────────────────────────────────────────
export const sendChatMessage = async (payload: {
  message: string;
  history: { role: string; content: string }[];
  lat?: number;
  lng?: number;
  user_id?: string;
  language?: string;
}) => api.post("/chat/", payload).then((r) => r.data);

// ── Clean Route / Commute Planner ────────────────────────
export const planCommute = async (payload: {
  origin: string;
  destination: string;
  distance_km: number;
  lat: number;
  lng: number;
  city: string;
}) => api.post("/commute/routes", payload).then((r) => r.data);

// ── Doctor Pulmonologist Health Report ────────────────────
export const generateDoctorReport = async (payload: {
  user_id?: string;
  patient_name: string;
  city: string;
  lat: number;
  lng: number;
  days_period?: number;
  symptoms?: string[];
  medications?: string[];
  notes?: string;
}) => api.post("/report/generate", payload).then((r) => r.data);
