import React from 'react';
import { View, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { Text, Card, useTheme, HelperText } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { CategoryValue, getSubcategories, formatCategoryLabel } from '../../constants/FormOptions';

interface SubcategorySelectorProps {
  category: CategoryValue | '';
  selectedSubcategory: string;
  onSelectSubcategory: (subcategory: string) => void;
  error?: string;
}

// Map subcategories to icons based on category
const getSubcategoryIcon = (category: CategoryValue, subcategory: string): string => {
  const iconMap: Record<string, Record<string, string>> = {
    vehicles: {
      cars: 'car',
      motorcycles: 'motorbike',
      scooters: 'scooter',
      bicycles: 'bicycle',
      trucks: 'truck',
      vans: 'van-utility',
      boats: 'sail-boat',
      rvs_campers: 'rv-truck',
      vehicle_parts: 'wrench',
      tires_rims: 'circle-outline',
    },
    electronics: {
      mobile_phones: 'cellphone',
      computers: 'laptop',
      tablets: 'tablet',
      tvs: 'television',
      cameras: 'camera',
      gaming_consoles: 'gamepad-variant',
      audio_headphones: 'headphones',
      smartwatches: 'watch',
      home_appliances: 'microwave',
      drones: 'drone',
    },
    home_furniture: {
      furniture: 'sofa',
      home_decor: 'image-frame',
      kitchenware: 'silverware-fork-knife',
      lighting: 'lightbulb',
      rugs_carpets: 'rug',
      storage: 'package-variant',
      bedding: 'bed',
      outdoor_furniture: 'table-furniture',
    },
    clothing_fashion: {
      mens_clothing: 'tshirt-v',
      womens_clothing: 'hanger',
      kids_clothing: 'baby-face-outline',
      shoes: 'shoe-formal',
      bags: 'bag-personal',
      jewelry_accessories: 'diamond-stone',
      watches: 'watch',
    },
    sports_outdoors: {
      fitness_equipment: 'dumbbell',
      bicycles_gear: 'bicycle',
      camping_gear: 'tent',
      sports_apparel: 'tshirt-crew',
      outdoor_equipment: 'compass',
      fishing_gear: 'fish',
    },
    pets_animals: {
      pet_supplies: 'dog',
      pet_food: 'bowl',
      pet_accessories: 'bone',
      livestock: 'cow',
      animals_for_sale: 'paw',
    },
    baby_kids: {
      baby_clothing: 'tshirt-crew',
      baby_gear: 'baby-carriage',
      toys: 'toy-brick',
      kids_furniture: 'bed',
      school_supplies: 'school',
    },
    real_estate: {
      apartments: 'home-city',
      houses: 'home',
      rooms: 'door',
      land: 'map',
      commercial_property: 'office-building',
    },
    tools_industrial: {
      power_tools: 'toolbox',
      hand_tools: 'wrench',
      construction_equipment: 'hard-hat',
      machinery: 'cog',
      industrial_supplies: 'package-variant',
    },
    hobby_entertainment: {
      musical_instruments: 'guitar-electric',
      books: 'book',
      board_games: 'dice-multiple',
      collectibles: 'star',
      art_crafts: 'palette',
    },
    health_beauty: {
      beauty_products: 'face-woman',
      personal_care: 'shower',
      medical_supplies: 'medical-bag',
      supplements: 'pill',
      perfumes: 'spray',
    },
    office_business: {
      office_furniture: 'desk',
      stationery: 'pencil',
      business_equipment: 'printer',
      pos_devices: 'cash-register',
    },
    services: {
      cleaning: 'broom',
      moving_delivery: 'truck-delivery',
      repair_services: 'toolbox',
      home_improvement: 'hammer',
      pet_services: 'dog',
    },
    other: {
      other: 'dots-horizontal-circle',
    },
  };

  return iconMap[category]?.[subcategory] || 'cube-outline';
};

export default function SubcategorySelector({
  category,
  selectedSubcategory,
  onSelectSubcategory,
  error,
}: SubcategorySelectorProps) {
  const theme = useTheme();

  if (!category) {
    return (
      <View style={styles.container}>
        <Text
          variant="bodyMedium"
          style={[styles.placeholder, { color: theme.colors.onSurfaceVariant }]}>
          Please select a category first
        </Text>
      </View>
    );
  }

  const subcategories = getSubcategories(category);

  const renderSubcategory = ({ item }: { item: string }) => {
    const isSelected = selectedSubcategory === item;
    const iconName = getSubcategoryIcon(category, item);

    return (
      <TouchableOpacity
        onPress={() => onSelectSubcategory(item)}
        activeOpacity={0.7}
        style={styles.subcategoryItem}>
        <Card
          mode="elevated"
          style={[
            styles.subcategoryCard,
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
                size={24}
                color={isSelected ? theme.colors.onPrimary : theme.colors.primary}
              />
            </View>
            <Text
              variant="labelSmall"
              style={[
                styles.subcategoryLabel,
                {
                  color: isSelected
                    ? theme.colors.onPrimaryContainer
                    : theme.colors.onSurfaceVariant,
                  fontWeight: isSelected ? '600' : '400',
                },
              ]}
              numberOfLines={2}>
              {formatCategoryLabel(item)}
            </Text>
          </Card.Content>
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Text variant="titleMedium" style={[styles.title, { color: theme.colors.onSurface }]}>
        Select Subcategory
      </Text>
      <FlatList
        data={subcategories}
        renderItem={renderSubcategory}
        keyExtractor={(item) => item}
        numColumns={3}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContent}
        scrollEnabled={false}
      />
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
  placeholder: {
    textAlign: 'center',
    padding: 16,
    fontStyle: 'italic',
  },
  listContent: {
    gap: 8,
  },
  row: {
    justifyContent: 'space-between',
    gap: 8,
  },
  subcategoryItem: {
    flex: 1,
    maxWidth: '31%',
  },
  subcategoryCard: {
    minHeight: 110,
  },
  cardContent: {
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 6,
    gap: 8,
    justifyContent: 'center',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subcategoryLabel: {
    textAlign: 'center',
    fontSize: 10,
  },
  error: {
    marginTop: 8,
  },
});
