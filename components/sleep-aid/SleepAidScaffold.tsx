import React, { useEffect, useMemo, useRef } from "react";
import {
  Animated,
  Easing,
  Platform,
  SafeAreaView,
  ScrollView,
  type ScrollViewProps,
  StyleSheet,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import Colors from "@/constants/colors";
import { SLEEP_AID_GRADIENT } from "@/components/sleep-aid/theme";

type SleepAidScaffoldProps = {
  children: React.ReactNode;
  scroll?: boolean;
  contentContainerStyle?: ScrollViewProps["contentContainerStyle"];
};

export function SleepAidScaffold({ children, scroll = true, contentContainerStyle }: SleepAidScaffoldProps) {
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fade, {
      toValue: 1,
      duration: 420,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [fade]);

  const body = useMemo(() => {
    if (!scroll) {
      return <View style={styles.staticBody}>{children}</View>;
    }

    return (
      <ScrollView
        contentContainerStyle={[styles.content, contentContainerStyle]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    );
  }, [children, scroll, contentContainerStyle]);

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <View style={styles.topGuard} />
      <LinearGradient colors={SLEEP_AID_GRADIENT} style={styles.background} />
      <SafeAreaView style={styles.safeArea}>
        <Animated.View style={[styles.animatedLayer, { opacity: fade }]}>{body}</Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  topGuard: {
    ...StyleSheet.absoluteFillObject,
    bottom: undefined,
    height: Platform.OS === "android" ? 64 : 88,
    backgroundColor: "#070B1A",
  },
  background: {
    ...StyleSheet.absoluteFillObject,
  },
  safeArea: {
    flex: 1,
    backgroundColor: "transparent",
  },
  animatedLayer: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 44,
    gap: 12,
  },
  staticBody: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 30,
    gap: 12,
  },
});
