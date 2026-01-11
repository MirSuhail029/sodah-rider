import { Stack } from "expo-router";

export default function RootLayout() {
  const isAuthenticated = false;
  return (
    <Stack>
      <Stack.Protected guard={isAuthenticated}>
        <Stack.Screen
          name="(tabs)"
          options={{ title: "Home", headerShown: false }}
        />
      </Stack.Protected>
      <Stack.Protected guard={!isAuthenticated}>
        <Stack.Screen name="login" />
      </Stack.Protected>
    </Stack>
  );
}
