/**
 * Legacy demo screen — the app uses `app/(tabs)/profile.tsx` (Expo Router).
 * Kept for reference; do not use for new features.
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';

export function ProfileScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.note}>Use Profile tab — this screen is not wired in the router.</Text>
      <Pressable style={styles.logoutButton}>
        <Text style={styles.logoutText}>Log out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
  },
  note: {
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 24,
  },
  logoutButton: {
    borderWidth: 1,
    borderColor: '#ef4444',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  logoutText: {
    color: '#ef4444',
    fontWeight: '600',
  },
});
