import { StyleSheet, View } from 'react-native';
import React, { ReactNode } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from 'react-native-paper';

interface SafeScreenProps {
  children: ReactNode;
  style?: object;
}

export default function SafeScreen({ children, style }: SafeScreenProps) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top,
        },
        style,
      ]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
