import React from 'react';
import { LayoutDashboard, Database, Settings, ShieldAlert, Cpu, MessageSquare } from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab }) {
  return (
    <aside className="sidebar">
      <div className="nav-section">
        {/* Brand Header */}
        <div className="brand-section">
          <div className="brand-icon">
            <Cpu size={18} />
          </div>
          <span className="brand-name">Indus Analytics</span>
        </div>

        {/* Navigation Menu */}
        <nav className="nav-menu">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
          >
            <LayoutDashboard size={18} />
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => setActiveTab('copilot')}
            className={`nav-item ${activeTab === 'copilot' ? 'active' : ''}`}
          >
            <MessageSquare size={18} />
            <span>AI Procurement Copilot</span>
          </button>
          
          <button
            onClick={() => setActiveTab('database')}
            className={`nav-item ${activeTab === 'database' ? 'active' : ''}`}
          >
            <Database size={18} />
            <span>Database Catalog</span>
          </button>
        </nav>
      </div>

      {/* Sidebar Footer Info */}
      <div className="sidebar-info-container">
        <div className="sidebar-footer" style={{ marginBottom: '12px' }}>
          <ShieldAlert size={14} style={{ color: '#ef4444' }} />
          <span style={{ color: '#9ca3af' }}>Read-Only Mode</span>
        </div>
        <div className="sidebar-footer">
          <Cpu size={14} />
          <span>v1.0.0 (FastAPI + Agent)</span>
        </div>
      </div>
    </aside>
  );
}
