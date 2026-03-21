import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useUser } from '../../src/contexts/UserContext';
import { apiAuthJson } from '../../src/lib/api';
import { removeItem } from '../../src/lib/storage';
import { ScreenContainer } from '../../src/components/ScreenContainer';
import { SectionCard } from '../../src/components/SectionCard';
import { theme } from '../../src/theme';

const APP_VERSION = '1.0.0';

type Transaction = {
  id: number;
  amount: number;
  description: string | null;
  category: string | null;
  date: string;
};

type PagedTransactions = {
  content: Transaction[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

function escapeCsvCell(value: string | null | undefined): string {
  const s = value ?? '';
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function transactionsToCsv(rows: Transaction[]): string {
  const header = 'Date,Amount,Description,Category';
  const lines = rows.map((tx) =>
    [
      escapeCsvCell(tx.date),
      escapeCsvCell(String(tx.amount)),
      escapeCsvCell(tx.description),
      escapeCsvCell(tx.category),
    ].join(','),
  );
  return [header, ...lines].join('\n');
}

async function fetchAllTransactions(): Promise<Transaction[]> {
  const all: Transaction[] = [];
  let page = 0;
  let totalPages = 1;
  while (page < totalPages) {
    const data = await apiAuthJson<PagedTransactions>(
      `/api/transactions?page=${page}&size=100&sort=dateDesc`,
    );
    all.push(...data.content);
    totalPages = Math.max(1, data.totalPages);
    page += 1;
    if (data.content.length === 0) break;
  }
  return all;
}

function alertCrossPlatform(title: string, message?: string) {
  const body = message ? `${title}\n\n${message}` : title;
  if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.alert === 'function') {
    window.alert(body);
    return;
  }
  Alert.alert(title, message);
}

export default function Profile() {
  const router = useRouter();
  const { user, setUser } = useUser();
  const [aboutOpen, setAboutOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const runDataExport = useCallback(async () => {
    setExporting(true);
    try {
      const rows = await fetchAllTransactions();
      const csv = transactionsToCsv(rows);
      const filename = `smartwallet-transactions-${new Date().toISOString().slice(0, 10)}.csv`;

      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        alertCrossPlatform('Export', `Saved ${rows.length} transaction(s) to ${filename}.`);
      } else {
        const result = await Share.share({
          title: 'SmartWallet export',
          message: rows.length > 80 ? `${filename}\n(${rows.length} rows — open on web for full CSV file.)` : csv,
        });
        if (result.action === Share.sharedAction) {
          alertCrossPlatform('Export', `Shared ${rows.length} transaction(s).`);
        }
      }
    } catch (e) {
      alertCrossPlatform('Export failed', (e as Error).message || 'Could not export transactions.');
    } finally {
      setExporting(false);
    }
  }, []);

  async function logout() {
    await removeItem('smartwallet_token');
    setUser(null);
    router.replace('/auth');
  }

  return (
    <ScreenContainer>
      <SectionCard style={styles.header}>
        <View style={styles.avatar} />
        <View>
          <Text style={styles.name}>{user?.displayName || user?.email || 'User'}</Text>
          <Text style={styles.email}>{user?.email || '—'}</Text>
        </View>
      </SectionCard>

      <SectionCard>
        <MenuRow label="Data Export" onPress={runDataExport} disabled={exporting} />
        <MenuRow label="Theme" onPress={() => setThemeOpen(true)} />
        <MenuRow label="About" onPress={() => setAboutOpen(true)} isLast />
      </SectionCard>

      {exporting && (
        <View style={styles.exportBanner}>
          <ActivityIndicator color={theme.colors.accent} />
          <Text style={styles.exportBannerText}>Preparing export…</Text>
        </View>
      )}

      <Pressable style={styles.logoutButton} onPress={logout}>
        <Text style={styles.logoutText}>Log out</Text>
      </Pressable>

      <Modal visible={themeOpen} transparent animationType="fade" onRequestClose={() => setThemeOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setThemeOpen(false)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Theme</Text>
            <Text style={styles.modalBody}>
              SmartWallet uses one tuned dark theme for readability and charts. Light mode and custom themes may be
              added in a future update.
            </Text>
            <Pressable style={styles.modalClose} onPress={() => setThemeOpen(false)}>
              <Text style={styles.modalCloseText}>OK</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={aboutOpen} transparent animationType="fade" onRequestClose={() => setAboutOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setAboutOpen(false)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>SmartWallet AI</Text>
            <Text style={styles.modalVersion}>Version {APP_VERSION}</Text>
            <Text style={styles.modalBody}>
              Personal finance with transactions, budgets, receipts, and AI insights. Data is tied to your account on
              the server you configure (e.g. local or hosted API).
            </Text>
            <Pressable style={styles.modalClose} onPress={() => setAboutOpen(false)}>
              <Text style={styles.modalCloseText}>Close</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </ScreenContainer>
  );
}

function MenuRow({
  label,
  onPress,
  disabled,
  isLast,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  isLast?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[styles.menuRow, !isLast && styles.menuRowBorder]}
      android_ripple={{ color: 'rgba(255,255,255,0.08)' }}
    >
      <Text style={[styles.menuLabel, disabled && styles.menuLabelDisabled]}>{label}</Text>
      <Text style={styles.menuChevron}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#1f2937',
  },
  name: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '600',
  },
  email: {
    color: '#94a3b8',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  menuRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  menuLabel: {
    color: theme.colors.text,
    fontSize: 16,
  },
  menuLabelDisabled: {
    opacity: 0.5,
  },
  menuChevron: {
    color: theme.colors.textMuted,
    fontSize: 20,
    fontWeight: '300',
  },
  exportBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 12,
  },
  exportBannerText: {
    color: theme.colors.textMuted,
    fontSize: 14,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: theme.colors.bgElevated,
    borderRadius: theme.radii.lg,
    padding: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  modalTitle: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  modalVersion: {
    color: theme.colors.accent,
    fontSize: 14,
    marginBottom: 12,
  },
  modalBody: {
    color: theme.colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 8,
  },
  modalClose: {
    marginTop: 8,
    alignSelf: 'flex-end',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  modalCloseText: {
    color: theme.colors.accent,
    fontWeight: '600',
    fontSize: 16,
  },
});
