import {
  View,
  StyleSheet,
  ScrollView,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
  Dimensions,
} from 'react-native';
import React, { useState, useRef, useCallback, useMemo } from 'react';
import { Text, Button, useTheme, TextInput, Divider, SegmentedButtons } from 'react-native-paper';
import Slider from 'rn-range-slider';
import Dropdown from '../ui/Dropdown';
import CategorySelector from '../forms/CategorySelector';
import SubcategorySelector from '../forms/SubcategorySelector';
import { useVehicleModels } from '../../lib/hooks/useVehicleModels';
import {
  CATEGORY_OPTIONS,
  MAKES,
  getSubcategories,
  formatCategoryLabel,
  CategoryValue,
} from '../../constants/FormOptions';
import { getCitiesForCountry } from '../../constants/CountryData';
import { useCountryStore } from '../../store/useCountryStore';

export interface FilterOptions {
  listingType: 'sale' | 'rent' | 'other' | null;
  city: string | null;
  category: CategoryValue | null;
  subcategory: string | null;
  make: string;
  model: string;
  yearRange: {
    min: number;
    max: number;
  };
  priceRange: {
    min: string;
    max: string;
  };
}

interface FilterSectionProps {
  onSearch?: (query: string) => void;
  onFilter?: (filters: FilterOptions) => void;
  onLogoPress?: () => void;
}

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const currentYear = new Date().getFullYear();
export const DEFAULT_YEAR_RANGE = {
  min: 1900,
  max: currentYear,
};
const initialFilters: FilterOptions = {
  listingType: null,
  city: null,
  category: null,
  subcategory: null,
  make: '',
  model: '',
  yearRange: { ...DEFAULT_YEAR_RANGE },
  priceRange: {
    min: '',
    max: '',
  },
};

