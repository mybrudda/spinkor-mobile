import React from 'react';
import { Link, Stack } from 'expo-router';
import { View } from 'react-native';
import { Button, Text, Surface, useTheme } from 'react-native-paper';

export default function NotFound() {
  const theme = useTheme();

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Oops!',
          headerStyle: {
            backgroundColor: theme.colors.surface,
          },
          headerTintColor: theme.colors.onSurface,
        }}
      />
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <Surface
          style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}
          elevation={0}>
          <Text
            variant="headlineMedium"
            style={{ marginBottom: 16, color: theme.colors.onSurface }}>
            This screen doesn't exist.
          </Text>
          <Link href="/(tabs)/home" asChild>
            <Button mode="contained">Go back home</Button>
          </Link>
        </Surface>
      </View>
    </>
  );
}
