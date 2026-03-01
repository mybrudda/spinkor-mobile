import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Modal, Portal, Text, Button, TextInput, useTheme } from 'react-native-paper';
import DropdownComponent from './ui/Dropdown';
import { useAuthStore } from '../store/useAuthStore';

interface ReportPostModalProps {
  visible: boolean;
  onDismiss: () => void;
  postId: string;
  reporterId: string;
  postOwnerId: string;
  postTitle: string;
}

type ReportReason = 'inappropriate' | 'spam' | 'fake' | 'offensive' | 'other';

const reportReasons = [
  { value: 'inappropriate', label: 'Inappropriate Content' },
  { value: 'spam', label: 'Spam' },
  { value: 'fake', label: 'Fake or Misleading' },
  { value: 'offensive', label: 'Offensive' },
  { value: 'other', label: 'Other' },
];

const reportReasonDescriptions = {
  inappropriate: 'Content that violates community guidelines',
  spam: 'Repeated or unwanted promotional content',
  fake: 'False information or misleading details',
  offensive: 'Content that is offensive or harmful',
  other: 'Other reasons not listed above',
};

export default function ReportPostModal({
  visible,
  onDismiss,
  postId,
  reporterId,
  postOwnerId,
}: ReportPostModalProps) {
  const theme = useTheme();
  const { session } = useAuthStore();
  const [reason, setReason] = useState<ReportReason>('inappropriate');
  const [details, setDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [detailsError, setDetailsError] = useState('');
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;

  // Constants for validation
  const MAX_DETAILS_LENGTH = 200;
  const MIN_DETAILS_LENGTH = 10;

  const selectedReasonDescription = reportReasonDescriptions[reason];

  // Validate details input
  const validateDetails = (text: string) => {
    if (text.length > MAX_DETAILS_LENGTH) {
      setDetailsError(`Details must be ${MAX_DETAILS_LENGTH} characters or less`);
      return false;
    }
    if (text.length > 0 && text.length < MIN_DETAILS_LENGTH) {
      setDetailsError(`Details must be at least ${MIN_DETAILS_LENGTH} characters`);
      return false;
    }
    setDetailsError('');
    return true;
  };

  const handleDetailsChange = (text: string) => {
    setDetails(text);
    if (text.length > 0) {
      validateDetails(text);
    } else {
      setDetailsError('');
    }
  };

  const handleSubmit = async () => {
    if (!reason) return;

    // Validate details before submission
    if (details.trim() && !validateDetails(details.trim())) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Check if user is authenticated using Zustand store
      if (!session) {
        throw new Error('Authentication required. Please log in again.');
      }

      // Prepare the report data with validation
      const reportData = {
        post_id: postId,
        reporter_id: reporterId,
        post_owner_id: postOwnerId,
        reason: reason,
        details: details.trim() || null,
      };

      // Validation for data length
      if (reportData.details && reportData.details.length > MAX_DETAILS_LENGTH) {
        throw new Error(`Details must be ${MAX_DETAILS_LENGTH} characters or less`);
      }

      // Make API call to Supabase function
      const response = await fetch(`${supabaseUrl}/functions/v1/create-post-report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(reportData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to submit report (${response.status})`);
      }

      const result = await response.json();

      console.log('Report submitted successfully:', {
        reportId: result.id,
        postId,
        reporterId,
        postOwnerId,
        reason,
        details: details.trim() || null,
        timestamp: new Date().toISOString(),
      });

      setIsSuccess(true);

      // Auto-dismiss after showing success
      setTimeout(() => {
        handleDismiss();
      }, 2000);
    } catch (error) {
      console.error('Error submitting report:', error);

      Alert.alert(
        'Report Submission Failed',
        error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDismiss = () => {
    setReason('inappropriate');
    setDetails('');
    setIsSubmitting(false);
    setIsSuccess(false);
    setDetailsError('');
    onDismiss();
  };

  if (isSuccess) {
    return (
      <Portal>
        {visible && (
          <View style={styles.backdrop}>
            <Modal
              visible={visible}
              onDismiss={handleDismiss}
              contentContainerStyle={[
                styles.modalContainer,
                { backgroundColor: theme.colors.surface },
              ]}>
              <View style={styles.successContainer}>
                <Text
                  variant="headlineSmall"
                  style={[styles.successTitle, { color: theme.colors.primary }]}>
                  Report Submitted
                </Text>
                <Text
                  variant="bodyMedium"
                  style={[styles.successMessage, { color: theme.colors.onSurface }]}>
                  Thank you for your report. We will review it and take appropriate action if
                  necessary.
                </Text>
              </View>
            </Modal>
          </View>
        )}
      </Portal>
    );
  }

  return (
    <Portal>
      {visible && (
        <View style={styles.backdrop}>
          <Modal
            visible={visible}
            onDismiss={handleDismiss}
            contentContainerStyle={[
              styles.modalContainer,
              { backgroundColor: theme.colors.surface },
            ]}>
            <View style={[styles.header, { borderBottomColor: theme.colors.outline }]}>
              <Text
                variant="headlineSmall"
                style={[styles.title, { color: theme.colors.onSurface }]}>
                Report
              </Text>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
              <Text
                variant="titleMedium"
                style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
                Reason
              </Text>

              <DropdownComponent
                data={reportReasons}
                value={reason}
                onChange={(value) => setReason(value as ReportReason)}
                placeholder="Select a reason for reporting"
                searchable={false}
              />

              {selectedReasonDescription && (
                <Text
                  variant="bodySmall"
                  style={[styles.reasonDescription, { color: theme.colors.onSurfaceVariant }]}>
                  {selectedReasonDescription}
                </Text>
              )}

              <Text
                variant="titleMedium"
                style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
                Details (Optional)
              </Text>

              <TextInput
                mode="outlined"
                multiline
                numberOfLines={4}
                placeholder="Please provide any additional details..."
                value={details}
                onChangeText={handleDetailsChange}
                style={styles.textInput}
                outlineColor={detailsError ? theme.colors.error : theme.colors.outline}
                activeOutlineColor={theme.colors.primary}
                contentStyle={styles.textInputContent}
                error={!!detailsError}
                right={
                  details.length > 0 ? (
                    <TextInput.Affix text={`${details.length}/${MAX_DETAILS_LENGTH}`} />
                  ) : undefined
                }
              />
              {detailsError ? (
                <Text variant="bodySmall" style={[styles.errorText, { color: theme.colors.error }]}>
                  {detailsError}
                </Text>
              ) : details.length > 0 ? (
                <Text
                  variant="bodySmall"
                  style={[styles.helpText, { color: theme.colors.onSurfaceVariant }]}>
                  {details.length >= MIN_DETAILS_LENGTH
                    ? null
                    : `At least ${MIN_DETAILS_LENGTH} characters needed`}
                </Text>
              ) : (
                <Text
                  variant="bodySmall"
                  style={[styles.helpText, { color: theme.colors.onSurfaceVariant }]}>
                  (Optional) Provide more details if needed.
                </Text>
              )}
            </ScrollView>

            <View style={[styles.footer, { borderTopColor: theme.colors.outline }]}>
              <Button
                mode="outlined"
                onPress={handleDismiss}
                style={styles.footerButton}
                disabled={isSubmitting}>
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={handleSubmit}
                loading={isSubmitting}
                disabled={isSubmitting}
                style={styles.footerButton}>
                Submit Report
              </Button>
            </View>
          </Modal>
        </View>
      )}
    </Portal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    margin: 20,
    borderRadius: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  title: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  subtitle: {
    marginBottom: 20,
    lineHeight: 20,
  },
  sectionTitle: {
    marginTop: 20,
    marginBottom: 12,
    fontWeight: '600',
  },
  textInput: {
    marginBottom: 16,
  },
  textInputContent: {
    paddingVertical: 12,
    minHeight: 100,
  },
  helpText: {
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    borderTopWidth: 1,
    gap: 12,
  },
  footerButton: {
    flex: 1,
  },
  successContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: {
    marginBottom: 16,
    textAlign: 'center',
  },
  successMessage: {
    textAlign: 'center',
    lineHeight: 20,
  },
  reasonDescription: {
    marginTop: 8,
    marginBottom: 16,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    marginTop: 8,
  },
});
