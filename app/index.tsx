import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import { isOnboardingCompleted } from '../store/useCountryStore';
import { useCountryStore } from '../store/useCountryStore';
import { useTheme } from 'react-native-paper';

export default function Index() {
  const [isLoading, setIsLoading] = useState(true);
  const [shouldShowOnboarding, setShouldShowOnboarding] = useState(false);
  const { loadCountry } = useCountryStore();
  const theme = useTheme();

  useEffect(() => {
    const checkOnboarding = async () => {
      try {
        const completed = await isOnboardingCompleted();
        await loadCountry();
        setShouldShowOnboarding(!completed);
      } catch (error) {
        console.error('Error checking onboarding status:', error);
        setShouldShowOnboarding(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkOnboarding();
  }, []);

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: theme.colors.background,
        }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (shouldShowOnboarding) {
    return <Redirect href="/(onboarding)" />;
  }

  return <Redirect href="/(auth)/login" />;
}
