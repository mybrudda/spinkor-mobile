import { View, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import React, { useState, useEffect, useMemo } from 'react';
import { TextInput, Button, Card, Text, useTheme } from 'react-native-paper';
import { useLocalSearchParams } from 'expo-router';
import RequireAuth from '../../../components/auth/RequireAuth';
import DropdownComponent from '../../../components/ui/Dropdown';
import Header from '../../../components/layout/Header';
import BasePostForm from '../../../components/forms/BasePostForm';
import CategorySelector from '../../../components/forms/CategorySelector';
import SubcategorySelector from '../../../components/forms/SubcategorySelector';
import {
  PostFormData,
  transformPostForm,
  validatePostForm,
  VALIDATION_LIMITS,
  DEFAULT_FORM_VALUES,
} from '../../../types/forms';
import { useCountryStore } from '../../../store/useCountryStore';
import { getCurrencyForCountry, COUNTRY_DATA } from '../../../constants/CountryData';
import LoadingScreen from '../../../components/ui/LoadingScreen';
import { usePostForm } from '../../../lib/hooks/usePostForm';
import { usePostUpdate } from '../../../lib/hooks/usePostUpdate';
import { useVehicleModels } from '../../../lib/hooks/useVehicleModels';
import { formStyles } from '../../../constants/formStyles';
import { Post } from '../../../types/database';
import {
  MAKES,
  YEARS,
  normalizeCategoryValue,
  CategoryValue,
} from '../../../constants/FormOptions';

const initialState: PostFormData = {
  title: '',
  description: '',
  price: '',
  currency: DEFAULT_FORM_VALUES.CURRENCY,
  images: [],
  listingType: DEFAULT_FORM_VALUES.LISTING_TYPE,
  category: 'vehicles',
  subcategory: '',
  location: {
    city: '',
    address: undefined,
    country: DEFAULT_FORM_VALUES.COUNTRY,
  },
  make: '',
  model: '',
  year: '',
};

export default function CreatePostScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams();
  const country = useCountryStore((state) => state.country);
  const currency = getCurrencyForCountry(country);
  const countryName = country ? COUNTRY_DATA[country].name : DEFAULT_FORM_VALUES.COUNTRY;

  const [formState, setFormState] = useState<PostFormData>({
    ...initialState,
    currency,
    location: {
      ...initialState.location,
      country: countryName,
    },
  });
  const [isUpdateMode, setIsUpdateMode] = useState(false);
  const [postToUpdate, setPostToUpdate] = useState<Post | null>(null);
  const { models, loadingModels } = useVehicleModels(
    formState.category === 'vehicles' ? formState.make : ''
  );

  // Update currency and country when country changes
  useEffect(() => {
    if (country && !isUpdateMode) {
      const newCurrency = getCurrencyForCountry(country);
      const newCountryName = COUNTRY_DATA[country].name;
      setFormState((prev) => ({
        ...prev,
        currency: newCurrency,
        location: {
          ...prev.location,
          country: newCountryName,
        },
      }));
    }
  }, [country, isUpdateMode]);

  // Check if we're in update mode
  useEffect(() => {
    if (params.mode === 'update' && params.post) {
      try {
        const postData = JSON.parse(params.post as string) as Post;
        setPostToUpdate(postData);
        setIsUpdateMode(true);
      } catch (error) {
        console.error('Error parsing post data:', error);
      }
    }
  }, [params.mode, params.post]);

  useEffect(() => {
    if (isUpdateMode) return;
    if (typeof params.category !== 'string') return;

    const normalizedCategory = normalizeCategoryValue(params.category as string | undefined);
    setFormState((prev) => {
      if (prev.category === normalizedCategory) {
        return prev;
      }
      return {
        ...prev,
        category: normalizedCategory,
        subcategory: '',
        make: '',
        model: '',
        year: '',
      };
    });
  }, [params.category, isUpdateMode]);

  const {
    loading: createLoading,
    errors: createErrors,
    handlePickImage: createHandlePickImage,
    handleRemoveImage: createHandleRemoveImage,
    handleInputChange: createHandleInputChange,
    handleLocationChange: createHandleLocationChange,
    handleSubmit: createHandleSubmit,
  } = usePostForm<PostFormData>({
    postType: 'post',
    transformForm: transformPostForm,
    validateForm: validatePostForm,
    successMessage: 'Post submitted! We will review it soon before publishing.',
  });

  const {
    loading: updateLoading,
    errors: updateErrors,
    initializeFormFromPost,
    handlePickImage: updateHandlePickImage,
    handleRemoveImage: updateHandleRemoveImage,
    handleInputChange: updateHandleInputChange,
    handleLocationChange: updateHandleLocationChange,
    handleUpdate,
  } = usePostUpdate<PostFormData>({
    postType: 'post',
    transformForm: transformPostForm,
    validateForm: validatePostForm,
    successMessage: 'Post updated successfully!',
  });

  // Initialize form with post data if in update mode
  useEffect(() => {
    if (isUpdateMode && postToUpdate) {
      const initialFormData = initializeFormFromPost(postToUpdate);
      setFormState(initialFormData);
    }
  }, [isUpdateMode, postToUpdate]);

  // Use the appropriate handlers based on mode
  const loading = isUpdateMode ? updateLoading : createLoading;
  const errors = isUpdateMode ? updateErrors : createErrors;
  const handlePickImage = isUpdateMode ? updateHandlePickImage : createHandlePickImage;
  const handleRemoveImage = isUpdateMode ? updateHandleRemoveImage : createHandleRemoveImage;
  const handleInputChange = isUpdateMode ? updateHandleInputChange : createHandleInputChange;
  const handleLocationChange = isUpdateMode
    ? updateHandleLocationChange
    : createHandleLocationChange;

  const handleImagePick = () => {
    Alert.alert('Select Image', 'Choose an option', [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Choose from Gallery',
        onPress: () =>
          handlePickImage(
            formState.images,
            (images) => setFormState((prev) => ({ ...prev, images })),
            'gallery'
          ),
      },
      {
        text: 'Take Picture',
        onPress: () =>
          handlePickImage(
            formState.images,
            (images) => setFormState((prev) => ({ ...prev, images })),
            'camera'
          ),
      },
    ]);
  };

  const handleImageRemove = (index: number) => {
    handleRemoveImage(index, formState.images, (images) =>
      setFormState((prev) => ({ ...prev, images }))
    );
  };

  const handleFormInputChange = (field: keyof PostFormData, value: string | string[]) => {
    handleInputChange(field, value, formState, setFormState);

    // Clear model when make changes
    if (field === 'make') {
      setFormState((prev) => ({ ...prev, model: '' }));
    }

    if (field === 'category') {
      setFormState((prev) => ({
        ...prev,
        subcategory: '',
        make: '',
        model: '',
        year: '',
      }));
    }
  };

  const handleFormLocationChange = (field: keyof PostFormData['location'], value: string) => {
    handleLocationChange(field, value, formState, setFormState);
  };

  const handleFormSubmit = () => {
    if (isUpdateMode && postToUpdate) {
      handleUpdate(formState, postToUpdate.id);
    } else {
      createHandleSubmit(formState);
    }
  };

  const isVehicleCategory = formState.category === 'vehicles';
  const pageTitle = isUpdateMode ? 'Update Post' : 'Create Post';
  const yearOptions = useMemo(
    () => [
      { label: 'Not Specified', value: '' },
      ...YEARS.map((year) => ({ label: year, value: year })),
    ],
    []
  );

  if (loading) {
    return (
      <LoadingScreen message={isUpdateMode ? 'Updating your post...' : 'Creating your post...'} />
    );
  }

  const renderCategoryFields = () => (
    <View>
      <CategorySelector
        selectedCategory={(formState.category || '') as CategoryValue | ''}
        onSelectCategory={(category) =>
          handleFormInputChange('category', normalizeCategoryValue(category))
        }
        error={errors.category}
      />

      <SubcategorySelector
        category={(formState.category || '') as CategoryValue | ''}
        selectedSubcategory={formState.subcategory}
        onSelectSubcategory={(subcategory) => handleFormInputChange('subcategory', subcategory)}
        error={errors.subcategory}
      />

      {isVehicleCategory ? (
        <>
          <DropdownComponent
            data={MAKES.map((make) => ({ label: make, value: make }))}
            value={formState.make}
            onChange={(value: string | null) => handleFormInputChange('make', value || '')}
            placeholder="Make"
            error={errors.make}
          />

          <DropdownComponent
            data={models.map((model) => ({ label: model.name, value: model.name }))}
            value={formState.model}
            onChange={(value: string | null) => handleFormInputChange('model', value || '')}
            placeholder={
              !formState.make ? 'Select make first' : loadingModels ? 'Loading models...' : 'Model'
            }
            error={errors.model}
            disabled={!formState.make || loadingModels}
          />
        </>
      ) : (
        <>
          <TextInput
            label="Make / Brand"
            value={formState.make}
            onChangeText={(text) => handleFormInputChange('make', text)}
            error={!!errors.make}
            style={formStyles.input}
          />
          <TextInput
            label="Model / Variant"
            value={formState.model}
            onChangeText={(text) => handleFormInputChange('model', text)}
            error={!!errors.model}
            style={formStyles.input}
          />
        </>
      )}

      <DropdownComponent
        data={yearOptions}
        value={formState.year}
        onChange={(value: string | null) => handleFormInputChange('year', value || '')}
        placeholder="Year (optional)"
        error={errors.year}
      />
    </View>
  );

  return (
    <RequireAuth message="You need to be logged in to create a post.">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>
        <View style={[formStyles.container, { backgroundColor: theme.colors.background }]}>
          <Header title={pageTitle} />
          <BasePostForm<PostFormData>
            title={pageTitle}
            formState={formState}
            errors={errors}
            onInputChange={handleFormInputChange}
            onLocationChange={handleFormLocationChange}
            onPickImage={handleImagePick}
            onRemoveImage={handleImageRemove}
            maxImages={VALIDATION_LIMITS.IMAGES_PER_POST}>
            {renderCategoryFields()}
          </BasePostForm>
          <Button mode="contained" onPress={handleFormSubmit} style={formStyles.submitButton}>
            {isUpdateMode ? 'Update Post' : 'Create'}
          </Button>
        </View>
      </KeyboardAvoidingView>
    </RequireAuth>
  );
}
