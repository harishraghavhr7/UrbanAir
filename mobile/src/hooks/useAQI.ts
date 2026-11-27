import { useQuery } from "@tanstack/react-query";
import { useAppStore } from "../store/appStore";
import { getAQI, getSuggestions, getForecast, getDailyRoutine } from "../services/api";

export const useAQI = () => {
  const { location } = useAppStore();
  return useQuery({
    queryKey: ["aqi", location.lat, location.lng],
    queryFn: () => getAQI(location.lat, location.lng, location.city),
    refetchInterval: 30 * 60 * 1000, // refresh every 30 min
    staleTime: 15 * 60 * 1000,
  });
};

export const useSuggestions = () => {
  const { location, profile } = useAppStore();
  return useQuery({
    queryKey: ["suggestions", location.lat, location.lng, profile?.user_id],
    queryFn: () =>
      getSuggestions(location.lat, location.lng, location.city, profile?.user_id),
    staleTime: 30 * 60 * 1000,
  });
};

export const useForecast = () => {
  const { location } = useAppStore();
  return useQuery({
    queryKey: ["forecast", location.lat, location.lng],
    queryFn: () => getForecast(location.lat, location.lng),
    staleTime: 30 * 60 * 1000,
  });
};

export const useDailyRoutine = () => {
  const { location, profile, userId, scheduleHabits } = useAppStore();
  const effectiveUserId = profile?.user_id || userId;
  const commuteMode = profile?.commute_mode;
  return useQuery({
    queryKey: [
      "routine",
      location.lat,
      location.lng,
      effectiveUserId,
      scheduleHabits,
      commuteMode,
    ],
    queryFn: () =>
      getDailyRoutine(
        location.lat,
        location.lng,
        location.city,
        effectiveUserId,
        scheduleHabits,
        commuteMode
      ),
    staleTime: 5 * 60 * 1000,
  });
};
