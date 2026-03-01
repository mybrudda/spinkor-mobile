import React from 'react';
import { View, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Conversation } from '../../types/chat';
import ProfileImage from '../ui/ProfileImage';

interface UserInfoModalProps {
  visible: boolean;
  onClose: () => void;
  conversation: Conversation | null;
  blurhash: string;
}

export const UserInfoModal = ({ visible, onClose, conversation, blurhash }: UserInfoModalProps) => {
  const theme = useTheme();

  return (
    <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.modalHeader}>
            <Text variant="titleLarge" style={{ color: theme.colors.onSurface }}>
              User Information
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <MaterialCommunityIcons
                name="close"
                size={24}
                color={theme.colors.onSurfaceVariant}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.userInfoContent}>
            <View style={styles.avatarContainer}>
              <ProfileImage
                imageId={conversation?.other_user_profile_image_id}
                size={80}
                folder="avatars"
              />
            </View>

            <View style={styles.userDetails}>
              <View style={styles.nameRow}>
                <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
                  {conversation?.other_user_display_name || 'Not provided'}
                </Text>
                {conversation?.other_user_is_verified && (
                  <MaterialCommunityIcons
                    name="check-decagram"
                    size={20}
                    color={theme.colors.primary}
                    style={styles.verifiedIcon}
                  />
                )}
              </View>
              <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>
                @{conversation?.other_user_name || 'Unknown'}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 20,
    width: '80%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  closeButton: {
    padding: 5,
  },
  userInfoContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    marginRight: 20,
  },
  modalAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  userDetails: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  verifiedIcon: {
    marginLeft: 5,
  },
});
