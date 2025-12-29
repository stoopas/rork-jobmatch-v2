import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StyleSheet, ActivityIndicator, View } from "react-native";

import { UserProfileProvider, useUserProfile } from "../contexts/UserProfileContext";
import { Brand } from "../constants/brand";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 60 * 5,
    },
  },
});

function RootLayoutNav() {
  const { isLoading } = useUserProfile();

  useEffect(() => {
    if (!isLoading) {
      SplashScreen.hideAsync();
    }
  }, [isLoading]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Brand.colors.accent} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerBackTitle: "Back" }}>
      <Stack.Screen
        name="index"
        options={{
          title: "JustApply",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="profile/edit"
        options={{
          title: "Edit Profile",
          headerLargeTitle: false,
        }}
      />
      <Stack.Screen
        name="job/analyze"
        options={{
          title: "Add Job",
          headerLargeTitle: false,
        }}
      />
      <Stack.Screen
        name="job/clarify"
        options={{
          title: "Quick Questions",
          headerLargeTitle: false,
        }}
      />
      <Stack.Screen
        name="job/fit-score"
        options={{
          title: "Fit Score",
          headerLargeTitle: false,
        }}
      />
      <Stack.Screen
        name="resume/options"
        options={{
          title: "Resume Format",
          headerLargeTitle: false,
        }}
      />
      <Stack.Screen
        name="resume/generate"
        options={{
          title: "Resume Ready",
          headerLargeTitle: false,
        }}
      />
      <Stack.Screen
        name="chat"
        options={{
          title: "Chat",
          headerShown: false,
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <UserProfileProvider>
        <GestureHandlerRootView style={styles.container}>
          <RootLayoutNav />
        </GestureHandlerRootView>
      </UserProfileProvider>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Brand.colors.bg,
  },
});
