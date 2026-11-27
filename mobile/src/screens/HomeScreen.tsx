import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useAQI, useSuggestions } from "../hooks/useAQI";
import { AQI_COLORS, AQI_BG_COLORS, DEFAULT_HABITS } from "../constants";
import { useAppStore } from "../store/appStore";
import { useRouter } from "expo-router";

import LocationModal from "../components/LocationModal";
import CommuteModal from "../components/CommuteModal";
import DoctorReportModal from "../components/DoctorReportModal";

// ── Skeleton Loader ──────────────────────────────────────
const HomeScreenSkeleton = () => (
  <View style={styles.skeletonContainer}>
    <View style={styles.skeletonHeader} />
    <View style={styles.skeletonHero} />
    <View style={styles.skeletonRow}>
      <View style={styles.skeletonBox} />
      <View style={styles.skeletonBox} />
    </View>
    <View style={styles.skeletonCard} />
  </View>
);

// ── Inversion Warning Banner ──────────────────────────────
const InversionAlertBanner = ({
  aqi,
  onOpenRoutine,
}: {
  aqi: number;
  onOpenRoutine: () => void;
}) => {
  // Atmospheric inversion typically traps ground particles during cooler hours
  const currentHour = new Date().getHours();
  const isInversionWindow = currentHour >= 5 && currentHour <= 11;
  const isHighPollution = aqi >= 150;

  if (!isInversionWindow && !isHighPollution) return null;

  return (
    <View style={styles.inversionCard}>
      <View style={styles.inversionTopRow}>
        <View style={styles.inversionBadge}>
          <Text style={styles.inversionBadgeText}>⚠️ ATMOSPHERIC INVERSION</Text>
        </View>
        <Text style={styles.inversionTimeText}>Active Ground Trap</Text>
      </View>
      <Text style={styles.inversionTitle}>Ground-Level Smog Trapped</Text>
      <Text style={styles.inversionDesc}>
        Cold surface air is pinning vehicle exhaust & PM2.5 below breathing height.
        Solar warming is estimated to clear the inversion trap by ~11:00 AM.
      </Text>
      <TouchableOpacity
        style={styles.inversionActionBtn}
        onPress={onOpenRoutine}
        activeOpacity={0.8}
      >
        <Text style={styles.inversionActionText}>
          🪄 View AI Re-balanced Routine →
        </Text>
      </TouchableOpacity>
    </View>
  );
};

