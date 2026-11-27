import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Switch,
} from "react-native";
import { useRouter } from "expo-router";
import { useDailyRoutine, useForecast } from "../hooks/useAQI";
import { useAppStore } from "../store/appStore";
import { AQI_COLORS } from "../constants";

const LEGEND_ITEMS = [
  { label: "Good", color: AQI_COLORS["Good"] },
  { label: "Moderate", color: AQI_COLORS["Moderate"] },
  { label: "Sensitive", color: AQI_COLORS["Unhealthy for Sensitive Groups"] },
  { label: "Unhealthy", color: AQI_COLORS["Unhealthy"] },
  { label: "Very Unhealthy", color: AQI_COLORS["Very Unhealthy"] },
  { label: "Hazardous", color: AQI_COLORS["Hazardous"] },
];

const RISK_BADGES: Record<
  string,
  { bg: string; text: string; border: string; label: string }
> = {
  clean: { bg: "#ECFDF5", text: "#059669", border: "#A7F3D0", label: "Clean" },
  moderate: { bg: "#FFFBEB", text: "#D97706", border: "#FDE68A", label: "Moderate" },
  unhealthy: { bg: "#FEF2F2", text: "#DC2626", border: "#FECACA", label: "Unhealthy" },
  hazardous: { bg: "#F5F3FF", text: "#7C3AED", border: "#DDD6FE", label: "Hazardous" },
};

