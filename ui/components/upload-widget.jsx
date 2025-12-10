/**
 * Upload Widget Component
 * React Native component for file upload functionality
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
  Platform,
} from 'react-native';
import { Upload, X, FileText } from 'lucide-react-native';
import { pickDocument, processResumeUpload, validateFile } from '../../api/upload-endpoints';
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from '../../memory/defaults';

/**
 * Upload Widget Component
 * @param {Object} props - Component props
 * @param {Function} props.onFileSelected - Callback when file is selected
 * @param {Function} props.onUploadComplete - Callback when upload completes
 * @param {Function} props.onUploadError - Callback when upload fails
 * @param {boolean} props.disabled - Whether upload is disabled
 * @param {string} props.label - Button label
 */
export default function UploadWidget({
  onFileSelected,
  onUploadComplete,
  onUploadError,
  disabled = false,
  label = 'Upload Resume',
}) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  /**
   * Handle file selection
   */
  const handlePickFile = useCallback(async () => {
    try {
      const file = await pickDocument({
        type: ['text/*', 'application/pdf', 'application/msword'],
      });

      if (!file) {
        // User cancelled
        return;
      }

      setSelectedFile(file);
      
      if (onFileSelected) {
        onFileSelected(file);
      }

      // Auto-start upload after selection
      await handleUpload(file);
    } catch (error) {
      console.error('[UploadWidget] Pick file error:', error);
      Alert.alert('Error', error.message || ERROR_MESSAGES.UPLOAD_FAILED);
      
      if (onUploadError) {
        onUploadError(error);
      }
    }
  }, [onFileSelected, onUploadError]);

  /**
   * Handle file upload
   */
  const handleUpload = useCallback(async (file) => {
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Process the upload
      const content = await processResumeUpload(file, (progress) => {
        setUploadProgress(progress);
      });

      setUploadProgress(1);
      
      if (onUploadComplete) {
        await onUploadComplete(file, content);
      }

      // Show success message
      if (Platform.OS !== 'web') {
        Alert.alert('Success', SUCCESS_MESSAGES.RESUME_UPLOADED);
      }
    } catch (error) {
      console.error('[UploadWidget] Upload error:', error);
      Alert.alert('Error', error.message || ERROR_MESSAGES.UPLOAD_FAILED);
      
      if (onUploadError) {
        onUploadError(error);
      }
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      setSelectedFile(null);
    }
  }, [onUploadComplete, onUploadError]);

  /**
   * Handle cancel
   */
  const handleCancel = useCallback(() => {
    setSelectedFile(null);
    setUploadProgress(0);
    setIsUploading(false);
  }, []);

  return (
    <View style={styles.container}>
      {!selectedFile && !isUploading ? (
        <TouchableOpacity
          style={[styles.uploadButton, disabled && styles.uploadButtonDisabled]}
          onPress={handlePickFile}
          disabled={disabled || isUploading}
        >
          <Upload size={20} color="#fff" />
          <Text style={styles.uploadButtonText}>{label}</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.uploadingContainer}>
          <View style={styles.fileInfo}>
            <FileText size={20} color="#007AFF" />
            <View style={styles.fileDetails}>
              <Text style={styles.fileName} numberOfLines={1}>
                {selectedFile?.name || 'Uploading...'}
              </Text>
              {isUploading && (
                <Text style={styles.uploadStatus}>
                  {Math.round(uploadProgress * 100)}% uploaded
                </Text>
              )}
            </View>
          </View>

          {isUploading ? (
            <ActivityIndicator size="small" color="#007AFF" />
          ) : (
            <TouchableOpacity onPress={handleCancel} style={styles.cancelButton}>
              <X size={20} color="#FF3B30" />
            </TouchableOpacity>
          )}
        </View>
      )}

      {isUploading && (
        <View style={styles.progressBarContainer}>
          <View
            style={[
              styles.progressBar,
              { width: `${uploadProgress * 100}%` },
            ]}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 8,
  },
  uploadButtonDisabled: {
    backgroundColor: '#ccc',
    opacity: 0.6,
  },
  uploadButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  uploadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f0f0f0',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  fileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  fileDetails: {
    flex: 1,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
  },
  uploadStatus: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  cancelButton: {
    padding: 4,
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 2,
  },
});

/**
 * Compact Upload Button (alternative style)
 */
export function CompactUploadButton({ onPress, disabled, isLoading }) {
  return (
    <TouchableOpacity
      style={[styles.compactButton, disabled && styles.compactButtonDisabled]}
      onPress={onPress}
      disabled={disabled || isLoading}
    >
      {isLoading ? (
        <ActivityIndicator size="small" color="#007AFF" />
      ) : (
        <Upload size={24} color="#007AFF" />
      )}
    </TouchableOpacity>
  );
}

const compactStyles = StyleSheet.create({
  compactButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactButtonDisabled: {
    opacity: 0.5,
  },
});

// Merge compact styles
Object.assign(styles, compactStyles);