// ── Modern AQI Hero Card ──────────────────────────────────
const AQIHeroCard = ({
  aqi,
  onOpenLocation,
}: {
  aqi: any;
  onOpenLocation: () => void;
}) => {
  const color = AQI_COLORS[aqi.category as keyof typeof AQI_COLORS] ?? "#2E7D32";
  const bg = AQI_BG_COLORS[aqi.category as keyof typeof AQI_BG_COLORS] ?? "#E8F5E9";
  const aqiValue = aqi.aqi ?? 50;

  // Percentage for spectrum meter (0 to 400+)
  const aqiPct = Math.min(Math.max((aqiValue / 400) * 100, 5), 100);

  return (
    <View style={styles.heroCard}>
      {/* Top Location Bar */}
      <View style={styles.heroTopRow}>
        <TouchableOpacity
          style={styles.locationChip}
          onPress={onOpenLocation}
          activeOpacity={0.7}
        >
          <Text style={styles.locationChipIcon}>📍</Text>
          <Text style={styles.locationChipText}>{aqi.city}</Text>
          <Text style={styles.locationChipArrow}>▾</Text>
        </TouchableOpacity>

        <View style={[styles.categoryBadge, { backgroundColor: color }]}>
          <Text style={styles.categoryBadgeText}>{aqi.category}</Text>
        </View>
      </View>

      {/* Main AQI Value Display */}
      <View style={styles.heroMainRow}>
        <View>
          <View style={styles.aqiNumberRow}>
            <Text style={[styles.heroAqiNum, { color }]}>{aqiValue}</Text>
            <Text style={styles.heroAqiUnit}>AQI</Text>
          </View>
          <Text style={styles.heroSubText}>
            {aqiValue <= 50
              ? "Clean mountain air quality"
              : aqiValue <= 100
              ? "Acceptable for most individuals"
              : aqiValue <= 200
              ? "Unhealthy for outdoor activities"
              : "Hazardous ground-level smog"}
          </Text>
        </View>

        {/* Cigarette Equivalent Badge */}
        <View style={styles.cigaretteBadge}>
          <Text style={styles.cigaretteIcon}>💨</Text>
          <Text style={styles.cigaretteVal}>
            {aqi.cigarette_equivalent
              ? aqi.cigarette_equivalent.replace("Equivalent to ", "")
              : "~2 cigs/day"}
          </Text>
          <Text style={styles.cigaretteSub}>inhalation dose</Text>
        </View>
      </View>

      {/* Spectrum Range Meter */}
      <View style={styles.spectrumWrapper}>
        <View style={styles.spectrumTrack}>
          <View
            style={[
              styles.spectrumIndicator,
              { left: `${aqiPct}%`, backgroundColor: color },
            ]}
          />
        </View>
        <View style={styles.spectrumLabels}>
          <Text style={styles.spectrumLabelText}>0 (Good)</Text>
          <Text style={styles.spectrumLabelText}>150 (Unhealthy)</Text>
          <Text style={styles.spectrumLabelText}>400+ (Severe)</Text>
        </View>
      </View>

      {/* Pollutant Metric Grid */}
      <View style={styles.metricsGrid}>
        <View style={styles.metricItem}>
          <Text style={styles.metricItemLabel}>PM2.5</Text>
          <Text style={styles.metricItemValue}>
            {aqi.pm25 ? aqi.pm25.toFixed(1) : "—"}
          </Text>
          <Text style={styles.metricItemUnit}>µg/m³</Text>
          <Text style={styles.metricItemLimit}>WHO: 15</Text>
        </View>

        <View style={styles.metricItemDivider} />

        <View style={styles.metricItem}>
          <Text style={styles.metricItemLabel}>PM10</Text>
          <Text style={styles.metricItemValue}>
            {aqi.pm10 ? aqi.pm10.toFixed(1) : "—"}
          </Text>
          <Text style={styles.metricItemUnit}>µg/m³</Text>
          <Text style={styles.metricItemLimit}>WHO: 45</Text>
        </View>

        <View style={styles.metricItemDivider} />

        <View style={styles.metricItem}>
          <Text style={styles.metricItemLabel}>NO₂</Text>
          <Text style={styles.metricItemValue}>
            {aqi.no2 ? aqi.no2.toFixed(1) : "22.4"}
          </Text>
          <Text style={styles.metricItemUnit}>ppb</Text>
          <Text style={styles.metricItemLimit}>Traffic</Text>
        </View>
      </View>
    </View>
  );
};

// ── Suggestion Card ───────────────────────────────────────
const SuggestionCard = ({ item }: { item: any }) => (
  <View style={styles.suggCard}>
    <View style={styles.suggIconBox}>
      <Text style={styles.suggIcon}>{item.icon}</Text>
    </View>
    <View style={styles.suggContent}>
      <Text style={styles.suggTitle}>{item.title}</Text>
      <Text style={styles.suggDesc} numberOfLines={3}>
        {item.description}
      </Text>
      {item.impact && (
        <View style={styles.suggImpactPill}>
          <Text style={styles.suggImpactText}>✨ {item.impact}</Text>
        </View>
      )}
    </View>
  </View>
);

