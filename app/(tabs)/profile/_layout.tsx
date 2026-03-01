import { Stack } from 'expo-router';
import { useTheme } from 'react-native-paper';

export default function ProfileLayout() {
  const theme = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.background },
      }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="my-posts" />
      <Stack.Screen name="saved-posts" />
      <Stack.Screen name="contact-support" />
      <Stack.Screen name="BlockedUsers" />
    </Stack>
  );
}
