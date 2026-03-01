import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Pressable, TouchableOpacity } from 'react-native';
import {
  useTheme,
  Text,
  IconButton,
  Button,
  Divider,
  ActivityIndicator,
  Portal,
  Modal,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuthStore } from '../../../store/useAuthStore';
import { useThemeStore } from '../../../store/useThemeStore';
import { useCountryStore } from '../../../store/useCountryStore';
import { COUNTRY_DATA, Country } from '../../../constants/CountryData';
import LoadingScreen from '../../../components/ui/LoadingScreen';
import { supabase } from '../../../supabaseClient';
import LoginRequiredModal from '../../../components/auth/LoginRequiredModal';
import * as ImagePicker from 'expo-image-picker';
import ProfileImage from '../../../components/ui/ProfileImage';

interface UserProfile {
  id: string;
  username: string;
  display_name: string | null;
  profile_image_id: string | null;
  email: string;
  user_type: 'person' | 'company';
  is_verified: boolean;
  created_at?: string;
  is_admin?: boolean;
  is_banned?: boolean;
  banned_reason?: string | null;
  banned_at?: string | null;
  banned_by?: string | null;
}

export default function ProfileScreen() {
  const theme = useTheme();
  const { user, session, signOut } = useAuthStore();
  const { isDarkMode, toggleTheme } = useThemeStore();
  const { country, setCountry } = useCountryStore();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [tempImageUrl, setTempImageUrl] = useState<string | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showCountryModal, setShowCountryModal] = useState(false);

  useEffect(() => {
    if (user) {
      fetchUserProfile();
    } else {
      setIsLoading(false);
      setShowLoginModal(true);
    }
  }, [user]);

  // Clear temporary image URL when user changes
  useEffect(() => {
    setTempImageUrl(null);
  }, [user]);

  const fetchUserProfile = async () => {
    try {
      const { data, error } = await supabase.from('users').select('*').eq('id', user!.id).single();

      if (error) throw error;
      setUserProfile(data);
    } catch (error) {
      console.error('Error fetching user profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      router.replace('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleImagePick = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets[0].base64) {
        const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
        if (!supabaseUrl) {
          throw new Error('Supabase URL is not configured');
        }

        // Use session token from Zustand store
        if (!session?.access_token) {
          throw new Error('No valid session found');
        }

        // Create temporary image URL for optimistic update
        const tempImageUrl = `data:image/jpeg;base64,${result.assets[0].base64}`;

        // Store the original profile image ID for rollback
        const originalProfileImageId = userProfile?.profile_image_id || null;

        // Set temporary image URL for optimistic display
        setTempImageUrl(tempImageUrl);

        // Optimistic update - show new image immediately
        setUserProfile((prev) => (prev ? { ...prev, profile_image_id: 'temp' } : null));

        // Start upload in background
        setIsUploading(true);

        try {
          const response = await fetch(`${supabaseUrl}/functions/v1/update-profile-image`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              base64Image: tempImageUrl,
            }),
          });

          if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`Failed to update profile image: ${errorData}`);
          }

          const { profile_image_id } = await response.json();

          // Update with the actual profile image ID
          setUserProfile((prev) => (prev ? { ...prev, profile_image_id } : null));
          // Clear temporary image URL
          setTempImageUrl(null);
        } catch (error) {
          // Rollback on error - restore original profile image ID
          setUserProfile((prev) =>
            prev ? { ...prev, profile_image_id: originalProfileImageId } : null
          );
          // Clear temporary image URL on error
          setTempImageUrl(null);
          console.error('Error updating profile image:', error);
          alert('Failed to update profile picture. Please try again.');
        } finally {
          setIsUploading(false);
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      alert('Failed to pick image. Please try again.');
    }
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <>
      {!user ? (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
          <View style={styles.emptyStateContainer}>
            <MaterialCommunityIcons
              name="account-circle-outline"
              size={64}
              color={theme.colors.onSurfaceVariant}
            />
            <Text
              variant="headlineSmall"
              style={[styles.emptyStateTitle, { color: theme.colors.onSurface }]}>
              Please Login
            </Text>
            <Text
              variant="bodyMedium"
              style={[styles.emptyStateText, { color: theme.colors.onSurfaceVariant }]}>
              You need to be logged in to view your profile.
            </Text>
          </View>
        </View>
      ) : (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
          {/* Header */}
          <View style={[styles.header, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.headerTop}>
              <View style={styles.logoContainer}>
                <Pressable onPress={handleImagePick} style={styles.avatarContainer}>
                  <View style={styles.avatarWrapper}>
                    <ProfileImage
                      imageId={userProfile?.profile_image_id}
                      size={80}
                      folder="avatars"
                      tempImageUrl={tempImageUrl}
                    />
                    {isUploading && (
                      <View style={styles.uploadingOverlay}>
                        <ActivityIndicator color={theme.colors.primary} size="small" />
                      </View>
                    )}
                  </View>
                </Pressable>
                <Text variant="titleLarge" style={{ marginLeft: 8 }}>
                  {userProfile?.username || 'Profile'}
                </Text>
              </View>
            </View>
          </View>

          {/* Profile Info */}
          <View style={[styles.profileInfo, { backgroundColor: theme.colors.surface }]}>
            <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
              {userProfile?.email || ''}
            </Text>
            <Text
              variant="bodyMedium"
              style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
              {userProfile?.display_name || userProfile?.username || 'User'}
            </Text>
          </View>

          {/* Navigation Options */}
          <View style={[styles.navigationContainer, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.navigationContent}>
              <TouchableOpacity
                onPress={() => router.push('/profile/my-posts' as any)}
                style={styles.navigationButton}
                activeOpacity={0.7}>
                <View style={styles.buttonInner}>
                  <View style={styles.buttonLeftContent}>
                    <MaterialCommunityIcons name="post" size={20} color={theme.colors.primary} />
                    <Text variant="bodyMedium" style={styles.buttonText}>
                      My Posts
                    </Text>
                  </View>
                  <MaterialCommunityIcons
                    name="chevron-right"
                    size={20}
                    color={theme.colors.onSurfaceVariant}
                  />
                </View>
              </TouchableOpacity>
              <Divider />
              <TouchableOpacity
                onPress={() => router.push('/profile/saved-posts' as any)}
                style={styles.navigationButton}
                activeOpacity={0.7}>
                <View style={styles.buttonInner}>
                  <View style={styles.buttonLeftContent}>
                    <MaterialCommunityIcons
                      name="bookmark"
                      size={20}
                      color={theme.colors.primary}
                    />
                    <Text variant="bodyMedium" style={styles.buttonText}>
                      Saved Posts
                    </Text>
                  </View>
                  <MaterialCommunityIcons
                    name="chevron-right"
                    size={20}
                    color={theme.colors.onSurfaceVariant}
                  />
                </View>
              </TouchableOpacity>
              <Divider />
              <TouchableOpacity
                onPress={() => router.push('/profile/BlockedUsers' as any)}
                style={styles.navigationButton}
                activeOpacity={0.7}>
                <View style={styles.buttonInner}>
                  <View style={styles.buttonLeftContent}>
                    <MaterialCommunityIcons
                      name="account-remove"
                      size={20}
                      color={theme.colors.primary}
                    />
                    <Text variant="bodyMedium" style={styles.buttonText}>
                      Blocked Users
                    </Text>
                  </View>
                  <MaterialCommunityIcons
                    name="chevron-right"
                    size={20}
                    color={theme.colors.onSurfaceVariant}
                  />
                </View>
              </TouchableOpacity>
              <Divider />
              <TouchableOpacity
                onPress={() => router.push('/(tabs)/profile/contact-support' as any)}
                style={styles.navigationButton}
                activeOpacity={0.7}>
                <View style={styles.buttonInner}>
                  <View style={styles.buttonLeftContent}>
                    <MaterialCommunityIcons name="headset" size={20} color={theme.colors.primary} />
                    <Text variant="bodyMedium" style={styles.buttonText}>
                      Contact Support
                    </Text>
                  </View>
                  <MaterialCommunityIcons
                    name="chevron-right"
                    size={20}
                    color={theme.colors.onSurfaceVariant}
                  />
                </View>
              </TouchableOpacity>
              <Divider />
              <TouchableOpacity
                onPress={() => router.push('/(tabs)/profile/notification-settings' as any)}
                style={styles.navigationButton}
                activeOpacity={0.7}>
                <View style={styles.buttonInner}>
                  <View style={styles.buttonLeftContent}>
                    <MaterialCommunityIcons name="bell" size={20} color={theme.colors.primary} />
                    <Text variant="bodyMedium" style={styles.buttonText}>
                      Notification Settings
                    </Text>
                  </View>
                  <MaterialCommunityIcons
                    name="chevron-right"
                    size={20}
                    color={theme.colors.onSurfaceVariant}
                  />
                </View>
              </TouchableOpacity>
              <Divider />
              <TouchableOpacity
                onPress={() => setShowCountryModal(true)}
                style={styles.navigationButton}
                activeOpacity={0.7}>
                <View style={styles.buttonInner}>
                  <View style={styles.buttonLeftContent}>
                    <MaterialCommunityIcons name="earth" size={20} color={theme.colors.primary} />
                    <View style={styles.countryInfoContainer}>
                      <Text variant="bodyMedium" style={styles.buttonText}>
                        Location / Country
                      </Text>
                      {country && (
                        <Text
                          variant="bodySmall"
                          style={[styles.countrySubtext, { color: theme.colors.onSurfaceVariant }]}>
                          {COUNTRY_DATA[country].name}
                        </Text>
                      )}
                    </View>
                  </View>
                  <MaterialCommunityIcons
                    name="chevron-right"
                    size={20}
                    color={theme.colors.onSurfaceVariant}
                  />
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* Bottom Actions */}
          <View style={[styles.bottomActionsContainer, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.bottomActionsContent}>
              <TouchableOpacity
                onPress={toggleTheme}
                style={styles.bottomActionButton}
                activeOpacity={0.7}>
                <View style={styles.buttonInner}>
                  <View style={styles.buttonLeftContent}>
                    <MaterialCommunityIcons
                      name={isDarkMode ? 'weather-sunny' : 'weather-night'}
                      size={20}
                      color={theme.colors.primary}
                    />
                    <Text variant="bodyMedium" style={styles.buttonText}>
                      {isDarkMode ? 'Light Mode' : 'Dark Mode'}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
              <Divider />
              <TouchableOpacity
                onPress={handleSignOut}
                style={styles.bottomActionButton}
                activeOpacity={0.7}>
                <View style={styles.buttonInner}>
                  <View style={styles.buttonLeftContent}>
                    <MaterialCommunityIcons name="logout" size={20} color={theme.colors.error} />
                    <Text
                      variant="bodyMedium"
                      style={[styles.buttonText, { color: theme.colors.error }]}>
                      Sign Out
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      <Portal>
        <LoginRequiredModal
          visible={showLoginModal}
          onDismiss={() => setShowLoginModal(false)}
          action="custom"
          customTitle="Login Required"
          customMessage="You need to be logged in to view profile"
        />

        {/* Country Selection Modal */}
        <Modal
          visible={showCountryModal}
          onDismiss={() => setShowCountryModal(false)}
          contentContainerStyle={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.modalHeader}>
            <Text
              variant="headlineSmall"
              style={[styles.modalTitle, { color: theme.colors.onSurface }]}>
              Select Your Country
            </Text>
            <IconButton icon="close" size={24} onPress={() => setShowCountryModal(false)} />
          </View>

          <Text
            variant="bodyMedium"
            style={[styles.modalDescription, { color: theme.colors.onSurfaceVariant }]}>
            Changing your country will update the listings you see and the available cities.
          </Text>

          <View style={styles.countryOptionsContainer}>
            <TouchableOpacity
              onPress={async () => {
                await setCountry('afghanistan');
                setShowCountryModal(false);
                // Optionally refresh posts or show a success message
              }}
              activeOpacity={0.7}>
              <View
                style={[
                  styles.countryOption,
                  {
                    backgroundColor:
                      country === 'afghanistan'
                        ? theme.colors.primaryContainer
                        : theme.colors.surfaceVariant,
                    borderColor:
                      country === 'afghanistan' ? theme.colors.primary : theme.colors.outline,
                    borderWidth: country === 'afghanistan' ? 2 : 1,
                  },
                ]}>
                <MaterialCommunityIcons
                  name="flag"
                  size={32}
                  color={
                    country === 'afghanistan' ? theme.colors.primary : theme.colors.onSurfaceVariant
                  }
                />
                <View style={styles.countryOptionText}>
                  <Text
                    variant="titleMedium"
                    style={[
                      styles.countryOptionName,
                      {
                        color:
                          country === 'afghanistan'
                            ? theme.colors.onPrimaryContainer
                            : theme.colors.onSurfaceVariant,
                      },
                    ]}>
                    Afghanistan
                  </Text>
                  <Text
                    variant="bodySmall"
                    style={[
                      styles.countryOptionCurrency,
                      {
                        color:
                          country === 'afghanistan'
                            ? theme.colors.onPrimaryContainer
                            : theme.colors.onSurfaceVariant,
                      },
                    ]}>
                    Currency: {COUNTRY_DATA.afghanistan.currency}
                  </Text>
                </View>
                {country === 'afghanistan' && (
                  <MaterialCommunityIcons
                    name="check-circle"
                    size={24}
                    color={theme.colors.primary}
                  />
                )}
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={async () => {
                await setCountry('pakistan');
                setShowCountryModal(false);
              }}
              activeOpacity={0.7}>
              <View
                style={[
                  styles.countryOption,
                  {
                    backgroundColor:
                      country === 'pakistan'
                        ? theme.colors.primaryContainer
                        : theme.colors.surfaceVariant,
                    borderColor:
                      country === 'pakistan' ? theme.colors.primary : theme.colors.outline,
                    borderWidth: country === 'pakistan' ? 2 : 1,
                  },
                ]}>
                <MaterialCommunityIcons
                  name="flag"
                  size={32}
                  color={
                    country === 'pakistan' ? theme.colors.primary : theme.colors.onSurfaceVariant
                  }
                />
                <View style={styles.countryOptionText}>
                  <Text
                    variant="titleMedium"
                    style={[
                      styles.countryOptionName,
                      {
                        color:
                          country === 'pakistan'
                            ? theme.colors.onPrimaryContainer
                            : theme.colors.onSurfaceVariant,
                      },
                    ]}>
                    Pakistan
                  </Text>
                  <Text
                    variant="bodySmall"
                    style={[
                      styles.countryOptionCurrency,
                      {
                        color:
                          country === 'pakistan'
                            ? theme.colors.onPrimaryContainer
                            : theme.colors.onSurfaceVariant,
                      },
                    ]}>
                    Currency: {COUNTRY_DATA.pakistan.currency}
                  </Text>
                </View>
                {country === 'pakistan' && (
                  <MaterialCommunityIcons
                    name="check-circle"
                    size={24}
                    color={theme.colors.primary}
                  />
                )}
              </View>
            </TouchableOpacity>
          </View>

          <Button
            mode="contained"
            onPress={() => setShowCountryModal(false)}
            style={styles.modalCloseButton}>
            Done
          </Button>
        </Modal>
      </Portal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    elevation: 2,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatarWrapper: {
    position: 'relative',
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  profileInfo: {
    padding: 16,
    marginTop: 10,
  },
  navigationContainer: {
    marginTop: 10,
    borderRadius: 8,
    marginHorizontal: 16,
  },
  navigationContent: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  navigationButton: {
    height: 50,
    marginHorizontal: 0,
    borderRadius: 0,
    justifyContent: 'flex-start',
    paddingHorizontal: 16,
  },
  buttonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flex: 1,
    paddingVertical: 4,
    paddingRight: 8,
  },
  buttonLeftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    justifyContent: 'flex-start',
    flex: 1,
  },
  buttonText: {
    marginLeft: 0,
  },
  bottomActionsContainer: {
    marginTop: 'auto',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
  },
  bottomActionsContent: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  bottomActionButton: {
    height: 48,
    marginHorizontal: 0,
    borderRadius: 0,
    justifyContent: 'flex-start',
    paddingHorizontal: 16,
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyStateTitle: {
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateText: {
    textAlign: 'center',
    marginBottom: 24,
  },
  countryInfoContainer: {
    flex: 1,
  },
  countrySubtext: {
    marginTop: 2,
    fontSize: 12,
  },
  modalContent: {
    margin: 20,
    borderRadius: 16,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontWeight: '600',
    flex: 1,
  },
  modalDescription: {
    marginBottom: 24,
    lineHeight: 20,
  },
  countryOptionsContainer: {
    gap: 12,
    marginBottom: 24,
  },
  countryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 16,
  },
  countryOptionText: {
    flex: 1,
  },
  countryOptionName: {
    fontWeight: '600',
    marginBottom: 4,
  },
  countryOptionCurrency: {
    opacity: 0.8,
  },
  modalCloseButton: {
    marginTop: 8,
  },
});