export default function RoutineScreen() {
  const router = useRouter();
  const { data: routineData, isLoading } = useDailyRoutine();
  const { data: forecast } = useForecast();
  const {
    isAiOptimizedView,
    setIsAiOptimizedView,
    checkedScheduleItems,
    toggleScheduleItem,
  } = useAppStore();

  const [selectedHour, setSelectedHour] = useState<any | null>(null);

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#059669" />
        <Text style={styles.loadingText}>Synthesizing personalized routine...</Text>
      </View>
    );
  }

  const forecastItems = routineData?.forecast ?? forecast ?? [];
  const scheduleItems =
    (isAiOptimizedView
      ? routineData?.optimized_schedule
      : routineData?.schedule) ??
    routineData?.routine ??
    [];

  const budgetScore = routineData?.toxin_budget_score ?? 54;
  const budgetStatus = routineData?.toxin_budget_status ?? "Moderate Exposure";
  const budgetColor =
    budgetScore < 40 ? "#059669" : budgetScore < 75 ? "#D97706" : "#DC2626";

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <View>
            <View style={styles.badgeRow}>
              <Text style={styles.headerTitle}>📅 Daily Routine</Text>
              <View style={styles.syncBadge}>
                <Text style={styles.syncBadgeText}>AI ADAPTED</Text>
              </View>
            </View>
            <Text style={styles.headerSub}>
              Personalized for {routineData?.city ?? "Your Location"} • AQI:{" "}
              <Text style={{ fontWeight: "800", color: "#FFFFFF" }}>
                {routineData?.current_aqi ?? routineData?.aqi_summary?.current_aqi ?? 47} (
                {routineData?.aqi_category ?? routineData?.aqi_summary?.category ?? "Good"})
              </Text>
            </Text>
          </View>

          <TouchableOpacity
            style={styles.editAnchorsBtn}
            onPress={() => router.push("/profile")}
            activeOpacity={0.8}
          >
            <Text style={styles.editAnchorsText}>⚙️ Habits</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.cigarette}>
          💨 {routineData?.cigarette_equivalent ?? routineData?.aqi_summary?.cigarette_equivalent ?? "Safe air today"}
        </Text>

        {routineData?.habits_summary && (
          <View style={styles.habitsSummaryBanner}>
            <Text style={styles.habitsSummaryText}>
              🧬 {routineData.habits_summary}
            </Text>
          </View>
        )}
      </View>

      {/* Inhaled Toxin Budget Card */}
      <View style={styles.budgetCard}>
        <View style={styles.budgetHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.budgetTitle}>🫁 Daily Inhalation Budget</Text>
            <Text style={styles.budgetSub}>Estimated daily PM2.5 dose threshold</Text>
          </View>
          <View style={[styles.budgetBadge, { backgroundColor: budgetColor + "18" }]}>
            <Text style={[styles.budgetBadgeText, { color: budgetColor }]}>
              {budgetStatus}
            </Text>
          </View>
        </View>

        {/* Progress Bar with Dual-Tone Track */}
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressBar,
              { width: `${Math.min(budgetScore, 100)}%`, backgroundColor: budgetColor },
            ]}
          />
        </View>

        <View style={styles.budgetFooter}>
          <Text style={styles.budgetScoreText}>
            {budgetScore}% of maximum safe exposure
          </Text>
          <Text style={styles.budgetTargetText}>
            {budgetScore <= 70 ? "✅ Under Safe Limit" : "⚠️ High Exposure Risk"}
          </Text>
        </View>

        {/* Cleanest vs Peak windows pills */}
        <View style={styles.windowsRow}>
          <View style={[styles.windowPill, { backgroundColor: "#ECFDF5" }]}>
            <Text style={styles.windowPillTitle}>🌤️ Cleanest Window</Text>
            <Text style={styles.windowPillVal}>
              {routineData?.cleanest_window ?? "02:00 PM - 04:00 PM"}
            </Text>
          </View>
          <View style={[styles.windowPill, { backgroundColor: "#FEF2F2" }]}>
            <Text style={styles.windowPillTitle}>⚠️ Peak Smog Trap</Text>
            <Text style={styles.windowPillVal}>
              {routineData?.peak_smog_window ?? "07:00 AM - 09:00 AM"}
            </Text>
          </View>
        </View>
      </View>

      {/* Hourly AQI Forecast with Interactive Scrubber */}
      <View style={styles.forecastHeaderRow}>
        <Text style={styles.sectionTitle}>Hourly AQI Scrubber</Text>
        <Text style={styles.scrubberHint}>Tap any hour to inspect</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chartScroll}
      >
        {forecastItems.map((item: any, idx: number) => {
          const color = AQI_COLORS[item.category as keyof typeof AQI_COLORS] ?? "#64748B";
          const heightPct = Math.min((item.aqi / 400) * 80, 80);
          const isSelected = selectedHour?.time === item.time;

          return (
            <TouchableOpacity
              key={idx}
              activeOpacity={0.7}
              onPress={() => setSelectedHour(isSelected ? null : item)}
              style={[
                styles.barWrap,
                isSelected && styles.barWrapSelected,
              ]}
            >
              <Text style={[styles.barAQI, isSelected && styles.barAQISelected]}>
                {item.aqi}
              </Text>
              <View
                style={[
                  styles.bar,
                  { height: Math.max(heightPct, 12), backgroundColor: color },
                  isSelected && styles.barActiveIndicator,
                ]}
              />
              <Text style={[styles.barTime, isSelected && styles.barTimeSelected]}>
                {item.time}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Selected Hour Details Popover */}
      {selectedHour && (
        <View style={styles.selectedHourCard}>
          <View style={styles.selectedHourTop}>
            <Text style={styles.selectedHourTime}>
              🕒 {selectedHour.time} Forecast
            </Text>
            <View
              style={[
                styles.selectedHourTag,
                {
                  backgroundColor:
                    AQI_COLORS[selectedHour.category as keyof typeof AQI_COLORS] ??
                    "#64748B",
                },
              ]}
            >
              <Text style={styles.selectedHourTagText}>
                AQI {selectedHour.aqi} • {selectedHour.category}
              </Text>
            </View>
          </View>
          <Text style={styles.selectedHourAdvice}>
            {selectedHour.aqi <= 50
              ? "🌿 Solar mixing is peak. Cleanest air of the day — best window for outdoor runs, cycling, and opening home ventilation."
              : selectedHour.aqi <= 100
              ? "🌤️ Moderate quality. Outdoor activities acceptable for healthy adults; sensitive groups should consider light pacing."
              : selectedHour.aqi <= 200
              ? "⚠️ Ground-level pollution building. If commuting or running errands, wear a certified N95 mask and close vehicle AC recirc."
              : "🚨 Inversion trap! Ground temperature keeps particulate smog pinned at breathing height. Shift outdoor workouts indoors!"}
          </Text>
        </View>
      )}

      {/* AQI Legend */}
      <View style={styles.legend}>
        {LEGEND_ITEMS.map((item) => (
          <View key={item.label} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: item.color }]} />
            <Text style={styles.legendLabel} numberOfLines={1}>
              {item.label}
            </Text>
          </View>
        ))}
      </View>

      {/* Schedule Mode Switcher */}
      <View style={styles.rebalanceSwitchCard}>
        <View style={{ flex: 1 }}>
          <View style={styles.rebalanceTitleRow}>
            <Text style={styles.rebalanceTitle}>🪄 AI Clean-Air Re-balance</Text>
            <View style={styles.liveAiBadge}>
              <Text style={styles.liveAiText}>DYNAMIC</Text>
            </View>
          </View>
          <Text style={styles.rebalanceDesc}>
            {isAiOptimizedView
              ? "Showing time-shifted schedule: avoids morning inversions & peak traffic smog."
              : "Showing your baseline daily schedule anchors without time-shifting."}
          </Text>
        </View>
        <Switch
          value={isAiOptimizedView}
          onValueChange={(val) => setIsAiOptimizedView(val)}
          trackColor={{ false: "#CBD5E1", true: "#6EE7B7" }}
          thumbColor={isAiOptimizedView ? "#059669" : "#F8FAFC"}
        />
      </View>

      {/* Daily Schedule List */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>
          {isAiOptimizedView ? "Re-balanced Day Plan" : "Your Standard Day Plan"}
        </Text>
        <Text style={styles.tasksCompletedText}>
          {checkedScheduleItems.length}/{scheduleItems.length} Done
        </Text>
      </View>

      {scheduleItems.map((item: any) => {
        const isChecked = checkedScheduleItems.includes(item.id);
        const risk = RISK_BADGES[item.risk_level] ?? RISK_BADGES.moderate;

        return (
          <TouchableOpacity
            key={item.id}
            activeOpacity={0.8}
            onPress={() => toggleScheduleItem(item.id)}
            style={[
              styles.routineCard,
              isChecked && styles.routineCardChecked,
              item.is_shifted && styles.routineCardShifted,
            ]}
          >
            {/* Checkbox / Completion status */}
            <TouchableOpacity
              onPress={() => toggleScheduleItem(item.id)}
              style={[
                styles.checkCircle,
                isChecked && styles.checkCircleActive,
              ]}
            >
              {isChecked ? (
                <Text style={styles.checkCheckmark}>✓</Text>
              ) : (
                <Text style={styles.checkEmpty}>○</Text>
              )}
            </TouchableOpacity>

            {/* Content Right */}
            <View style={styles.routineContent}>
              <View style={styles.routineTopRow}>
                <View style={styles.routineTimeRow}>
                  <Text style={styles.routineIcon}>{item.icon}</Text>
                  <Text
                    style={[
                      styles.routineTime,
                      isChecked && styles.routineTimeChecked,
                    ]}
                  >
                    {item.time}
                  </Text>
                  {item.is_shifted &&
                    item.original_time &&
                    item.original_time !== item.time && (
                      <Text style={styles.originalTimeStrike}>
                        (was {item.original_time})
                      </Text>
                    )}
                </View>

                {/* Risk Level Badge */}
                <View
                  style={[
                    styles.riskBadge,
                    {
                      backgroundColor: risk.bg,
                      borderColor: risk.border,
                    },
                  ]}
                >
                  <Text style={[styles.riskBadgeText, { color: risk.text }]}>
                    {risk.label}
                  </Text>
                </View>
              </View>

              <Text
                style={[
                  styles.routineActivity,
                  isChecked && styles.routineActivityChecked,
                ]}
              >
                {item.activity}
              </Text>

              {/* Shift Benefit Pill */}
              {item.is_shifted && item.shift_benefit && (
                <View style={styles.benefitPill}>
                  <Text style={styles.benefitText}>
                    ✨ {item.shift_benefit}
                  </Text>
                </View>
              )}

              <Text style={styles.routineDetail}>{item.detail}</Text>
            </View>
          </TouchableOpacity>
        );
      })}

      <View style={{ height: 60 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
  },
  loadingText: { marginTop: 12, color: "#059669", fontSize: 15, fontWeight: "700" },

  header: {
    backgroundColor: "#133E1B",
    padding: 20,
    paddingTop: 52,
    paddingBottom: 20,
  },
  headerTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  badgeRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerTitle: { fontSize: 22, fontWeight: "800", color: "#FFFFFF", letterSpacing: -0.5 },
  syncBadge: {
    backgroundColor: "rgba(16, 185, 129, 0.25)",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  syncBadgeText: { fontSize: 9, fontWeight: "800", color: "#A7F3D0" },
  editAnchorsBtn: {
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  editAnchorsText: { fontSize: 12, color: "#FFFFFF", fontWeight: "700" },
  headerSub: { fontSize: 13, color: "#A7F3D0", marginTop: 8 },
  cigarette: { fontSize: 12, color: "#ECFDF5", marginTop: 4, fontWeight: "500" },

  habitsSummaryBanner: {
    marginTop: 12,
    backgroundColor: "rgba(0, 0, 0, 0.25)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  habitsSummaryText: {
    fontSize: 12,
    color: "#ECFDF5",
    lineHeight: 16,
  },

  /* Budget Card */
  budgetCard: {
    margin: 16,
    marginBottom: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.06)",
  },
  budgetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  budgetTitle: { fontSize: 15, fontWeight: "800", color: "#0F172A", letterSpacing: -0.3 },
  budgetSub: { fontSize: 11, color: "#64748B", marginTop: 2 },
  budgetBadge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
  },
  budgetBadgeText: { fontSize: 11, fontWeight: "800" },

  progressTrack: {
    height: 8,
    backgroundColor: "#F1F5F9",
    borderRadius: 4,
    marginTop: 14,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    borderRadius: 4,
  },
  budgetFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  budgetScoreText: { fontSize: 11, fontWeight: "700", color: "#334155" },
  budgetTargetText: { fontSize: 11, fontWeight: "700", color: "#64748B" },

  windowsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  windowPill: {
    flex: 1,
    padding: 10,
    borderRadius: 12,
  },
  windowPillTitle: { fontSize: 10, fontWeight: "800", color: "#475569" },
  windowPillVal: { fontSize: 12, fontWeight: "800", color: "#065F46", marginTop: 2 },

  /* Forecast Scrubber */
  forecastHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 18,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  scrubberHint: {
    fontSize: 11,
    color: "#94A3B8",
    fontStyle: "italic",
  },
  chartScroll: {
    paddingHorizontal: 16,
    alignItems: "flex-end",
    gap: 8,
    paddingVertical: 6,
  },
  barWrap: {
    alignItems: "center",
    width: 46,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.05)",
  },
  barWrapSelected: {
    borderColor: "#059669",
    backgroundColor: "#ECFDF5",
  },
  barAQI: { fontSize: 10, color: "#64748B", marginBottom: 6, fontWeight: "700" },
  barAQISelected: { color: "#065F46", fontWeight: "800" },
  bar: { width: 18, borderRadius: 5, minHeight: 12 },
  barActiveIndicator: {
    borderWidth: 2,
    borderColor: "#059669",
  },
  barTime: { fontSize: 9, color: "#94A3B8", marginTop: 6, textAlign: "center", fontWeight: "600" },
  barTimeSelected: { color: "#065F46", fontWeight: "800" },

  selectedHourCard: {
    marginHorizontal: 16,
    marginTop: 10,
    backgroundColor: "#ECFDF5",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  selectedHourTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  selectedHourTime: { fontSize: 13, fontWeight: "800", color: "#065F46" },
  selectedHourTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  selectedHourTagText: { fontSize: 10, color: "#FFFFFF", fontWeight: "800" },
  selectedHourAdvice: { fontSize: 12, color: "#047857", lineHeight: 17 },

  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 16,
    marginTop: 10,
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { fontSize: 10, color: "#64748B", fontWeight: "600" },

  /* Rebalance Switch Card */
  rebalanceSwitchCard: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 18,
    backgroundColor: "#ECFDF5",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  rebalanceTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  rebalanceTitle: { fontSize: 14, fontWeight: "800", color: "#065F46" },
  liveAiBadge: {
    backgroundColor: "#059669",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  liveAiText: { fontSize: 8, color: "#FFFFFF", fontWeight: "800" },
  rebalanceDesc: {
    fontSize: 11,
    color: "#047857",
    marginTop: 3,
    lineHeight: 16,
    paddingRight: 8,
  },

  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 10,
  },
  tasksCompletedText: {
    fontSize: 11,
    color: "#059669",
    fontWeight: "800",
  },

  /* Routine Cards */
  routineCard: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.05)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 2,
  },
  routineCardChecked: {
    backgroundColor: "#F8FAFC",
    opacity: 0.7,
    borderColor: "#E2E8F0",
  },
  routineCardShifted: {
    borderLeftWidth: 4,
    borderLeftColor: "#059669",
  },
  checkCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 2,
    marginRight: 12,
  },
  checkCircleActive: {
    backgroundColor: "#059669",
    borderColor: "#059669",
  },
  checkCheckmark: { color: "#FFFFFF", fontSize: 13, fontWeight: "bold" },
  checkEmpty: { color: "transparent" },

  routineContent: { flex: 1 },
  routineTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  routineTimeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  routineIcon: { fontSize: 16 },
  routineTime: { fontSize: 12, fontWeight: "800", color: "#065F46" },
  routineTimeChecked: { textDecorationLine: "line-through", color: "#94A3B8" },
  originalTimeStrike: {
    fontSize: 10,
    color: "#94A3B8",
    textDecorationLine: "line-through",
  },

  riskBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
  },
  riskBadgeText: { fontSize: 9, fontWeight: "800" },

  routineActivity: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
    marginTop: 4,
  },
  routineActivityChecked: {
    textDecorationLine: "line-through",
    color: "#94A3B8",
  },

  benefitPill: {
    alignSelf: "flex-start",
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 5,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  benefitText: { fontSize: 10, color: "#065F46", fontWeight: "800" },

  routineDetail: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 5,
    lineHeight: 17,
  },
});
