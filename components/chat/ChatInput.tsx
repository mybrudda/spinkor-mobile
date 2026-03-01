import React, { useState, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, useTheme, TextInput } from 'react-native-paper';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';

interface ChatInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  isSending?: boolean;
  disabled?: boolean;
  placeholder?: string;
  maxLength?: number;
}

export const ChatInput = ({
  value,
  onChangeText,
  onSend,
  isSending = false,
  disabled = false,
  placeholder = 'Type a message...',
  maxLength = 1000,
}: ChatInputProps) => {
  const theme = useTheme();
  const inputRef = useRef<any>(null);

  const [inputHeight, setInputHeight] = useState(40);
  const MIN_HEIGHT = 10;
  const MAX_HEIGHT = 80; // around 4 lines of text

  const hasText = value.trim().length > 0;

  const handleSend = () => {
    if (hasText && !isSending && !disabled) {
      onSend();
      inputRef.current?.blur();
      setInputHeight(MIN_HEIGHT);
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.surfaceVariant,
        },
      ]}>
      <View style={styles.inputRow}>
        <TextInput
          ref={inputRef}
          mode="outlined"
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          contentStyle={{
            minHeight: 0,
            paddingVertical: 0,
            paddingHorizontal: 12,
            paddingTop: 8,
            paddingBottom: 8,
          }}
          multiline
          maxLength={maxLength}
          editable={!disabled}
          style={[styles.input, { height: inputHeight }]}
          theme={{
            colors: {
              primary: theme.colors.primary,
              background: theme.colors.surfaceVariant,
            },
          }}
          textAlignVertical="top"
          scrollEnabled={false}
          onContentSizeChange={(e) => {
            const newHeight = Math.min(
              Math.max(MIN_HEIGHT, e.nativeEvent.contentSize.height),
              MAX_HEIGHT
            );
            setInputHeight(newHeight);
          }}
        />

        <TouchableOpacity
          style={[
            styles.sendButton,
            {
              backgroundColor: hasText ? theme.colors.primary : theme.colors.surfaceVariant,
            },
          ]}
          onPress={handleSend}
          disabled={disabled || !hasText || isSending}
          activeOpacity={0.8}>
          {isSending ? (
            <MaterialCommunityIcons name="loading" size={24} color={theme.colors.onPrimary} />
          ) : (
            <Ionicons
              name="send"
              size={20}
              color={hasText ? theme.colors.onPrimary : theme.colors.onSurfaceVariant}
            />
          )}
        </TouchableOpacity>
      </View>

      {value.length > maxLength * 0.8 && (
        <Text
          style={[
            styles.charCount,
            {
              color:
                value.length > maxLength * 0.9 ? theme.colors.error : theme.colors.onSurfaceVariant,
            },
          ]}>
          {value.length}/{maxLength}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 20,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  input: {
    flex: 1,
    borderRadius: 20,
  },
  charCount: {
    fontSize: 10,
    textAlign: 'right',
    marginTop: 4,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
