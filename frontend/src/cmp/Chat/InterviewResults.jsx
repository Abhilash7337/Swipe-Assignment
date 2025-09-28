import React from 'react';
import { Card, Typography, Progress, Tag, Divider, Row, Col, Statistic } from 'antd';
import { 
  TrophyOutlined, 
  ClockCircleOutlined, 
  CheckCircleOutlined, 
  ExclamationCircleOutlined,
  UserOutlined,
  MailOutlined,
  PhoneOutlined
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;

const InterviewResults = ({ 
  candidateInfo, 
  allAnswers, 
  totalQuestions = 6,
  onClose 
}) => {
  // Calculate statistics
  const totalScore = allAnswers.reduce((sum, answer) => sum + (answer.score || 0), 0);
  const maxPossibleScore = totalQuestions * 10;
  const averageScore = totalScore / totalQuestions;
  const percentage = Math.round((averageScore / 10) * 100);
  
  // Calculate time statistics
  const totalTimeTaken = allAnswers.reduce((sum, answer) => sum + (answer.timeTaken || 0), 0);
  const totalTimeAllowed = allAnswers.reduce((sum, answer) => sum + (answer.timeLimit || 0), 0);
  const averageTimePerQuestion = totalTimeTaken / totalQuestions;
  
  // Count by difficulty
  const difficultyStats = allAnswers.reduce((acc, answer) => {
    const difficulty = answer.difficulty || 'unknown';
    if (!acc[difficulty]) {
      acc[difficulty] = { count: 0, totalScore: 0, totalTime: 0 };
    }
    acc[difficulty].count++;
    acc[difficulty].totalScore += answer.score || 0;
    acc[difficulty].totalTime += answer.timeTaken || 0;
    return acc;
  }, {});

  // Performance level
  const getPerformanceLevel = (percentage) => {
    if (percentage >= 90) return { level: 'Excellent', color: '#52c41a', icon: <TrophyOutlined /> };
    if (percentage >= 80) return { level: 'Very Good', color: '#1890ff', icon: <CheckCircleOutlined /> };
    if (percentage >= 70) return { level: 'Good', color: '#faad14', icon: <CheckCircleOutlined /> };
    if (percentage >= 60) return { level: 'Average', color: '#fa8c16', icon: <ExclamationCircleOutlined /> };
    if (percentage >= 50) return { level: 'Below Average', color: '#f5222d', icon: <ExclamationCircleOutlined /> };
    return { level: 'Needs Improvement', color: '#ff4d4f', icon: <ExclamationCircleOutlined /> };
  };

  const performance = getPerformanceLevel(percentage);

  // Generate AI-powered summary
  const generateSummary = () => {
    const strengths = [];
    const improvements = [];
    
    // Analyze by difficulty
    Object.entries(difficultyStats).forEach(([difficulty, stats]) => {
      const avgScore = stats.totalScore / stats.count;
      const avgTime = stats.totalTime / stats.count;
      
      if (avgScore >= 8) {
        strengths.push(`Strong performance in ${difficulty} questions`);
      } else if (avgScore < 6) {
        improvements.push(`Focus more on ${difficulty} level concepts`);
      }
      
      // Time analysis
      if (difficulty === 'easy' && avgTime > 15) {
        improvements.push('Could improve speed on basic questions');
      } else if (difficulty === 'hard' && avgTime < 60) {
        strengths.push('Efficient problem-solving on complex questions');
      }
    });

    // Overall time management
    if (totalTimeTaken / totalTimeAllowed < 0.7) {
      strengths.push('Excellent time management');
    } else if (totalTimeTaken / totalTimeAllowed > 0.9) {
      improvements.push('Work on time management under pressure');
    }

    return { strengths, improvements };
  };

  const summary = generateSummary();

  return (
    <div style={{ padding: '20px', maxWidth: '900px', margin: '0 auto' }}>
      <Card>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <Title level={2}>
            <TrophyOutlined style={{ color: performance.color, marginRight: '10px' }} />
            Interview Complete!
          </Title>
          <Text type="secondary" style={{ fontSize: '16px' }}>
            Technical Assessment Results
          </Text>
        </div>

        {/* Candidate Information */}
        <Card 
          title={<><UserOutlined /> Candidate Information</>} 
          style={{ marginBottom: '20px' }}
          size="small"
        >
          <Row gutter={16}>
            <Col span={8}>
              <Text strong>Name: </Text>
              <Text>{candidateInfo?.name || 'Not provided'}</Text>
            </Col>
            <Col span={8}>
              <Text strong><MailOutlined /> Email: </Text>
              <Text>{candidateInfo?.email || 'Not provided'}</Text>
            </Col>
            <Col span={8}>
              <Text strong><PhoneOutlined /> Phone: </Text>
              <Text>{candidateInfo?.phone || 'Not provided'}</Text>
            </Col>
          </Row>
        </Card>

        {/* Overall Score */}
        <Card style={{ marginBottom: '20px' }}>
          <Row gutter={16} align="middle">
            <Col span={12}>
              <div style={{ textAlign: 'center' }}>
                <Progress
                  type="circle"
                  percent={percentage}
                  format={() => `${percentage}%`}
                  strokeColor={performance.color}
                  size={120}
                />
                <div style={{ marginTop: '10px' }}>
                  <Tag color={performance.color} style={{ fontSize: '14px', padding: '4px 12px' }}>
                    {performance.icon} {performance.level}
                  </Tag>
                </div>
              </div>
            </Col>
            <Col span={12}>
              <Row gutter={[0, 16]}>
                <Col span={24}>
                  <Statistic title="Total Score" value={totalScore} suffix={`/ ${maxPossibleScore}`} />
                </Col>
                <Col span={24}>
                  <Statistic title="Average Score" value={averageScore.toFixed(1)} suffix="/ 10" />
                </Col>
                <Col span={24}>
                  <Statistic 
                    title="Time Taken" 
                    value={Math.floor(totalTimeTaken / 60)} 
                    suffix={`m ${totalTimeTaken % 60}s`}
                    prefix={<ClockCircleOutlined />}
                  />
                </Col>
              </Row>
            </Col>
          </Row>
        </Card>

        {/* Question Breakdown */}
        <Card title="Question-wise Performance" style={{ marginBottom: '20px' }}>
          {allAnswers.map((answer, index) => (
            <Card 
              key={index} 
              size="small" 
              style={{ marginBottom: '10px' }}
              styles={{ body: { padding: '12px' } }}
            >
              <Row align="middle" justify="space-between">
                <Col span={16}>
                  <Text strong>Question {index + 1}</Text>
                  <Tag color={
                    answer.difficulty === 'easy' ? 'green' : 
                    answer.difficulty === 'medium' ? 'orange' : 'red'
                  } style={{ marginLeft: '8px' }}>
                    {answer.difficulty?.toUpperCase()}
                  </Tag>
                  <div style={{ marginTop: '4px' }}>
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      {answer.question?.substring(0, 100)}...
                    </Text>
                  </div>
                </Col>
                <Col span={4} style={{ textAlign: 'center' }}>
                  <Text strong style={{ 
                    color: answer.score >= 8 ? '#52c41a' : 
                           answer.score >= 6 ? '#faad14' : '#f5222d'
                  }}>
                    {answer.score}/10
                  </Text>
                  <div>
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      {answer.timeTaken}s
                      {answer.timedOut && <Tag color="red" size="small">Timeout</Tag>}
                    </Text>
                  </div>
                </Col>
                <Col span={4}>
                  <Progress 
                    percent={(answer.score / 10) * 100} 
                    showInfo={false} 
                    strokeColor={
                      answer.score >= 8 ? '#52c41a' : 
                      answer.score >= 6 ? '#faad14' : '#f5222d'
                    }
                    size="small"
                  />
                </Col>
              </Row>
            </Card>
          ))}
        </Card>

        {/* Performance Analysis */}
        <Card title="Performance Analysis" style={{ marginBottom: '20px' }}>
          <Row gutter={16}>
            <Col span={12}>
              <Title level={5} style={{ color: '#52c41a' }}>
                <CheckCircleOutlined /> Strengths
              </Title>
              {summary.strengths.length > 0 ? (
                <ul>
                  {summary.strengths.map((strength, index) => (
                    <li key={index}>
                      <Text>{strength}</Text>
                    </li>
                  ))}
                </ul>
              ) : (
                <Text type="secondary">Keep practicing to develop your strengths!</Text>
              )}
            </Col>
            <Col span={12}>
              <Title level={5} style={{ color: '#faad14' }}>
                <ExclamationCircleOutlined /> Areas for Improvement
              </Title>
              {summary.improvements.length > 0 ? (
                <ul>
                  {summary.improvements.map((improvement, index) => (
                    <li key={index}>
                      <Text>{improvement}</Text>
                    </li>
                  ))}
                </ul>
              ) : (
                <Text style={{ color: '#52c41a' }}>Great job! No major areas for improvement identified.</Text>
              )}
            </Col>
          </Row>
        </Card>

        {/* Difficulty Analysis */}
        <Card title="Difficulty-wise Analysis">
          <Row gutter={16}>
            {Object.entries(difficultyStats).map(([difficulty, stats]) => {
              const avgScore = (stats.totalScore / stats.count).toFixed(1);
              const avgTime = Math.round(stats.totalTime / stats.count);
              
              return (
                <Col span={8} key={difficulty}>
                  <Card size="small">
                    <Statistic
                      title={
                        <span>
                          <Tag color={
                            difficulty === 'easy' ? 'green' : 
                            difficulty === 'medium' ? 'orange' : 'red'
                          }>
                            {difficulty.toUpperCase()}
                          </Tag>
                        </span>
                      }
                      value={avgScore}
                      suffix="/ 10"
                      precision={1}
                    />
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      Avg Time: {avgTime}s | Questions: {stats.count}
                    </Text>
                  </Card>
                </Col>
              );
            })}
          </Row>
        </Card>

        <Divider />
        
        <div style={{ textAlign: 'center' }}>
          <Paragraph>
            <Text type="secondary">
              Assessment completed on {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}
            </Text>
          </Paragraph>
          <Paragraph>
            <Text strong>
              Thank you for completing the technical interview! 
              {percentage >= 70 && " Your performance shows strong technical capabilities."}
              {percentage < 70 && " Keep practicing and you'll improve your technical skills."}
            </Text>
          </Paragraph>
        </div>
      </Card>
    </div>
  );
};

export default InterviewResults;