import { View, StyleSheet } from 'react-native';
import { Text, Button, useTheme } from 'react-native-paper';
import { router } from 'expo-router';
import { useAuthStore } from '../../store/useAuthStore';

interface RequireAuthProps {
  children: React.ReactNode;
  message?: string;
}

export default function RequireAuth({
  children,
  message = 'You need to be logged in to access this feature.',
}: RequireAuthProps) {
  const { user } = useAuthStore();
  const theme = useTheme();

  if (!user) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Text variant="headlineMedium" style={{ textAlign: 'center', marginBottom: 16 }}>
          Please Login
        </Text>
        <Text variant="bodyLarge" style={{ textAlign: 'center', marginBottom: 24 }}>
          {message}
        </Text>
        <Button mode="contained" onPress={() => router.push('/(auth)/login')}>
          Go to Login
        </Button>
      </View>
    );
  }

  return children;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 16,
  },
});
