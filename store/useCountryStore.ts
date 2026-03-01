import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Country = 'afghanistan' | 'pakistan';

interface CountryState {
  country: Country | null;
  setCountry: (country: Country) => Promise<void>;
  loadCountry: () => Promise<void>;
}

const COUNTRY_STORAGE_KEY = 'user_country';
const ONBOARDING_COMPLETED_KEY = 'onboardingCompleted';

export const useCountryStore = create<CountryState>((set) => ({
  country: null,

  setCountry: async (country: Country) => {
    try {
      await AsyncStorage.setItem(COUNTRY_STORAGE_KEY, country);
      set({ country });
    } catch (error) {
      console.error('Error saving country:', error);
    }
  },

  loadCountry: async () => {
    try {
      const savedCountry = await AsyncStorage.getItem(COUNTRY_STORAGE_KEY);
      if (savedCountry && (savedCountry === 'afghanistan' || savedCountry === 'pakistan')) {
        set({ country: savedCountry as Country });
      }
    } catch (error) {
      console.error('Error loading country:', error);
    }
  },
}));

export async function isOnboardingCompleted(): Promise<boolean> {
  try {
    const completed = await AsyncStorage.getItem(ONBOARDING_COMPLETED_KEY);
    return completed === 'true';
  } catch (error) {
    console.error('Error checking onboarding status:', error);
    return false;
  }
}

export async function setOnboardingCompleted(): Promise<void> {
  try {
    await AsyncStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true');
  } catch (error) {
    console.error('Error setting onboarding completed:', error);
  }
}
