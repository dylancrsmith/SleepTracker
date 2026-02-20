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

const GENDERS = ["male", "female", "non-binary", "prefer not to say"] as const;
const ACTIVITY_LEVELS = ["sedentary", "lightly active", "active", "very active"] as const;

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;
  const { login, register } = useAuth();

  const [mode, setMode] = useState<"login" | "signup">("login");

  // Shared fields
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Signup mandatory fields
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [age, setAge] = useState("");

  // Signup optional fields
  const [weight, setWeight] = useState("");
  const [gender, setGender] = useState<string | null>(null);
  const [activityLevel, setActivityLevel] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isLogin = mode === "login";

  const handleSubmit = async () => {
    setError(null);

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

    if (!isLogin) {
      if (!fullName.trim() || fullName.trim().length < 2) {
        setError("Please enter your full name (at least 2 characters).");
        return;
      }
      if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        setError("Please enter a valid email address.");
        return;
      }
      const ageNum = parseInt(age, 10);
      if (!age || isNaN(ageNum) || ageNum < 13 || ageNum > 120) {
        setError("Please enter a valid age (13–120).");
        return;
      }
    }

    setIsLoading(true);
    try {
      if (isLogin) {
        await login(username.trim(), password);
      } else {
        const ageNum = parseInt(age, 10);
        const weightNum = weight ? parseInt(weight, 10) : undefined;
        await register({
          username: username.trim(),
          password,
          fullName: fullName.trim(),
          email: email.trim().toLowerCase(),
          age: ageNum,
          weight: weightNum && !isNaN(weightNum) ? weightNum : undefined,
          gender: gender ?? undefined,
          activityLevel: activityLevel ?? undefined,
        });
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
    setUsername(""); setPassword(""); setFullName(""); setEmail("");
    setAge(""); setWeight(""); setGender(null); setActivityLevel(null);
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
        {/* Logo */}
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
          <Field label="Username" theme={theme}>
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
          </Field>

          {/* Password */}
          <Field label="Password" theme={theme}>
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
              <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={18} color={theme.textMuted} />
            </Pressable>
          </Field>

          {/* ── Signup-only fields ── */}
          {!isLogin && (
            <>
              <SectionLabel label="About you" theme={theme} />

              <Field label="Full Name" theme={theme}>
                <Ionicons name="id-card-outline" size={18} color={theme.textMuted} style={styles.inputIcon} />
                <TextInput
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="e.g. Dylan Smith"
                  placeholderTextColor={theme.textMuted}
                  autoCapitalize="words"
                  style={[styles.input, { color: theme.text, fontFamily: "Nunito_400Regular" }]}
                />
              </Field>

              <Field label="Email" theme={theme}>
                <Ionicons name="mail-outline" size={18} color={theme.textMuted} style={styles.inputIcon} />
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="e.g. you@email.com"
                  placeholderTextColor={theme.textMuted}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoCorrect={false}
                  style={[styles.input, { color: theme.text, fontFamily: "Nunito_400Regular" }]}
                />
              </Field>

              <Field label="Age" theme={theme}>
                <Ionicons name="calendar-outline" size={18} color={theme.textMuted} style={styles.inputIcon} />
                <TextInput
                  value={age}
                  onChangeText={setAge}
                  placeholder="e.g. 21"
                  placeholderTextColor={theme.textMuted}
                  keyboardType="number-pad"
                  style={[styles.input, { color: theme.text, fontFamily: "Nunito_400Regular" }]}
                />
              </Field>

              <SectionLabel label="Optional — helps personalise your experience" theme={theme} optional />

              <Field label="Weight (kg)" theme={theme}>
                <Ionicons name="barbell-outline" size={18} color={theme.textMuted} style={styles.inputIcon} />
                <TextInput
                  value={weight}
                  onChangeText={setWeight}
                  placeholder="e.g. 75"
                  placeholderTextColor={theme.textMuted}
                  keyboardType="number-pad"
                  style={[styles.input, { color: theme.text, fontFamily: "Nunito_400Regular" }]}
                />
              </Field>

              {/* Gender chips */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.label, { color: theme.textSecondary, fontFamily: "Nunito_600SemiBold" }]}>Gender</Text>
                <View style={styles.chipGrid}>
                  {GENDERS.map((g) => (
                    <Pressable
                      key={g}
                      onPress={() => { Haptics.selectionAsync(); setGender(gender === g ? null : g); }}
                      style={[styles.chip, { borderColor: gender === g ? theme.primary : theme.border, backgroundColor: gender === g ? theme.primary + "15" : "transparent" }]}
                    >
                      <Text style={[styles.chipText, { color: gender === g ? theme.primary : theme.textSecondary, fontFamily: "Nunito_600SemiBold" }]}>
                        {g}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Activity level chips */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.label, { color: theme.textSecondary, fontFamily: "Nunito_600SemiBold" }]}>Activity Level</Text>
                <View style={styles.chipGrid}>
                  {ACTIVITY_LEVELS.map((a) => (
                    <Pressable
                      key={a}
                      onPress={() => { Haptics.selectionAsync(); setActivityLevel(activityLevel === a ? null : a); }}
                      style={[styles.chip, { borderColor: activityLevel === a ? theme.primary : theme.border, backgroundColor: activityLevel === a ? theme.primary + "15" : "transparent" }]}
                    >
                      <Text style={[styles.chipText, { color: activityLevel === a ? theme.primary : theme.textSecondary, fontFamily: "Nunito_600SemiBold" }]}>
                        {a}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </>
          )}

          {/* Error */}
          {error && (
            <View style={[styles.errorBox, { backgroundColor: "#ff4444" + "18", borderColor: "#ff4444" + "40" }]}>
              <Ionicons name="alert-circle-outline" size={16} color="#ff4444" />
              <Text style={[styles.errorText, { fontFamily: "Nunito_600SemiBold" }]}>{error}</Text>
            </View>
          )}

          {/* Submit */}
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

// ── Shared sub-components ────────────────────────────────────────────────────

function Field({ label, theme, children }: { label: string; theme: any; children: React.ReactNode }) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={[styles.label, { color: theme.textSecondary, fontFamily: "Nunito_600SemiBold" }]}>{label}</Text>
      <View style={[styles.inputRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        {children}
      </View>
    </View>
  );
}

function SectionLabel({ label, theme, optional }: { label: string; theme: any; optional?: boolean }) {
  return (
    <View style={styles.sectionRow}>
      <View style={[styles.sectionLine, { backgroundColor: theme.border }]} />
      <Text style={[styles.sectionText, { color: optional ? theme.textMuted : theme.textSecondary, fontFamily: "Nunito_600SemiBold" }]}>
        {label}
      </Text>
      <View style={[styles.sectionLine, { backgroundColor: theme.border }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 24, flexGrow: 1, justifyContent: "center" },
  header: { alignItems: "center", marginBottom: 32, gap: 12 },
  iconCircle: { width: 88, height: 88, borderRadius: 44, alignItems: "center", justifyContent: "center" },
  appName: { fontSize: 32 },
  tagline: { fontSize: 15, textAlign: "center" },
  card: { borderRadius: 24, borderWidth: 1, padding: 24, gap: 16, marginBottom: 24 },
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
  sectionRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 4 },
  sectionLine: { flex: 1, height: 1 },
  sectionText: { fontSize: 11 },
  chipGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5 },
  chipText: { fontSize: 13 },
});
