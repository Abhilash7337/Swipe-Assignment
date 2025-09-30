import React, { useState } from 'react';
import { Card, Button } from 'antd';
import { FileTextOutlined, UploadOutlined } from '@ant-design/icons';
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
    <Card
      style={{
        background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
        border: '1px solid #e2e8f0',
        borderRadius: 16,
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.03), 0 2px 4px -1px rgba(0, 0, 0, 0.02)',
        padding: '32px 40px',
        maxWidth: 600,
        margin: '0 auto 32px auto',
        textAlign: 'center'
      }}
      bordered={false}
    >
      {/* Heading */}
      <div style={{ marginBottom: 24 }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 12
        }}>
          <FileTextOutlined style={{
            fontSize: 32,
            color: '#10b981',
            background: '#ecfdf5',
            padding: 8,
            borderRadius: 12
          }} />
          <h2 style={{
            fontWeight: 700,
            fontSize: '26px',
            color: '#1e293b',
            margin: 0,
            letterSpacing: '-0.5px'
          }}>
            Step 1: Upload Your Resume
          </h2>
        </div>
        <p style={{
          color: '#64748b',
          fontSize: '16px',
          margin: 0,
          lineHeight: 1.6
        }}>
          Choose a PDF or DOCX file, or drag and drop it below. We'll extract your info automatically!
        </p>
      </div>

      {/* Upload Area */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        style={{
          padding: '32px 20px',
          textAlign: 'center',
          background: '#f9fafb',
          border: '2px dashed #a7f3d0',
          borderRadius: 12,
          marginBottom: '24px',
          transition: 'border-color 0.2s',
          cursor: 'pointer'
        }}
      >
        <input
          type="file"
          accept=".pdf,.docx"
          onChange={handleFileChange}
          style={{
            marginBottom: '16px',
            fontSize: '15px',
            borderRadius: 8,
            border: '1px solid #e2e8f0',
            padding: '8px 12px',
            background: '#fff',
            boxShadow: '0 1px 4px rgba(16,185,129,0.04)'
          }}
        />
        <div style={{ color: '#10b981', fontWeight: 500, fontSize: '15px', marginBottom: 8 }}>
          <UploadOutlined style={{ marginRight: 6 }} />
          Or drag and drop a PDF or DOCX file here
        </div>
        <div style={{ color: '#94a3b8', fontSize: '13px' }}>
          Max file size: 5MB
        </div>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', margin: '20px 0', color: '#2563eb', fontWeight: 500 }}>
          <p>Processing file...</p>
        </div>
      )}

      {error && (
        <div style={{ color: '#ef4444', margin: '10px 0', fontWeight: 500 }}>
          <p>Error: {error}</p>
        </div>
      )}

      {selectedFile && (
        <div style={{ margin: '20px 0', padding: '14px', background: '#e0f2fe', borderRadius: '8px', textAlign: 'left' }}>
          <h3 style={{ color: '#2563eb', marginBottom: 8 }}>Selected File:</h3>
          <p><strong>Name:</strong> {selectedFile.name}</p>
          <p><strong>Size:</strong> {formatFileSize(selectedFile.size)}</p>
          <p><strong>Type:</strong> {selectedFile.type}</p>
        </div>
      )}

      {extractedData && (
        <div style={{ margin: '20px 0', padding: '14px', background: '#f0fff0', borderRadius: '8px', textAlign: 'left' }}>
          <h3 style={{ color: '#10b981', marginBottom: 8 }}>Extracted Data:</h3>
          <p><strong>Name:</strong> {extractedData.name}</p>
          <p><strong>Email:</strong> {extractedData.email}</p>
          <p><strong>Phone:</strong> {extractedData.phone}</p>
        </div>
      )}

      {extractedText && (
        <div style={{ margin: '20px 0', padding: '14px', background: '#fff5f5', borderRadius: '8px', textAlign: 'left' }}>
          <h3 style={{ color: '#f59e42', marginBottom: 8 }}>Extracted Text (first 500 characters):</h3>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: '13px', margin: 0 }}>
            {extractedText.substring(0, 500)}
            {extractedText.length > 500 && '...'}
          </pre>
        </div>
      )}
    </Card>
  );
};

export default ResumeUpload;
