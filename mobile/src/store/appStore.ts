import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

export interface Location {
  lat: number;
  lng: number;
  city: string;
}

export interface ScheduleHabits {
  wakeTime: string;
  exerciseType: string;
  exerciseTime: string;
  commuteDeparture: string;
  commuteReturn: string;
  hasSchoolRun: boolean;
  schoolRunTime: string;
  cookingTime: string;
  sleepTime: string;
}

export interface UserProfile {
  user_id: string;
  name?: string;
  commute_mode: string;
  has_children: boolean;
  has_elderly: boolean;
  has_air_purifier: boolean;
  health_conditions: string[];
  schedule_habits?: ScheduleHabits;
}

export interface AQIData {
  aqi: number;
  category: string;
  pm25?: number;
  pm10?: number;
  city: string;
  cigarette_equivalent: string;
}

interface AppState {
  userId: string;
  isAuthenticated: boolean;
  authToken: string | null;
  userEmail: string | null;
  location: Location;
  profile: UserProfile | null;
  aqi: AQIData | null;
  isOnboarded: boolean;
  completedHabits: string[];
  preferredLanguage: "en" | "hi" | "hinglish";
  scheduleHabits: ScheduleHabits;
  checkedScheduleItems: string[];
  isAiOptimizedView: boolean;

  login: (token: string, profile: UserProfile) => void;
  logout: () => void;
  setUserId: (id: string) => void;
  setLocation: (location: Location) => void;
  setProfile: (profile: UserProfile) => void;
  setAQI: (aqi: AQIData) => void;
  setOnboarded: (val: boolean) => void;
  toggleHabit: (habitId: string) => void;
  setPreferredLanguage: (lang: "en" | "hi" | "hinglish") => void;
  setScheduleHabits: (habits: Partial<ScheduleHabits>) => void;
  toggleScheduleItem: (id: string) => void;
  setIsAiOptimizedView: (val: boolean) => void;
}

