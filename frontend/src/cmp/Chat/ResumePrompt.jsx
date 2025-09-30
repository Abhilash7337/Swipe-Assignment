import React from 'react';
import { Card, Space, Input, Button, Tag } from 'antd';
import { ClockCircleOutlined, MailOutlined } from '@ant-design/icons';
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
  <div style={{ 
    maxWidth: 1200, 
    margin: '0 auto', 
    padding: '40px 24px' 
  }}>
    {/* Resume Upload Section */}
    <ResumeUploadSection 
      onFileSelect={onFileSelect} 
      onTextExtracted={onTextExtracted} 
    />

    {/* Divider with OR */}
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      margin: '48px 0',
      gap: 16 
    }}>
      <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
      <span style={{ 
        color: '#94a3b8', 
        fontWeight: 600, 
        fontSize: '14px',
        padding: '0 8px' 
      }}>
        OR
      </span>
      <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
    </div>

    {/* Resume Unfinished Interview Section */}
    <div style={{ 
      textAlign: 'center',
      maxWidth: 600,
      margin: '0 auto'
    }}>
      {/* Heading */}
      <div style={{ marginBottom: 32 }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 12
        }}>
          <ClockCircleOutlined style={{ 
            fontSize: 32, 
            color: '#3b82f6',
            background: '#eff6ff',
            padding: 8,
            borderRadius: 12
          }} />
          <h2 style={{
            fontWeight: 700,
            fontSize: '28px',
            color: '#1e293b',
            margin: 0,
            letterSpacing: '-0.5px'
          }}>
            Continue Your Interview
          </h2>
        </div>
        <p style={{ 
          color: '#64748b', 
          fontSize: '16px',
          margin: 0,
          lineHeight: 1.6
        }}>
          Already started? Enter your email to resume where you left off.
        </p>
      </div>

      {/* Input Card */}
      <Card 
        style={{
          background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
          border: '1px solid #e2e8f0',
          borderRadius: 16,
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.03), 0 2px 4px -1px rgba(0, 0, 0, 0.02)',
          padding: '32px 40px'
        }}
        bordered={false}
      >
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Input
            prefix={<MailOutlined style={{ color: '#94a3b8' }} />}
            placeholder="Enter your email address"
            value={resumeEmail}
            onChange={(e) => onResumeEmailChange(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && resumeEmail.trim() && resumeEmail.includes('@')) {
                onCheck();
              }
            }}
            size="large"
            style={{
              borderRadius: 10,
              border: '2px solid #e2e8f0',
              fontSize: '15px',
              padding: '12px 16px',
              transition: 'all 0.3s ease'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#3b82f6';
              e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#e2e8f0';
              e.target.style.boxShadow = 'none';
            }}
          />
          
          <Button
            type="primary"
            onClick={onCheck}
            disabled={!resumeEmail.trim() || !resumeEmail.includes('@')}
            size="large"
            block
            style={{
              background: resumeEmail.trim() && resumeEmail.includes('@') 
                ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
                : '#cbd5e1',
              border: 'none',
              borderRadius: 10,
              fontWeight: 600,
              fontSize: '16px',
              height: 48,
              boxShadow: resumeEmail.trim() && resumeEmail.includes('@')
                ? '0 4px 12px rgba(59, 130, 246, 0.3)'
                : 'none',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              if (resumeEmail.trim() && resumeEmail.includes('@')) {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 6px 16px rgba(59, 130, 246, 0.4)';
              }
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = resumeEmail.trim() && resumeEmail.includes('@')
                ? '0 4px 12px rgba(59, 130, 246, 0.3)'
                : 'none';
            }}
          >
            Check Interview Status
          </Button>

          <p style={{ 
            color: '#94a3b8', 
            fontSize: '13px', 
            margin: '8px 0 0 0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6
          }}>
            <span style={{ fontSize: 16 }}>💡</span>
            Your progress is automatically saved
          </p>
        </Space>
      </Card>

      {/* Continue Interview Prompt */}
      {showContinuePrompt && pendingInterview && (
        <Card
          style={{
            marginTop: 24,
            background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
            border: '2px solid #93c5fd',
            borderRadius: 16,
            padding: '24px',
            boxShadow: '0 4px 12px rgba(59, 130, 246, 0.15)'
          }}
          bordered={false}
        >
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              gap: 8
            }}>
              <Tag 
                color="blue" 
                style={{ 
                  fontWeight: 600, 
                  fontSize: '15px',
                  padding: '6px 16px',
                  borderRadius: 20,
                  border: 'none',
                  background: '#3b82f6',
                  color: 'white'
                }}
              >
                ✓ Interview Found
              </Tag>
            </div>
            
            <p style={{ 
              color: '#1e40af', 
              fontSize: '16px', 
              fontWeight: 500,
              margin: 0 
            }}>
              We found an unfinished interview for <strong>{resumeEmail}</strong>
            </p>

            <Button
              type="primary"
              onClick={onContinue}
              size="large"
              block
              style={{
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                border: 'none',
                borderRadius: 10,
                fontWeight: 600,
                fontSize: '16px',
                height: 48,
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 6px 16px rgba(16, 185, 129, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.3)';
              }}
            >
              Continue Interview →
            </Button>
          </Space>
        </Card>
      )}
    </div>
  </div>
);

export default ResumePrompt;