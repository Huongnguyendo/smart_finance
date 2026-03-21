import { ReactNode } from 'react';
import { Platform, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { theme } from '../theme';

type Props = {
  children: ReactNode;
  style?: object;
  /** When false, uses View instead of ScrollView (e.g. for Chat which scrolls internally). Default true. */
  scrollable?: boolean;
};

export function ScreenContainer({ children, style, scrollable = true }: Props) {
  const { width } = useWindowDimensions();
  const isWebWide = Platform.OS === 'web' && width >= 768;
  const rootStyle = style ? StyleSheet.flatten([styles.root, style]) : styles.root;
  const innerStyle = StyleSheet.flatten([styles.inner, isWebWide && styles.innerWide]);

  if (!scrollable) {
    return (
      <View style={rootStyle}>
        <View style={innerStyle}>{children}</View>
      </View>
    );
  }

  return (
    <ScrollView
      style={rootStyle}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={true}
    >
      <View style={innerStyle}>{children}</View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  scrollContent: {
    flexGrow: 1,
  },
  inner: {
    padding: 20,
    gap: 20,
  },
  innerWide: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 1100,
  },
});
