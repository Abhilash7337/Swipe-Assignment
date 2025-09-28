/**
 * Validates if a file is a valid PDF file
 * @param {File} file - File to validate
 * @param {number} maxSizeInMB - Maximum file size in MB (default: 5MB)
 * @returns {Object} Validation result with isValid boolean and error message
 */
export const validatePDFFile = (file, maxSizeInMB = 5) => {
  if (!file || !(file instanceof File)) {
    return { isValid: false, error: 'Invalid file object' };
  }
  const fileName = file.name.toLowerCase();
  const fileType = file.type.toLowerCase();
  const isPDF = fileName.endsWith('.pdf') || fileType === 'application/pdf';
  if (!isPDF) {
    return { isValid: false, error: 'File is not a PDF' };
  }
  const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
  if (file.size > maxSizeInBytes) {
    return { isValid: false, error: `PDF file size must be less than ${maxSizeInMB}MB` };
  }
  if (file.size === 0) {
    return { isValid: false, error: 'PDF file appears to be empty' };
  }
  return { isValid: true, error: null };
};