import React from "react";
import { StyleSheet, View } from "react-native";
import Colors from "@/constants/colors";
import { SleepAidCard } from "@/components/sleep-aid/SleepAidCard";
import { SleepAidScaffold } from "@/components/sleep-aid/SleepAidScaffold";
import { SleepAidBody, SleepAidHeading, SleepAidSubheading } from "@/components/sleep-aid/SleepAidText";

const STRETCH_STEPS = [
  {
    name: "Neck rolls",
    instruction:
      "Sit tall. Circle your neck clockwise for 20 seconds, then counter-clockwise for 20 seconds. Keep shoulders loose.",
  },
  {
    name: "Shoulder release",
    instruction:
      "Lift shoulders toward your ears, hold for 2 seconds, then fully release. Repeat 8 gentle reps with slow breathing.",
  },
  {
    name: "Light back stretch",
    instruction:
      "Sit and hinge forward with a straight back until you feel a mild stretch. Hold for 20 to 30 seconds.",
  },
  {
    name: "Hamstring stretch",
    instruction:
      "Extend one leg, keep the other bent, and lean toward the extended leg. Hold 20 to 30 seconds per side.",
  },
];

export default function StretchingScreen() {
  return (
    <SleepAidScaffold>
      <SleepAidCard>
        <SleepAidHeading>Light Stretching</SleepAidHeading>
        <SleepAidBody>
          Move slowly and stay within a comfortable range. This sequence should feel soothing, never forceful.
        </SleepAidBody>
      </SleepAidCard>

      {STRETCH_STEPS.map((step, index) => (
        <SleepAidCard key={step.name} style={styles.stepCard}>
          <View style={styles.stepHeader}>
            <View style={styles.badge}>
              <SleepAidSubheading style={styles.badgeText}>{index + 1}</SleepAidSubheading>
            </View>
            <SleepAidSubheading>{step.name}</SleepAidSubheading>
          </View>
          <SleepAidBody>{step.instruction}</SleepAidBody>
        </SleepAidCard>
      ))}
    </SleepAidScaffold>
  );
}

const styles = StyleSheet.create({
  stepCard: {
    gap: 9,
  },
  stepHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  badge: {
    width: 30,
    height: 30,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(123, 140, 222, 0.2)",
    borderWidth: 1,
    borderColor: Colors.dark.primary,
  },
  badgeText: {
    color: Colors.dark.primaryLight,
    fontSize: 14,
  },
});
