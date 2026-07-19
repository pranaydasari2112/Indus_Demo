import React, { useEffect, useRef } from 'react';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import PromptChips from './PromptChips';
import Thinking from './Thinking';
import { Eye, EyeOff } from 'lucide-react';

export default function ChatWindow({
  messages,
  loading,
  inputValue,
  setInputValue,
  onSubmit,
  onChipClick,
  visualizerCollapsed,
  onToggleVisualizer
}) {
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  return (
    <div className="chat-window">
      {/* Chat Window Header */}
      <div className="chat-header" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '14px 20px',
        borderBottom: '1px solid var(--border-color)',
        backgroundColor: 'rgba(255, 255, 255, 0.01)',
        backdropFilter: 'blur(10px)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)' }}>Conversational Analyst</span>
          <span style={{ fontSize: '0.7rem', color: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>Active</span>
        </div>
        <button
          onClick={onToggleVisualizer}
          style={{
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            color: 'var(--text-secondary)',
            fontSize: '0.75rem',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            cursor: 'pointer',
            fontWeight: 500,
            transition: 'all 0.15s ease'
          }}
          onMouseOver={(e) => { e.currentTarget.style.borderColor = 'var(--accent-blue)'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.1)'; }}
          onMouseOut={(e) => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.04)'; }}
        >
          {visualizerCollapsed ? <Eye size={13} style={{ color: '#60a5fa' }} /> : <EyeOff size={13} />}
          {visualizerCollapsed ? 'Show Visualizations' : 'Hide Visualizations'}
        </button>
      </div>

      {/* Scrollable Message Box */}
      <div className="messages-list">
        {messages.length === 0 && (
          <div className="empty-visualizer" style={{ flex: 1, padding: '40px 20px' }}>
            <p style={{ fontWeight: 700, fontSize: '1.15rem', color: '#60a5fa' }}>
              Procurement Intelligence Assistant
            </p>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', maxWidth: '420px', marginTop: '6px', lineHeight: 1.5 }}>
              Ask questions regarding pending commitments, circle orders, material distributions, or vendor ratings. The assistant compiles SQL queries, fetches live datasets, and outlines analytical highlights.
            </p>
          </div>
        )}
        
        {messages.map((msg, index) => (
          <ChatMessage key={index} message={msg} />
        ))}
        
        {loading && <Thinking />}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Suggestion Chips - shown only when chat is clean */}
      {messages.length === 0 && !loading && (
        <div style={{ marginBottom: '10px' }}>
          <PromptChips onChipClick={onChipClick} />
        </div>
      )}

      {/* Input Action Bar */}
      <ChatInput
        value={inputValue}
        setValue={setInputValue}
        onSubmit={onSubmit}
        loading={loading}
      />
    </div>
  );
}
