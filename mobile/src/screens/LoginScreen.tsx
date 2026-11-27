import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { loginUser, registerUser, guestLogin } from "../services/api";
import { useAppStore } from "../store/appStore";

export default function LoginScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { login, location } = useAppStore();

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const authMutation = useMutation({
    mutationFn: async () => {
      if (mode === "signin") {
        return loginUser({ email, password });
      } else {
        return registerUser({
          email,
          password,
          name: name.trim() || "UrbanAir Member",
          city: location.city,
        });
      }
    },
    onSuccess: (data) => {
      login(data.access_token, data.user);
      queryClient.invalidateQueries({ queryKey: ["routine"] });
      queryClient.invalidateQueries({ queryKey: ["suggestions"] });
      router.replace("/(tabs)");
    },
    onError: (error: any) => {
      const msg =
        error?.response?.data?.detail || "Authentication failed. Please verify credentials.";
      setErrorMsg(typeof msg === "string" ? msg : JSON.stringify(msg));
    },
  });

  const demoLoginMutation = useMutation({
    mutationFn: () => loginUser({ email: "demo@urbsafe.ai", password: "password123" }),
    onSuccess: (data) => {
      login(data.access_token, data.user);
      queryClient.invalidateQueries({ queryKey: ["routine"] });
      queryClient.invalidateQueries({ queryKey: ["suggestions"] });
      router.replace("/(tabs)");
    },
    onError: () => {
      setErrorMsg("Demo login unavailable. Try creating an account or continue as Guest.");
    },
  });

  const guestMutation = useMutation({
    mutationFn: () => guestLogin(),
    onSuccess: (data) => {
      login(data.access_token, data.user);
      queryClient.invalidateQueries({ queryKey: ["routine"] });
      queryClient.invalidateQueries({ queryKey: ["suggestions"] });
      router.replace("/(tabs)");
    },
    onError: () => {
      setErrorMsg("Could not start guest session.");
    },
  });

  const handleSubmit = () => {
    setErrorMsg(null);
    if (!email.trim() || !password.trim()) {
      setErrorMsg("Please enter both email and password.");
      return;
    }
    if (mode === "signup" && !name.trim()) {
      setErrorMsg("Please enter your name.");
      return;
    }
    authMutation.mutate();
  };

  const isBusy =
    authMutation.isPending || demoLoginMutation.isPending || guestMutation.isPending;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Text style={styles.backBtnText}>← Back</Text>
          </TouchableOpacity>
          <View style={styles.logoWrap}>
            <Text style={styles.logoIcon}>🌿</Text>
            <Text style={styles.logoTitle}>UrbanAir</Text>
          </View>
          <Text style={styles.logoSubtitle}>
            Personalized clean-air routines & real-time smog alerts
          </Text>
        </View>

        {/* Auth Card */}
        <View style={styles.card}>
          {/* Segmented Mode Switch */}
          <View style={styles.segmentedRow}>
            <TouchableOpacity
              style={[
                styles.segmentBtn,
                mode === "signin" && styles.segmentBtnActive,
              ]}
              onPress={() => {
                setMode("signin");
                setErrorMsg(null);
              }}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.segmentText,
                  mode === "signin" && styles.segmentTextActive,
                ]}
              >
                Sign In
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.segmentBtn,
                mode === "signup" && styles.segmentBtnActive,
              ]}
              onPress={() => {
                setMode("signup");
                setErrorMsg(null);
              }}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.segmentText,
                  mode === "signup" && styles.segmentTextActive,
                ]}
              >
                Create Account
              </Text>
            </TouchableOpacity>
          </View>

          {/* Error Message Banner */}
          {errorMsg && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>⚠️ {errorMsg}</Text>
            </View>
          )}

          {/* Form Fields */}
          <View style={styles.formGroup}>
            {mode === "signup" && (
              <View style={styles.inputWrap}>
                <Text style={styles.inputLabel}>Full Name</Text>
                <TextInput
                  style={styles.textInput}
                  value={name}
                  onChangeText={setName}
                  placeholder="e.g. Aryan Sharma"
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="words"
                />
              </View>
            )}

            <View style={styles.inputWrap}>
              <Text style={styles.inputLabel}>Email Address</Text>
              <TextInput
                style={styles.textInput}
                value={email}
                onChangeText={setEmail}
                placeholder="name@example.com"
                placeholderTextColor="#94A3B8"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputWrap}>
              <Text style={styles.inputLabel}>Password</Text>
              <TextInput
                style={styles.textInput}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor="#94A3B8"
                secureTextEntry
              />
            </View>

            {/* Primary Action Button */}
            <TouchableOpacity
              style={[styles.primaryBtn, isBusy && styles.btnDisabled]}
              onPress={handleSubmit}
              disabled={isBusy}
              activeOpacity={0.8}
            >
              {authMutation.isPending ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.primaryBtnText}>
                  {mode === "signin" ? "Sign In →" : "Create Account →"}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR QUICK ACCESS</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* 1-Tap Demo User */}
          <TouchableOpacity
            style={styles.demoBtn}
            onPress={() => demoLoginMutation.mutate()}
            disabled={isBusy}
            activeOpacity={0.8}
          >
            <Text style={styles.demoBtnIcon}>🚀</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.demoBtnTitle}>1-Tap Demo Account</Text>
              <Text style={styles.demoBtnSub}>
                Pre-configured profile (Aryan Sharma • Delhi)
              </Text>
            </View>
            <Text style={styles.demoBtnArrow}>›</Text>
          </TouchableOpacity>

          {/* Guest Access */}
          <TouchableOpacity
            style={styles.guestBtn}
            onPress={() => guestMutation.mutate()}
            disabled={isBusy}
            activeOpacity={0.7}
          >
            <Text style={styles.guestBtnText}>
              👤 Continue as Guest (No Password Required)
            </Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  scrollContent: {
    padding: 16,
    paddingTop: 48,
  },
  header: {
    marginBottom: 20,
    alignItems: "center",
  },
  backBtn: {
    alignSelf: "flex-start",
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginBottom: 12,
    borderRadius: 8,
    backgroundColor: "#E2E8F0",
  },
  backBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334155",
  },
  logoWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  logoIcon: {
    fontSize: 28,
  },
  logoTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.5,
  },
  logoSubtitle: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 4,
    textAlign: "center",
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.06)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
  },

  segmentedRow: {
    flexDirection: "row",
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 9,
    alignItems: "center",
    borderRadius: 8,
  },
  segmentBtnActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748B",
  },
  segmentTextActive: {
    color: "#0F172A",
    fontWeight: "800",
  },

  errorBanner: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    padding: 10,
    borderRadius: 10,
    marginBottom: 14,
  },
  errorText: {
    fontSize: 12,
    color: "#DC2626",
    fontWeight: "600",
  },

  formGroup: {
    gap: 12,
  },
  inputWrap: {
    gap: 5,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334155",
  },
  textInput: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: "#0F172A",
  },

  primaryBtn: {
    backgroundColor: "#059669",
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 6,
    shadowColor: "#059669",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 18,
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E2E8F0",
  },
  dividerText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#94A3B8",
    letterSpacing: 0.5,
  },

  demoBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    borderRadius: 14,
    padding: 12,
    gap: 10,
    marginBottom: 10,
  },
  demoBtnIcon: {
    fontSize: 22,
  },
  demoBtnTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#065F46",
  },
  demoBtnSub: {
    fontSize: 11,
    color: "#047857",
    marginTop: 1,
  },
  demoBtnArrow: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#059669",
  },

  guestBtn: {
    paddingVertical: 10,
    alignItems: "center",
  },
  guestBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
  },
});
