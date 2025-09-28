import { validatePDFFile } from './pdfExtraction.js';
import { extractTextFromDOCX, validateDOCXFile } from './docxExtraction.js';

/**
 * @typedef {Object} DocumentExtractionResult
 * @property {boolean} success - Whether the extraction was successful
 * @property {string} text - The extracted and cleaned text content
 * @property {string|null} error - Error message if extraction failed
 * @property {string} fileType - Type of file processed (pdf, docx, doc)
 * @property {Object|null} metadata - Additional document metadata
 * @property {Object|null} resumeInfo - Analyzed resume information
 */

/**
 * Gets the file type based on file extension and MIME type
 * @param {File} file - The file to analyze
 * @returns {string} File type identifier (pdf, docx, doc, unknown)
 */
const getFileType = (file) => {
  if (!file) return 'unknown';
  
  const fileName = file.name.toLowerCase();
  const mimeType = file.type;
  
  if (mimeType === 'application/pdf' || fileName.endsWith('.pdf')) {
    return 'pdf';
  }
  
  if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || fileName.endsWith('.docx')) {
    return 'docx';
  }
  
  if (mimeType === 'application/msword' || fileName.endsWith('.doc')) {
    return 'doc';
  }
  
  return 'unknown';
};

/**
 * Analyzes extracted text to determine if it's a resume and extract key information
 * @param {string} text - The extracted text to analyze
 * @returns {Object} Resume analysis results
 */
const extractResumeInfo = (text) => {
  if (!text || typeof text !== 'string') {
    return {
      isLikelyResume: false,
      wordCount: 0,
      sections: [],
      hasContactInfo: false,
      hasWorkExperience: false,
      hasEducation: false
    };
  }

  const wordCount = text.trim().split(/\s+/).length;
  
  // Common resume sections and keywords
  const resumeKeywords = [
    'experience', 'education', 'skills', 'contact', 'email', 'phone',
    'address', 'employment', 'work', 'job', 'position', 'company',
    'university', 'college', 'school', 'degree', 'certification'
  ];
  
  const sectionKeywords = [
    'experience', 'education', 'skills', 'projects', 'certifications',
    'achievements', 'summary', 'objective', 'qualifications'
  ];
  
  const lowerText = text.toLowerCase();
  
  // Check for contact information patterns
  const hasEmail = /@[a-z0-9.-]+\.[a-z]{2,}/i.test(text);
  const hasPhone = /(\+?[0-9\s\-\(\)]{10,})|(\([0-9]{3}\))/.test(text);
  const hasContactInfo = hasEmail || hasPhone;
  
  // Check for work experience indicators
  const workKeywords = ['experience', 'employment', 'work', 'job', 'position', 'company', 'responsibilities'];
  const hasWorkExperience = workKeywords.some(keyword => lowerText.includes(keyword));
  
  // Check for education indicators
  const educationKeywords = ['education', 'university', 'college', 'school', 'degree', 'bachelor', 'master', 'phd'];
  const hasEducation = educationKeywords.some(keyword => lowerText.includes(keyword));
  
  // Detect sections
  const sections = sectionKeywords.filter(section => lowerText.includes(section));
  
  // Calculate resume likelihood score
  const keywordMatches = resumeKeywords.filter(keyword => lowerText.includes(keyword)).length;
  const resumeScore = (keywordMatches / resumeKeywords.length) * 100;
  
  const isLikelyResume = resumeScore >= 20 && (hasContactInfo || hasWorkExperience || hasEducation);
  
  return {
    isLikelyResume,
    wordCount,
    sections,
    hasContactInfo,
    hasWorkExperience,
    hasEducation,
    resumeScore: Math.round(resumeScore)
  };
};

/**
 * Validates if a file is a supported document type and within size limits
 * @param {File} file - The file to validate
 * @param {number} maxSizeInMB - Maximum file size in MB (default: 5MB)
 * @returns {Object} Validation result with success status and error message
 */
