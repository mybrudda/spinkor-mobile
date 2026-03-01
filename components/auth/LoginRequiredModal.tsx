import React from 'react';
import { useTheme, Dialog, Text, Button } from 'react-native-paper';
import { router } from 'expo-router';

interface LoginRequiredModalProps {
  visible: boolean;
  onDismiss: () => void;
  action: 'message' | 'save' | 'report' | 'custom';
  customTitle?: string;
  customMessage?: string;
}

export default function LoginRequiredModal({
  visible,
  onDismiss,
  action,
  customTitle,
  customMessage,
}: LoginRequiredModalProps) {
  const theme = useTheme();

  const getTitle = () => {
    if (customTitle) return customTitle;

    switch (action) {
      case 'message':
        return 'Login Required';
      case 'save':
        return 'Login Required';
      case 'report':
        return 'Login Required';
      default:
        return 'Login Required';
    }
  };

  const getMessage = () => {
    if (customMessage) return customMessage;

    switch (action) {
      case 'message':
        return 'You need to be logged in to message sellers.';
      case 'save':
        return 'You need to be logged in to save posts.';
      case 'report':
        return 'You need to be logged in to report posts.';
      default:
        return 'You need to be logged in to perform this action.';
    }
  };

  const handleLogin = () => {
    onDismiss();
    router.push('/(auth)/login');
  };

  return (
    <Dialog
      visible={visible}
      onDismiss={onDismiss}
      style={{ backgroundColor: theme.colors.surface }}>
      <Dialog.Title style={{ color: theme.colors.onSurface }}>{getTitle()}</Dialog.Title>
      <Dialog.Content>
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>
          {getMessage()}
        </Text>
      </Dialog.Content>
      <Dialog.Actions>
        <Button onPress={onDismiss}>Cancel</Button>
        <Button onPress={handleLogin}>Login</Button>
      </Dialog.Actions>
    </Dialog>
  );
}
