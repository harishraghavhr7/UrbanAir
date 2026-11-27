import React from "react";
import { Tabs } from "expo-router";
import { Platform } from "react-native";
import Svg, { Path, Rect, Line } from "react-native-svg";

const LeafIcon = ({ color }: { color: string }) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
    <Path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
  </Svg>
);

const CalendarIcon = ({ color }: { color: string }) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
    <Rect x={3} y={4} width={18} height={18} rx={4} />
    <Line x1={16} y1={2} x2={16} y2={6} />
    <Line x1={8} y1={2} x2={8} y2={6} />
    <Line x1={3} y1={10} x2={21} y2={10} />
  </Svg>
);

const SparklesIcon = ({ color }: { color: string }) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
    <Path d="M5 3v4" />
    <Path d="M19 17v4" />
    <Path d="M3 5h4" />
    <Path d="M17 19h4" />
  </Svg>
);

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#059669",
        tabBarInactiveTintColor: "#94A3B8",
        tabBarStyle: {
          backgroundColor: "#FFFFFF",
          borderTopColor: "rgba(0, 0, 0, 0.06)",
          borderTopWidth: 1,
          height: 64,
          paddingTop: 8,
          paddingBottom: Platform.OS === "ios" ? 20 : 8,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.05,
          shadowRadius: 10,
          elevation: 6,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "700",
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => <LeafIcon color={color} />,
        }}
      />
      <Tabs.Screen
        name="routine"
        options={{
          title: "Routine",
          tabBarIcon: ({ color }) => <CalendarIcon color={color} />,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: "Ask AI",
          tabBarIcon: ({ color }) => <SparklesIcon color={color} />,
        }}
      />
    </Tabs>
  );
}
