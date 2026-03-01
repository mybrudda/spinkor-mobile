import { View, StyleSheet, Pressable } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';

interface HeaderProps {
  title: string;
  onBackPress?: () => void;
  rightElement?: React.ReactNode;
}

export default function Header({ title, onBackPress, rightElement }: HeaderProps) {
  const theme = useTheme();

  const handleBackPress = () => {
    if (onBackPress) {
      onBackPress();
    } else {
      router.back();
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.content}>
        <Pressable
          onPress={handleBackPress}
          style={({ pressed }) => [styles.backButton, pressed && { opacity: 0.7 }]}>
          <MaterialCommunityIcons
            name="arrow-left"
            size={24}
            color={theme.colors.onSecondaryContainer}
          />
        </Pressable>

        <Text
          variant="titleLarge"
          style={[styles.title, { color: theme.colors.onSecondaryContainer }]}
          numberOfLines={1}>
          {title}
        </Text>

        <View style={styles.rightContainer}>{rightElement}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 40,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.23,
    shadowRadius: 2.62,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    flex: 1,
    marginHorizontal: 8,
  },
  rightContainer: {
    minWidth: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
