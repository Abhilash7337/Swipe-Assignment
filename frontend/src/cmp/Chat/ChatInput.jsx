import React from 'react';
import { Input, Button } from 'antd';
import { SendOutlined } from '@ant-design/icons';

const ChatInput = ({ value, onChange, onSend, placeholder, disabled, buttonText = "Send", inputStyle = { flex: 1 }, containerStyle = { display: 'flex', gap: '8px' } }) => (
  <div style={containerStyle}>
    <Input
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          onSend();
        }
      }}
      style={inputStyle}
    />
    <Button
      type="primary"
      icon={<SendOutlined />}
      onClick={onSend}
      disabled={disabled}
    >
      {buttonText}
    </Button>
  </div>
);

export default ChatInput;
