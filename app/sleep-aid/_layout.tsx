import React from "react";
import { Stack } from "expo-router";
import Colors from "@/constants/colors";

export default function SleepAidLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.dark.background },
        headerTintColor: Colors.dark.text,
        headerTitleStyle: { color: Colors.dark.text, fontFamily: "Nunito_700Bold" },
        contentStyle: { backgroundColor: Colors.dark.background },
        animation: "fade_from_bottom",
        statusBarStyle: "light",
        statusBarColor: Colors.dark.background,
      }}
    >
      <Stack.Screen name="wind-down" options={{ title: "Wind-down Routine" }} />
      <Stack.Screen name="audio" options={{ title: "Calming Audio" }} />
      <Stack.Screen name="breathing" options={{ title: "Guided Breathing" }} />
      <Stack.Screen name="stretching" options={{ title: "Stretching & Relax" }} />
      <Stack.Screen name="relaxation" options={{ title: "Relaxation" }} />
    </Stack>
  );
}
