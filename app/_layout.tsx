import useAuthStore from "@/store/auth.store";
import { Stack } from "expo-router";

export default function RootLayout() {
  const { isLoggedIn } = useAuthStore();

  return (
    <Stack>
      <Stack.Protected guard={isLoggedIn}>
        <Stack.Screen
          name="(tabs)"
          options={{ title: "Home", headerShown: false }}
        />
      </Stack.Protected>
      <Stack.Protected guard={!isLoggedIn}>
        <Stack.Screen name="login" />
      </Stack.Protected>
    </Stack>
  );
}
