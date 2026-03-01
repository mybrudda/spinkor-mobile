import { View, KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import React, { useState, useEffect } from 'react';
import { TextInput, Button, Text, useTheme, HelperText, Divider } from 'react-native-paper';
import { router, Redirect } from 'expo-router';
import SafeScreen from '../../components/layout/SafeScreen';
import { useAuthStore } from '../../store/useAuthStore';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const theme = useTheme();
  const { signIn, loading, session } = useAuthStore();

  // Redirect if already logged in
  if (session) {
    return <Redirect href="/home" />;
  }

  const handleLogin = async () => {
    try {
      setError('');
      await signIn(email, password);
      router.replace('/home');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during login');
    }
  };

  const handleSkip = () => {
    router.replace('/home');
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <View style={{ padding: 20, flex: 1, justifyContent: 'center' }}>
            <Text variant="headlineMedium" style={{ marginBottom: 24, textAlign: 'center' }}>
              Welcome to Spinkor
            </Text>
            <Text
              variant="bodyMedium"
              style={{
                marginBottom: 32,
                textAlign: 'center',
                color: theme.colors.onSurfaceVariant,
              }}>
              Sign in to access all features or continue as a guest
            </Text>

            {error ? (
              <HelperText type="error" visible={!!error}>
                {error}
              </HelperText>
            ) : null}

            <TextInput
              mode="outlined"
              label="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              style={{ marginBottom: 16 }}
              disabled={loading}
            />

            <TextInput
              mode="outlined"
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              right={
                <TextInput.Icon
                  icon={showPassword ? 'eye-off' : 'eye'}
                  onPress={() => setShowPassword(!showPassword)}
                />
              }
              style={{ marginBottom: 24 }}
              disabled={loading}
            />

            <Button
              mode="contained"
              onPress={handleLogin}
              style={{ marginBottom: 16 }}
              loading={loading}
              disabled={loading}>
              Login
            </Button>

            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: 16,
              }}>
              <Text variant="bodyMedium">Don't have an account? </Text>
              <Button
                mode="text"
                compact
                onPress={() => router.replace('/(auth)/register')}
                disabled={loading}>
                Register
              </Button>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 24 }}>
              <Button
                mode="text"
                compact
                onPress={() => router.replace('/(auth)/forgotPassword')}
                disabled={loading}>
                Forgot Password?
              </Button>
            </View>

            <Divider style={{ marginBottom: 24 }} />

            <Button
              mode="outlined"
              onPress={handleSkip}
              disabled={loading}
              style={{ marginBottom: 8 }}>
              Continue as Guest
            </Button>
            <Text
              variant="bodySmall"
              style={{ textAlign: 'center', color: theme.colors.onSurfaceVariant }}>
              Some features will be limited without an account
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 16,
  },
});
