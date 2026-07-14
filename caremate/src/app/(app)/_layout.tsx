import { Stack } from 'expo-router';

export default function AppLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        headerBackButtonDisplayMode: 'minimal',
      }}
    >
      <Stack.Screen name="(tabs)" options={{ title: 'Apps' }} />
      <Stack.Screen name="search" options={{ headerShown: false, title: 'Search' }} />
      <Stack.Screen
        name="emergency/index"
        options={{ presentation: 'card', headerShown: true, title: 'Emergency Profile' }}
      />
      <Stack.Screen
        name="emergency/edit"
        options={{ presentation: 'modal', headerShown: true, title: 'Edit Emergency Profile' }}
      />
      <Stack.Screen
        name="emergency/qr"
        options={{ presentation: 'modal', headerShown: true, title: 'Emergency QR' }}
      />
      <Stack.Screen name="articles/[id]" options={{ headerShown: true, title: 'Article' }} />
      <Stack.Screen
        name="articles/category/[slug]"
        options={{ headerShown: true, title: 'Category' }}
      />
      <Stack.Screen name="articles/bookmarks" options={{ headerShown: true, title: 'Bookmarks' }} />
      <Stack.Screen name="providers/[id]" options={{ headerShown: true, title: 'Provider' }} />
      <Stack.Screen name="providers/map" options={{ headerShown: true, title: 'Map' }} />
      <Stack.Screen name="profile/settings" options={{ headerShown: true, title: 'Settings' }} />
      <Stack.Screen name="family/index" options={{ headerShown: true, title: 'Family' }} />
      <Stack.Screen name="family/setup" options={{ headerShown: true, title: 'Family setup' }} />
      <Stack.Screen name="family/kids-count" options={{ headerShown: true, title: 'Kids' }} />
      <Stack.Screen
        name="family/child/[index]"
        options={{ headerShown: true, title: 'Child profile' }}
      />
      <Stack.Screen name="family/review" options={{ headerShown: true, title: 'Review family' }} />
      <Stack.Screen
        name="family/requests"
        options={{ headerShown: true, title: 'Connection requests' }}
      />
      <Stack.Screen
        name="apps/period-tracker/index"
        options={{ headerShown: true, title: 'Period Tracker', headerBackTitle: 'Apps' }}
      />
      <Stack.Screen
        name="apps/period-tracker/log"
        options={{
          presentation: 'modal',
          headerShown: true,
          title: 'Log Period',
          headerBackTitle: 'Period Tracker',
        }}
      />
      <Stack.Screen
        name="apps/pregnancy-tracker/index"
        options={{ headerShown: true, title: 'Pregnancy Tracker', headerBackTitle: 'Apps' }}
      />
      <Stack.Screen
        name="apps/pregnancy-tracker/setup"
        options={{
          presentation: 'modal',
          headerShown: true,
          title: 'Set Up Pregnancy',
          headerBackTitle: 'Pregnancy Tracker',
        }}
      />
      <Stack.Screen
        name="apps/pregnancy-tracker/log"
        options={{
          presentation: 'modal',
          headerShown: true,
          title: 'Daily Log',
          headerBackTitle: 'Pregnancy Tracker',
        }}
      />
      <Stack.Screen
        name="apps/immunization-tracker/index"
        options={{ headerShown: true, title: 'Immunization Tracker', headerBackTitle: 'Apps' }}
      />
      <Stack.Screen
        name="apps/immunization-tracker/setup"
        options={{
          presentation: 'modal',
          headerShown: true,
          title: 'Family children',
          headerBackTitle: 'Immunization Tracker',
        }}
      />
      <Stack.Screen
        name="apps/immunization-tracker/log"
        options={{
          presentation: 'modal',
          headerShown: true,
          title: 'Log Vaccine',
          headerBackTitle: 'Immunization Tracker',
        }}
      />
      <Stack.Screen
        name="apps/medication-tracker/index"
        options={{ headerShown: true, title: 'Medication Tracker', headerBackTitle: 'Apps' }}
      />
      <Stack.Screen
        name="apps/medication-tracker/setup"
        options={{
          presentation: 'modal',
          headerShown: true,
          title: 'Add Medicine',
          headerBackTitle: 'Medication Tracker',
        }}
      />
      <Stack.Screen
        name="apps/medication-tracker/log"
        options={{
          presentation: 'modal',
          headerShown: true,
          title: 'Log Dose',
          headerBackTitle: 'Medication Tracker',
        }}
      />
      <Stack.Screen
        name="apps/checkup-planner/index"
        options={{ headerShown: true, title: 'Checkup Planner', headerBackTitle: 'Apps' }}
      />
      <Stack.Screen
        name="apps/checkup-planner/setup"
        options={{
          presentation: 'modal',
          headerShown: true,
          title: 'Set Up Planner',
          headerBackTitle: 'Checkup Planner',
        }}
      />
      <Stack.Screen
        name="apps/checkup-planner/log"
        options={{
          presentation: 'modal',
          headerShown: true,
          title: 'Log Checkup',
          headerBackTitle: 'Checkup Planner',
        }}
      />
    </Stack>
  );
}
