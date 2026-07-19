import React from 'react';

export default function Layout({ sidebar, header, children }) {
  return (
    <div className="app-container">
      {sidebar}
      <div className="main-content">
        {header}
        <main className="content-pane">
          {children}
        </main>
      </div>
    </div>
  );
}
