import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { setBaseUrl } from "@workspace/api-client-react";
import { Redirect, Stack, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider, useAuth } from "@/context/auth";

setBaseUrl(`https://${process.env.EXPO_PUBLIC_DOMAIN}`);

if (Platform.OS !== "web") {
  SplashScreen.preventAutoHideAsync();
}

const queryClient = new QueryClient();

function AuthGuard() {
  const { token, isLoading } = useAuth();
  const segments = useSegments();

  if (isLoading) return null;

  const inLogin = segments[0] === "login";

  if (!token && !inLogin) {
    return <Redirect href="/login" />;
  }
  if (token && inLogin) {
    return <Redirect href="/(tabs)" />;
  }
  return null;
}

function RootLayoutNav() {
  return (
    <>
      <AuthGuard />
      <Stack screenOptions={{ headerBackTitle: "Back" }}>
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="customers/[id]"
          options={{ title: "Customer", headerBackTitle: "Back" }}
        />
        <Stack.Screen
          name="customers/new"
          options={{ title: "New Customer", headerBackTitle: "Back" }}
        />
        <Stack.Screen
          name="estimates/[id]"
          options={{ title: "Estimate", headerBackTitle: "Back" }}
        />
        <Stack.Screen
          name="estimates/new"
          options={{ title: "New Estimate", headerBackTitle: "Back" }}
        />
        <Stack.Screen
          name="jobs/[id]"
          options={{ title: "Job", headerBackTitle: "Back" }}
        />
        <Stack.Screen
          name="jobs/new"
          options={{ title: "New Job", headerBackTitle: "Back" }}
        />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError && Platform.OS !== "web") return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <GestureHandlerRootView style={{ flex: 1 }}>
              <KeyboardProvider>
                <RootLayoutNav />
              </KeyboardProvider>
            </GestureHandlerRootView>
          </AuthProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
