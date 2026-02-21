import React from "react";
import { StyleSheet, View, type ViewStyle, type StyleProp } from "react-native";
import Colors from "@/constants/colors";
import { SLEEP_AID_CARD_BACKGROUND, SLEEP_AID_CARD_BORDER, SLEEP_AID_CARD_RADIUS } from "@/components/sleep-aid/theme";

type SleepAidCardProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function SleepAidCard({ children, style }: SleepAidCardProps) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: SLEEP_AID_CARD_BORDER,
    borderRadius: SLEEP_AID_CARD_RADIUS,
    backgroundColor: SLEEP_AID_CARD_BACKGROUND,
    padding: 18,
    gap: 10,
    shadowColor: Colors.dark.background,
    shadowOpacity: 0.24,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
});
