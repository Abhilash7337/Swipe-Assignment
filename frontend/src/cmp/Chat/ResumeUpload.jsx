import React, { useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';

// Set up PDF.js worker using local file
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

const ResumeUpload = ({ onFileSelect, onTextExtracted }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [extractedText, setExtractedText] = useState('');
  const [extractedData, setExtractedData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Extract text from PDF
  const extractTextFromPDF = async (file) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let text = '';
      
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ');
        text += pageText + '\n';
      }
      
      return text;
    } catch (error) {
      throw new Error(`PDF extraction failed: ${error.message}`);
    }
  };

  // Extract text from DOCX
  const extractTextFromDOCX = async (file) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText(arrayBuffer);
      return result.value;
    } catch (error) {
      throw new Error(`DOCX extraction failed: ${error.message}`);
    }
  };

  // Validate file
  const validateFile = (file) => {
    if (!file) return false;
    
    // Check file type
    const isValidType = file.type === 'application/pdf' || 
                       file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    
    if (!isValidType) {
      setError('Please select a PDF or DOCX file');
      return false;
    }

    // Check file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      return false;
    }

    return true;
  };

  // Extract data from text (name, email, phone)
  const extractDataFromText = (text) => {
    const emailMatch = text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
    const phoneMatch = text.match(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b|\(\d{3}\)\s*\d{3}[-.]?\d{4}/);
    
    // Simple name extraction - usually first line or first few words
    const lines = text.split('\n').filter(line => line.trim());
    const nameMatch = lines[0] && lines[0].trim().length < 50 ? lines[0].trim() : 'Name not found';

    return {
      name: nameMatch,
      email: emailMatch ? emailMatch[0] : 'Email not found',
      phone: phoneMatch ? phoneMatch[0] : 'Phone not found'
    };
  };

  // Process file
  const processFile = async (file) => {
    if (!validateFile(file)) return;

    setLoading(true);
    setError('');
    setSelectedFile(file);

    try {
      let text = '';
      
      if (file.type === 'application/pdf') {
        text = await extractTextFromPDF(file);
      } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        text = await extractTextFromDOCX(file);
      }

      setExtractedText(text);
      const data = extractDataFromText(text);
      setExtractedData(data);
      
      if (onFileSelect) onFileSelect(file);
      if (onTextExtracted) onTextExtracted({ success: true, text, data });
    } catch (error) {
      setError(error.message);
      if (onTextExtracted) onTextExtracted({ success: false, error: error.message });
    } finally {
      setLoading(false);
    }
  };

  // Handle file input change
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) processFile(file);
  };

  // Handle drag and drop
  const handleDrop = (event) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const handleDragOver = (event) => {
    event.preventDefault();
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
  };

  // Format file size for display
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div style={{ padding: '20px', border: '2px dashed #ccc', borderRadius: '8px' }}>
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        style={{
          padding: '20px',
          textAlign: 'center',
          backgroundColor: '#f9f9f9',
          borderRadius: '4px',
          marginBottom: '20px'
        }}
      >
        <input
          type="file"
          accept=".pdf,.docx"
          onChange={handleFileChange}
          style={{ marginBottom: '10px' }}
        />
        <p>Or drag and drop a PDF or DOCX file here</p>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', margin: '20px 0' }}>
          <p>Processing file...</p>
        </div>
      )}

      {error && (
        <div style={{ color: 'red', margin: '10px 0' }}>
          <p>Error: {error}</p>
        </div>
      )}

      {selectedFile && (
        <div style={{ margin: '20px 0', padding: '10px', backgroundColor: '#f0f8ff', borderRadius: '4px' }}>
          <h3>Selected File:</h3>
          <p><strong>Name:</strong> {selectedFile.name}</p>
          <p><strong>Size:</strong> {formatFileSize(selectedFile.size)}</p>
          <p><strong>Type:</strong> {selectedFile.type}</p>
        </div>
      )}

      {extractedData && (
        <div style={{ margin: '20px 0', padding: '10px', backgroundColor: '#f0fff0', borderRadius: '4px' }}>
          <h3>Extracted Data:</h3>
          <p><strong>Name:</strong> {extractedData.name}</p>
          <p><strong>Email:</strong> {extractedData.email}</p>
          <p><strong>Phone:</strong> {extractedData.phone}</p>
        </div>
      )}

      {extractedText && (
        <div style={{ margin: '20px 0', padding: '10px', backgroundColor: '#fff5f5', borderRadius: '4px' }}>
          <h3>Extracted Text (first 500 characters):</h3>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: '12px' }}>
            {extractedText.substring(0, 500)}
            {extractedText.length > 500 && '...'}
          </pre>
        </div>
      )}
    </div>
  );
};

export default ResumeUpload;
