import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useMutation } from "@tanstack/react-query";
import { planCommute } from "../services/api";
import { useAppStore } from "../store/appStore";

interface CommuteModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function CommuteModal({ visible, onClose }: CommuteModalProps) {
  const { location } = useAppStore();
  const [origin, setOrigin] = useState("Home");
  const [destination, setDestination] = useState("Office");
  const [distanceKm, setDistanceKm] = useState("12");

  const mutation = useMutation({
    mutationFn: () =>
      planCommute({
        origin,
        destination,
        distance_km: parseFloat(distanceKm) || 10,
        lat: location.lat,
        lng: location.lng,
        city: location.city,
      }),
  });

  const handleCalculate = () => {
    mutation.mutate();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>🚗 Clean Commute Planner</Text>
              <Text style={styles.subtitle}>
                Compare PM2.5 Inhaled Dose & Health Risk across Travel Modes
              </Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Form */}
          <View style={styles.formRow}>
            <View style={styles.inputWrap}>
              <Text style={styles.inputLabel}>From</Text>
              <TextInput
                style={styles.input}
                value={origin}
                onChangeText={setOrigin}
                placeholder="Origin"
              />
            </View>
            <View style={styles.inputWrap}>
              <Text style={styles.inputLabel}>To</Text>
              <TextInput
                style={styles.input}
                value={destination}
                onChangeText={setDestination}
                placeholder="Destination"
              />
            </View>
            <View style={[styles.inputWrap, { flex: 0.6 }]}>
              <Text style={styles.inputLabel}>Distance (km)</Text>
              <TextInput
                style={styles.input}
                value={distanceKm}
                onChangeText={setDistanceKm}
                keyboardType="numeric"
                placeholder="km"
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.calcBtn, mutation.isPending && { opacity: 0.7 }]}
            onPress={handleCalculate}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.calcBtnText}>Compare Inhaled Exposure</Text>
            )}
          </TouchableOpacity>

          <ScrollView style={styles.resultsScroll} showsVerticalScrollIndicator={false}>
            {mutation.data && (
              <View style={styles.resultsContainer}>
                {/* Recommendation Summary */}
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryTitle}>🌟 Cleanest Route Recommendation</Text>
                  <Text style={styles.summaryDesc}>
                    {mutation.data.recommendation_summary}
                  </Text>
                </View>

                {/* Route Cards */}
                <Text style={styles.sectionHeading}>Exposure by Mode (Cleanest First):</Text>
                {mutation.data.routes.map((r: any, idx: number) => {
                  const isCleanest = idx === 0;
                  return (
                    <View
                      key={r.mode}
                      style={[styles.routeCard, isCleanest && styles.routeCardBest]}
                    >
                      <View style={styles.routeHeader}>
                        <View style={styles.routeLeft}>
                          <Text style={styles.routeIcon}>{r.icon}</Text>
                          <View>
                            <Text style={styles.routeName}>{r.name}</Text>
                            <Text style={styles.routeMeta}>
                              ⏱️ {r.duration_mins} mins • 🌿 {r.co2_grams}g CO₂
                            </Text>
                          </View>
                        </View>
                        <View style={styles.doseBadge}>
                          <Text style={styles.doseScore}>Dose: {r.inhaled_dose_score}/100</Text>
                          {r.reduction_pct > 0 && (
                            <Text style={styles.reductionText}>
                              -{r.reduction_pct}% PM2.5
                            </Text>
                          )}
                        </View>
                      </View>

                      <View style={styles.divider} />

                      {/* Tips */}
                      {r.health_tips && r.health_tips.map((tip: string, tIdx: number) => (
                        <Text key={tIdx} style={styles.tipText}>
                          • {tip}
                        </Text>
                      ))}
                    </View>
                  );
                })}
              </View>
            )}

            {!mutation.data && !mutation.isPending && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>🧭</Text>
                <Text style={styles.emptyTitle}>Know Your Inhaled Dose</Text>
                <Text style={styles.emptyDesc}>
                  Motorcycle and open-window commutes can increase PM2.5 exposure by up to 150% compared to metro or closed AC recirculation. Enter your trip to compare modes.
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: "88%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  title: { fontSize: 20, fontWeight: "bold", color: "#1B5E20" },
  subtitle: { fontSize: 12, color: "#666", marginTop: 2 },
  closeBtn: { fontSize: 22, color: "#888", padding: 4 },

  formRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  inputWrap: { flex: 1 },
  inputLabel: { fontSize: 11, fontWeight: "bold", color: "#555", marginBottom: 4 },
  input: {
    backgroundColor: "#F3F4F6",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: "#222",
  },
  calcBtn: {
    backgroundColor: "#1B5E20",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    marginBottom: 14,
  },
  calcBtnText: { color: "#fff", fontWeight: "bold", fontSize: 14 },

  resultsScroll: { maxHeight: 420 },
  resultsContainer: { paddingBottom: 20 },
  summaryCard: {
    backgroundColor: "#E8F5E9",
    borderWidth: 1,
    borderColor: "#A5D6A7",
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  summaryTitle: { fontSize: 13, fontWeight: "bold", color: "#1B5E20", marginBottom: 4 },
  summaryDesc: { fontSize: 12, color: "#2E7D32", lineHeight: 18 },

  sectionHeading: { fontSize: 14, fontWeight: "bold", color: "#333", marginBottom: 10 },
  routeCard: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  routeCardBest: {
    borderColor: "#2E7D32",
    borderWidth: 2,
    backgroundColor: "#FAFCFA",
  },
  routeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  routeLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  routeIcon: { fontSize: 26 },
  routeName: { fontSize: 14, fontWeight: "bold", color: "#222" },
  routeMeta: { fontSize: 11, color: "#777", marginTop: 2 },
  doseBadge: { alignItems: "flex-end" },
  doseScore: { fontSize: 12, fontWeight: "bold", color: "#1B5E20" },
  reductionText: { fontSize: 11, fontWeight: "700", color: "#00C853", marginTop: 2 },
  divider: { height: 1, backgroundColor: "#F0F0F0", marginVertical: 8 },
  tipText: { fontSize: 11, color: "#555", lineHeight: 16, marginBottom: 2 },

  emptyState: { padding: 30, alignItems: "center" },
  emptyIcon: { fontSize: 40, marginBottom: 10 },
  emptyTitle: { fontSize: 16, fontWeight: "bold", color: "#333", marginBottom: 6 },
  emptyDesc: { fontSize: 13, color: "#777", textAlign: "center", lineHeight: 19 },
});
