import React from 'react';
import { ClockCircleOutlined } from '@ant-design/icons';
import { Tag, Typography } from 'antd';
const { Text } = Typography;

const InterviewStatusBar = ({ isAnswering, currentTimer, currentQuestionIndex, label = "💬 Technical Interview in Progress", totalQuestions = 6, timerWarningColor = '#ff4d4f', timerNormalColor = '#1890ff' }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
    <span>{label}</span>
    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
      {isAnswering && (
        <>
          <ClockCircleOutlined style={{ color: currentTimer <= 10 ? timerWarningColor : timerNormalColor }} />
          <Text strong style={{ color: currentTimer <= 10 ? timerWarningColor : timerNormalColor }}>
            {currentTimer}s
          </Text>
        </>
      )}
      <Tag color="blue">{currentQuestionIndex + 1}/{totalQuestions}</Tag>
    </div>
  </div>
);

export default InterviewStatusBar;
