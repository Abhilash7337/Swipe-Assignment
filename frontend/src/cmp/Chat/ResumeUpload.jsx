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
    <div style={{ padding: '12px' }}>
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        style={{
          padding: '28px',
          textAlign: 'center',
          background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
          border: '1px dashed rgba(16,24,40,0.08)',
          borderRadius: 12,
          marginBottom: 16,
          transition: 'border-color 200ms ease'
        }}
      >
        <input
          type="file"
          accept=".pdf,.docx"
          onChange={handleFileChange}
          style={{ display: 'block', margin: '0 auto 12px' }}
        />
        <p style={{ margin: 0, color: '#475569' }}>Or drag and drop a <strong>PDF</strong> or <strong>DOCX</strong> file here</p>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', margin: '12px 0' }}>
          <p style={{ color: '#6b7280' }}>Processing file...</p>
        </div>
      )}

      {error && (
        <div style={{ color: '#b91c1c', margin: '10px 0' }}>
          <p>Error: {error}</p>
        </div>
      )}

      {selectedFile && (
        <div style={{ margin: '12px 0', padding: '12px', backgroundColor: '#f1f5f9', borderRadius: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 600 }}>{selectedFile.name}</div>
              <div style={{ color: '#475569', fontSize: 13 }}>{formatFileSize(selectedFile.size)} • {selectedFile.type}</div>
            </div>
            <div style={{ color: '#0ea5a0', fontWeight: 600 }}>File ready</div>
          </div>
        </div>
      )}

      {extractedData && (
        <div style={{ margin: '12px 0', padding: '12px', backgroundColor: '#ecfccb', borderRadius: 8 }}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Extracted Data</div>
          <div style={{ color: '#475569' }}><strong>Name:</strong> {extractedData.name}</div>
          <div style={{ color: '#475569' }}><strong>Email:</strong> {extractedData.email}</div>
          <div style={{ color: '#475569' }}><strong>Phone:</strong> {extractedData.phone}</div>
        </div>
      )}

      {extractedText && (
        <div style={{ margin: '12px 0', padding: '12px', backgroundColor: '#fff7ed', borderRadius: 8 }}>
          <div style={{ fontWeight: 600, marginBottom: 6, color: '#92400e' }}>Extracted Text (preview)</div>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: 13, margin: 0, color: '#475569' }}>
            {extractedText.substring(0, 500)}
            {extractedText.length > 500 && '...'}
          </pre>
        </div>
      )}

    </div>
  );

};

export default ResumeUpload;
