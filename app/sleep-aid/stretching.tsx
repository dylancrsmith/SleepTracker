import React from "react";
import { ScrollView, StyleSheet, Text, View, useColorScheme } from "react-native";
import Colors from "@/constants/colors";

const STRETCH_STEPS = [
  {
    name: "Neck rolls",
    instruction:
      "Sit tall. Slowly circle your neck clockwise for 20 seconds, then counter-clockwise for 20 seconds. Keep shoulders relaxed.",
  },
  {
    name: "Shoulder relaxation",
    instruction:
      "Lift your shoulders toward your ears, hold 2 seconds, then release. Repeat 8 gentle reps with slow breathing.",
  },
  {
    name: "Light back stretch",
    instruction:
      "Sit and hinge forward with a straight back until you feel a mild stretch. Hold for 20-30 seconds and breathe slowly.",
  },
  {
    name: "Hamstring stretch",
    instruction:
      "Extend one leg, keep the other bent, and lean toward the extended leg. Hold 20-30 seconds each side without bouncing.",
  },
];

export default function StretchingScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === "dark" ? Colors.dark : Colors.light;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}> 
          <Text style={[styles.title, { color: theme.text, fontFamily: "Nunito_700Bold" }]}>Light Stretching & Relax</Text>
          <Text style={[styles.copy, { color: theme.textSecondary, fontFamily: "Nunito_400Regular" }]}>
            Move slowly and stay in a comfortable range. This is a gentle wind-down sequence, not a workout.
          </Text>
        </View>

        {STRETCH_STEPS.map((step, index) => (
          <View key={step.name} style={[styles.stepCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}> 
            <Text style={[styles.stepTitle, { color: theme.text, fontFamily: "Nunito_700Bold" }]}>{index + 1}. {step.name}</Text>
            <Text style={[styles.stepText, { color: theme.textSecondary, fontFamily: "Nunito_400Regular" }]}>{step.instruction}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 40, gap: 12 },
  card: { borderWidth: 1, borderRadius: 16, padding: 18, gap: 8 },
  title: { fontSize: 18.5 },
  copy: { fontSize: 14.5, lineHeight: 21 },
  stepCard: { borderWidth: 1, borderRadius: 14, padding: 15, gap: 8 },
  stepTitle: { fontSize: 15.5 },
  stepText: { fontSize: 14.5, lineHeight: 21 },
});
