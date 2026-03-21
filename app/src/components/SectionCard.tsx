import { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { theme } from '../theme';

type Props = {
  children: ReactNode;
  style?: object | object[];
};

export function SectionCard({ children, style }: Props) {
  const flattened = style ? StyleSheet.flatten([styles.card, style]) : styles.card;
  return <View style={flattened}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.bgCard,
    padding: 20,
    borderRadius: theme.radii.lg,
    gap: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.card,
  },
});
