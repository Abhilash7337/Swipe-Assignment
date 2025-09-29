import React from "react";
import { Card, Space } from "antd";
import ResumeUpload from "./ResumeUpload";

const ResumeUploadSection = ({ onFileSelect, onTextExtracted }) => (
  <Card title="Step 1: Upload Your Resume" style={{ marginBottom: '20px' }}>
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <ResumeUpload 
        onFileSelect={onFileSelect} 
        onTextExtracted={onTextExtracted} 
      />
    </Space>
  </Card>
);

export default ResumeUploadSection;
