import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from 'react-native-paper';
import Header from '../../../components/layout/Header';
import NotificationOptions from '../../../components/NotificationOptions';
import RequireAuth from '../../../components/auth/RequireAuth';

export default function NotificationOptionsScreen() {
  const theme = useTheme();

  return (
    <RequireAuth message="You need to be logged in to view notification options.">
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Header title="Notification Options" />
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          <NotificationOptions />
        </ScrollView>
      </View>
    </RequireAuth>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
});
