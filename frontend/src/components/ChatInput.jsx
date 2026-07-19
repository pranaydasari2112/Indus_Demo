import React from 'react';
import { Send } from 'lucide-react';

export default function ChatInput({ value, setValue, onSubmit, loading }) {
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && value.trim()) {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <div className="chat-input-container">
      <input
        type="text"
        className="chat-input"
        placeholder={loading ? "AI Analyst is reasoning..." : "Ask about open POs, vendor ratings, cycle times..."}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={loading}
      />
      <button
        className="send-button"
        onClick={onSubmit}
        disabled={loading || !value.trim()}
      >
        <Send size={18} />
      </button>
    </div>
  );
}