export default function FilterSection({ onSearch, onFilter, onLogoPress }: FilterSectionProps) {
  const theme = useTheme();
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<FilterOptions>(initialFilters);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchWidthAnimation = useRef(new Animated.Value(0)).current;
  const { height: windowHeight } = Dimensions.get('window');
  const country = useCountryStore((state) => state.country);
  const cities = getCitiesForCountry(country);

  const isVehicleCategory = filters.category === 'vehicles';
  const { models, loadingModels } = useVehicleModels(isVehicleCategory ? filters.make : '');

  const categoryOptions = useMemo(
    () => [{ label: 'All Categories', value: '' }, ...CATEGORY_OPTIONS],
    []
  );

  const cityOptions = useMemo(
    () => [
      { label: 'All Cities', value: '' },
      ...cities.map((city) => ({ label: city, value: city })),
    ],
    [cities]
  );

  const subcategoryOptions = useMemo(() => {
    if (!filters.category) return [];
    const options = getSubcategories(filters.category).map((value) => ({
      label: formatCategoryLabel(value),
      value,
    }));
    return [{ label: 'All Subcategories', value: '' }, ...options];
  }, [filters.category]);

  const makeOptions = useMemo(
    () => [
      { label: 'All Makes', value: '' },
      ...MAKES.map((make) => ({ label: make, value: make })),
    ],
    []
  );

  const modelOptions = useMemo(
    () => [
      { label: 'All Models', value: '' },
      ...models.map((model) => ({ label: model.name, value: model.name })),
    ],
    [models]
  );

  const handleYearChange = useCallback((low: number, high: number) => {
    setFilters((prev) => ({
      ...prev,
      yearRange: {
        min: Math.floor(low),
        max: Math.floor(high),
      },
    }));
  }, []);

  const handlePriceChange = useCallback((field: 'min' | 'max', value: string) => {
    setFilters((prev) => ({
      ...prev,
      priceRange: {
        ...prev.priceRange,
        [field]: value,
      },
    }));
  }, []);

  const handleFilterChange = useCallback((field: keyof FilterOptions, value: any) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  const handleCategoryChange = useCallback((value: string) => {
    setFilters((prev) => ({
      ...prev,
      category: value ? (value as CategoryValue) : null,
      subcategory: null,
      make: '',
      model: '',
      yearRange: { ...DEFAULT_YEAR_RANGE },
    }));
  }, []);

  const handleCityChange = useCallback(
    (value: string) => {
      handleFilterChange('city', value || null);
    },
    [handleFilterChange]
  );

  const handleSubcategoryChange = useCallback(
    (value: string) => {
      handleFilterChange('subcategory', value || null);
    },
    [handleFilterChange]
  );

  const clearFilters = useCallback(() => {
    setFilters({
      ...initialFilters,
      yearRange: { ...DEFAULT_YEAR_RANGE },
      priceRange: { ...initialFilters.priceRange },
    });
  }, []);

  const applyFilters = useCallback(() => {
    onFilter?.({
      ...filters,
      yearRange: { ...filters.yearRange },
      priceRange: { ...filters.priceRange },
    });
    closeFilters();
  }, [filters, onFilter, closeFilters]);

  const handleSearch = useCallback(() => {
    onSearch?.(searchQuery);
  }, [searchQuery, onSearch]);

  const animateLayout = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  }, []);

  const toggleExpand = () => {
    animateLayout();
    setIsExpanded((prev) => !prev);
  };

  const closeFilters = useCallback(() => {
    animateLayout();
    setIsExpanded(false);
  }, [animateLayout]);

  const animateSearchWidth = (focused: boolean) => {
    Animated.timing(searchWidthAnimation, {
      toValue: focused ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  const handleSearchFocus = () => {
    setIsSearchFocused(true);
    animateSearchWidth(true);
  };

  const handleSearchBlur = () => {
    setIsSearchFocused(false);
    animateSearchWidth(false);
  };

  const searchWidth = searchWidthAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['80%', '100%'],
  });

  const renderCommonInputs = () => (
    <View style={styles.inputSection}>
      <Text variant="titleSmall" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
        Basic Filters
      </Text>

      {/* Listing Type */}
      <View style={styles.inputGroup}>
        <Text
          variant="bodySmall"
          style={[styles.inputLabel, { color: theme.colors.onSurfaceVariant }]}>
          Listing Type
        </Text>
        <SegmentedButtons
          value={filters.listingType ?? 'all'}
          onValueChange={(value) =>
            handleFilterChange(
              'listingType',
              value === 'all' ? null : (value as FilterOptions['listingType'])
            )
          }
          buttons={[
            { value: 'all', label: 'All' },
            { value: 'sale', label: 'Sale' },
            { value: 'rent', label: 'Rent' },
            { value: 'other', label: 'Other' },
          ]}
          style={styles.segmentedButton}
        />
      </View>

      {/* City */}
      <View style={styles.inputGroup}>
        <Text
          variant="bodySmall"
          style={[styles.inputLabel, { color: theme.colors.onSurfaceVariant }]}>
          City
        </Text>
        <Dropdown
          data={cityOptions}
          value={filters.city}
          onChange={handleCityChange}
          placeholder="Select city"
        />
      </View>

      {/* Category */}
      <View style={styles.inputGroup}>
        <CategorySelector
          selectedCategory={(filters.category || '') as CategoryValue | ''}
          onSelectCategory={(category) => handleCategoryChange(category)}
        />
      </View>

      {filters.category && (
        <View style={styles.inputGroup}>
          <SubcategorySelector
            category={filters.category}
            selectedSubcategory={filters.subcategory || ''}
            onSelectSubcategory={(subcategory) => handleSubcategoryChange(subcategory)}
          />
        </View>
      )}

      {/* Price Range */}
      <View style={styles.inputGroup}>
        <Text
          variant="bodySmall"
          style={[styles.inputLabel, { color: theme.colors.onSurfaceVariant }]}>
          Price Range
        </Text>
        <View style={styles.priceInputs}>
          <TextInput
            mode="outlined"
            label="Min"
            value={filters.priceRange.min}
            onChangeText={(value) => handlePriceChange('min', value)}
            keyboardType="numeric"
            style={styles.priceInput}
            dense
          />
          <TextInput
            mode="outlined"
            label="Max"
            value={filters.priceRange.max}
            onChangeText={(value) => handlePriceChange('max', value)}
            keyboardType="numeric"
            style={styles.priceInput}
            dense
          />
        </View>
      </View>
    </View>
  );

  const renderCategorySpecificInputs = () => {
    if (!filters.category) return null;

    return (
      <View style={styles.inputSection}>
        <Text variant="titleSmall" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
          {isVehicleCategory ? 'Vehicle Details' : 'Item Details'}
        </Text>

        {isVehicleCategory ? (
          <>
            <View style={styles.inputGroup}>
              <Text
                variant="bodySmall"
                style={[styles.inputLabel, { color: theme.colors.onSurfaceVariant }]}>
                Make
              </Text>
              <Dropdown
                data={makeOptions}
                value={filters.make || null}
                onChange={(value) => {
                  handleFilterChange('make', value);
                  handleFilterChange('model', '');
                }}
                placeholder="Select make"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text
                variant="bodySmall"
                style={[styles.inputLabel, { color: theme.colors.onSurfaceVariant }]}>
                Model
              </Text>
              <Dropdown
                data={modelOptions}
                value={filters.model || null}
                onChange={(value) => handleFilterChange('model', value)}
                placeholder={
                  !filters.make
                    ? 'Select make first'
                    : loadingModels
                      ? 'Loading...'
                      : 'Select model'
                }
                disabled={!filters.make || loadingModels}
                loading={loadingModels}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text
                variant="bodySmall"
                style={[styles.inputLabel, { color: theme.colors.onSurfaceVariant }]}>
                Year Range: {filters.yearRange.min} - {filters.yearRange.max}
              </Text>
              <View style={styles.sliderContainer}>
                <Slider
                  min={DEFAULT_YEAR_RANGE.min}
                  max={DEFAULT_YEAR_RANGE.max}
                  low={filters.yearRange.min}
                  high={filters.yearRange.max}
                  step={1}
                  onValueChanged={handleYearChange}
                  renderThumb={() => (
                    <View style={[styles.thumb, { backgroundColor: theme.colors.primary }]} />
                  )}
                  renderRail={() => (
                    <View style={[styles.rail, { backgroundColor: theme.colors.outlineVariant }]} />
                  )}
                  renderRailSelected={() => (
                    <View
                      style={[styles.railSelected, { backgroundColor: theme.colors.primary }]}
                    />
                  )}
                />
              </View>
            </View>
          </>
        ) : (
          <>
            <View style={styles.inputGroup}>
              <Text
                variant="bodySmall"
                style={[styles.inputLabel, { color: theme.colors.onSurfaceVariant }]}>
                Brand / Make
              </Text>
              <TextInput
                mode="outlined"
                value={filters.make}
                onChangeText={(value) => handleFilterChange('make', value)}
                placeholder="e.g. Samsung"
                style={styles.textField}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text
                variant="bodySmall"
                style={[styles.inputLabel, { color: theme.colors.onSurfaceVariant }]}>
                Model / Variant
              </Text>
              <TextInput
                mode="outlined"
                value={filters.model}
                onChangeText={(value) => handleFilterChange('model', value)}
                placeholder="e.g. Galaxy S21"
                style={styles.textField}
              />
            </View>
          </>
        )}
      </View>
    );
  };

  const categoryInputs = renderCategorySpecificInputs();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface }]}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Animated.View style={[styles.searchInputContainer, { width: searchWidth }]}>
          <TextInput
            mode="outlined"
            placeholder="Search listings..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            onFocus={handleSearchFocus}
            onBlur={handleSearchBlur}
            onSubmitEditing={handleSearch}
            left={<TextInput.Icon icon="magnify" />}
            right={
              searchQuery.length > 0 ? (
                <TextInput.Icon icon="close" onPress={() => setSearchQuery('')} />
              ) : undefined
            }
            style={styles.searchInput}
            dense
          />
        </Animated.View>

        <Button
          mode="contained"
          onPress={toggleExpand}
          icon={isExpanded ? 'chevron-up' : 'chevron-down'}
          style={styles.filterButton}>
          Filters
        </Button>
      </View>

      {/* Expandable Filter Section */}
      {isExpanded && (
        <View style={[styles.expandableContent, { maxHeight: windowHeight * 0.7 }]}>
          <ScrollView
            style={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled={true}>
            {renderCommonInputs()}
            {categoryInputs && (
              <>
                <Divider style={[styles.divider, { backgroundColor: theme.colors.outline }]} />
                {categoryInputs}
              </>
            )}

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <Button mode="outlined" onPress={clearFilters} style={styles.clearButton}>
                Clear All
              </Button>
              <Button mode="contained" onPress={applyFilters} style={styles.applyButton}>
                Apply Filters
              </Button>
            </View>
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchInputContainer: {
    flex: 1,
  },
  searchInput: {
    backgroundColor: 'transparent',
  },
  filterButton: {
    borderRadius: 8,
  },
  expandableContent: {
    overflow: 'hidden',
  },
  scrollContent: {
    paddingTop: 16,
  },
  inputSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    marginBottom: 12,
    fontWeight: '600',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    marginBottom: 6,
    fontWeight: '500',
  },
  dropdown: {
    backgroundColor: 'transparent',
  },
  segmentedButton: {
    marginTop: 4,
  },
  priceInputs: {
    flexDirection: 'row',
    gap: 8,
  },
  priceInput: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  sliderContainer: {
    marginTop: 8,
    paddingHorizontal: 8,
  },
  slider: {
    height: 40,
  },
  divider: {
    marginVertical: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    marginBottom: 24,
  },
  clearButton: {
    flex: 1,
  },
  applyButton: {
    flex: 1,
  },
  thumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'white',
  },
  rail: {
    height: 6,
    borderRadius: 3,
  },
  railSelected: {
    height: 6,
    borderRadius: 3,
  },
  textField: {
    backgroundColor: 'transparent',
  },
});
