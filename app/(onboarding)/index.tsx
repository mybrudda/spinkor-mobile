import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Dimensions, TouchableOpacity } from 'react-native';
import { Text, Button, useTheme, Card } from 'react-native-paper';
import { router } from 'expo-router';
import { useCountryStore, setOnboardingCompleted } from '../../store/useCountryStore';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Country } from '../../constants/CountryData';

const { width } = Dimensions.get('window');

interface OnboardingStep {
  title: string;
  description: string;
  icon: string;
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    title: 'Welcome to Spinkor',
    description:
      'Your marketplace for buying and selling items in your community. Find great deals or list your items for sale.',
    icon: 'store',
  },
  {
    title: 'Browse Categories',
    description:
      'Explore thousands of items across various categories including vehicles, electronics, home & furniture, and more.',
    icon: 'view-grid',
  },
  {
    title: 'Connect with Sellers',
    description:
      'Message sellers directly through our built-in chat system. Negotiate prices and arrange meetups easily.',
    icon: 'message-text',
  },
  {
    title: 'Safe & Secure',
    description:
      'All posts are moderated to ensure a safe marketplace experience. Report any inappropriate content.',
    icon: 'shield-check',
  },
];

export default function OnboardingScreen() {
  const theme = useTheme();
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const { setCountry } = useCountryStore();
  const [isCountryStep, setIsCountryStep] = useState(false);

  const handleNext = () => {
    if (isCountryStep) {
      // Country selection step
      if (!selectedCountry) {
        // Show error or prevent proceeding
        return;
      }
      // Save country and complete onboarding
      handleComplete();
    } else if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Last step, move to country selection
      setIsCountryStep(true);
    }
  };

  const handleSkip = () => {
    // Skip to country selection
    setIsCountryStep(true);
  };

  const handleComplete = async () => {
    if (selectedCountry) {
      await setCountry(selectedCountry);
      await setOnboardingCompleted();
      router.replace('/(auth)/login');
    }
  };

  const handleCountrySelect = (country: Country) => {
    setSelectedCountry(country);
  };

  const handleLogin = async () => {
    if (selectedCountry) {
      await setCountry(selectedCountry);
      await setOnboardingCompleted();
      router.replace('/(auth)/login');
    }
  };

  const handleRegister = async () => {
    if (selectedCountry) {
      await setCountry(selectedCountry);
      await setOnboardingCompleted();
      router.replace('/(auth)/register');
    }
  };

  if (isCountryStep) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            <MaterialCommunityIcons
              name="earth"
              size={80}
              color={theme.colors.primary}
              style={styles.countryIcon}
            />
            <Text
              variant="headlineMedium"
              style={[styles.title, { color: theme.colors.onSurface }]}>
              Select Your Country
            </Text>
            <Text
              variant="bodyLarge"
              style={[styles.description, { color: theme.colors.onSurfaceVariant }]}>
              Choose your country to see relevant listings in your area
            </Text>

            <View style={styles.countryContainer}>
              <TouchableOpacity
                onPress={() => handleCountrySelect('afghanistan')}
                activeOpacity={0.7}>
                <Card
                  mode="elevated"
                  style={[
                    styles.countryCard,
                    {
                      backgroundColor:
                        selectedCountry === 'afghanistan'
                          ? theme.colors.primaryContainer
                          : theme.colors.surfaceVariant,
                      borderColor:
                        selectedCountry === 'afghanistan'
                          ? theme.colors.primary
                          : theme.colors.outline,
                      borderWidth: selectedCountry === 'afghanistan' ? 2 : 1,
                    },
                  ]}>
                  <Card.Content style={styles.countryCardContent}>
                    <Text
                      variant="headlineSmall"
                      style={[
                        styles.countryName,
                        {
                          color:
                            selectedCountry === 'afghanistan'
                              ? theme.colors.onPrimaryContainer
                              : theme.colors.onSurfaceVariant,
                        },
                      ]}>
                      Afghanistan
                    </Text>
                    <MaterialCommunityIcons
                      name="flag"
                      size={32}
                      color={
                        selectedCountry === 'afghanistan'
                          ? theme.colors.primary
                          : theme.colors.onSurfaceVariant
                      }
                    />
                  </Card.Content>
                </Card>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => handleCountrySelect('pakistan')} activeOpacity={0.7}>
                <Card
                  mode="elevated"
                  style={[
                    styles.countryCard,
                    {
                      backgroundColor:
                        selectedCountry === 'pakistan'
                          ? theme.colors.primaryContainer
                          : theme.colors.surfaceVariant,
                      borderColor:
                        selectedCountry === 'pakistan'
                          ? theme.colors.primary
                          : theme.colors.outline,
                      borderWidth: selectedCountry === 'pakistan' ? 2 : 1,
                    },
                  ]}>
                  <Card.Content style={styles.countryCardContent}>
                    <Text
                      variant="headlineSmall"
                      style={[
                        styles.countryName,
                        {
                          color:
                            selectedCountry === 'pakistan'
                              ? theme.colors.onPrimaryContainer
                              : theme.colors.onSurfaceVariant,
                        },
                      ]}>
                      Pakistan
                    </Text>
                    <MaterialCommunityIcons
                      name="flag"
                      size={32}
                      color={
                        selectedCountry === 'pakistan'
                          ? theme.colors.primary
                          : theme.colors.onSurfaceVariant
                      }
                    />
                  </Card.Content>
                </Card>
              </TouchableOpacity>
            </View>

            {selectedCountry && (
              <View style={styles.authButtons}>
                <Text
                  variant="bodyLarge"
                  style={[styles.authPrompt, { color: theme.colors.onSurface }]}>
                  Get Started
                </Text>
                <Button
                  mode="contained"
                  onPress={handleRegister}
                  style={styles.authButton}
                  contentStyle={styles.authButtonContent}>
                  Create Account
                </Button>
                <Button
                  mode="outlined"
                  onPress={handleLogin}
                  style={styles.authButton}
                  contentStyle={styles.authButtonContent}>
                  Login
                </Button>
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    );
  }

  const step = ONBOARDING_STEPS[currentStep];
  const isLastStep = currentStep === ONBOARDING_STEPS.length - 1;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons
              name={step.icon as any}
              size={100}
              color={theme.colors.primary}
            />
          </View>

          <View style={styles.pagination}>
            {ONBOARDING_STEPS.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.paginationDot,
                  {
                    backgroundColor:
                      index === currentStep ? theme.colors.primary : theme.colors.outlineVariant,
                    width: index === currentStep ? 24 : 8,
                  },
                ]}
              />
            ))}
          </View>

          <Text variant="headlineMedium" style={[styles.title, { color: theme.colors.onSurface }]}>
            {step.title}
          </Text>

          <Text
            variant="bodyLarge"
            style={[styles.description, { color: theme.colors.onSurfaceVariant }]}>
            {step.description}
          </Text>

          <View style={styles.buttonContainer}>
            {!isLastStep && (
              <Button mode="text" onPress={handleSkip} style={styles.skipButton}>
                Skip
              </Button>
            )}
            <Button
              mode="contained"
              onPress={handleNext}
              style={styles.nextButton}
              contentStyle={styles.nextButtonContent}>
              {isLastStep ? 'Continue' : 'Next'}
            </Button>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    paddingTop: 60,
  },
  iconContainer: {
    marginBottom: 40,
    alignItems: 'center',
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    gap: 8,
  },
  paginationDot: {
    height: 8,
    borderRadius: 4,
  },
  title: {
    textAlign: 'center',
    marginBottom: 16,
    fontWeight: '600',
  },
  description: {
    textAlign: 'center',
    marginBottom: 48,
    lineHeight: 24,
    paddingHorizontal: 16,
  },
  buttonContainer: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  skipButton: {
    flex: 1,
  },
  nextButton: {
    flex: 2,
  },
  nextButtonContent: {
    paddingVertical: 8,
  },
  countryIcon: {
    marginBottom: 24,
  },
  countryContainer: {
    width: '100%',
    gap: 16,
    marginVertical: 32,
  },
  countryCard: {
    width: '100%',
  },
  countryCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 24,
  },
  countryName: {
    fontWeight: '600',
  },
  authButtons: {
    width: '100%',
    marginTop: 24,
    gap: 12,
  },
  authPrompt: {
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: '500',
  },
  authButton: {
    width: '100%',
  },
  authButtonContent: {
    paddingVertical: 8,
  },
});
