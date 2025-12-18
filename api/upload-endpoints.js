/**
 * Upload Endpoints
 * API endpoints for file upload handling
 */

import * as FileSystem from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import { UPLOAD_CONFIG, ERROR_MESSAGES } from '../memory/defaults.js';

/**
 * Pick a document from the device
 * @param {Object} options - Picker options
 * @returns {Promise<Object>} Selected document
 */
export async function pickDocument(options = {}) {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: options.type || ['text/*', 'application/pdf', 'application/msword'],
      copyToCacheDirectory: true,
      multiple: false,
    });

    if (result.canceled) {
      return null;
    }

    const file = result.assets?.[0] || result;

    // Validate file
    const validation = validateFile(file);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    return file;
  } catch (error) {
    console.error('[pickDocument] Error:', error);
    throw new Error(`Document picker error: ${error.message}`);
  }
}

/**
 * Validate uploaded file
 * @param {Object} file - File object
 * @returns {Object} Validation result
 */
export function validateFile(file) {
  if (!file) {
    return { valid: false, error: 'No file provided' };
  }

  // Check file size
  if (file.size && file.size > UPLOAD_CONFIG.MAX_FILE_SIZE) {
    return { valid: false, error: ERROR_MESSAGES.FILE_TOO_LARGE };
  }

  // Check file type
  if (file.type && !UPLOAD_CONFIG.ALLOWED_TYPES.includes(file.type)) {
    const extension = file.name?.split('.').pop()?.toLowerCase();
    if (!extension || !UPLOAD_CONFIG.ALLOWED_EXTENSIONS.includes(`.${extension}`)) {
      return { valid: false, error: ERROR_MESSAGES.INVALID_FILE };
    }
  }

  return { valid: true };
}

/**
 * Read file content as text
 * @param {string} uri - File URI
 * @returns {Promise<string>} File content
 */
export async function readFileAsText(uri) {
  try {
    // Try FileSystem first
    try {
      const content = await FileSystem.readAsStringAsync(uri, {
        encoding: 'utf8',
      });
      return content;
    } catch (fsError) {
      console.warn('[readFileAsText] FileSystem read failed, trying fetch fallback:', fsError);
      
      // Fallback to fetch for web or if FileSystem fails
      const response = await fetch(uri);
      const content = await response.text();
      return content;
    }
  } catch (error) {
    console.error('[readFileAsText] Error:', error);
    throw new Error(`Failed to read file: ${error.message}`);
  }
}

/**
 * Read file content as base64
 * @param {string} uri - File URI
 * @returns {Promise<string>} Base64 content
 */
export async function readFileAsBase64(uri) {
  try {
    const content = await FileSystem.readAsStringAsync(uri, {
      encoding: 'base64',
    });
    return content;
  } catch (error) {
    console.error('[readFileAsBase64] Error:', error);
    throw new Error(`Failed to read file as base64: ${error.message}`);
  }
}

/**
 * Upload file to server
 * @param {Object} file - File object
 * @param {string} endpoint - Upload endpoint URL
 * @returns {Promise<Object>} Upload response
 */
export async function uploadFile(file, endpoint = '/api/upload') {
  try {
    const formData = new FormData();
    
    // For React Native
    if (file.uri) {
      formData.append('file', {
        uri: file.uri,
        name: file.name,
        type: file.type || 'application/octet-stream',
      });
    } else {
      // For web
      formData.append('file', file);
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('[uploadFile] Error:', error);
    throw new Error(`Upload failed: ${error.message}`);
  }
}

/**
 * Process resume file upload
 * @param {Object} file - File object
 * @param {Function} onProgress - Progress callback
 * @returns {Promise<string>} File content
 */
export async function processResumeUpload(file, onProgress) {
  try {
    // Validate file
    const validation = validateFile(file);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Report progress
    if (onProgress) onProgress(0.2);

    // Read file content
    const content = await readFileAsText(file.uri);

    if (!content || content.trim().length === 0) {
      throw new Error('File is empty or could not be read');
    }

    // Report progress
    if (onProgress) onProgress(1.0);

    return content;
  } catch (error) {
    console.error('[processResumeUpload] Error:', error);
    throw error;
  }
}

/**
 * Handle file upload with retry logic
 * @param {Object} file - File object
 * @param {Object} options - Upload options
 * @returns {Promise<Object>} Upload result
 */
export async function uploadWithRetry(file, options = {}) {
  const maxRetries = options.maxRetries || 3;
  const retryDelay = options.retryDelay || 1000;
  
  let lastError;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const result = await uploadFile(file, options.endpoint);
      return result;
    } catch (error) {
      console.error(`[uploadWithRetry] Attempt ${attempt + 1} failed:`, error);
      lastError = error;

      if (attempt < maxRetries - 1) {
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)));
      }
    }
  }

  throw lastError;
}

/**
 * Get file info
 * @param {string} uri - File URI
 * @returns {Promise<Object>} File info
 */
export async function getFileInfo(uri) {
  try {
    if (FileSystem.getInfoAsync) {
      const info = await FileSystem.getInfoAsync(uri);
      return info;
    }

    // Fallback for web
    return {
      exists: true,
      uri,
      size: 0,
    };
  } catch (error) {
    console.error('[getFileInfo] Error:', error);
    return null;
  }
}

/**
 * Delete temporary file
 * @param {string} uri - File URI
 * @returns {Promise<boolean>} Success status
 */
export async function deleteTempFile(uri) {
  try {
    if (FileSystem.deleteAsync) {
      await FileSystem.deleteAsync(uri, { idempotent: true });
      return true;
    }
    return false;
  } catch (error) {
    console.error('[deleteTempFile] Error:', error);
    return false;
  }
}

/**
 * Create a mock file for testing
 * @param {string} content - File content
 * @param {string} name - File name
 * @returns {Object} Mock file object
 */
export function createMockFile(content, name = 'test-resume.txt') {
  return {
    uri: `data:text/plain;base64,${btoa(content)}`,
    name,
    type: 'text/plain',
    size: content.length,
  };
}

/**
 * Handle PDF file (requires PDF library)
 * @param {Object} file - PDF file object
 * @returns {Promise<string>} Extracted text
 */
export async function handlePDFFile(file) {
  try {
    // For production, this would use a PDF parsing library
    // For now, return a message indicating PDF support is needed
    console.warn('[handlePDFFile] PDF parsing not yet implemented');
    
    // In production, use a library like react-native-pdf or pdf-parse
    // const pdfText = await parsePDF(file.uri);
    // return pdfText;

    throw new Error('PDF parsing requires additional library. Please use TXT or DOC format.');
  } catch (error) {
    console.error('[handlePDFFile] Error:', error);
    throw error;
  }
}

/**
 * Check if file is PDF
 * @param {Object} file - File object
 * @returns {boolean} True if PDF
 */
export function isPDFFile(file) {
  if (!file) return false;
  
  return (
    file.type === 'application/pdf' ||
    file.name?.toLowerCase().endsWith('.pdf')
  );
}

/**
 * Check if file is text
 * @param {Object} file - File object
 * @returns {boolean} True if text file
 */
export function isTextFile(file) {
  if (!file) return false;
  
  const textTypes = ['text/plain', 'text/html', 'application/rtf'];
  const textExtensions = ['.txt', '.text', '.rtf'];
  
  return (
    textTypes.includes(file.type) ||
    textExtensions.some(ext => file.name?.toLowerCase().endsWith(ext))
  );
}
