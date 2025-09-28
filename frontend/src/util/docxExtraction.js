import mammoth from 'mammoth';

/**
 * @typedef {Object} DOCXExtractionResult
 * @property {boolean} success - Whether the extraction was successful
 * @property {string} text - The extracted and cleaned text content
 * @property {string|null} error - Error message if extraction failed
 * @property {Object|null} metadata - Additional document metadata
 */

/**
 * Converts a File object to ArrayBuffer
 * @param {File} file - The DOCX file to convert
 * @returns {Promise<ArrayBuffer>} The file as ArrayBuffer
 */
const fileToArrayBuffer = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => resolve(event.target.result);
    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
};

/**
 * Cleans and normalizes extracted DOCX text
 * @param {string} rawText - Raw text extracted from DOCX
 * @returns {string} Cleaned and normalized text
 */
const cleanDOCXText = (rawText) => {
  if (!rawText || typeof rawText !== 'string') {
    return '';
  }

  let cleanedText = rawText;

  // Clean up common DOCX artifacts
  cleanedText = cleanedText
    // Remove excessive whitespace but preserve intentional line breaks
    .replace(/[ \t]+/g, ' ')
    // Normalize line breaks - convert multiple consecutive line breaks to max 2
    .replace(/\n{3,}/g, '\n\n')
    // Remove trailing spaces from lines
    .replace(/[ \t]+\n/g, '\n')
    // Remove leading/trailing whitespace from the entire text
    .trim();

  // Handle common formatting cleanup
  cleanedText = cleanedText
    // Clean up bullet points and list formatting
    .replace(/\n•/g, '\n• ')
    .replace(/\n-/g, '\n- ')
    .replace(/\n\*/g, '\n* ')
    // Fix spacing around punctuation
    .replace(/([.!?])\s*\n\s*([A-Z])/g, '$1\n\n$2');

  return cleanedText;
};

/**
 * Extracts text content from a DOCX file
 * @param {File} file - The DOCX file to extract text from
 * @returns {Promise<DOCXExtractionResult>} Result object containing success status, text, and error info
 */
export const extractTextFromDOCX = async (file) => {
  // Input validation
  if (!file) {
    return {
      success: false,
      text: '',
      error: 'No file provided',
      metadata: null
    };
  }

  const fileName = file.name.toLowerCase();
  const isValidDOCX = file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
                     fileName.endsWith('.docx') || 
                     fileName.endsWith('.doc');

  if (!isValidDOCX) {
    return {
      success: false,
      text: '',
      error: 'File is not a valid Word document',
      metadata: null
    };
  }

  try {
    // Convert File to ArrayBuffer
    let arrayBuffer;
    try {
      arrayBuffer = await fileToArrayBuffer(file);
    } catch (error) {
      return {
        success: false,
        text: '',
        error: 'Failed to read file contents',
        metadata: null
      };
    }

    // Extract text using mammoth
    let result;
    try {
      result = await mammoth.extractRawText({ arrayBuffer });
    } catch (extractError) {
      // Handle specific DOCX parsing errors
      const errorMessage = extractError.message || 'Unknown parsing error';
      
      if (errorMessage.includes('not a valid zip file') || errorMessage.includes('ENOENT')) {
        return {
          success: false,
          text: '',
          error: 'Invalid or corrupted Word document',
          metadata: null
        };
      }
      
      if (errorMessage.includes('Unsupported')) {
        return {
          success: false,
          text: '',
          error: 'Unsupported Word document format',
          metadata: null
        };
      }
      
      return {
        success: false,
        text: '',
        error: `Document parsing failed: ${errorMessage}`,
        metadata: null
      };
    }

    // Extract and clean text
    const rawText = result.value || '';
    const cleanedText = cleanDOCXText(rawText);

    // Check if document appears to be empty
    if (!cleanedText.trim()) {
      return {
        success: false,
        text: '',
        error: 'Document appears to be empty or contains no readable text',
        metadata: {
          messages: result.messages || []
        }
      };
    }

    // Return successful result
    return {
      success: true,
      text: cleanedText,
      error: null,
      metadata: {
        messages: result.messages || [],
        originalLength: rawText.length,
        cleanedLength: cleanedText.length
      }
    };

  } catch (error) {
    // Handle unexpected errors
    console.error('Unexpected error during DOCX extraction:', error);
    
    return {
      success: false,
      text: '',
      error: `Unexpected error occurred: ${error.message || 'Unknown error'}`,
      metadata: null
    };
  }
};

/**
 * Validates if a file is a Word document and within size limits
 * @param {File} file - The file to validate
 * @param {number} maxSizeInMB - Maximum file size in MB (default: 10MB)
 * @returns {Object} Validation result with success status and error message
 */
export const validateDOCXFile = (file, maxSizeInMB = 10) => {
  if (!file) {
    return { isValid: false, error: 'No file provided' };
  }

  // Check file type
  const fileName = file.name.toLowerCase();
  const isValidDOCX = file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
                     file.type === 'application/msword' ||
                     fileName.endsWith('.docx') || 
                     fileName.endsWith('.doc');

  if (!isValidDOCX) {
    return { isValid: false, error: 'File must be a Word document (.docx or .doc)' };
  }

  // Check file size
  const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
  if (file.size > maxSizeInBytes) {
    return { 
      isValid: false, 
      error: `File size must be less than ${maxSizeInMB}MB` 
    };
  }

  if (file.size === 0) {
    return { isValid: false, error: 'File appears to be empty' };
  }

  return { isValid: true, error: null };
};

export default {
  extractTextFromDOCX,
  validateDOCXFile
};