// ── Main Home Screen ──────────────────────────────────────
export default function HomeScreen() {
  const router = useRouter();
  const { location, completedHabits, toggleHabit, profile, isAuthenticated } = useAppStore();
  const { data: aqiData, isLoading: aqiLoading, refetch } = useAQI();
  const { data: suggData, isLoading: suggLoading } = useSuggestions();

  const [refreshing, setRefreshing] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showCommuteModal, setShowCommuteModal] = useState(false);
  const [showDoctorModal, setShowDoctorModal] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const totalCigarettesAvoided = DEFAULT_HABITS.reduce((sum, habit) => {
    return completedHabits.includes(habit.id) ? sum + habit.cigarettesSaved : sum;
  }, 0);

  if (aqiLoading) {
    return <HomeScreenSkeleton />;
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header App Bar */}
        <View style={styles.header}>
          <View>
            <View style={styles.brandRow}>
              <Text style={styles.brandIcon}>🌿</Text>
              <Text style={styles.brandName}>UrbanAir</Text>
              <View style={styles.liveIndicator}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>LIVE</Text>
              </View>
            </View>
            <Text style={styles.tagline}>
              {profile?.name
                ? `Hi, ${profile.name.split(" ")[0]} 👋`
                : "Smart Urban Smog Assistant"}
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => router.push(isAuthenticated ? "/profile" : "/login")}
            style={styles.profileBtn}
            activeOpacity={0.8}
          >
            <Text style={styles.profileBtnText}>
              {profile?.name ? profile.name.charAt(0).toUpperCase() : "👤"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Thermal Inversion Alert Banner */}
        <InversionAlertBanner
          aqi={aqiData?.aqi || 174}
          onOpenRoutine={() => router.push("/routine")}
        />

        {/* Main AQI Hero Display */}
        {aqiData && (
          <AQIHeroCard
            aqi={aqiData}
            onOpenLocation={() => setShowLocationModal(true)}
          />
        )}

        {/* Quick Action Tools Hub */}
        <View style={styles.toolsRow}>
          <TouchableOpacity
            style={styles.toolCard}
            onPress={() => setShowCommuteModal(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.toolCardIcon}>🚗</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.toolCardTitle}>Clean Commute</Text>
              <Text style={styles.toolCardDesc}>Compare route exposure</Text>
            </View>
            <Text style={styles.toolCardChevron}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.toolCard}
            onPress={() => setShowDoctorModal(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.toolCardIcon}>🩺</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.toolCardTitle}>Clinical Summary</Text>
              <Text style={styles.toolCardDesc}>Doctor-ready exposure</Text>
            </View>
            <Text style={styles.toolCardChevron}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Daily Habits & Cigarettes Avoided Tracker */}
        <View style={styles.habitCard}>
          <View style={styles.habitHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.habitCardTitle}>🛡️ Daily Protection Habits</Text>
              <Text style={styles.habitCardSubtitle}>
                Check off actions taken today to lower your PM2.5 dose
              </Text>
            </View>
            <View style={styles.savedScoreBox}>
              <Text style={styles.savedScoreVal}>
                {totalCigarettesAvoided.toFixed(1)}
              </Text>
              <Text style={styles.savedScoreLbl}>Cigs Saved</Text>
            </View>
          </View>

          <View style={styles.habitList}>
            {DEFAULT_HABITS.map((habit) => {
              const isDone = completedHabits.includes(habit.id);
              return (
                <TouchableOpacity
                  key={habit.id}
                  style={[styles.habitItem, isDone && styles.habitItemActive]}
                  onPress={() => toggleHabit(habit.id)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.habitIcon}>{habit.icon}</Text>
                  <Text
                    style={[
                      styles.habitLabel,
                      isDone && styles.habitLabelActive,
                    ]}
                  >
                    {habit.label}
                  </Text>
                  <View
                    style={[
                      styles.habitCheckCircle,
                      isDone && styles.habitCheckCircleActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.checkText,
                        isDone && styles.checkTextActive,
                      ]}
                    >
                      {isDone ? "✓" : "+"}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Today's Context Situation */}
        {suggData?.daily_summary && (
          <View style={styles.summaryBox}>
            <Text style={styles.summaryTitle}>☀️ Atmospheric Situation</Text>
            <Text style={styles.summaryText}>{suggData.daily_summary}</Text>
          </View>
        )}

        {/* Safe Midday Solar Window */}
        {suggData?.safe_outdoor_window && (
          <View style={styles.safeWindow}>
            <Text style={styles.safeWindowIcon}>🌤️</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.safeWindowTitle}>Optimal Solar Mixing Window</Text>
              <Text style={styles.safeWindowText}>
                {suggData.safe_outdoor_window} — lowest particulate concentration
              </Text>
            </View>
          </View>
        )}

        {/* Suggestions Section */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Source-Grounded Action Tips</Text>
          <Text style={styles.sectionSub}>WHO & CPCB Interventions</Text>
        </View>

        {suggLoading ? (
          <ActivityIndicator color="#2E7D32" style={{ marginVertical: 16 }} />
        ) : (
          suggData?.suggestions?.map((item: any, idx: number) => (
            <SuggestionCard key={idx} item={item} />
          ))
        )}

        <View style={{ height: 60 }} />
      </ScrollView>

      {/* Modals */}
      <LocationModal
        visible={showLocationModal}
        onClose={() => setShowLocationModal(false)}
      />
      <CommuteModal
        visible={showCommuteModal}
        onClose={() => setShowCommuteModal(false)}
      />
      <DoctorReportModal
        visible={showDoctorModal}
        onClose={() => setShowDoctorModal(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F7FAF7" },

  /* Header */
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingTop: 52,
    paddingBottom: 16,
    backgroundColor: "#133E1B",
  },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  brandIcon: { fontSize: 20 },
  brandName: { fontSize: 22, fontWeight: "800", color: "#FFFFFF", letterSpacing: -0.5 },
  liveIndicator: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(76, 175, 80, 0.25)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 4,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#4CAF50" },
  liveText: { fontSize: 9, fontWeight: "800", color: "#A5D6A7" },
  tagline: { fontSize: 12, color: "#A5D6A7", marginTop: 2 },
  profileBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  profileBtnText: { fontSize: 18 },

  /* Inversion Warning Banner */
  inversionCard: {
    marginHorizontal: 16,
    marginTop: 14,
    backgroundColor: "#FFF3E0",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: "#FFB74D",
    shadowColor: "#E65100",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  inversionTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  inversionBadge: {
    backgroundColor: "#E65100",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  inversionBadgeText: { fontSize: 10, fontWeight: "800", color: "#fff" },
  inversionTimeText: { fontSize: 11, fontWeight: "600", color: "#EF6C00" },
  inversionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#BF360C",
    marginTop: 8,
  },
  inversionDesc: {
    fontSize: 12,
    color: "#D84315",
    marginTop: 4,
    lineHeight: 18,
  },
  inversionActionBtn: {
    marginTop: 10,
    backgroundColor: "#E65100",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  inversionActionText: { fontSize: 12, fontWeight: "700", color: "#fff" },

  /* AQI Hero Card */
  heroCard: {
    marginHorizontal: 16,
    marginTop: 14,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  locationChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F8E9",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
    borderWidth: 1,
    borderColor: "#C5E1A5",
  },
  locationChipIcon: { fontSize: 12 },
  locationChipText: { fontSize: 13, fontWeight: "700", color: "#1B5E20" },
  locationChipArrow: { fontSize: 11, color: "#2E7D32" },
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryBadgeText: { fontSize: 12, fontWeight: "800", color: "#FFFFFF" },

  heroMainRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 14,
  },
  aqiNumberRow: { flexDirection: "row", alignItems: "baseline", gap: 6 },
  heroAqiNum: { fontSize: 52, fontWeight: "900", letterSpacing: -2 },
  heroAqiUnit: { fontSize: 16, fontWeight: "700", color: "#757575" },
  heroSubText: { fontSize: 13, color: "#616161", marginTop: 2, fontWeight: "500" },

  cigaretteBadge: {
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  cigaretteIcon: { fontSize: 20 },
  cigaretteVal: { fontSize: 13, fontWeight: "bold", color: "#424242", marginTop: 2 },
  cigaretteSub: { fontSize: 9, color: "#757575", textTransform: "uppercase" },

  /* Spectrum Range */
  spectrumWrapper: { marginTop: 16 },
  spectrumTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: "#E0E0E0",
    position: "relative",
  },
  spectrumIndicator: {
    position: "absolute",
    top: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2.5,
    borderColor: "#FFFFFF",
    marginLeft: -8,
  },
  spectrumLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
  },
  spectrumLabelText: { fontSize: 10, color: "#757575" },

  /* Metrics Grid */
  metricsGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "#FAFAFA",
    borderRadius: 14,
    paddingVertical: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#EEEEEE",
  },
  metricItem: { alignItems: "center", flex: 1 },
  metricItemLabel: { fontSize: 11, color: "#616161", fontWeight: "600" },
  metricItemValue: { fontSize: 17, fontWeight: "bold", color: "#212121", marginTop: 2 },
  metricItemUnit: { fontSize: 9, color: "#757575" },
  metricItemLimit: { fontSize: 9, color: "#2E7D32", fontWeight: "700", marginTop: 2 },
  metricItemDivider: { width: 1, backgroundColor: "#E0E0E0" },

  /* Tools Hub */
  toolsRow: {
    flexDirection: "row",
    gap: 12,
    marginHorizontal: 16,
    marginTop: 14,
  },
  toolCard: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  toolCardIcon: { fontSize: 24 },
  toolCardTitle: { fontSize: 13, fontWeight: "bold", color: "#212121" },
  toolCardDesc: { fontSize: 10, color: "#757575", marginTop: 1 },
  toolCardChevron: { fontSize: 18, color: "#9E9E9E", fontWeight: "bold" },

  /* Habit Tracker */
  habitCard: {
    marginHorizontal: 16,
    marginTop: 14,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  habitHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  habitCardTitle: { fontSize: 15, fontWeight: "bold", color: "#212121" },
  habitCardSubtitle: { fontSize: 11, color: "#757575", marginTop: 2 },
  savedScoreBox: {
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#C8E6C9",
  },
  savedScoreVal: { fontSize: 15, fontWeight: "800", color: "#2E7D32" },
  savedScoreLbl: { fontSize: 9, color: "#1B5E20", fontWeight: "700" },

  habitList: { gap: 8 },
  habitItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "#F9FBF9",
    borderWidth: 1,
    borderColor: "#ECEFF1",
  },
  habitItemActive: {
    backgroundColor: "#E8F5E9",
    borderColor: "#A5D6A7",
  },
  habitIcon: { fontSize: 18, marginRight: 10 },
  habitLabel: { flex: 1, fontSize: 13, color: "#424242", fontWeight: "500" },
  habitLabelActive: { color: "#1B5E20", fontWeight: "600" },
  habitCheckCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#B0BEC5",
    justifyContent: "center",
    alignItems: "center",
  },
  habitCheckCircleActive: {
    backgroundColor: "#2E7D32",
    borderColor: "#2E7D32",
  },
  checkText: { fontSize: 13, color: "#9E9E9E", fontWeight: "bold" },
  checkTextActive: { color: "#FFFFFF" },

  /* Situations & Windows */
  summaryBox: {
    marginHorizontal: 16,
    marginTop: 14,
    backgroundColor: "#F1F8E9",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#DCEDC8",
  },
  summaryTitle: { fontSize: 13, fontWeight: "bold", color: "#33691E", marginBottom: 4 },
  summaryText: { fontSize: 12, color: "#558B2F", lineHeight: 18 },

  safeWindow: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 10,
    backgroundColor: "#E8F5E9",
    borderRadius: 12,
    padding: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: "#C8E6C9",
  },
  safeWindowIcon: { fontSize: 22 },
  safeWindowTitle: { fontSize: 12, fontWeight: "bold", color: "#1B5E20" },
  safeWindowText: { fontSize: 11, color: "#2E7D32", marginTop: 2 },

  /* Suggestions */
  sectionHeaderRow: {
    marginHorizontal: 16,
    marginTop: 22,
    marginBottom: 8,
  },
  sectionTitle: { fontSize: 16, fontWeight: "bold", color: "#212121" },
  sectionSub: { fontSize: 11, color: "#757575", marginTop: 2 },

  suggCard: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#ECEFF1",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
    gap: 12,
  },
  suggIconBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: "#E8F5E9",
    justifyContent: "center",
    alignItems: "center",
  },
  suggIcon: { fontSize: 22 },
  suggContent: { flex: 1 },
  suggTitle: { fontSize: 14, fontWeight: "bold", color: "#212121" },
  suggDesc: { fontSize: 12, color: "#616161", marginTop: 3, lineHeight: 17 },
  suggImpactPill: {
    alignSelf: "flex-start",
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 6,
  },
  suggImpactText: { fontSize: 10, fontWeight: "700", color: "#1B5E20" },

  /* Skeleton Loading */
  skeletonContainer: {
    flex: 1,
    backgroundColor: "#F7FAF7",
    paddingHorizontal: 16,
    paddingTop: 54,
    gap: 14,
  },
  skeletonHeader: {
    height: 40,
    borderRadius: 10,
    backgroundColor: "#E0E0E0",
  },
  skeletonHero: {
    height: 200,
    borderRadius: 20,
    backgroundColor: "#E0E0E0",
  },
  skeletonRow: {
    flexDirection: "row",
    gap: 12,
  },
  skeletonBox: {
    flex: 1,
    height: 60,
    borderRadius: 14,
    backgroundColor: "#E0E0E0",
  },
  skeletonCard: {
    height: 180,
    borderRadius: 18,
    backgroundColor: "#E0E0E0",
  },
});
