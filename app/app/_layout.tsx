import { Stack } from 'expo-router';

import { UserProvider } from '../src/contexts/UserContext';

export const unstable_settings = {
  initialRouteName: 'splash',
};

export default function RootLayout() {
  return (
    <UserProvider>
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="splash" />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="auth" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="transaction/[id]" options={{ headerShown: true, title: 'Transaction' }} />
      <Stack.Screen name="receipt-upload" options={{ headerShown: true, title: 'Add Receipt' }} />
      <Stack.Screen name="chat" options={{ headerShown: true, title: 'SmartWallet AI' }} />
      <Stack.Screen name="goals" options={{ headerShown: true, title: 'Goals & Gamification' }} />
    </Stack>
    </UserProvider>
  );
}
