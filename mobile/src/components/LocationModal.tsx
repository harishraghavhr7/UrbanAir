import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StyleSheet,
} from "react-native";
import { CITY_PRESETS } from "../constants";
import { useAppStore } from "../store/appStore";

interface LocationModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function LocationModal({ visible, onClose }: LocationModalProps) {
  const { location, setLocation } = useAppStore();
  const [search, setSearch] = useState("");

  const filteredCities = CITY_PRESETS.filter((c) =>
    c.city.toLowerCase().includes(search.toLowerCase()) ||
    c.tag.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelectCity = (c: (typeof CITY_PRESETS)[0]) => {
    setLocation({ city: c.city, lat: c.lat, lng: c.lng });
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>📍 Change Location</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.subtitle}>
            Select your city to get hyperlocal real-time AQI and customized health advice.
          </Text>

          <TextInput
            style={styles.searchInput}
            placeholder="Search city (e.g. Delhi, Mumbai, London)..."
            placeholderTextColor="#999"
            value={search}
            onChangeText={setSearch}
          />

          <ScrollView style={styles.cityList} showsVerticalScrollIndicator={false}>
            {filteredCities.map((c) => {
              const isSelected = location.city.toLowerCase() === c.city.toLowerCase();
              return (
                <TouchableOpacity
                  key={c.city}
                  style={[styles.cityItem, isSelected && styles.cityItemActive]}
                  onPress={() => handleSelectCity(c)}
                >
                  <View style={styles.cityLeft}>
                    <Text style={styles.cityIcon}>🏢</Text>
                    <View>
                      <Text style={[styles.cityName, isSelected && styles.cityNameActive]}>
                        {c.city}
                      </Text>
                      <Text style={styles.cityCoords}>
                        Lat: {c.lat.toFixed(2)}, Lng: {c.lng.toFixed(2)}
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.tagBadge, isSelected && styles.tagBadgeActive]}>
                    <Text style={[styles.tagText, isSelected && styles.tagTextActive]}>
                      {c.tag}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
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
    maxHeight: "80%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  title: { fontSize: 20, fontWeight: "bold", color: "#1B5E20" },
  closeBtn: { fontSize: 22, color: "#888", padding: 4 },
  subtitle: { fontSize: 13, color: "#666", marginBottom: 14 },
  searchInput: {
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: "#222",
    marginBottom: 14,
  },
  cityList: { maxHeight: 350 },
  cityItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: "#FAFAFA",
    borderWidth: 1,
    borderColor: "#EEEEEE",
  },
  cityItemActive: {
    backgroundColor: "#E8F5E9",
    borderColor: "#A5D6A7",
  },
  cityLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  cityIcon: { fontSize: 20 },
  cityName: { fontSize: 15, fontWeight: "600", color: "#333" },
  cityNameActive: { color: "#1B5E20", fontWeight: "bold" },
  cityCoords: { fontSize: 11, color: "#888", marginTop: 2 },
  tagBadge: {
    backgroundColor: "#ECEFF1",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tagBadgeActive: { backgroundColor: "#C8E6C9" },
  tagText: { fontSize: 11, fontWeight: "600", color: "#546E7A" },
  tagTextActive: { color: "#1B5E20" },
});
