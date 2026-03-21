import { Alert, Platform } from 'react-native';

/**
 * Cross-platform confirmation. Alert.alert doesn't work on web - use window.confirm.
 */
export function confirmDelete(
  title: string,
  message: string,
  onConfirm: () => void | Promise<void>
): void {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.confirm) {
    const ok = window.confirm(`${title}\n\n${message}`);
    if (ok) {
      void Promise.resolve(onConfirm());
    }
  } else {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => void Promise.resolve(onConfirm()) },
    ]);
  }
}
