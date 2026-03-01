import { StyleSheet, View } from 'react-native';
import { Text, TextInput } from 'react-native-paper';
import React from 'react';
import DropdownComponent from '../ui/Dropdown';
import { getCitiesForCountry } from '../../constants/CountryData';
import { useCountryStore } from '../../store/useCountryStore';

interface LocationSectionProps {
  location: {
    city: string;
    address?: string | null;
    country?: string;
  };
  errors: Record<string, string>;
  onLocationChange: (field: 'city' | 'address' | 'country', value: string) => void;
}

export default function LocationSection({
  location,
  errors,
  onLocationChange,
}: LocationSectionProps) {
  const country = useCountryStore((state) => state.country);
  const cities = getCitiesForCountry(country);

  return (
    <View style={styles.container}>
      <Text variant="titleMedium" style={styles.sectionTitle}>
        Location
      </Text>

      <DropdownComponent
        data={cities.map((city) => ({ label: city, value: city }))}
        value={location.city}
        onChange={(value: string | null) => onLocationChange('city', value || '')}
        placeholder="City"
        error={errors['location.city']}
      />

      <TextInput
        label="Address (Optional)"
        value={location.address || ''}
        onChangeText={(text) => onLocationChange('address', text)}
        style={styles.input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    marginBottom: 12,
  },
  input: {
    marginBottom: 4,
  },
});
