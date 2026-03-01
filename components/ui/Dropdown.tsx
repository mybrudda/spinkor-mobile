import React, { useState } from 'react';
import { StyleSheet, View, Text, ActivityIndicator } from 'react-native';
import { Dropdown } from 'react-native-element-dropdown';
import AntDesign from '@expo/vector-icons/AntDesign';
import { useTheme, HelperText } from 'react-native-paper';

interface DropdownItem {
  label: string;
  value: string;
}

interface DropdownComponentProps {
  data: DropdownItem[];
  value: string | null;
  onChange: (value: string) => void;
  placeholder: string;
  error?: string;
  disabled?: boolean;
  loading?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
}

const DropdownComponent: React.FC<DropdownComponentProps> = ({
  data,
  value,
  onChange,
  placeholder,
  error,
  disabled = false,
  loading = false,
  searchable = true,
  searchPlaceholder = 'Search...',
}) => {
  const { colors } = useTheme();
  const [isFocused, setIsFocused] = useState(false);

  const renderItem = (item: DropdownItem) => {
    const isSelected = item.value === value;

    return (
      <View
        style={[
          styles.item,
          {
            borderBottomColor: colors.outlineVariant || '#ccc',
            backgroundColor: isSelected ? colors.secondaryContainer : colors.surfaceVariant,
          },
        ]}>
        <Text style={[styles.textItem, { color: colors.onSurface }]}>{item.label}</Text>
        {isSelected && (
          <AntDesign style={styles.icon} color={colors.primary} name="check-circle" size={20} />
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View
        style={[
          styles.dropdown,
          {
            backgroundColor: colors.surfaceVariant,
            borderColor: colors.outline,
            borderWidth: 1,
            justifyContent: 'center',
            alignItems: 'center',
          },
        ]}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={{ marginBottom: error ? 4 : 15 }}>
      <Dropdown
        style={[
          styles.dropdown,
          {
            backgroundColor: colors.surfaceVariant,
            borderColor: error ? colors.error : isFocused ? colors.primary : colors.outline,
            borderBottomWidth: isFocused ? 2 : 1,
            opacity: disabled ? 0.6 : 1,
          },
        ]}
        containerStyle={{ backgroundColor: colors.surfaceVariant }}
        itemContainerStyle={{ backgroundColor: colors.surfaceVariant }}
        placeholderStyle={[styles.placeholderStyle, { color: colors.onSurfaceVariant }]}
        selectedTextStyle={[
          styles.selectedTextStyle,
          { color: error ? colors.error : colors.onSurface },
        ]}
        inputSearchStyle={[styles.inputSearchStyle, { color: colors.onSurface }]}
        data={data}
        search={searchable}
        maxHeight={300}
        labelField="label"
        valueField="value"
        placeholder={value ? '' : placeholder}
        searchPlaceholder={searchPlaceholder}
        value={value}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        onChange={(item) => {
          onChange(item.value);
          setIsFocused(false);
        }}
        renderItem={renderItem}
        disable={disabled}
        testID={`dropdown-${placeholder}`}
      />
      {error && (
        <HelperText type="error" visible={true}>
          {error}
        </HelperText>
      )}
    </View>
  );
};

export default DropdownComponent;

const styles = StyleSheet.create({
  dropdown: {
    height: 50,
    borderRadius: 4,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  icon: {
    marginRight: 5,
  },
  item: {
    padding: 17,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  textItem: {
    flex: 1,
    fontSize: 16,
  },
  placeholderStyle: {
    fontSize: 16,
  },
  selectedTextStyle: {
    fontSize: 16,
  },
  iconStyle: {
    width: 20,
    height: 20,
  },
  inputSearchStyle: {
    height: 40,
    fontSize: 16,
  },
});
