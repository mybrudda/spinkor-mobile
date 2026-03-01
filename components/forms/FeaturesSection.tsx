import { View, StyleSheet, Pressable } from 'react-native';
import { Text, Checkbox } from 'react-native-paper';
import React from 'react';

interface FeaturesSectionProps {
  features: string[];
  selectedFeatures: string[];
  onToggleFeature: (feature: string) => void;
}

export default function FeaturesSection({
  features,
  selectedFeatures,
  onToggleFeature,
}: FeaturesSectionProps) {
  return (
    <View>
      <Text variant="titleSmall" style={styles.featuresTitle}>
        Features
      </Text>
      <View style={styles.checkboxContainer}>
        {features.map((feature) => (
          <View key={feature} style={styles.checkboxWrapper}>
            <Pressable style={styles.checkboxRow} onPress={() => onToggleFeature(feature)}>
              <Checkbox
                status={selectedFeatures.includes(feature) ? 'checked' : 'unchecked'}
                onPress={() => onToggleFeature(feature)}
              />
              <Text style={styles.checkboxLabel}>{feature}</Text>
            </Pressable>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  featuresTitle: {
    marginTop: 8,
    marginBottom: 4,
  },
  checkboxContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  checkboxWrapper: {
    width: '50%',
    paddingHorizontal: 8,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  checkboxLabel: {
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
});
