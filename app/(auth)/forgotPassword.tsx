import React, { useRef, useState } from 'react';
import { View, KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { TextInput, Button, Text, useTheme, HelperText } from 'react-native-paper';
import { router } from 'expo-router';
import Recaptcha from 'react-native-recaptcha-that-works';
import { useAuthStore } from '../../store/useAuthStore';

export default function ForgotPassword() {
  const theme = useTheme();
  const { resetPassword, loading } = useAuthStore();

  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const recaptchaRef = useRef<any>(null);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleResetPassword = () => {
    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }

    if (!validateEmail(email.trim())) {
      setError('Please enter a valid email address');
      return;
    }

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
      await resetPassword(email.trim(), recaptchaToken);
      setSuccess(true);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred while sending reset email');
    }
  };

  const handleBackToLogin = () => {
    router.replace('/(auth)/login');
  };

  if (success) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.successContainer}>
          <Text
            variant="headlineMedium"
            style={[styles.successTitle, { color: theme.colors.primary }]}>
            Check Your Email
          </Text>
          <Text variant="bodyLarge" style={[styles.emailText, { color: theme.colors.primary }]}>
            {email}
          </Text>
          <Text
            variant="bodyMedium"
            style={[styles.successInstructions, { color: theme.colors.onSurfaceVariant }]}>
            Check your email and click the link to reset your password. The link will expire in 24
            hours.
          </Text>

          <Button mode="contained" onPress={handleBackToLogin} style={styles.backButton}>
            Back to Login
          </Button>

          <Button
            mode="text"
            onPress={() => {
              setSuccess(false);
              setEmail('');
            }}
            style={styles.resendButton}>
            Send to Different Email
          </Button>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <View style={styles.content}>
            <Text variant="headlineMedium" style={styles.title}>
              Forgot Password?
            </Text>

            <Text
              variant="bodyLarge"
              style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
              No worries! Enter your email address and we'll send you a link to reset your password.
            </Text>

            {error ? (
              <HelperText type="error" visible={!!error}>
                {error}
              </HelperText>
            ) : null}

            <TextInput
              mode="outlined"
              label="Email Address"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              style={styles.input}
              disabled={loading}
              error={!!error}
            />

            <Button
              mode="contained"
              onPress={handleResetPassword}
              style={styles.submitButton}
              loading={loading}
              disabled={loading || !email.trim()}>
              Send Reset Link
            </Button>

            <Button
              mode="text"
              onPress={handleBackToLogin}
              style={styles.backToLoginButton}
              disabled={loading}>
              Back to Login
            </Button>
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
  container: { flex: 1 },
  content: {
    padding: 20,
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    marginBottom: 16,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  subtitle: {
    marginBottom: 32,
    textAlign: 'center',
    lineHeight: 22,
  },
  input: {
    marginBottom: 24,
  },
  submitButton: {
    marginBottom: 16,
  },
  backToLoginButton: {
    marginTop: 8,
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
  successMessage: {
    marginBottom: 8,
    textAlign: 'center',
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
