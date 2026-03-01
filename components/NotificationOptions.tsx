import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import {
  Card,
  Switch,
  Text,
  Button,
  ActivityIndicator,
  useTheme,
  Divider,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../supabaseClient';
import { useAuthStore } from '../store/useAuthStore';

interface NotificationOptions {
  id: string;
  message_notifications: boolean;
}

export default function NotificationOptions() {
  const [settings, setSettings] = useState<NotificationOptions | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const user = useAuthStore((state) => state.user);
  const theme = useTheme();

  useEffect(() => {
    if (user) {
      loadSettings();
    }
  }, [user]);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading settings:', error);
        return;
      }

      if (data) {
        setSettings(data);
      } else {
        await createDefaultSettings();
      }
    } catch (error) {
      console.error('Error loading notification settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const createDefaultSettings = async () => {
    try {
      const { data, error } = await supabase.rpc('create_default_notification_settings');
      if (error) {
        console.error('Error creating default settings:', error);
        return;
      }
      await loadSettings();
    } catch (error) {
      console.error('Error creating default settings:', error);
    }
  };

  const updateSetting = async (field: keyof NotificationOptions, value: any) => {
    if (!settings || !user) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('notification_settings')
        .update({ [field]: value, updated_at: new Date().toISOString() })
        .eq('user_id', user.id);

      if (error) {
        console.error('Error updating setting:', error);
        return;
      }

      setSettings((prev) => (prev ? { ...prev, [field]: value } : null));
    } catch (error) {
      console.error('Error updating notification setting:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text
          variant="bodyMedium"
          style={[styles.loadingText, { color: theme.colors.onSurfaceVariant }]}>
          Loading notification options...
        </Text>
      </View>
    );
  }

  if (!settings) {
    return (
      <View style={styles.errorContainer}>
        <MaterialCommunityIcons
          name="alert-circle-outline"
          size={48}
          color={theme.colors.onSurfaceVariant}
        />
        <Text
          variant="bodyMedium"
          style={[styles.errorText, { color: theme.colors.onSurfaceVariant }]}>
          Failed to load notification options
        </Text>
        <Button onPress={loadSettings} mode="contained" style={styles.retryButton}>
          Try Again
        </Button>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Options Container */}
      <View style={[styles.settingsContainer, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.settingsContent}>
          <View style={styles.settingRow}>
            <View style={styles.settingLeftContent}>
              <MaterialCommunityIcons
                name="message-text-outline"
                size={20}
                color={theme.colors.primary}
              />
              <Text
                variant="bodyMedium"
                style={[styles.settingText, { color: theme.colors.onSurface }]}>
                Message Notifications
              </Text>
            </View>
            <Switch
              value={settings.message_notifications}
              onValueChange={(value) => updateSetting('message_notifications', value)}
              disabled={saving}
              trackColor={{ false: theme.colors.outline, true: theme.colors.primary }}
              thumbColor={theme.colors.surface}
            />
          </View>
          <Divider />
          <View style={styles.settingRow}>
            <View style={styles.settingLeftContent}>
              <MaterialCommunityIcons
                name="information-outline"
                size={20}
                color={theme.colors.onSurfaceVariant}
              />
              <Text
                variant="bodySmall"
                style={[styles.settingDescription, { color: theme.colors.onSurfaceVariant }]}>
                Receive notifications when someone sends you a message
              </Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    marginTop: 12,
    marginBottom: 20,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 8,
  },
  settingsContainer: {
    marginTop: 10,
    borderRadius: 8,
    marginHorizontal: 0,
  },
  settingsContent: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  settingLeftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    justifyContent: 'flex-start',
    flex: 1,
  },
  settingText: {
    marginLeft: 0,
  },
  settingDescription: {
    marginLeft: 0,
    flex: 1,
  },
});
