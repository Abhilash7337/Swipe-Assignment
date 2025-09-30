import React from 'react';
import { Card, Space, Input, Button, Tag } from 'antd';
import ResumeUploadSection from './ResumeUploadSection';

const ResumePrompt = ({
  resumeEmail,
  onResumeEmailChange,
  onCheck,
  showContinuePrompt,
  pendingInterview,
  onContinue,
  onFileSelect,
  onTextExtracted
}) => (
  <div>
    <Card style={{ marginBottom: 16 }}>
      <Space direction="vertical" style={{ width: '100%' }}>
        <Input
          placeholder="Enter your email to check for unfinished interview"
          value={resumeEmail}
          onChange={(e) => onResumeEmailChange(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter' && resumeEmail.trim()) {
              onCheck();
            }
          }}
          style={{ width: '100%' }}
        />
        <Button
          type="primary"
          onClick={onCheck}
          disabled={!resumeEmail.trim() || !resumeEmail.includes('@')}
        >
          Check for Unfinished Interview
        </Button>
      </Space>
    </Card>

    {showContinuePrompt && pendingInterview && (
      <div style={{ marginBottom: 16 }}>
        <Tag color="orange">Unfinished interview found for {resumeEmail}</Tag>
        <Button type="primary" onClick={onContinue}>Continue Previous Interview</Button>
      </div>
    )}

    <ResumeUploadSection onFileSelect={onFileSelect} onTextExtracted={onTextExtracted} />
  </div>
);

export default ResumePrompt;
