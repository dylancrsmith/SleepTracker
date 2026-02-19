import React, { useState } from "react";
import {
  View, Text, StyleSheet, Pressable, TextInput,
  useColorScheme, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useAuth } from "@/lib/auth-context";

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;
  const { login, register } = useAuth();

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isLogin = mode === "login";

  const handleSubmit = async () => {
    setError(null);

    // Inline validation
    if (!username.trim() || !password.trim()) {
      setError("Please enter a username and password.");
      return;
    }
    if (username.trim().length < 3) {
      setError("Username must be at least 3 characters.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setIsLoading(true);
    try {
      if (isLogin) {
        await login(username.trim(), password);
      } else {
        await register(username.trim(), password);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/(tabs)");
    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    Haptics.selectionAsync();
    setMode(isLogin ? "signup" : "login");
    setUsername("");
    setPassword("");
    setError(null);
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo / Icon */}
        <View style={styles.header}>
          <View style={[styles.iconCircle, { backgroundColor: theme.primary + "20" }]}>
            <Ionicons name="moon" size={48} color={theme.moonLavender} />
          </View>
          <Text style={[styles.appName, { color: theme.text, fontFamily: "Nunito_800ExtraBold" }]}>
            DreamStreak
          </Text>
          <Text style={[styles.tagline, { color: theme.textSecondary, fontFamily: "Nunito_400Regular" }]}>
            {isLogin ? "Welcome back! Log in to continue." : "Create an account to start tracking."}
          </Text>
        </View>

        {/* Form Card */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <Text style={[styles.cardTitle, { color: theme.text, fontFamily: "Nunito_700Bold" }]}>
            {isLogin ? "Log In" : "Create Account"}
          </Text>

          {/* Username */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: theme.textSecondary, fontFamily: "Nunito_600SemiBold" }]}>
              Username
            </Text>
            <View style={[styles.inputRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Ionicons name="person-outline" size={18} color={theme.textMuted} style={styles.inputIcon} />
              <TextInput
                value={username}
                onChangeText={setUsername}
                placeholder="e.g. sleepyhead42"
                placeholderTextColor={theme.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                style={[styles.input, { color: theme.text, fontFamily: "Nunito_400Regular" }]}
              />
            </View>
          </View>

          {/* Password */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: theme.textSecondary, fontFamily: "Nunito_600SemiBold" }]}>
              Password
            </Text>
            <View style={[styles.inputRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Ionicons name="lock-closed-outline" size={18} color={theme.textMuted} style={styles.inputIcon} />
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Min. 8 characters"
                placeholderTextColor={theme.textMuted}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                style={[styles.input, { color: theme.text, fontFamily: "Nunito_400Regular" }]}
              />
              <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={18}
                  color={theme.textMuted}
                />
              </Pressable>
            </View>
          </View>

          {/* Error message */}
          {error && (
            <View style={[styles.errorBox, { backgroundColor: "#ff4444" + "18", borderColor: "#ff4444" + "40" }]}>
              <Ionicons name="alert-circle-outline" size={16} color="#ff4444" />
              <Text style={[styles.errorText, { fontFamily: "Nunito_600SemiBold" }]}>{error}</Text>
            </View>
          )}

          {/* Submit Button */}
          <Pressable
            onPress={handleSubmit}
            disabled={isLoading}
            style={[styles.submitBtn, { backgroundColor: theme.primary, opacity: isLoading ? 0.7 : 1 }]}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={[styles.submitBtnText, { fontFamily: "Nunito_700Bold" }]}>
                {isLogin ? "Log In" : "Create Account"}
              </Text>
            )}
          </Pressable>
        </View>

        {/* Toggle login/signup */}
        <View style={styles.toggleRow}>
          <Text style={[styles.toggleText, { color: theme.textSecondary, fontFamily: "Nunito_400Regular" }]}>
            {isLogin ? "Don't have an account?" : "Already have an account?"}
          </Text>
          <Pressable onPress={toggleMode}>
            <Text style={[styles.toggleLink, { color: theme.primary, fontFamily: "Nunito_700Bold" }]}>
              {isLogin ? " Sign Up" : " Log In"}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 24, flexGrow: 1, justifyContent: "center" },
  header: { alignItems: "center", marginBottom: 32, gap: 12 },
  iconCircle: { width: 88, height: 88, borderRadius: 44, alignItems: "center", justifyContent: "center" },
  appName: { fontSize: 32 },
  tagline: { fontSize: 15, textAlign: "center" },
  card: { borderRadius: 24, borderWidth: 1, padding: 24, gap: 20, marginBottom: 24 },
  cardTitle: { fontSize: 22, marginBottom: 4 },
  fieldGroup: { gap: 8 },
  label: { fontSize: 13 },
  inputRow: {
    flexDirection: "row", alignItems: "center",
    borderRadius: 14, borderWidth: 1, paddingHorizontal: 14, height: 52,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 15, height: "100%" },
  eyeBtn: { padding: 4 },
  submitBtn: { height: 54, borderRadius: 27, alignItems: "center", justifyContent: "center", marginTop: 4 },
  submitBtnText: { color: "#fff", fontSize: 17 },
  toggleRow: { flexDirection: "row", justifyContent: "center", alignItems: "center" },
  toggleText: { fontSize: 14 },
  toggleLink: { fontSize: 14 },
  errorBox: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 12, borderWidth: 1 },
  errorText: { color: "#ff4444", fontSize: 13, flex: 1 },
});
