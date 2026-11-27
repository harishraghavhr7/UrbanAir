import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Switch,
  Alert,
} from "react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createProfile, updateProfile } from "../services/api";
import { useAppStore } from "../store/appStore";
import { useRouter } from "expo-router";

const COMMUTE_OPTIONS = [
  { value: "car", label: "🚗 Car" },
  { value: "metro", label: "🚇 Metro" },
  { value: "walk", label: "🚶 Walk" },
  { value: "cycle", label: "🚴 Cycle" },
  { value: "two_wheeler", label: "🛵 Bike" },
  { value: "wfh", label: "🏠 WFH" },
];

const HEALTH_OPTIONS = [
  { value: "none", label: "✅ None" },
  { value: "asthma", label: "🫁 Asthma" },
  { value: "heart_disease", label: "❤️ Heart Disease" },
  { value: "diabetes", label: "🩸 Diabetes" },
  { value: "copd", label: "🫧 COPD" },
];

const EXERCISE_OPTIONS = [
  { value: "morning_walk", label: "🚶 Morning Walk" },
  { value: "outdoor_run", label: "🏃 Outdoor Run" },
  { value: "gym", label: "🏋️ Indoor Gym" },
  { value: "indoor_yoga", label: "🧘 Home Yoga" },
  { value: "none", label: "❌ No Exercise" },
];

