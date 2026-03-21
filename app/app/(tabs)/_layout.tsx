import { Link, Slot, Tabs, usePathname } from 'expo-router';
import { Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { useUser } from '../../src/contexts/UserContext';
import { theme } from '../../src/theme';

const baseNavItems = [
  { label: 'Home', href: '/(tabs)/home' },
  { label: 'Transactions', href: '/(tabs)/transactions' },
  { label: 'Add', href: '/(tabs)/add' },
  { label: 'Insights', href: '/(tabs)/insights' },
  { label: 'Budgets', href: '/(tabs)/budgets' },
  { label: 'Profile', href: '/(tabs)/profile' },
];

export default function TabsLayout() {
  const { width } = useWindowDimensions();
  const pathname = usePathname();
  const { user } = useUser();
  const isWebWide = Platform.OS === 'web' && width >= 768;

  const navItems =
    user?.role === 'ADMIN'
      ? [...baseNavItems, { label: 'Admin', href: '/(tabs)/admin' as const }]
      : baseNavItems;

  const adminTabHref = user?.role === 'ADMIN' ? '/(tabs)/admin' : null;

  if (isWebWide) {
    return (
      <View style={styles.webRoot}>
        <View style={styles.sidebar}>
          <View style={styles.sidebarBrand}>
            <Text style={styles.sidebarLogo}>◆</Text>
            <Text style={styles.sidebarTitle}>SmartWallet</Text>
          </View>
          {navItems.map((item) => {
            const slug = item.label.toLowerCase();
            const isActive = pathname?.toLowerCase().includes(slug);
            return (
              <Link key={item.href} href={item.href} asChild>
                <Pressable style={[styles.sidebarLink, isActive && styles.sidebarLinkActive]}>
                  <Text style={[styles.sidebarLinkText, isActive && styles.sidebarLinkTextActive]}>
                    {item.label}
                  </Text>
                </Pressable>
              </Link>
            );
          })}
        </View>
        <View style={styles.webContent}>
          <Slot />
        </View>
      </View>
    );
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: theme.colors.bg },
        headerTintColor: theme.colors.text,
        tabBarStyle: { backgroundColor: theme.colors.bgElevated, borderTopColor: theme.colors.border },
        tabBarActiveTintColor: theme.colors.accent,
        tabBarInactiveTintColor: theme.colors.textMuted,
      }}
    >
      <Tabs.Screen name="home" options={{ title: 'Home' }} />
      <Tabs.Screen name="transactions" options={{ title: 'Transactions' }} />
      <Tabs.Screen name="add" options={{ title: 'Add' }} />
      <Tabs.Screen name="insights" options={{ title: 'Insights' }} />
      <Tabs.Screen name="budgets" options={{ title: 'Budgets' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
      <Tabs.Screen
        name="admin"
        options={{
          title: 'Admin',
          href: adminTabHref,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  webRoot: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: theme.colors.bg,
  },
  sidebar: {
    width: 240,
    padding: 24,
    gap: 4,
    borderRightWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.bgElevated,
  },
  sidebarBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderColor: theme.colors.border,
  },
  sidebarLogo: {
    color: theme.colors.accent,
    fontSize: 20,
  },
  sidebarTitle: {
    color: theme.colors.text,
    fontWeight: '700',
    fontSize: 18,
    letterSpacing: -0.3,
  },
  sidebarLink: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: theme.radii.md,
  },
  sidebarLinkActive: {
    backgroundColor: theme.colors.accentMuted,
  },
  sidebarLinkText: {
    color: theme.colors.textMuted,
    fontWeight: '500',
  },
  sidebarLinkTextActive: {
    color: theme.colors.accent,
    fontWeight: '600',
  },
  webContent: {
    flex: 1,
  },
});
