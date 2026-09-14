import { Tabs } from "expo-router";
import {
  CalendarHeart,
  Moon,
  RotateCcw,
  Settings2,
  Users,
} from "lucide-react-native";
import React from "react";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#E5B45B",
        tabBarInactiveTintColor: "#8494B4",
        tabBarStyle: {
          backgroundColor: "#0D1426",
          borderTopColor: "#1F2C47",
          borderTopWidth: 1,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Today",
          tabBarIcon: ({ color, size }) => <Moon color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="qadha"
        options={{
          title: "Qadha",
          tabBarIcon: ({ color, size }) => (
            <RotateCcw color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="brothers"
        options={{
          title: "Brothers",
          tabBarIcon: ({ color, size }) => <Users color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="journey"
        options={{
          title: "Journey",
          tabBarIcon: ({ color, size }) => (
            <CalendarHeart color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: "More",
          tabBarIcon: ({ color, size }) => (
            <Settings2 color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
