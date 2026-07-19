import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Table } from 'lucide-react';

export default function DataTable({ data }) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (!data || data.length === 0) {
    return (
      <div className="empty-visualizer" style={{ minHeight: '180px' }}>
        <p style={{ fontWeight: 600 }}>No Active Dataset</p>
        <p style={{ fontSize: '0.8rem', color: '#6b7280' }}>
          Execute a query to retrieve rows and display tables.
        </p>
      </div>
    );
  }

  // Get keys of data records
  const headers = Object.keys(data[0]);

  // Capitalize and format header labels
  const formatHeader = (header) => {
    return header
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  return (
    <div className="panel-card" style={{ display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
      <div 
        className="panel-header" 
        style={{ 
          cursor: 'pointer',
          width: '100%'
        }}
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <h3 className="panel-title" style={{ fontSize: '1rem', borderBottom: isCollapsed ? 'none' : '1px solid rgba(255,255,255,0.05)', paddingBottom: '6px', width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: 0 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Table size={16} style={{ color: '#10b981' }} />
            <span>Dataset Records ({data.length})</span>
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--text-secondary)' }} onClick={() => setIsCollapsed(!isCollapsed)}>
              {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
            </div>
          </span>
        </h3>
      </div>

      {!isCollapsed && (
        <div className="table-container" style={{ maxHeight: '300px', overflowY: 'auto', marginTop: '12px' }}>
          <table className="analytics-table">
            <thead>
              <tr>
                {headers.map((header) => (
                  <th key={header}>{formatHeader(header)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {headers.map((header) => {
                    const val = row[header];
                    // If it's a number, format it nicely
                    let displayVal = val;
                    if (typeof val === 'number') {
                      if (header.toLowerCase().includes('amount') || header.toLowerCase().includes('commitment') || header.toLowerCase().includes('value')) {
                        displayVal = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
                      } else {
                        displayVal = val.toLocaleString();
                      }
                    }
                    return <td key={header}>{displayVal ?? 'N/A'}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
