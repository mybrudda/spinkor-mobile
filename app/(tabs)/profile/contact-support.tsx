import React from 'react';
import { View, StyleSheet, Linking } from 'react-native';
import { Text, useTheme, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Header from '../../../components/layout/Header';

export default function ContactSupportScreen() {
  const theme = useTheme();

  const handleEmailSupport = () => {
    Linking.openURL('mailto:support@market.com');
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Header title="Contact Support" />
      <View style={styles.content}>
        <MaterialCommunityIcons name="headset" size={64} color={theme.colors.onSurfaceVariant} />
        <Text variant="headlineSmall" style={[styles.title, { color: theme.colors.onSurface }]}>
          Contact Support
        </Text>
        <Text
          variant="bodyLarge"
          style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
          Need help? Our support team is here for you.
        </Text>
        <Button mode="contained" onPress={handleEmailSupport} style={styles.button} icon="email">
          Email Support
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  title: {
    marginTop: 16,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 8,
    textAlign: 'center',
    marginBottom: 24,
  },
  button: {
    marginTop: 16,
  },
});
