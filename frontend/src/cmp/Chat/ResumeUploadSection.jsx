import React from "react";
import { Card, Row, Col, Typography } from "antd";
import ResumeUpload from "./ResumeUpload";

const { Title, Text } = Typography;

const ResumeUploadSection = ({ onFileSelect, onTextExtracted }) => (
  <Card
    bordered={false}
    style={{ marginBottom: '20px', boxShadow: '0 6px 18px rgba(15,23,42,0.08)', borderRadius: 12 }}
  >
    <Row gutter={24} align="middle">
      <Col xs={24} md={16}>
        <Title level={4} style={{ margin: 0 }}>Upload Your Resume</Title>
        <Text type="secondary">Choose a PDF or DOCX. We'll extract your info automatically.</Text>
        <div style={{ marginTop: 16 }}>
          <ResumeUpload onFileSelect={onFileSelect} onTextExtracted={onTextExtracted} />
        </div>
      </Col>
      <Col xs={24} md={8}>
        <div style={{ padding: 16, background: '#fafafa', borderRadius: 8, minHeight: 140 }}>
          <Title level={5} style={{ marginBottom: 8 }}>Quick Tips</Title>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            <li><Text type="secondary">Preferred: PDF or DOCX</Text></li>
            <li><Text type="secondary">Max file size: 5MB</Text></li>
            <li><Text type="secondary">Drag & drop supported</Text></li>
          </ul>
        </div>
      </Col>
    </Row>
  </Card>
);

export default ResumeUploadSection;
