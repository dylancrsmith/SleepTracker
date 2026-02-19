import React, { useState } from "react";
import {
  View, Text, StyleSheet, Pressable, ScrollView, TextInput, Platform, useColorScheme, Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import Colors from "@/constants/colors";
import { useSleep } from "@/lib/sleep-context";

const TAGS = ["Caffeine", "Stress", "Exercise", "Alcohol", "Late Meal", "Screen Time"];

export default function CheckInScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;
  const { endSleep } = useSleep();
  const params = useLocalSearchParams<{ ritualDone: string; ritualItemsDone: string; ritualTotal: string }>();

  const [rating, setRating] = useState(0);
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newBadges, setNewBadges] = useState<string[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);

  const webTopInset = Platform.OS === "web" ? 67 : 0;

  const toggleTag = (tag: string) => {
    Haptics.selectionAsync();
    const next = new Set(selectedTags);
    if (next.has(tag)) next.delete(tag);
    else next.add(tag);
    setSelectedTags(next);
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert("Rate your sleep", "Please tap the stars to rate your sleep quality.");
      return;
    }
    setIsSubmitting(true);
    try {
      const ritualDone = params.ritualDone === "true";
      const ritualItemsDone = parseInt(params.ritualItemsDone || "0");
      const ritualTotal = parseInt(params.ritualTotal || "0");

      const badges = await endSleep(
        rating,
        Array.from(selectedTags),
        note,
        ritualDone,
        ritualItemsDone,
        ritualTotal
      );
      setNewBadges(badges);
      setShowSuccess(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      console.error("Failed to end sleep:", e);
      Alert.alert("Error", "Failed to save sleep log. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (showSuccess) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top + webTopInset }]}>
        <View style={styles.successContent}>
          <View style={[styles.successIcon, { backgroundColor: theme.success + "20" }]}>
            <Ionicons name="checkmark-circle" size={56} color={theme.success} />
          </View>
          <Text style={[styles.successTitle, { color: theme.text, fontFamily: "Nunito_800ExtraBold" }]}>
            Sleep Logged!
          </Text>
          <Text style={[styles.successDesc, { color: theme.textSecondary, fontFamily: "Nunito_400Regular" }]}>
            Great job tracking your sleep. Keep building that streak!
          </Text>
          {newBadges.length > 0 && (
            <View style={[styles.badgeNotif, { backgroundColor: theme.xpGold + "15" }]}>
              <Ionicons name="trophy" size={24} color={theme.xpGold} />
              <Text style={[styles.badgeNotifText, { color: theme.xpGold, fontFamily: "Nunito_700Bold" }]}>
                {newBadges.length} new badge{newBadges.length > 1 ? "s" : ""} earned!
              </Text>
            </View>
          )}
          <Pressable
            onPress={() => router.back()}
            style={[styles.doneBtn, { backgroundColor: theme.primary }]}
          >
            <Text style={[styles.doneBtnText, { fontFamily: "Nunito_700Bold" }]}>Done</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.topBar, { paddingTop: insets.top + webTopInset + 12 }]}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="close" size={28} color={theme.text} />
        </Pressable>
        <Text style={[styles.topTitle, { color: theme.text, fontFamily: "Nunito_700Bold" }]}>Morning Check-in</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: "Nunito_700Bold" }]}>
            How did you sleep?
          </Text>
          <View style={styles.starRow}>
            {[1, 2, 3, 4, 5].map((s) => (
              <Pressable key={s} onPress={() => { setRating(s); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}>
                <Ionicons
                  name={s <= rating ? "star" : "star-outline"}
                  size={44}
                  color={s <= rating ? theme.starYellow : theme.border}
                />
              </Pressable>
            ))}
          </View>
          <Text style={[styles.ratingLabel, { color: theme.textSecondary, fontFamily: "Nunito_400Regular" }]}>
            {rating === 0 ? "Tap to rate" : rating <= 2 ? "Poor" : rating === 3 ? "Okay" : rating === 4 ? "Good" : "Excellent"}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: "Nunito_700Bold" }]}>
            What affected your sleep?
          </Text>
          <View style={styles.tagGrid}>
            {TAGS.map((tag) => (
              <Pressable
                key={tag}
                onPress={() => toggleTag(tag)}
                style={[
                  styles.tag,
                  {
                    backgroundColor: selectedTags.has(tag) ? theme.primary + "20" : theme.surface,
                    borderColor: selectedTags.has(tag) ? theme.primary : theme.border,
                  },
                ]}
              >
                <Text style={[styles.tagText, { color: selectedTags.has(tag) ? theme.primary : theme.textSecondary, fontFamily: "Nunito_600SemiBold" }]}>
                  {tag}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: "Nunito_700Bold" }]}>
            Notes (optional)
          </Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="Any additional notes..."
            placeholderTextColor={theme.textMuted}
            multiline
            style={[styles.noteInput, { color: theme.text, backgroundColor: theme.surface, borderColor: theme.border, fontFamily: "Nunito_400Regular" }]}
          />
        </View>
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 16) }]}>
        <Pressable
          onPress={handleSubmit}
          disabled={isSubmitting}
          style={[styles.submitBtn, { backgroundColor: theme.primary, opacity: isSubmitting ? 0.7 : 1 }]}
        >
          <Text style={[styles.submitBtnText, { fontFamily: "Nunito_700Bold" }]}>
            {isSubmitting ? "Saving..." : "Log Sleep"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 12 },
  topTitle: { fontSize: 18 },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 24 },
  section: { marginTop: 28 },
  sectionTitle: { fontSize: 18, marginBottom: 16 },
  starRow: { flexDirection: "row", justifyContent: "center", gap: 12 },
  ratingLabel: { textAlign: "center", marginTop: 8, fontSize: 14 },
  tagGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  tag: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1.5 },
  tagText: { fontSize: 14 },
  noteInput: { borderRadius: 14, borderWidth: 1, padding: 14, height: 100, textAlignVertical: "top", fontSize: 15 },
  bottomBar: { paddingHorizontal: 24, paddingTop: 12 },
  submitBtn: { height: 54, borderRadius: 27, alignItems: "center", justifyContent: "center" },
  submitBtnText: { color: "#fff", fontSize: 17 },
  successContent: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, gap: 16 },
  successIcon: { width: 100, height: 100, borderRadius: 50, alignItems: "center", justifyContent: "center" },
  successTitle: { fontSize: 26 },
  successDesc: { fontSize: 15, textAlign: "center", lineHeight: 22 },
  badgeNotif: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 20, paddingVertical: 14, borderRadius: 16, marginTop: 8 },
  badgeNotifText: { fontSize: 15 },
  doneBtn: { paddingHorizontal: 48, paddingVertical: 14, borderRadius: 24, marginTop: 16 },
  doneBtnText: { color: "#fff", fontSize: 16 },
});
