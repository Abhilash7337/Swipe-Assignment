import React from 'react';
import { Spin, Typography } from 'antd';
const { Text } = Typography;

const LoadingIndicator = ({ text, spinnerSize = "large", padding = "20px" }) => (
  <div style={{ textAlign: 'center', padding }}>
    <Spin size={spinnerSize} />
    <div style={{ marginTop: '8px' }}>
      <Text>{text}</Text>
    </div>
  </div>
);

export default LoadingIndicator;
