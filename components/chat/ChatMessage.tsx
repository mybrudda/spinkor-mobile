import React, { memo, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Text, useTheme, Menu } from 'react-native-paper';
import { Message } from '../../types/chat';
import { format, isToday, isYesterday } from 'date-fns';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface ChatMessageProps {
  message: Message;
  isOwnMessage: boolean;
  hasFailed?: boolean;
  onRetry?: () => void;
  onLongPress?: () => void;
  isFirstInGroup?: boolean;
  isLastInGroup?: boolean;
}

export const ChatMessage = memo(
  ({
    message,
    isOwnMessage,
    hasFailed,
    onRetry,
    onLongPress,
    isFirstInGroup = true,
    isLastInGroup = true,
  }: ChatMessageProps) => {
    const theme = useTheme();
    const [menuVisible, setMenuVisible] = useState(false);

    const formatTime = (date: string) => {
      const messageDate = new Date(date);
      return format(messageDate, 'h:mm a');
    };

    return (
      <View style={styles.wrapper}>
        <View
          style={[
            styles.container,
            isOwnMessage ? styles.ownMessageContainer : styles.otherMessageContainer,
            isFirstInGroup && (isOwnMessage ? styles.ownFirstInGroup : styles.otherFirstInGroup),
            isLastInGroup && (isOwnMessage ? styles.ownLastInGroup : styles.otherLastInGroup),
            !isFirstInGroup && !isLastInGroup && styles.middleInGroup,
            hasFailed && styles.failedMessage,
          ]}>
          <TouchableOpacity
            onLongPress={onLongPress}
            onPress={hasFailed ? onRetry : undefined}
            activeOpacity={0.8}
            style={styles.messageTouchable}>
            <View
              style={[
                styles.bubble,
                {
                  backgroundColor: isOwnMessage
                    ? hasFailed
                      ? theme.colors.errorContainer
                      : theme.colors.primary
                    : theme.colors.surfaceVariant,
                  borderTopLeftRadius: isOwnMessage ? 16 : isFirstInGroup ? 16 : 4,
                  borderTopRightRadius: isOwnMessage ? (isFirstInGroup ? 16 : 4) : 16,
                  borderBottomLeftRadius: isOwnMessage ? 16 : isLastInGroup ? 16 : 4,
                  borderBottomRightRadius: isOwnMessage ? (isLastInGroup ? 16 : 4) : 16,
                },
              ]}>
              <Text
                variant="bodyMedium"
                style={[
                  styles.messageText,
                  {
                    color: isOwnMessage
                      ? hasFailed
                        ? theme.colors.error
                        : theme.colors.onPrimary
                      : theme.colors.onSurface,
                  },
                ]}>
                {message.content}
              </Text>
              {hasFailed && (
                <MaterialCommunityIcons
                  name="alert-circle"
                  size={16}
                  color={theme.colors.error}
                  style={styles.errorIcon}
                />
              )}
            </View>

            <View
              style={[
                styles.messageFooter,
                isOwnMessage ? styles.ownMessageFooter : styles.otherMessageFooter,
              ]}>
              <Text
                variant="labelSmall"
                style={[
                  styles.timeText,
                  { color: hasFailed ? theme.colors.error : theme.colors.onSurfaceVariant },
                ]}>
                {hasFailed ? 'Failed to send - Tap to retry' : formatTime(message.created_at)}
              </Text>
              {isOwnMessage && !hasFailed && (
                <View style={styles.readStatusContainer}>
                  <MaterialCommunityIcons
                    name={message.read_at ? 'check-all' : 'check'}
                    size={16}
                    color={message.read_at ? theme.colors.primary : theme.colors.onSurfaceVariant}
                    style={styles.readStatusIcon}
                  />
                </View>
              )}
            </View>
          </TouchableOpacity>
        </View>
      </View>
    );
  },
  (prevProps, nextProps) => {
    // Enhanced comparison function for better memoization
    return (
      prevProps.message.id === nextProps.message.id &&
      prevProps.message.content === nextProps.message.content &&
      prevProps.message.created_at === nextProps.message.created_at &&
      prevProps.message.read_at === nextProps.message.read_at &&
      prevProps.isOwnMessage === nextProps.isOwnMessage &&
      prevProps.hasFailed === nextProps.hasFailed &&
      prevProps.isFirstInGroup === nextProps.isFirstInGroup &&
      prevProps.isLastInGroup === nextProps.isLastInGroup
    );
  }
);

ChatMessage.displayName = 'ChatMessage';

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
  },
  container: {
    marginVertical: 1,
    marginBottom: 8,
    maxWidth: '75%',
    paddingHorizontal: 8,
  },
  ownMessageContainer: {
    alignSelf: 'flex-end',
  },
  otherMessageContainer: {
    alignSelf: 'flex-start',
  },
  ownFirstInGroup: {
    marginBottom: 2,
  },
  otherFirstInGroup: {
    marginBottom: 2,
  },
  ownLastInGroup: {
    marginTop: 2,
  },
  otherLastInGroup: {
    marginTop: 2,
  },
  middleInGroup: {
    marginVertical: 1,
  },
  messageTouchable: {
    minWidth: 60,
  },
  bubble: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'flex-end',
    minHeight: 32,
  },
  messageText: {
    flexShrink: 1,
    lineHeight: 20,
    fontSize: 16,
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    marginHorizontal: 4,
    minHeight: 16,
  },
  ownMessageFooter: {
    justifyContent: 'flex-end',
  },
  otherMessageFooter: {
    justifyContent: 'flex-start',
  },
  timeText: {
    fontSize: 11,
    fontWeight: '400',
  },
  failedMessage: {
    opacity: 0.9,
  },
  errorIcon: {
    marginLeft: 6,
    marginBottom: 2,
  },
  readStatusContainer: {
    marginLeft: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  readStatusIcon: {
    marginLeft: 2,
  },
});
