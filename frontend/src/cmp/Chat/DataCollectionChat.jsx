import React, { forwardRef } from "react";
import { Card } from "antd";
import ChatMessages from "./ChatMessages";
import ChatInput from "./ChatInput";

const DataCollectionChat = forwardRef(({
  chatMessages,
  botIsTyping,
  chatInput,
  setChatInput,
  handleChatInput,
  waitingForUserResponse,
  chatPhase,
  currentMissingField,
}, chatContainerRef) => (
  <Card 
    title="💬 Let's Get You Ready for the Interview"
    style={{ marginBottom: '20px' }}
  >
    {/* Chat Messages */}
    <div 
      ref={chatContainerRef}
      style={{ 
        height: '400px', 
        overflowY: 'auto', 
        marginBottom: '16px',
        padding: '10px',
        border: '1px solid #f0f0f0',
        borderRadius: '6px'
      }}
    >
      <ChatMessages 
        messages={chatMessages} 
        botIsTyping={botIsTyping} 
        botTypingText="Bot is typing..." 
      />
    </div>

    {/* Chat Input - only show when waiting for user response */}
    {waitingForUserResponse && !botIsTyping && (
      <ChatInput
        value={chatInput}
        onChange={(e) => setChatInput(e.target.value)}
        onSend={handleChatInput}
        placeholder={
          chatPhase === 'collecting' 
            ? `Enter your ${currentMissingField}...` 
            : 'Type your response...'
        }
        disabled={!chatInput.trim()}
        buttonText="Send"
      />
    )}
  </Card>
));

export default DataCollectionChat;
