import React from "react";
import { Stack } from "expo-router";

export default function SleepAidLayout() {
  return (
    <Stack>
      <Stack.Screen name="wind-down" options={{ title: "Wind-down Routine" }} />
      <Stack.Screen name="audio" options={{ title: "Calming Audio" }} />
      <Stack.Screen name="breathing" options={{ title: "Guided Breathing" }} />
      <Stack.Screen name="stretching" options={{ title: "Stretching & Relax" }} />
      <Stack.Screen name="relaxation" options={{ title: "Relaxation" }} />
    </Stack>
  );
}