export const validateDocumentFile = (file, maxSizeInMB = 5) => {
  console.log('validateDocumentFile called with:', file?.name, file?.type, file?.size);
  
  if (!file) {
    console.log('No file provided');
    return { isValid: false, error: 'No file provided', fileType: 'unknown' };
  }

  const fileType = getFileType(file);
  console.log('Detected file type:', fileType);
  
  // Check if file type is supported
  if (fileType === 'unknown') {
    console.log('Unsupported file type');
    return { 
      isValid: false, 
      error: 'File type not supported. Please upload a PDF, DOC, or DOCX file.',
      fileType: 'unknown'
    };
  }

  // Check file size
  const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
  if (file.size > maxSizeInBytes) {
    console.log('File too large:', file.size, 'vs max:', maxSizeInBytes);
    return { 
      isValid: false, 
      error: `File size must be less than ${maxSizeInMB}MB`,
      fileType 
    };
  }

  if (file.size === 0) {
    console.log('Empty file');
    return { 
      isValid: false, 
      error: 'File appears to be empty',
      fileType 
    };
  }

  console.log('Basic validation passed, checking specific validator...');
  // Use specific validators based on file type
  let validationResult;
  if (fileType === 'pdf') {
    console.log('Validating PDF file...');
    validationResult = validatePDFFile(file, maxSizeInMB);
  } else if (fileType === 'docx' || fileType === 'doc') {
    console.log('Validating DOCX/DOC file...');
    validationResult = validateDOCXFile(file, maxSizeInMB);
  }

  console.log('Validation result:', validationResult);
  return {
    ...validationResult,
    fileType
  };
};

/**
 * Extracts text from a document file (PDF, DOC, or DOCX)
 * @param {File} file - The document file to extract text from
 * @returns {Promise<DocumentExtractionResult>} Result object containing success status, text, and metadata
 */
export const extractTextFromDocument = async (file) => {
  // Validate file first
  const validation = validateDocumentFile(file);
  if (!validation.isValid) {
    return {
      success: false,
      text: '',
      error: validation.error,
      fileType: validation.fileType,
      metadata: null,
      resumeInfo: null
    };
  }

  const fileType = validation.fileType;

  try {
    let extractionResult;

    // Use appropriate extraction method based on file type
    if (fileType === 'pdf') {
      // Only validate, do not extract text from PDF
      return {
        success: true,
        text: '',
        error: null,
        fileType,
        metadata: {
          fileName: file.name,
          fileSize: file.size,
          lastModified: file.lastModified
        },
        resumeInfo: null
      };
    } else if (fileType === 'docx' || fileType === 'doc') {
      extractionResult = await extractTextFromDOCX(file);
    } else {
      return {
        success: false,
        text: '',
        error: 'Unsupported file type',
        fileType,
        metadata: null,
        resumeInfo: null
      };
    }

    // If extraction failed, return the error
    if (!extractionResult.success) {
      return {
        ...extractionResult,
        fileType,
        resumeInfo: null
      };
    }

    // Analyze the extracted text for resume information
    const resumeInfo = extractResumeInfo(extractionResult.text);

    // Return successful result with enhanced metadata
    return {
      success: true,
      text: extractionResult.text,
      error: null,
      fileType,
      metadata: {
        ...extractionResult.metadata,
        fileName: file.name,
        fileSize: file.size,
        lastModified: file.lastModified
      },
      resumeInfo
    };

  } catch (error) {
    console.error('Unexpected error during document extraction:', error);
    
    return {
      success: false,
      text: '',
      error: `Unexpected error occurred: ${error.message || 'Unknown error'}`,
      fileType,
      metadata: null,
      resumeInfo: null
    };
  }
};

/**
 * Extracts and analyzes resume content from a document
 * @param {File} file - The resume file to process
 * @returns {Promise<Object>} Enhanced result with resume analysis
 */
export const extractResumeFromDocument = async (file) => {
  const result = await extractTextFromDocument(file);
  
  if (!result.success) {
    return result;
  }

  // Additional resume-specific validation
  const { resumeInfo } = result;
  
  if (!resumeInfo.isLikelyResume) {
    return {
      ...result,
      success: false,
      error: 'Document does not appear to be a resume. Please ensure it contains contact information and work experience or education details.',
      resumeInfo
    };
  }

  if (resumeInfo.wordCount < 50) {
    return {
      ...result,
      success: false,
      error: 'Resume appears to be too short. Please ensure it contains sufficient information about your background.',
      resumeInfo
    };
  }

  return result;
};

/**
 * Gets supported file extensions and MIME types
 * @returns {Object} Object containing arrays of supported extensions and MIME types
 */
export const getSupportedFormats = () => {
  return {
    extensions: ['.pdf', '.docx', '.doc'],
    mimeTypes: [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword'
    ],
    acceptString: '.pdf,.docx,.doc'
  };
};

export default {
  extractTextFromDocument,
  extractResumeFromDocument,
  validateDocumentFile,
  getSupportedFormats,
  getFileType
};