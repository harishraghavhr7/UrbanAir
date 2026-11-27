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
  Platform,
} from "react-native";
import { useMutation } from "@tanstack/react-query";
import { generateDoctorReport } from "../services/api";
import { useAppStore } from "../store/appStore";

interface DoctorReportModalProps {
  visible: boolean;
  onClose: () => void;
}

const SYMPTOM_OPTIONS = [
  "Morning dry cough",
  "Chest tightness / wheezing",
  "Throat irritation / burning",
  "Shortness of breath on exertion",
  "Eye irritation / redness",
];

export default function DoctorReportModal({ visible, onClose }: DoctorReportModalProps) {
  const { location, profile } = useAppStore();
  const [patientName, setPatientName] = useState(profile?.name || "Patient");
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([
    "Morning dry cough",
    "Throat irritation / burning",
  ]);

  const toggleSymptom = (s: string) => {
    setSelectedSymptoms((prev) =>
      prev.includes(s) ? prev.filter((item) => item !== s) : [...prev, s]
    );
  };

  const mutation = useMutation({
    mutationFn: () =>
      generateDoctorReport({
        user_id: profile?.user_id,
        patient_name: patientName || "Patient",
        city: location.city,
        lat: location.lat,
        lng: location.lng,
        days_period: 14,
        symptoms: selectedSymptoms,
      }),
  });

  const handlePrint = () => {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      window.print();
    } else {
      alert("Report generated! You can screenshot or copy this summary for your doctor.");
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>🩺 Doctor Health Summary</Text>
              <Text style={styles.subtitle}>
                Clinical Exposure & Respiratory Log for Your Pulmonologist
              </Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>

          {!mutation.data && (
            <View>
              <Text style={styles.label}>Patient Name:</Text>
              <TextInput
                style={styles.input}
                value={patientName}
                onChangeText={setPatientName}
                placeholder="Enter patient name"
              />

              <Text style={[styles.label, { marginTop: 12 }]}>Reported Symptoms (Last 14 Days):</Text>
              <View style={styles.symptomsGrid}>
                {SYMPTOM_OPTIONS.map((sym) => {
                  const isChecked = selectedSymptoms.includes(sym);
                  return (
                    <TouchableOpacity
                      key={sym}
                      style={[styles.symptomChip, isChecked && styles.symptomChipActive]}
                      onPress={() => toggleSymptom(sym)}
                    >
                      <Text style={[styles.symptomText, isChecked && styles.symptomTextActive]}>
                        {isChecked ? "✓ " : "+ "}
                        {sym}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TouchableOpacity
                style={[styles.genBtn, mutation.isPending && { opacity: 0.7 }]}
                onPress={() => mutation.mutate()}
                disabled={mutation.isPending}
              >
                {mutation.isPending ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.genBtnText}>Generate Clinical Summary</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {mutation.data && (
            <ScrollView style={styles.reportScroll} showsVerticalScrollIndicator={false}>
              <View style={styles.reportSheet}>
                {/* Header card */}
                <View style={styles.reportHeaderCard}>
                  <Text style={styles.clinicTitle}>CLINICAL ENVIRONMENTAL EXPOSURE RECORD</Text>
                  <Text style={styles.patientNameHeader}>{mutation.data.patient_name}</Text>
                  <Text style={styles.patientMeta}>
                    📍 {mutation.data.location} • 📅 Date: {mutation.data.report_date} • ⏱️ Period: {mutation.data.period_days} Days
                  </Text>
                </View>

                {/* Metrics */}
                <View style={styles.metricsRow}>
                  <View style={styles.metricCard}>
                    <Text style={styles.metricVal}>{mutation.data.average_aqi}</Text>
                    <Text style={styles.metricLbl}>Avg AQI</Text>
                  </View>
                  <View style={styles.metricCard}>
                    <Text style={[styles.metricVal, { color: "#D50000" }]}>
                      {mutation.data.peak_aqi}
                    </Text>
                    <Text style={styles.metricLbl}>Peak AQI</Text>
                  </View>
                  <View style={styles.metricCard}>
                    <Text style={[styles.metricVal, { color: "#E65100" }]}>
                      ~{mutation.data.estimated_cigarette_total}
                    </Text>
                    <Text style={styles.metricLbl}>Cigarettes Equiv.</Text>
                  </View>
                </View>

                {/* Logged Symptoms */}
                <Text style={styles.sectionHeader}>LOGGED PATIENT SYMPTOMS</Text>
                <View style={styles.chipRow}>
                  {mutation.data.symptoms_logged.map((s: string, idx: number) => (
                    <Text key={idx} style={styles.symptomBadge}>
                      ⚠️ {s}
                    </Text>
                  ))}
                </View>

                {/* Clinical Findings */}
                <Text style={styles.sectionHeader}>ENVIRONMENTAL BURDEN & RISK FINDINGS</Text>
                {mutation.data.clinical_evidence_findings.map((f: string, idx: number) => (
                  <Text key={idx} style={styles.findingItem}>
                    • {f}
                  </Text>
                ))}

                {/* Physician Discussion Points */}
                <Text style={styles.sectionHeader}>KEY DISCUSSION POINTS FOR PHYSICIAN</Text>
                {mutation.data.doctor_discussion_points.map((p: string, idx: number) => (
                  <Text key={idx} style={styles.discussionItem}>
                    ✓ {p}
                  </Text>
                ))}

                {/* Action buttons */}
                <View style={styles.actionRow}>
                  <TouchableOpacity style={styles.printBtn} onPress={handlePrint}>
                    <Text style={styles.printBtnText}>🖨️ Print / Save PDF</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.reGenBtn}
                    onPress={() => mutation.reset()}
                  >
                    <Text style={styles.reGenBtnText}>Edit Details</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          )}
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
    maxHeight: "90%",
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

  label: { fontSize: 13, fontWeight: "bold", color: "#333", marginBottom: 6 },
  input: {
    backgroundColor: "#F3F4F6",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: "#222",
  },
  symptomsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  symptomChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#F5F5F5",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  symptomChipActive: { backgroundColor: "#FFEBEE", borderColor: "#EF5350" },
  symptomText: { fontSize: 12, color: "#555" },
  symptomTextActive: { color: "#C62828", fontWeight: "600" },

  genBtn: {
    backgroundColor: "#1B5E20",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 20,
  },
  genBtnText: { color: "#fff", fontWeight: "bold", fontSize: 14 },

  reportScroll: { maxHeight: 500 },
  reportSheet: {
    backgroundColor: "#FAFAFA",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  reportHeaderCard: {
    borderBottomWidth: 2,
    borderBottomColor: "#1B5E20",
    paddingBottom: 10,
    marginBottom: 12,
  },
  clinicTitle: { fontSize: 10, fontWeight: "800", color: "#1B5E20", letterSpacing: 1 },
  patientNameHeader: { fontSize: 20, fontWeight: "bold", color: "#111", marginTop: 4 },
  patientMeta: { fontSize: 11, color: "#666", marginTop: 2 },

  metricsRow: { flexDirection: "row", gap: 8, marginBottom: 14 },
  metricCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 10,
    padding: 10,
    alignItems: "center",
  },
  metricVal: { fontSize: 18, fontWeight: "bold", color: "#1B5E20" },
  metricLbl: { fontSize: 10, color: "#777", marginTop: 2 },

  sectionHeader: {
    fontSize: 11,
    fontWeight: "800",
    color: "#455A64",
    letterSpacing: 0.5,
    marginTop: 10,
    marginBottom: 6,
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 8 },
  symptomBadge: {
    backgroundColor: "#FFF3E0",
    color: "#E65100",
    fontSize: 11,
    fontWeight: "600",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },

  findingItem: { fontSize: 12, color: "#333", lineHeight: 18, marginBottom: 4 },
  discussionItem: {
    fontSize: 12,
    color: "#1B5E20",
    lineHeight: 18,
    marginBottom: 4,
    fontWeight: "500",
  },

  actionRow: { flexDirection: "row", gap: 10, marginTop: 16 },
  printBtn: {
    flex: 1,
    backgroundColor: "#1B5E20",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  printBtnText: { color: "#fff", fontWeight: "bold", fontSize: 13 },
  reGenBtn: {
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: "#ECEFF1",
    justifyContent: "center",
    alignItems: "center",
  },
  reGenBtnText: { color: "#37474F", fontWeight: "600", fontSize: 13 },
});