const customStorage = {
  getItem: async (name: string): Promise<string | null> => {
    if (Platform.OS === "web" && typeof window !== "undefined" && window.localStorage) {
      return window.localStorage.getItem(name);
    }
    return AsyncStorage.getItem(name);
  },
  setItem: async (name: string, value: string): Promise<void> => {
    if (Platform.OS === "web" && typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem(name, value);
      return;
    }
    await AsyncStorage.setItem(name, value);
  },
  removeItem: async (name: string): Promise<void> => {
    if (Platform.OS === "web" && typeof window !== "undefined" && window.localStorage) {
      window.localStorage.removeItem(name);
      return;
    }
    await AsyncStorage.removeItem(name);
  },
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      userId: "user_default_local",
      isAuthenticated: false,
      authToken: null,
      userEmail: null,
      location: { lat: 28.6139, lng: 77.209, city: "New Delhi" },
      profile: null,
      aqi: null,
      isOnboarded: false,
      completedHabits: ["mask", "purifier"],
      preferredLanguage: "en",
      scheduleHabits: {
        wakeTime: "06:30 AM",
        exerciseType: "morning_walk",
        exerciseTime: "07:00 AM",
        commuteDeparture: "08:30 AM",
        commuteReturn: "06:00 PM",
        hasSchoolRun: false,
        schoolRunTime: "07:45 AM",
        cookingTime: "08:00 PM",
        sleepTime: "10:30 PM",
      },
      checkedScheduleItems: [],
      isAiOptimizedView: true,

      login: (token, profile) =>
        set((state) => ({
          isAuthenticated: true,
          authToken: token,
          userEmail: profile.email || null,
          profile,
          userId: profile.user_id,
          location: profile.city
            ? { ...state.location, city: profile.city }
            : state.location,
          scheduleHabits: (profile as any).schedule_habits
            ? {
                wakeTime:
                  (profile as any).schedule_habits.wake_time ??
                  state.scheduleHabits.wakeTime,
                exerciseType:
                  (profile as any).schedule_habits.exercise_type ??
                  state.scheduleHabits.exerciseType,
                exerciseTime:
                  (profile as any).schedule_habits.exercise_time ??
                  state.scheduleHabits.exerciseTime,
                commuteDeparture:
                  (profile as any).schedule_habits.commute_departure ??
                  state.scheduleHabits.commuteDeparture,
                commuteReturn:
                  (profile as any).schedule_habits.commute_return ??
                  state.scheduleHabits.commuteReturn,
                hasSchoolRun:
                  (profile as any).schedule_habits.has_school_run ??
                  state.scheduleHabits.hasSchoolRun,
                schoolRunTime:
                  (profile as any).schedule_habits.school_run_time ??
                  state.scheduleHabits.schoolRunTime,
                cookingTime:
                  (profile as any).schedule_habits.cooking_time ??
                  state.scheduleHabits.cookingTime,
                sleepTime:
                  (profile as any).schedule_habits.sleep_time ??
                  state.scheduleHabits.sleepTime,
              }
            : state.scheduleHabits,
        })),
      logout: () =>
        set({
          isAuthenticated: false,
          authToken: null,
          userEmail: null,
          profile: null,
          userId: "user_guest_" + Math.random().toString(36).substring(2, 8),
          checkedScheduleItems: [],
        }),

      setUserId: (userId) => set({ userId }),
      setLocation: (location) => set({ location }),
      setProfile: (profile) =>
        set((state) => ({
          profile,
          userId: profile.user_id,
          // If profile returned schedule_habits, map it to frontend camelCase
          scheduleHabits: (profile as any).schedule_habits
            ? {
                wakeTime: (profile as any).schedule_habits.wake_time ?? state.scheduleHabits.wakeTime,
                exerciseType: (profile as any).schedule_habits.exercise_type ?? state.scheduleHabits.exerciseType,
                exerciseTime: (profile as any).schedule_habits.exercise_time ?? state.scheduleHabits.exerciseTime,
                commuteDeparture: (profile as any).schedule_habits.commute_departure ?? state.scheduleHabits.commuteDeparture,
                commuteReturn: (profile as any).schedule_habits.commute_return ?? state.scheduleHabits.commuteReturn,
                hasSchoolRun: (profile as any).schedule_habits.has_school_run ?? state.scheduleHabits.hasSchoolRun,
                schoolRunTime: (profile as any).schedule_habits.school_run_time ?? state.scheduleHabits.schoolRunTime,
                cookingTime: (profile as any).schedule_habits.cooking_time ?? state.scheduleHabits.cookingTime,
                sleepTime: (profile as any).schedule_habits.sleep_time ?? state.scheduleHabits.sleepTime,
              }
            : state.scheduleHabits,
        })),
      setAQI: (aqi) => set({ aqi }),
      setOnboarded: (val) => set({ isOnboarded: val }),
      toggleHabit: (habitId) =>
        set((state) => ({
          completedHabits: state.completedHabits.includes(habitId)
            ? state.completedHabits.filter((id) => id !== habitId)
            : [...state.completedHabits, habitId],
        })),
      setPreferredLanguage: (preferredLanguage) => set({ preferredLanguage }),
      setScheduleHabits: (habits) =>
        set((state) => ({
          scheduleHabits: { ...state.scheduleHabits, ...habits },
        })),
      toggleScheduleItem: (id) =>
        set((state) => ({
          checkedScheduleItems: state.checkedScheduleItems.includes(id)
            ? state.checkedScheduleItems.filter((item) => item !== id)
            : [...state.checkedScheduleItems, id],
        })),
      setIsAiOptimizedView: (isAiOptimizedView) => set({ isAiOptimizedView }),
    }),
    {
      name: "urbsafe-app-storage-v1",
      storage: createJSONStorage(() => customStorage),
    }
  )
);
