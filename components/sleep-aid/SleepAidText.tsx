import React from "react";
import { StyleSheet, Text, type StyleProp, type TextStyle } from "react-native";
import Colors from "@/constants/colors";

type SleepAidTextProps = {
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
};

export function SleepAidHeading({ children, style }: SleepAidTextProps) {
  return <Text style={[styles.heading, style]}>{children}</Text>;
}

export function SleepAidSubheading({ children, style }: SleepAidTextProps) {
  return <Text style={[styles.subheading, style]}>{children}</Text>;
}

export function SleepAidBody({ children, style }: SleepAidTextProps) {
  return <Text style={[styles.body, style]}>{children}</Text>;
}

const styles = StyleSheet.create({
  heading: {
    color: Colors.dark.text,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: 0.2,
  },
  subheading: {
    color: Colors.dark.text,
    fontFamily: "Nunito_700Bold",
    fontSize: 16,
    lineHeight: 22,
  },
  body: {
    color: Colors.dark.textSecondary,
    fontFamily: "Nunito_400Regular",
    fontSize: 14.5,
    lineHeight: 21,
  },
});
