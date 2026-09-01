import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="emergency-basics" />
      <Stack.Screen name="country" />
      <Stack.Screen name="location" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="next" />
    </Stack>
  );
}
