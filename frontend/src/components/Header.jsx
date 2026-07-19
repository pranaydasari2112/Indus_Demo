import React from 'react';

export default function Header() {
  return (
    <header className="header">
      <div className="header-title-container">
        <h1>Procurement Intelligence</h1>
        <p>Indus - Purchase Order Analytics Portal</p>
      </div>
      
      <div className="status-indicators">

        {/* Database Health Badge */}
        <div className="status-badge">
          <span className="status-dot"></span>
          SQLite Connection - Live
        </div>
      </div>
    </header>
  );
}
