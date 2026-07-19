import React from 'react';
import { Landmark, FileClock, Handshake, Timer } from 'lucide-react';

export default function KPICards({ kpis, loading }) {
  const formatCurrency = (value) => {
    if (value >= 10000000) {
      return `₹${(value / 10000000).toFixed(2)} Cr`;
    }
    if (value >= 100000) {
      return `₹${(value / 100000).toFixed(2)} L`;
    }
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(value);
  };

  const cardsData = [
    {
      label: 'Open Commitment',
      value: loading ? '...' : formatCurrency(kpis.open_commitment || 0),
      icon: <Landmark size={22} className="text-blue-400" style={{ color: '#60a5fa' }} />,
      bg: 'rgba(59, 130, 246, 0.1)',
      border: 'rgba(59, 130, 246, 0.15)'
    },
    {
      label: 'Active POs',
      value: loading ? '...' : (kpis.active_pos ?? 0).toLocaleString(),
      icon: <FileClock size={22} className="text-cyan-400" style={{ color: '#22d3ee' }} />,
      bg: 'rgba(6, 182, 212, 0.1)',
      border: 'rgba(6, 182, 212, 0.15)'
    },
    {
      label: 'Vendors Engaged',
      value: loading ? '...' : (kpis.vendors_engaged ?? 0).toLocaleString(),
      icon: <Handshake size={22} className="text-emerald-400" style={{ color: '#34d399' }} />,
      bg: 'rgba(16, 185, 129, 0.1)',
      border: 'rgba(16, 185, 129, 0.15)'
    },
    {
      label: 'Avg Cycle Time',
      value: loading ? '...' : `${kpis.avg_cycle_time ?? 0} days`,
      icon: <Timer size={22} className="text-amber-400" style={{ color: '#fbbf24' }} />,
      bg: 'rgba(245, 158, 11, 0.1)',
      border: 'rgba(245, 158, 11, 0.15)'
    }
  ];

  return (
    <div className="kpi-grid">
      {cardsData.map((card, index) => (
        <div key={index} className="kpi-card" style={{ borderLeft: `4px solid ${card.icon.props.style.color}` }}>
          <div className="kpi-info">
            <span className="kpi-label">{card.label}</span>
            <span className="kpi-value">{card.value}</span>
          </div>
          <div className="kpi-icon-container" style={{ backgroundColor: card.bg, border: `1px solid ${card.border}` }}>
            {card.icon}
          </div>
        </div>
      ))}
    </div>
  );
}
