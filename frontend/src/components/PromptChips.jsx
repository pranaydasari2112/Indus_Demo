import React from 'react';

export default function PromptChips({ onChipClick }) {
  const chips = [
    "Show all open POs older than 180 days as a bar chart?",
    "Which vendors have the largest outstanding commitments? Show a horizontal bar chart.",
    "Show invoices on hold as a table.",
    "List delayed projects as a table.",
    "What is the total open PO value by region as a pie chart."
  ];

  return (
    <div className="chips-container">
      {chips.map((chip, index) => (
        <button
          key={index}
          className="prompt-chip"
          onClick={() => onChipClick(chip)}
        >
          {chip}
        </button>
      ))}
    </div>
  );
}
