import React, { useEffect } from "react";
import { View, StyleSheet, Platform } from "react-native";
import { Stack } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 2,
    },
  },
});

export default function RootLayout() {
  useEffect(() => {
    if (Platform.OS === "web" && typeof document !== "undefined") {
      const fontId = "urbsafe-modern-fonts";
      if (!document.getElementById(fontId)) {
        const link = document.createElement("link");
        link.id = fontId;
        link.rel = "stylesheet";
        link.href =
          "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=Inter:wght@400;500;600;700&display=swap";
        document.head.appendChild(link);

        const style = document.createElement("style");
        style.innerHTML = `
          * {
            font-family: 'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
          }
          ::-webkit-scrollbar {
            height: 4px;
            width: 4px;
          }
          ::-webkit-scrollbar-track {
            background: transparent;
          }
          ::-webkit-scrollbar-thumb {
            background: rgba(0, 0, 0, 0.15);
            border-radius: 4px;
          }
        `;
        document.head.appendChild(style);
      }
    }
  }, []);

  const content = (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="profile" />
        <Stack.Screen name="login" />
      </Stack>
    </QueryClientProvider>
  );

  if (Platform.OS === "web") {
    return (
      <View style={styles.webBackdrop}>
        <View style={styles.webFrame}>{content}</View>
      </View>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  webBackdrop: {
    flex: 1,
    backgroundColor: "#06130B",
    alignItems: "center",
    justifyContent: "flex-start",
    minHeight: "100vh" as any,
  },
  webFrame: {
    width: "100%",
    maxWidth: 480,
    minHeight: "100vh" as any,
    backgroundColor: "#F8FAFC",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.45,
    shadowRadius: 36,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
});
