import React, { useEffect } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { Redirect } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { initialize, initialized, session } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (!initialized) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return <>{children}</>;
}
