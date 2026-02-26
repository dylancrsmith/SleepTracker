import { QueryClientProvider } from "@tanstack/react-query";
import { Stack, router } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { queryClient } from "@/lib/query-client";
import { SleepProvider } from "@/lib/sleep-context";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { useFonts, Nunito_400Regular, Nunito_600SemiBold, Nunito_700Bold, Nunito_800ExtraBold } from "@expo-google-fonts/nunito";

SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const { user, isLoading } = useAuth();

  useEffect(() => {
    // Wait until auth state is loaded before redirecting
    if (isLoading) return;

    if (!user) {
      // Not logged in — send to login screen
      router.replace("/login");
    } else {
      // Logged in — send to main app
      router.replace("/(tabs)");
    }
  }, [user, isLoading]);

  return (
      <Stack screenOptions={{ headerBackTitle: "Back" }}>
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="sleep-aid" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="check-in" options={{ headerShown: false, presentation: "modal" }} />
        <Stack.Screen
          name="healthkit-sync"
          options={{
            headerShown: false,
          }}
        />
      </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <KeyboardProvider>
            <AuthProvider>
              <SleepProvider>
                <RootLayoutNav />
              </SleepProvider>
            </AuthProvider>
          </KeyboardProvider>
        </GestureHandlerRootView>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
