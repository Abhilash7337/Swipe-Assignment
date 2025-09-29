import React from 'react';
import {
  Modal,
  Typography,
  Card,
  Row,
  Col,
  Tag,
  Timeline,
  Space,
  Divider,
  Avatar,
  Progress,
  Statistic,
  Badge,
  Empty
} from 'antd';
import {
  UserOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  TrophyOutlined,
  PhoneOutlined,
  MailOutlined,
  CalendarOutlined,
  QuestionCircleOutlined
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;

const CandidateDetailModal = ({ visible, candidate, onClose }) => {
  if (!candidate) return null;

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'success';
      case 'in-progress': return 'processing';
      case 'abandoned': return 'error';
      default: return 'default';
    }
  };

  // Get score color
  const getScoreColor = (score) => {
    if (score >= 8) return '#52c41a';
    if (score >= 6) return '#faad14';
    if (score >= 4) return '#ff7a45';
    return '#ff4d4f';
  };

  // Get difficulty color
  const getDifficultyColor = (difficulty) => {
    switch (difficulty?.toLowerCase()) {
      case 'easy': return 'green';
      case 'medium': return 'orange';
      case 'hard': return 'red';
      default: return 'default';
    }
  };

  // Format duration
  const formatDuration = (seconds) => {
    if (!seconds) return 'N/A';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  // Calculate overall performance
  const calculatePerformance = () => {
    const questions = candidate.questions || [];
    const answeredQuestions = questions.filter(q => q.answered);
    
    if (answeredQuestions.length === 0) {
      return {
        completion: 0,
        averageScore: 0,
        totalTimeTaken: 0,
        timedOutCount: 0
      };
    }

    const completion = (answeredQuestions.length / questions.length) * 100;
    const averageScore = answeredQuestions.reduce((sum, q) => sum + (q.score || 0), 0) / answeredQuestions.length;
    const totalTimeTaken = answeredQuestions.reduce((sum, q) => sum + (q.timeTaken || 0), 0);
    const timedOutCount = answeredQuestions.filter(q => q.timedOut).length;

    return {
      completion: Math.round(completion),
      averageScore: Math.round(averageScore * 10) / 10,
      totalTimeTaken,
      timedOutCount
    };
  };

  const performance = calculatePerformance();

  return (
    <Modal
      title={
        <Space>
          <Avatar size="large" icon={<UserOutlined />} />
          <div>
            <Title level={4} style={{ margin: 0 }}>
              {candidate.candidateInfo?.name || 'N/A'}
            </Title>
            <Text type="secondary">Interview Details</Text>
          </div>
        </Space>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      width={1000}
      style={{ top: 20 }}
      bodyStyle={{ maxHeight: '80vh', overflowY: 'auto' }}
    >
      {/* Candidate Basic Info */}
      <Card style={{ marginBottom: '16px' }}>
        <Row gutter={16}>
          <Col span={8}>
            <Space direction="vertical" size="small">
              <div>
                <MailOutlined /> <strong>Email:</strong>
              </div>
              <Text copyable>{candidate.candidateInfo?.email}</Text>
            </Space>
          </Col>
          <Col span={8}>
            <Space direction="vertical" size="small">
              <div>
                <PhoneOutlined /> <strong>Phone:</strong>
              </div>
              <Text>{candidate.candidateInfo?.phone || 'N/A'}</Text>
            </Space>
          </Col>
          <Col span={8}>
            <Space direction="vertical" size="small">
              <div>
                <CalendarOutlined /> <strong>Status:</strong>
              </div>
              <Tag color={getStatusColor(candidate.status)}>
                {candidate.status?.toUpperCase() || 'N/A'}
              </Tag>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Performance Overview */}
      <Card title="Performance Overview" style={{ marginBottom: '16px' }}>
        <Row gutter={16}>
          <Col span={6}>
            <Statistic
              title="Completion Rate"
              value={performance.completion}
              suffix="%"
              valueStyle={{ color: performance.completion >= 80 ? '#3f8600' : '#cf1322' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="Average Score"
              value={performance.averageScore}
              suffix="/ 10"
              precision={1}
              valueStyle={{ color: getScoreColor(performance.averageScore) }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="Total Time"
              value={formatDuration(performance.totalTimeTaken)}
              prefix={<ClockCircleOutlined />}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="Timeouts"
              value={performance.timedOutCount}
              valueStyle={{ color: performance.timedOutCount > 0 ? '#cf1322' : '#3f8600' }}
            />
          </Col>
        </Row>
      </Card>

      {/* Interview Timeline */}
      <Card title="Interview Timeline">
        {candidate.questions && candidate.questions.length > 0 ? (
          <Timeline>
            {candidate.questions.map((question, index) => (
              <Timeline.Item
                key={question.id || index}
                color={question.answered ? (question.timedOut ? 'red' : 'green') : 'gray'}
                dot={
                  question.answered ? (
                    question.timedOut ? (
                      <CloseCircleOutlined style={{ color: 'red' }} />
                    ) : (
                      <CheckCircleOutlined style={{ color: 'green' }} />
                    )
                  ) : (
                    <QuestionCircleOutlined style={{ color: 'gray' }} />
                  )
                }
              >
                <Card size="small" style={{ marginBottom: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <Space style={{ marginBottom: '8px' }}>
                        <Text strong>Question {index + 1}</Text>
                        <Tag color={getDifficultyColor(question.difficulty)}>
                          {question.difficulty?.toUpperCase() || 'N/A'}
                        </Tag>
                        {question.answered && (
                          <Badge 
                            count={`${question.score || 0}/10`} 
                            style={{ backgroundColor: getScoreColor(question.score || 0) }}
                          />
                        )}
                      </Space>
                      
                      <Paragraph style={{ marginBottom: '8px' }}>
                        <Text strong>Q: </Text>
                        {question.question || 'Question not available'}
                      </Paragraph>

                      {question.answered && question.answer && (
                        <div style={{ marginBottom: '8px' }}>
                          <Text strong>A: </Text>
                          <Paragraph 
                            ellipsis={{ rows: 3, expandable: true }}
                            style={{ 
                              backgroundColor: '#f5f5f5', 
                              padding: '8px', 
                              borderRadius: '4px',
                              marginTop: '4px'
                            }}
                          >
                            {question.answer}
                          </Paragraph>
                        </div>
                      )}

                      {question.answered && question.feedback && (
                        <div style={{ marginBottom: '8px' }}>
                          <Text strong>Feedback: </Text>
                          <Paragraph 
                            style={{ 
                              backgroundColor: '#fff7e6', 
                              padding: '8px', 
                              borderRadius: '4px',
                              marginTop: '4px',
                              borderLeft: '3px solid #faad14'
                            }}
                          >
                            {question.feedback}
                          </Paragraph>
                        </div>
                      )}

                      <Space>
                        <Text type="secondary">
                          <ClockCircleOutlined /> Time Limit: {question.timeLimit || 0}s
                        </Text>
                        {question.timeTaken !== undefined && (
                          <Text type="secondary">
                            Time Taken: {question.timeTaken}s
                          </Text>
                        )}
                        {question.timedOut && (
                          <Tag color="red">TIMED OUT</Tag>
                        )}
                      </Space>
                    </div>
                  </div>
                </Card>
              </Timeline.Item>
            ))}
          </Timeline>
        ) : (
          <Empty description="No questions found" />
        )}
      </Card>

      {/* Interview Metadata */}
      {(candidate.startedAt || candidate.completedAt || candidate.duration) && (
        <Card title="Interview Details" style={{ marginTop: '16px' }}>
          <Row gutter={16}>
            {candidate.startedAt && (
              <Col span={8}>
                <Text strong>Started At:</Text><br />
                <Text>{new Date(candidate.startedAt).toLocaleString()}</Text>
              </Col>
            )}
            {candidate.completedAt && (
              <Col span={8}>
                <Text strong>Completed At:</Text><br />
                <Text>{new Date(candidate.completedAt).toLocaleString()}</Text>
              </Col>
            )}
            {candidate.duration && (
              <Col span={8}>
                <Text strong>Total Duration:</Text><br />
                <Text>{candidate.duration} minutes</Text>
              </Col>
            )}
          </Row>
        </Card>
      )}
    </Modal>
  );
};

export default CandidateDetailModal;