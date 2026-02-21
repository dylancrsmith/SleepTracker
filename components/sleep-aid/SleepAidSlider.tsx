import React, { useMemo, useState } from "react";
import { LayoutChangeEvent, StyleSheet, View } from "react-native";
import Colors from "@/constants/colors";

type SleepAidSliderProps = {
  value: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
};

export function SleepAidSlider({ value, min = 0, max = 1, onChange }: SleepAidSliderProps) {
  const [trackWidth, setTrackWidth] = useState(1);

  const progress = useMemo(() => {
    const clamped = Math.max(min, Math.min(max, value));
    return (clamped - min) / (max - min);
  }, [max, min, value]);

  const handleLayout = (event: LayoutChangeEvent) => {
    setTrackWidth(Math.max(1, event.nativeEvent.layout.width));
  };

  const updateFromX = (x: number) => {
    const normalized = Math.max(0, Math.min(1, x / trackWidth));
    const next = min + normalized * (max - min);
    onChange(next);
  };

  return (
    <View
      style={styles.track}
      onLayout={handleLayout}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderGrant={(event) => updateFromX(event.nativeEvent.locationX)}
      onResponderMove={(event) => updateFromX(event.nativeEvent.locationX)}
    >
      <View style={[styles.fill, { width: `${progress * 100}%` }]} />
      <View style={[styles.thumb, { left: `${progress * 100}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 16,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.12)",
    justifyContent: "center",
    overflow: "visible",
  },
  fill: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: Colors.dark.primary,
    borderRadius: 10,
  },
  thumb: {
    position: "absolute",
    top: -4,
    marginLeft: -10,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#DDE3FF",
    backgroundColor: Colors.dark.primaryLight,
  },
});