export default function ProfileScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const {
    profile,
    location,
    scheduleHabits,
    setProfile,
    setScheduleHabits,
    setOnboarded,
    isAuthenticated,
    userEmail,
    logout,
  } = useAppStore();

  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  const [name, setName] = useState(profile?.name ?? "");
  const [commute, setCommute] = useState(profile?.commute_mode ?? "car");
  const [hasChildren, setHasChildren] = useState(profile?.has_children ?? false);
  const [hasElderly, setHasElderly] = useState(profile?.has_elderly ?? false);
  const [hasPurifier, setHasPurifier] = useState(profile?.has_air_purifier ?? false);
  const [healthConditions, setHealthConditions] = useState<string[]>(
    profile?.health_conditions ?? ["none"]
  );

  // Schedule habits state
  const [wakeTime, setWakeTime] = useState(scheduleHabits.wakeTime);
  const [exerciseType, setExerciseType] = useState(scheduleHabits.exerciseType);
  const [exerciseTime, setExerciseTime] = useState(scheduleHabits.exerciseTime);
  const [commuteDep, setCommuteDep] = useState(scheduleHabits.commuteDeparture);
  const [commuteRet, setCommuteRet] = useState(scheduleHabits.commuteReturn);
  const [hasSchoolRun, setHasSchoolRun] = useState(scheduleHabits.hasSchoolRun);
  const [schoolRunTime, setSchoolRunTime] = useState(scheduleHabits.schoolRunTime);
  const [cookingTime, setCookingTime] = useState(scheduleHabits.cookingTime);
  const [sleepTime, setSleepTime] = useState(scheduleHabits.sleepTime);

  // Sync state if store rehydrated from localStorage
  useEffect(() => {
    if (profile) {
      if (profile.name !== undefined) setName(profile.name);
      if (profile.commute_mode) setCommute(profile.commute_mode);
      if (profile.has_children !== undefined) setHasChildren(profile.has_children);
      if (profile.has_elderly !== undefined) setHasElderly(profile.has_elderly);
      if (profile.has_air_purifier !== undefined) setHasPurifier(profile.has_air_purifier);
      if (profile.health_conditions && profile.health_conditions.length > 0) {
        setHealthConditions(profile.health_conditions);
      }
    }
  }, [profile]);

  useEffect(() => {
    if (scheduleHabits) {
      if (scheduleHabits.wakeTime) setWakeTime(scheduleHabits.wakeTime);
      if (scheduleHabits.exerciseType) setExerciseType(scheduleHabits.exerciseType);
      if (scheduleHabits.exerciseTime) setExerciseTime(scheduleHabits.exerciseTime);
      if (scheduleHabits.commuteDeparture) setCommuteDep(scheduleHabits.commuteDeparture);
      if (scheduleHabits.commuteReturn) setCommuteRet(scheduleHabits.commuteReturn);
      if (scheduleHabits.hasSchoolRun !== undefined) setHasSchoolRun(scheduleHabits.hasSchoolRun);
      if (scheduleHabits.schoolRunTime) setSchoolRunTime(scheduleHabits.schoolRunTime);
      if (scheduleHabits.cookingTime) setCookingTime(scheduleHabits.cookingTime);
      if (scheduleHabits.sleepTime) setSleepTime(scheduleHabits.sleepTime);
    }
  }, [scheduleHabits]);

  const toggleHealth = (val: string) => {
    if (val === "none") {
      setHealthConditions(["none"]);
      return;
    }
    setHealthConditions((prev) => {
      const without = prev.filter((h) => h !== "none");
      return without.includes(val)
        ? without.filter((h) => h !== val)
        : [...without, val];
    });
  };

  const mutation = useMutation({
    mutationFn: (data: any) =>
      profile?.user_id
        ? updateProfile(profile.user_id, data)
        : createProfile(data),
    onSuccess: (data) => {
      setProfile(data);
      queryClient.invalidateQueries({ queryKey: ["routine"] });
      queryClient.invalidateQueries({ queryKey: ["suggestions"] });
      setSaveSuccessMsg("✅ Personalized plan saved permanently!");
      setTimeout(() => {
        setSaveSuccessMsg(null);
        router.back();
      }, 1000);
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ["routine"] });
      setSaveSuccessMsg("✅ Personalized plan saved to device!");
      setTimeout(() => {
        setSaveSuccessMsg(null);
        router.back();
      }, 1000);
    },
  });

  const handleSave = () => {
    // 1. Immediately persist locally to Zustand & localStorage
    const updatedHabits = {
      wakeTime,
      exerciseType,
      exerciseTime,
      commuteDeparture: commuteDep,
      commuteReturn: commuteRet,
      hasSchoolRun,
      schoolRunTime,
      cookingTime,
      sleepTime,
    };
    setScheduleHabits(updatedHabits);
    setOnboarded(true);

    // 2. Persist to backend
    mutation.mutate({
      name,
      city: location.city,
      lat: location.lat,
      lng: location.lng,
      commute_mode: commute,
      has_children: hasChildren,
      has_elderly: hasElderly,
      has_air_purifier: hasPurifier,
      health_conditions:
        healthConditions.length === 0 ? ["none"] : healthConditions,
      schedule_habits: {
        wake_time: wakeTime,
        exercise_type: exerciseType,
        exercise_time: exerciseTime,
        commute_departure: commuteDep,
        commute_return: commuteRet,
        has_school_run: hasSchoolRun,
        school_run_time: schoolRunTime,
        cooking_time: cookingTime,
        sleep_time: sleepTime,
      },
    });
  };

  const Row = ({ label, value, onToggle }: { label: string; value: boolean; onToggle: () => void }) => (
    <View style={styles.toggleRow}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: "#ccc", true: "#A5D6A7" }}
        thumbColor={value ? "#2E7D32" : "#f4f3f4"}
      />
    </View>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>👤 Profile & Day Plan</Text>
        <Text style={styles.headerSub}>
          Set your schedule anchors so UrbanAir adapts routines around your real life
        </Text>
      </View>

      <View style={styles.form}>
        {/* Account & Session Card */}
        <View style={styles.accountCard}>
          <View style={styles.accountLeft}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarInitial}>
                {profile?.name ? profile.name.charAt(0).toUpperCase() : "👤"}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.accountName}>
                {profile?.name || (isAuthenticated ? "Member" : "Guest Mode")}
              </Text>
              <Text style={styles.accountEmail}>
                {profile?.email || userEmail || "Not signed in"}
              </Text>
            </View>
          </View>

          {isAuthenticated ? (
            <TouchableOpacity
              style={styles.signOutBtn}
              onPress={() => {
                logout();
                queryClient.invalidateQueries({ queryKey: ["routine"] });
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.signOutBtnText}>Log Out</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.signInBtn}
              onPress={() => router.push("/login")}
              activeOpacity={0.7}
            >
              <Text style={styles.signInBtnText}>Sign In →</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Name */}
        <Text style={styles.label}>Your Name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Enter your name"
          placeholderTextColor="#999"
        />

        {/* ── NEW: Schedule & Habits Section ── */}
        <View style={styles.sectionDivider}>
          <Text style={styles.sectionHeaderTitle}>⏰ My Daily Schedule Anchors</Text>
          <Text style={styles.sectionHeaderSub}>
            We adjust your exposure windows based on when you actually wake, travel, and sleep
          </Text>
        </View>

        {/* Wake up & Sleep */}
        <View style={styles.anchorSection}>
          <Text style={styles.subLabel}>Wake-up Time</Text>
          <View style={styles.presetChipRow}>
            {["05:30 AM", "06:00 AM", "06:30 AM", "07:00 AM", "07:30 AM"].map((time) => (
              <TouchableOpacity
                key={time}
                style={[styles.presetChip, wakeTime === time && styles.presetChipActive]}
                onPress={() => setWakeTime(time)}
              >
                <Text style={[styles.presetChipText, wakeTime === time && styles.presetChipTextActive]}>
                  {time}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            style={styles.timeInput}
            value={wakeTime}
            onChangeText={setWakeTime}
            placeholder="or custom (e.g. 06:15 AM)"
          />
        </View>

        <View style={[styles.anchorSection, { marginTop: 14 }]}>
          <Text style={styles.subLabel}>Bedtime</Text>
          <View style={styles.presetChipRow}>
            {["10:00 PM", "10:30 PM", "11:00 PM", "11:30 PM"].map((time) => (
              <TouchableOpacity
                key={time}
                style={[styles.presetChip, sleepTime === time && styles.presetChipActive]}
                onPress={() => setSleepTime(time)}
              >
                <Text style={[styles.presetChipText, sleepTime === time && styles.presetChipTextActive]}>
                  {time}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            style={styles.timeInput}
            value={sleepTime}
            onChangeText={setSleepTime}
            placeholder="or custom (e.g. 10:45 PM)"
          />
        </View>

        {/* Exercise Type */}
        <Text style={styles.label}>Exercise & Workout Habit</Text>
        <View style={styles.optionRow}>
          {EXERCISE_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.optionChip, exerciseType === opt.value && styles.optionChipActive]}
              onPress={() => setExerciseType(opt.value)}
            >
              <Text style={[styles.optionText, exerciseType === opt.value && styles.optionTextActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {exerciseType !== "none" && (
          <View style={[styles.anchorSection, { marginTop: 14 }]}>
            <Text style={styles.subLabel}>Planned Exercise Time</Text>
            <View style={styles.presetChipRow}>
              {["06:00 AM", "06:30 AM", "07:00 AM", "05:30 PM", "06:30 PM"].map((time) => (
                <TouchableOpacity
                  key={time}
                  style={[styles.presetChip, exerciseTime === time && styles.presetChipActive]}
                  onPress={() => setExerciseTime(time)}
                >
                  <Text style={[styles.presetChipText, exerciseTime === time && styles.presetChipTextActive]}>
                    {time}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={styles.timeInput}
              value={exerciseTime}
              onChangeText={setExerciseTime}
              placeholder="or custom (e.g. 06:15 AM)"
            />
          </View>
        )}

        {/* Commute times */}
        <Text style={styles.label}>Primary Commute Mode</Text>
        <View style={styles.optionRow}>
          {COMMUTE_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.optionChip, commute === opt.value && styles.optionChipActive]}
              onPress={() => setCommute(opt.value)}
            >
              <Text style={[styles.optionText, commute === opt.value && styles.optionTextActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={[styles.anchorSection, { marginTop: 14 }]}>
          <Text style={styles.subLabel}>Leave for Work/Classes</Text>
          <View style={styles.presetChipRow}>
            {["08:00 AM", "08:30 AM", "09:00 AM", "09:30 AM"].map((time) => (
              <TouchableOpacity
                key={time}
                style={[styles.presetChip, commuteDep === time && styles.presetChipActive]}
                onPress={() => setCommuteDep(time)}
              >
                <Text style={[styles.presetChipText, commuteDep === time && styles.presetChipTextActive]}>
                  {time}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            style={styles.timeInput}
            value={commuteDep}
            onChangeText={setCommuteDep}
            placeholder="or custom (e.g. 08:15 AM)"
          />
        </View>

        <View style={[styles.anchorSection, { marginTop: 14 }]}>
          <Text style={styles.subLabel}>Return Commute</Text>
          <View style={styles.presetChipRow}>
            {["05:00 PM", "05:30 PM", "06:00 PM", "06:30 PM", "07:00 PM"].map((time) => (
              <TouchableOpacity
                key={time}
                style={[styles.presetChip, commuteRet === time && styles.presetChipActive]}
                onPress={() => setCommuteRet(time)}
              >
                <Text style={[styles.presetChipText, commuteRet === time && styles.presetChipTextActive]}>
                  {time}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            style={styles.timeInput}
            value={commuteRet}
            onChangeText={setCommuteRet}
            placeholder="or custom (e.g. 06:45 PM)"
          />
        </View>

        {/* Household Chores */}
        <View style={styles.sectionDivider}>
          <Text style={styles.sectionHeaderTitle}>🏠 Household & Family</Text>
        </View>

        <View style={styles.card}>
          <Row
            label="👧 Children at home"
            value={hasChildren}
            onToggle={() => setHasChildren(!hasChildren)}
          />
          <Row
            label="🎒 Morning school drop-off run"
            value={hasSchoolRun}
            onToggle={() => setHasSchoolRun(!hasSchoolRun)}
          />
          <Row
            label="👴 Elderly members"
            value={hasElderly}
            onToggle={() => setHasElderly(!hasElderly)}
          />
          <Row
            label="🌬️ Have air purifier"
            value={hasPurifier}
            onToggle={() => setHasPurifier(!hasPurifier)}
          />
        </View>

        <View style={{ marginTop: 10 }}>
          <Text style={styles.subLabel}>Dinner Cooking Time</Text>
          <TextInput
            style={styles.input}
            value={cookingTime}
            onChangeText={setCookingTime}
            placeholder="e.g. 08:00 PM"
          />
        </View>

        {/* Health Conditions */}
        <View style={styles.sectionDivider}>
          <Text style={styles.sectionHeaderTitle}>🩺 Health Conditions</Text>
        </View>
        <View style={styles.optionRow}>
          {HEALTH_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[
                styles.optionChip,
                healthConditions.includes(opt.value) && styles.optionChipActive,
              ]}
              onPress={() => toggleHealth(opt.value)}
            >
              <Text
                style={[
                  styles.optionText,
                  healthConditions.includes(opt.value) && styles.optionTextActive,
                ]}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Save feedback banner */}
        {saveSuccessMsg && (
          <View style={styles.successToast}>
            <Text style={styles.successToastText}>{saveSuccessMsg}</Text>
          </View>
        )}

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveBtn, mutation.isPending && { opacity: 0.7 }]}
          onPress={handleSave}
          disabled={mutation.isPending}
        >
          <Text style={styles.saveBtnText}>
            {mutation.isPending ? "Saving..." : "Save Personalized Day Plan"}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  header: {
    backgroundColor: "#133E1B",
    padding: 20,
    paddingTop: 52,
    paddingBottom: 22,
  },
  headerTitle: { fontSize: 24, fontWeight: "bold", color: "#fff" },
  headerSub: { fontSize: 13, color: "#A5D6A7", marginTop: 4, lineHeight: 18 },

  form: { padding: 16 },
  accountCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.06)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  accountLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#ECFDF5",
    borderWidth: 1.5,
    borderColor: "#A7F3D0",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInitial: {
    fontSize: 18,
    fontWeight: "800",
    color: "#059669",
  },
  accountName: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },
  accountEmail: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 1,
  },
  signInBtn: {
    backgroundColor: "#059669",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  signInBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  signOutBtn: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  signOutBtnText: {
    color: "#DC2626",
    fontSize: 12,
    fontWeight: "700",
  },
  sectionDivider: { marginTop: 22, marginBottom: 10 },
  sectionHeaderTitle: { fontSize: 16, fontWeight: "bold", color: "#1B5E20" },
  sectionHeaderSub: { fontSize: 12, color: "#666", marginTop: 2 },

  label: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 6,
    marginTop: 14,
  },
  subLabel: { fontSize: 12, fontWeight: "600", color: "#555", marginBottom: 4 },
  input: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: "#222",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  anchorSection: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  presetChipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 8,
  },
  presetChip: {
    backgroundColor: "#F1F5F1",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  presetChipActive: {
    backgroundColor: "#1B5E20",
    borderColor: "#1B5E20",
  },
  presetChipText: {
    fontSize: 11,
    color: "#555",
    fontWeight: "600",
  },
  presetChipTextActive: {
    color: "#FFFFFF",
    fontWeight: "bold",
  },
  timeRow: { flexDirection: "row", gap: 10, marginTop: 8 },
  timeCol: { flex: 1 },
  timeInput: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 11,
    fontSize: 13,
    color: "#222",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },

  optionRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  optionChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "#E0E0E0",
  },
  optionChipActive: {
    backgroundColor: "#1B5E20",
    borderColor: "#1B5E20",
  },
  optionText: { fontSize: 12, color: "#555" },
  optionTextActive: { color: "#fff", fontWeight: "600" },

  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  toggleLabel: { fontSize: 14, color: "#333" },

  successToast: {
    backgroundColor: "#E8F5E9",
    borderColor: "#81C784",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginTop: 20,
    alignItems: "center",
  },
  successToastText: {
    color: "#1B5E20",
    fontWeight: "bold",
    fontSize: 14,
  },
  saveBtn: {
    backgroundColor: "#059669",
    padding: 15,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 26,
  },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});
