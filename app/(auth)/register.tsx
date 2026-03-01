import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import React, { useState, useRef } from 'react';
import { TextInput, Button, Text, useTheme, HelperText } from 'react-native-paper';
import { router, Redirect } from 'expo-router';
import { useAuthStore } from '../../store/useAuthStore';
import Recaptcha from 'react-native-recaptcha-that-works';

export default function Register() {
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const theme = useTheme();
  const { signUp, loading, session } = useAuthStore();
  const recaptchaRef = useRef<any>(null);

  // Redirect if already logged in
  if (session) {
    return <Redirect href="/home" />;
  }

  if (success) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.successContainer}>
          <Text
            variant="headlineMedium"
            style={[styles.successTitle, { color: theme.colors.primary }]}>
            Verify Your Email!
          </Text>
          <Text variant="bodyLarge" style={[styles.emailText, { color: theme.colors.primary }]}>
            {email}
          </Text>
          <Text
            variant="bodyMedium"
            style={[styles.successInstructions, { color: theme.colors.onSurfaceVariant }]}>
            Please check your email and click the verification link to activate your account. The
            link will expire in 24 hours.
          </Text>

          <Button
            mode="contained"
            onPress={() => router.replace('/(auth)/login')}
            style={styles.backButton}>
            Go to Login
          </Button>

          <Button
            mode="text"
            onPress={() => {
              setSuccess(false);
              setUsername('');
              setDisplayName('');
              setEmail('');
              setPassword('');
            }}
            style={styles.resendButton}>
            Create Another Account
          </Button>
        </View>
      </View>
    );
  }

  const validateForm = () => {
    if (!username || !email || !password || !displayName) {
      setError('Please fill in all fields');
      return false;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return false;
    }
    if (username.length < 3) {
      setError('Username must be at least 3 characters');
      return false;
    }
    // Username should only contain letters, numbers, and underscores
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setError('Username can only contain letters, numbers, and underscores');
      return false;
    }
    return true;
  };

  const handleRegister = () => {
    if (!validateForm()) return;

    if (!process.env.EXPO_PUBLIC_RECAPTCHA_SITE_KEY) {
      setError('reCAPTCHA is not configured. Please contact support.');
      return;
    }

    setError('');
    recaptchaRef.current?.open();
  };

  const onCaptchaVerify = async (recaptchaToken: string) => {
    try {
      setError('');

      const result = await signUp(email, password, username, recaptchaToken, displayName);

      if (result.success) {
        setSuccess(true);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred during registration');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <View style={{ padding: 20, flex: 1, justifyContent: 'center' }}>
            <Text variant="headlineMedium" style={{ marginBottom: 24, textAlign: 'center' }}>
              Create Account
            </Text>

            {error ? (
              <HelperText type="error" visible={!!error}>
                {error}
              </HelperText>
            ) : null}

            <TextInput
              mode="outlined"
              label="Username"
              value={username}
              onChangeText={(text) => setUsername(text.trim())}
              autoCapitalize="none"
              style={{ marginBottom: 16 }}
              disabled={loading}
            />

            <TextInput
              mode="outlined"
              label="Display Name (Optional)"
              value={displayName}
              onChangeText={setDisplayName}
              style={{ marginBottom: 16 }}
              disabled={loading}
            />

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
              onPress={handleRegister}
              style={{ marginBottom: 16 }}
              loading={loading}
              disabled={loading}>
              Register
            </Button>

            <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}>
              <Text variant="bodyMedium">Already have an account? </Text>
              <Button
                mode="text"
                compact
                onPress={() => router.replace('/(auth)/login')}
                disabled={loading}>
                Login
              </Button>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Recaptcha
        ref={recaptchaRef}
        siteKey={process.env.EXPO_PUBLIC_RECAPTCHA_SITE_KEY!}
        baseUrl="https://spinkor.com"
        size="normal"
        theme="light"
        onVerify={onCaptchaVerify}
        onExpire={() => setError('Captcha expired. Try again.')}
        onError={() => setError('Captcha error. Try again.')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 16,
  },
  successContainer: {
    padding: 20,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successTitle: {
    marginBottom: 16,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  emailText: {
    marginBottom: 16,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  successInstructions: {
    marginBottom: 32,
    textAlign: 'center',
    lineHeight: 22,
  },
  backButton: {
    marginBottom: 16,
    minWidth: 200,
  },
  resendButton: {
    marginTop: 8,
  },
});
