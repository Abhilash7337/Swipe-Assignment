import React from 'react';
import { Spin, Typography } from 'antd';
const { Text } = Typography;

const defaultStyles = {
  base: {
    padding: '12px',
    borderRadius: '8px',
    marginBottom: '8px',
    whiteSpace: 'pre-wrap'
  },
  user: { backgroundColor: '#f0f8ff', border: '1px solid #1890ff', textAlign: 'right' },
  bot: { backgroundColor: '#f6ffed', border: '1px solid #52c41a' },
  system: { backgroundColor: '#fff7e6', border: '1px solid #ffa940', textAlign: 'center' }
};

const getMessageStyle = (type, styles = defaultStyles) => {
  const baseStyle = styles.base;
  switch (type) {
    case 'user':
      return { ...baseStyle, ...styles.user };
    case 'bot':
      return { ...baseStyle, ...styles.bot };
    case 'system':
      return { ...baseStyle, ...styles.system };
    default:
      return baseStyle;
  }
};

const ChatMessages = ({ messages, botIsTyping, botTypingText = "Bot is typing...", styles = defaultStyles }) => (
  <>
    {messages.map((message) => (
      <div key={message.id} style={getMessageStyle(message.type, styles)}>
        {message.message}
      </div>
    ))}
    {botIsTyping && (
      <div style={getMessageStyle('bot', styles)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Spin size="small" />
          <Text type="secondary">{botTypingText}</Text>
        </div>
      </div>
    )}
  </>
);

export default ChatMessages;
