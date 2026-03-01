import { View, ScrollView, StyleSheet } from 'react-native';
import { Text, useTheme, TextInput, HelperText, SegmentedButtons } from 'react-native-paper';
import React from 'react';
import ImagePickerSection from './ImagePickerSection';
import LocationSection from './LocationSection';
import PriceDescriptionSection from './PriceDescriptionSection';
import { BaseFormData } from '../../types/forms';

interface BasePostFormProps<T extends BaseFormData> {
  title: string;
  formState: T;
  errors: Record<string, string>;
  onInputChange: (field: keyof T, value: string | string[]) => void;
  onLocationChange: (field: keyof T['location'], value: string) => void;
  onPickImage: () => void;
  onRemoveImage: (index: number) => void;
  maxImages: number;
  children?: React.ReactNode;
}

export default function BasePostForm<T extends BaseFormData>({
  title,
  formState,
  errors,
  onInputChange,
  onLocationChange,
  onPickImage,
  onRemoveImage,
  maxImages,
  children,
}: BasePostFormProps<T>) {
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.basicInfoSection}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Basic Information
          </Text>

          <TextInput
            label="Title"
            value={formState.title}
            onChangeText={(text) => onInputChange('title', text)}
            error={!!errors.title}
            style={styles.input}
          />
          {errors.title && (
            <HelperText type="error" visible={true}>
              {errors.title}
            </HelperText>
          )}

          <ImagePickerSection
            images={formState.images}
            onPickImage={onPickImage}
            onRemoveImage={onRemoveImage}
            maxImages={maxImages}
          />
          {errors.images && (
            <HelperText type="error" visible={true}>
              {errors.images}
            </HelperText>
          )}

          <SegmentedButtons
            value={formState.listingType}
            onValueChange={(value) => onInputChange('listingType', value)}
            buttons={[
              { value: 'sale', label: 'For Sale' },
              { value: 'rent', label: 'For Rent' },
              { value: 'other', label: 'Other' },
            ]}
            style={styles.segmentedButton}
          />
        </View>

        {children}

        <LocationSection
          location={formState.location}
          errors={errors}
          onLocationChange={onLocationChange}
        />

        <PriceDescriptionSection
          price={formState.price}
          description={formState.description}
          errors={errors}
          onInputChange={onInputChange}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  basicInfoSection: {
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    marginBottom: 12,
  },
  input: {
    marginBottom: 4,
  },
  segmentedButton: {
    marginVertical: 8,
  },
});
