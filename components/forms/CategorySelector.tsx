import React from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Text, Card, useTheme, HelperText } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { CategoryValue, formatCategoryLabel, CATEGORY_OPTIONS } from '../../constants/FormOptions';

interface CategorySelectorProps {
  selectedCategory: CategoryValue | '';
  onSelectCategory: (category: CategoryValue) => void;
  error?: string;
}

// Map categories to icons
const CATEGORY_ICONS: Record<CategoryValue, string> = {
  vehicles: 'car',
  electronics: 'cellphone',
  home_furniture: 'sofa',
  clothing_fashion: 'tshirt-v',
  sports_outdoors: 'dumbbell',
  pets_animals: 'paw',
  baby_kids: 'baby-face-outline',
  real_estate: 'home-variant',
  tools_industrial: 'wrench',
  hobby_entertainment: 'gamepad-variant',
  health_beauty: 'face-woman-shimmer',
  office_business: 'briefcase',
  services: 'tools',
  other: 'dots-horizontal-circle',
};

export default function CategorySelector({
  selectedCategory,
  onSelectCategory,
  error,
}: CategorySelectorProps) {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <Text variant="titleMedium" style={[styles.title, { color: theme.colors.onSurface }]}>
        Select Category
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>
        {CATEGORY_OPTIONS.map((option) => {
          const isSelected = selectedCategory === option.value;
          const iconName = CATEGORY_ICONS[option.value as CategoryValue];

          return (
            <TouchableOpacity
              key={option.value}
              onPress={() => onSelectCategory(option.value as CategoryValue)}
              activeOpacity={0.7}>
              <Card
                mode="elevated"
                style={[
                  styles.categoryCard,
                  {
                    backgroundColor: isSelected
                      ? theme.colors.primaryContainer
                      : theme.colors.surfaceVariant,
                    borderColor: isSelected ? theme.colors.primary : theme.colors.outline,
                    borderWidth: isSelected ? 2 : 1,
                  },
                ]}>
                <Card.Content style={styles.cardContent}>
                  <View
                    style={[
                      styles.iconContainer,
                      {
                        backgroundColor: isSelected
                          ? theme.colors.primary
                          : theme.colors.secondaryContainer,
                      },
                    ]}>
                    <MaterialCommunityIcons
                      name={iconName as any}
                      size={32}
                      color={isSelected ? theme.colors.onPrimary : theme.colors.primary}
                    />
                  </View>
                  <Text
                    variant="labelMedium"
                    style={[
                      styles.categoryLabel,
                      {
                        color: isSelected
                          ? theme.colors.onPrimaryContainer
                          : theme.colors.onSurfaceVariant,
                        fontWeight: isSelected ? '600' : '400',
                      },
                    ]}
                    numberOfLines={2}>
                    {formatCategoryLabel(option.value)}
                  </Text>
                </Card.Content>
              </Card>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      {error && (
        <HelperText type="error" visible={true} style={styles.error}>
          {error}
        </HelperText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  title: {
    marginBottom: 12,
    fontWeight: '600',
  },
  scrollContent: {
    paddingRight: 16,
    gap: 12,
  },
  categoryCard: {
    width: 110,
    marginRight: 8,
    minHeight: 120,
  },
  cardContent: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    gap: 10,
    justifyContent: 'center',
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryLabel: {
    textAlign: 'center',
    fontSize: 11,
  },
  error: {
    marginTop: 8,
  },
});
