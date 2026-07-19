import React, { useState, useEffect } from 'react';

export default function Thinking() {
  const steps = [
    "Classifying user intent & parameters...",
    "Synthesizing SQL query schema mapping...",
    "Validating query security constraints...",
    "Executing read-only SQLite database query...",
    "Drafting procurement analysis & strategic recommendations..."
  ];
  
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep((prev) => (prev < steps.length - 1 ? prev + 1 : prev));
    }, 1200);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="thinking-container" style={{ margin: '16px 0' }}>
      <div className="thinking-text">
        <div className="thinking-dots">
          <div className="thinking-dot"></div>
          <div className="thinking-dot"></div>
          <div className="thinking-dot"></div>
        </div>
        <span style={{ fontWeight: 500 }}>{steps[currentStep]}</span>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
        <div className="skeleton-line" style={{ width: '100%' }}></div>
        <div className="skeleton-line" style={{ width: '92%', animationDelay: '0.1s' }}></div>
        <div className="skeleton-line" style={{ width: '70%', animationDelay: '0.2s' }}></div>
      </div>
    </div>
  );
}
