import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs } from "expo-router";
import { NativeTabs, Icon, Label } from "expo-router/unstable-native-tabs";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { Platform, StyleSheet, useColorScheme, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import React from "react";
import Colors from "@/constants/colors";

function NativeTabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: "moon.stars", selected: "moon.stars.fill" }} />
        <Label>Sleep</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="dashboard">
        <Icon sf={{ default: "chart.bar", selected: "chart.bar.fill" }} />
        <Label>Insights</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="badges">
        <Icon sf={{ default: "trophy", selected: "trophy.fill" }} />
        <Label>Journey</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="sleep-aid">
        <Icon sf={{ default: "wind", selected: "wind" }} />
        <Label>Sleep Aid</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings">
        <Icon sf={{ default: "gearshape", selected: "gearshape.fill" }} />
        <Label>Settings</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicTabLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;
  const isWeb = Platform.OS === "web";
  const isIOS = Platform.OS === "ios";
  const safeAreaInsets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.tabIconDefault,
        tabBarLabelStyle: { fontFamily: "Nunito_600SemiBold", fontSize: 11 },
        tabBarStyle: {
          position: "absolute" as const,
          backgroundColor: isIOS ? "transparent" : theme.surface,
          borderTopWidth: isWeb ? 1 : 0,
          borderTopColor: theme.border,
          elevation: 0,
          paddingBottom: isWeb ? 0 : safeAreaInsets.bottom,
          ...(isWeb ? { height: 84 } : {}),
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView intensity={100} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
          ) : isWeb ? (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.surface }]} />
          ) : null,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Sleep",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "moon" : "moon-outline"} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Insights",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "bar-chart" : "bar-chart-outline"} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="badges"
        options={{
          title: "Journey",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "trophy" : "trophy-outline"} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="sleep-aid"
        options={{
          title: "Sleep Aid",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "leaf" : "leaf-outline"} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "settings" : "settings-outline"} size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  if (isLiquidGlassAvailable()) {
    return <NativeTabLayout />;
  }
  return <ClassicTabLayout />;
}
