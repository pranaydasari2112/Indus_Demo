import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import KPICards from './components/KPICards';
import ChatWindow from './components/ChatWindow';
import ChartRenderer from './components/ChartRenderer';
import DataTable from './components/DataTable';
import { sendMessageToAgent, getKPIs, getDashboardCharts } from './api/api';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#ef4444'];

// Helper to format values in Indian Rupees (Cr/Lakhs)
const formatCurrency = (value) => {
  if (value >= 10000000) {
    return `₹${(value / 10000000).toFixed(2)} Cr`;
  } else if (value >= 100000) {
    return `₹${(value / 100000).toFixed(2)} L`;
  }
  return `₹${value.toLocaleString()}`;
};

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [kpis, setKpis] = useState({ open_commitment: 0, active_pos: 0, vendors_engaged: 0, avg_cycle_time: 0 });
  const [kpiLoading, setKpiLoading] = useState(true);
  const [dashboardCharts, setDashboardCharts] = useState({ region_commitment: [], top_vendors: [], ageing_slabs: [], po_status: [] });
  const [chartsLoading, setChartsLoading] = useState(true);
  const [activeChartTab, setActiveChartTab] = useState('region');
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [activeResult, setActiveResult] = useState({ chart: null, data: [] });
  const [error, setError] = useState(null);
  const [visualizerCollapsed, setVisualizerCollapsed] = useState(false);

  // Retrieve KPI highlights from db
  const fetchKpis = async () => {
    try {
      setKpiLoading(true);
      const data = await getKPIs();
      setKpis(data);
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Could not connect to FastAPI server. Please verify the backend service is running on port 8000.');
    } finally {
      setKpiLoading(false);
    }
  };

  const fetchDashboardCharts = async () => {
    try {
      setChartsLoading(true);
      const data = await getDashboardCharts();
      setDashboardCharts(data);
    } catch (err) {
      console.error("Failed to load dashboard static charts", err);
    } finally {
      setChartsLoading(false);
    }
  };

  useEffect(() => {
    fetchKpis();
    fetchDashboardCharts();
  }, []);

  const handleSendMessage = async (textToSend) => {
    const text = textToSend || inputValue;
    if (!text.trim()) return;

    // Add user message
    const userMsg = { sender: 'user', text };
    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setChatLoading(true);

    // Compile message history format for LangGraph context
    const history = messages.map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'assistant',
      content: msg.text
    }));

    try {
      const response = await sendMessageToAgent(text, history);
      
      const assistantMsg = {
        sender: 'assistant',
        text: response.answer,
        sql: response.sql,
        data: response.data,
        chart: response.chart
      };
      
      setMessages((prev) => [...prev, assistantMsg]);
      setActiveResult({ chart: response.chart, data: response.data });
      
      // Dynamic KPI refetch to capture any changes
      fetchKpis();
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'assistant',
          text: `### Connection Error\nI failed to fetch a response. ${err.message || 'Verify your backend server and Gemini API keys.'}`
        }
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleChipClick = (chipText) => {
    handleSendMessage(chipText);
  };

  return (
    <Layout
      sidebar={<Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />}
      header={<Header />}
    >
      {error && (
        <div style={{
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          borderRadius: '8px',
          padding: '12px 16px',
          color: '#f87171',
          fontSize: '0.88rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          animation: 'fadeIn 0.3s ease',
          marginBottom: '10px'
        }}>
          <span>{error}</span>
          <button 
            onClick={fetchKpis} 
            style={{ 
              background: 'rgba(255,255,255,0.05)', 
              border: '1px solid rgba(255,255,255,0.1)', 
              borderRadius: '4px', 
              color: 'white', 
              padding: '4px 10px', 
              cursor: 'pointer', 
              fontSize: '0.75rem',
              fontWeight: 600
            }}
          >
            Retry Connection
          </button>
        </div>
      )}

      {activeTab === 'dashboard' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', flex: 1, overflow: 'hidden', animation: 'fadeIn 0.3s ease' }}>
          {/* Corporate Dashboard KPI Panel */}
          <KPICards kpis={kpis} loading={kpiLoading} />
          
          <div className="dashboard-charts-wrapper">
          <div className="panel-card chart-tabbed-container">
            {/* Chart Tab Selectors */}
            <div className="chart-tabs-header">
              <button 
                className={`chart-tab-btn ${activeChartTab === 'region' ? 'active' : ''}`}
                onClick={() => { setActiveChartTab('region'); setHoveredIndex(null); }}
              >
                Commitment by Region
              </button>
              <button 
                className={`chart-tab-btn ${activeChartTab === 'vendors' ? 'active' : ''}`}
                onClick={() => { setActiveChartTab('vendors'); setHoveredIndex(null); }}
              >
                Top 5 Vendors
              </button>
              <button 
                className={`chart-tab-btn ${activeChartTab === 'ageing' ? 'active' : ''}`}
                onClick={() => { setActiveChartTab('ageing'); setHoveredIndex(null); }}
              >
                Open POs by Ageing Slab
              </button>
              <button 
                className={`chart-tab-btn ${activeChartTab === 'status' ? 'active' : ''}`}
                onClick={() => { setActiveChartTab('status'); setHoveredIndex(null); }}
              >
                PO Status Distribution
              </button>
            </div>

            {/* Tab Content Area */}
            <div className="chart-tab-content">
              {/* Left Side: Spacious Chart */}
              <div className="chart-display-area">
                {chartsLoading ? (
                  <div className="chart-loader">Loading baseline statistics...</div>
                ) : activeChartTab === 'region' ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={dashboardCharts.region_commitment}
                      layout="vertical"
                      margin={{ top: 10, right: 30, left: 10, bottom: 5 }}
                      onMouseMove={(state) => {
                        if (state && state.activeTooltipIndex !== undefined) {
                          setHoveredIndex(state.activeTooltipIndex);
                        } else {
                          setHoveredIndex(null);
                        }
                      }}
                      onMouseLeave={() => setHoveredIndex(null)}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                      <XAxis type="number" stroke="#9ca3af" tickFormatter={formatCurrency} tick={{ fontSize: 10 }} />
                      <YAxis dataKey="name" type="category" stroke="#9ca3af" width={80} tick={{ fontSize: 10 }} />
                      <Tooltip 
                        formatter={(value) => [formatCurrency(value), 'Commitment']} 
                        contentStyle={{ backgroundColor: '#111827', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}
                        labelStyle={{ color: 'white', fontSize: '11px' }}
                        cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                      />
                      <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]}>
                        {dashboardCharts.region_commitment.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={COLORS[index % COLORS.length]} 
                            style={{
                              cursor: 'pointer',
                              transition: 'opacity 0.2s ease',
                              opacity: hoveredIndex === null || hoveredIndex === index ? 1 : 0.3
                            }}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : activeChartTab === 'vendors' ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={dashboardCharts.top_vendors}
                      margin={{ top: 20, right: 20, left: 20, bottom: 10 }}
                      onMouseMove={(state) => {
                        if (state && state.activeTooltipIndex !== undefined) {
                          setHoveredIndex(state.activeTooltipIndex);
                        } else {
                          setHoveredIndex(null);
                        }
                      }}
                      onMouseLeave={() => setHoveredIndex(null)}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                      <XAxis dataKey="name" stroke="#9ca3af" tickFormatter={() => ''} height={35} />
                      <YAxis stroke="#9ca3af" tickFormatter={formatCurrency} tick={{ fontSize: 10 }} domain={[0, 'auto']} />
                      <Tooltip 
                        formatter={(value) => [formatCurrency(value), 'Open Commitment']}
                        contentStyle={{ backgroundColor: '#111827', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}
                        labelStyle={{ color: 'white', fontSize: '11px' }}
                        cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                      />
                      <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]}>
                        {dashboardCharts.top_vendors.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={COLORS[index % COLORS.length]} 
                            style={{
                              cursor: 'pointer',
                              transition: 'opacity 0.2s ease',
                              opacity: hoveredIndex === null || hoveredIndex === index ? 1 : 0.3
                            }}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : activeChartTab === 'ageing' ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={dashboardCharts.ageing_slabs}
                      margin={{ top: 20, right: 20, left: 10, bottom: 5 }}
                      onMouseMove={(state) => {
                        if (state && state.activeTooltipIndex !== undefined) {
                          setHoveredIndex(state.activeTooltipIndex);
                        } else {
                          setHoveredIndex(null);
                        }
                      }}
                      onMouseLeave={() => setHoveredIndex(null)}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                      <XAxis dataKey="name" stroke="#9ca3af" tick={{ fontSize: 10 }} />
                      <YAxis stroke="#9ca3af" tick={{ fontSize: 10 }} domain={[0, 'auto']} />
                      <Tooltip 
                        formatter={(value) => [value, 'POs Count']}
                        contentStyle={{ backgroundColor: '#111827', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}
                        labelStyle={{ color: 'white', fontSize: '11px' }}
                        cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                      />
                      <Bar dataKey="value" fill="#f59e0b" radius={[4, 4, 0, 0]}>
                        {dashboardCharts.ageing_slabs.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={COLORS[index % COLORS.length]} 
                            style={{
                              cursor: 'pointer',
                              transition: 'opacity 0.2s ease',
                              opacity: hoveredIndex === null || hoveredIndex === index ? 1 : 0.3
                            }}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={dashboardCharts.po_status}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {dashboardCharts.po_status.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={COLORS[index % COLORS.length]} 
                            style={{
                              cursor: 'pointer',
                              transition: 'opacity 0.2s ease',
                              opacity: hoveredIndex === null || hoveredIndex === index ? 1 : 0.3
                            }}
                            onMouseEnter={() => setHoveredIndex(index)}
                            onMouseLeave={() => setHoveredIndex(null)}
                          />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#111827', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}
                        labelStyle={{ color: 'white', fontSize: '11px' }}
                      />
                      <Legend 
                        layout="vertical"
                        verticalAlign="middle"
                        align="right"
                        iconType="circle" 
                        wrapperStyle={{ fontSize: '11px', color: '#9ca3af', paddingLeft: '15px', lineHeight: '22px' }} 
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Right Side: Key Insights and Summary stats Panel */}
              <div className="chart-insights-sidebar">
                <h4 className="insights-title">Key Baseline Metrics</h4>
                {chartsLoading ? (
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Loading insights...</div>
                ) : activeChartTab === 'region' ? (
                  <div className="insights-content">
                    <p className="insight-intro">Regional commitment distribution highlights:</p>
                    <div style={{ paddingRight: '4px', margin: '8px 0' }}>
                      <ul className="insights-list">
                        {dashboardCharts.region_commitment.map((item, idx) => {
                          const isHovered = hoveredIndex === idx;
                          return (
                            <li 
                              key={idx} 
                              className="insight-item"
                              onMouseEnter={() => setHoveredIndex(idx)}
                              onMouseLeave={() => setHoveredIndex(null)}
                              style={{
                                padding: '6px 8px',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                backgroundColor: isHovered ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                                border: isHovered ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid transparent',
                                transition: 'all 0.15s ease',
                                opacity: hoveredIndex === null || isHovered ? 1 : 0.4,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                              }}
                            >
                              <span className="region-indicator" style={{ backgroundColor: COLORS[idx % COLORS.length], margin: 0 }}></span>
                              <span className="insight-label" style={{ flex: 1 }}>{item.name}:</span>
                              <strong className="insight-val">{formatCurrency(item.value)}</strong>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                    <div className="insight-summary-card">
                      <span>Total Regional Open Commitment:</span>
                      <strong>
                        {formatCurrency(dashboardCharts.region_commitment.reduce((acc, curr) => acc + curr.value, 0))}
                      </strong>
                    </div>
                  </div>
                ) : activeChartTab === 'vendors' ? (
                  <div className="insights-content">
                    <p className="insight-intro">Outstanding commitment concentration across top 5 suppliers:</p>
                    <div style={{ paddingRight: '4px', margin: '8px 0' }}>
                      <ul className="insights-list">
                        {dashboardCharts.top_vendors.map((item, idx) => {
                          const isHovered = hoveredIndex === idx;
                          return (
                            <li 
                              key={idx} 
                              className="insight-item"
                              onMouseEnter={() => setHoveredIndex(idx)}
                              onMouseLeave={() => setHoveredIndex(null)}
                              style={{
                                padding: '6px 8px',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                backgroundColor: isHovered ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                                border: isHovered ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid transparent',
                                transition: 'all 0.15s ease',
                                opacity: hoveredIndex === null || isHovered ? 1 : 0.4,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                              }}
                            >
                              <span className="region-indicator" style={{ backgroundColor: COLORS[idx % COLORS.length], margin: 0 }}></span>
                              <span className="insight-label" style={{ flex: 1, maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.name}>{item.name}:</span>
                              <strong className="insight-val">{formatCurrency(item.value)}</strong>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </div>
                ) : activeChartTab === 'ageing' ? (
                  <div className="insights-content">
                    <p className="insight-intro">Aging distribution of active/pending purchase orders:</p>
                    <div style={{ paddingRight: '4px', margin: '8px 0' }}>
                      <ul className="insights-list">
                        {dashboardCharts.ageing_slabs.map((item, idx) => {
                          const isHovered = hoveredIndex === idx;
                          return (
                            <li 
                              key={idx} 
                              className="insight-item"
                              onMouseEnter={() => setHoveredIndex(idx)}
                              onMouseLeave={() => setHoveredIndex(null)}
                              style={{
                                padding: '6px 8px',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                backgroundColor: isHovered ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                                border: isHovered ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid transparent',
                                transition: 'all 0.15s ease',
                                opacity: hoveredIndex === null || isHovered ? 1 : 0.4,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                              }}
                            >
                              <span className="region-indicator" style={{ backgroundColor: COLORS[idx % COLORS.length], margin: 0 }}></span>
                              <span className="insight-label" style={{ flex: 1 }}>{item.name}:</span>
                              <strong className="insight-val">{item.value} POs</strong>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </div>
                ) : (
                  <div className="insights-content">
                    <p className="insight-intro">Breakdown of all records by procurement lifecycle status:</p>
                    <div style={{ paddingRight: '4px', margin: '8px 0' }}>
                      <ul className="insights-list">
                        {dashboardCharts.po_status.map((item, idx) => {
                          const isHovered = hoveredIndex === idx;
                          return (
                            <li 
                              key={idx} 
                              className="insight-item"
                              onMouseEnter={() => setHoveredIndex(idx)}
                              onMouseLeave={() => setHoveredIndex(null)}
                              style={{
                                padding: '6px 8px',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                backgroundColor: isHovered ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                                border: isHovered ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid transparent',
                                transition: 'all 0.15s ease',
                                opacity: hoveredIndex === null || isHovered ? 1 : 0.4,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                              }}
                            >
                              <span className="region-indicator" style={{ backgroundColor: COLORS[idx % COLORS.length], margin: 0 }}></span>
                              <span className="insight-label" style={{ flex: 1 }}>{item.name}:</span>
                              <strong className="insight-val">{item.value} POs</strong>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    ) : activeTab === 'copilot' ? (
        <div className="dashboard-workspace" style={{ 
          animation: 'fadeIn 0.3s ease',
          gridTemplateColumns: visualizerCollapsed ? '1fr' : '1.2fr 1fr'
        }}>
          {/* Left Conversational Analyst View */}
          <ChatWindow
            messages={messages}
            loading={chatLoading}
            inputValue={inputValue}
            setInputValue={setInputValue}
            onSubmit={() => handleSendMessage()}
            onChipClick={handleChipClick}
            visualizerCollapsed={visualizerCollapsed}
            onToggleVisualizer={() => setVisualizerCollapsed(!visualizerCollapsed)}
          />

          {/* Right Visualizer Panel (Charts & Data Tables) */}
          {!visualizerCollapsed && (
            <div className="visualizer-panel">
              <ChartRenderer chartSpec={activeResult.chart} data={activeResult.data} />
              <DataTable data={activeResult.data} />
            </div>
          )}
        </div>
      ) : (
        <div className="database-workspace" style={{ animation: 'fadeIn 0.3s ease' }}>
          <h2 style={{ fontSize: '1.2rem', marginBottom: '6px', color: '#60a5fa', fontWeight: 600 }}>Database Schema Catalog</h2>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '24px' }}>
            The SQLite database contains 1000 records loaded directly from the cell tower PO synthetic tracker. All fields exist under a single flat table <code>purchase_orders</code>.
          </p>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', overflowY: 'auto', flex: 1, paddingBottom: '10px' }}>
            <div className="panel-card" style={{ gridColumn: 'span 2' }}>
              <h3 style={{ fontSize: '0.95rem', color: 'var(--text-primary)', marginBottom: '12px', fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '4px' }}>
                purchase_orders (1000 Rows, 92 Columns)
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '12px', lineHeight: 1.4 }}>
                This table represents the comprehensive lifecycle of procurement transactions, including order placement, material/service definitions, goods receipt entries, inspection checks, invoicing matched states, payments, and open aging statistics.
              </p>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <h4 style={{ fontSize: '0.88rem', color: '#60a5fa', margin: '8px 0 4px 0', fontWeight: 600 }}>Transactional Columns</h4>
                  <ul style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <li><code>po_number</code> (TEXT): Unique purchase order ID (e.g., PO-2025-00001)</li>
                    <li><code>po_date</code> (TEXT): Order issue date in YYYY-MM-DD</li>
                    <li><code>po_status</code> (TEXT): Operational status (e.g., 'Open', 'Partially Fulfilled', 'Fully Fulfilled', 'Finally Closed')</li>
                    <li><code>po_type</code> (TEXT): Order type ('Supply' or 'Service')</li>
                    <li><code>payment_terms</code> (TEXT): Supplier invoice rules (e.g., '45 days from invoice')</li>
                  </ul>
                </div>
                <div>
                  <h4 style={{ fontSize: '0.88rem', color: '#60a5fa', margin: '8px 0 4px 0', fontWeight: 600 }}>Financial Columns (INR)</h4>
                  <ul style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <li><code>po_line_amount_inr</code> (REAL): Total contract value of the line item</li>
                    <li><code>open_po_amount_inr</code> (REAL): Remaining value to be fulfilled (Outstanding Commitment)</li>
                    <li><code>received_amount_line_total_inr</code> (REAL): Value of items received so far</li>
                    <li><code>billed_amount_to_date_inr</code> (REAL): Value of invoices matched</li>
                    <li><code>unit_price_inr</code> (REAL): Item unit rate</li>
                  </ul>
                </div>
                <div>
                  <h4 style={{ fontSize: '0.88rem', color: '#60a5fa', margin: '8px 0 4px 0', fontWeight: 600 }}>Supplier &amp; Geography</h4>
                  <ul style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <li><code>vendor_id</code> &amp; <code>vendor_name</code> (TEXT): Supplier identifiers (e.g., Zenith Power Solutions)</li>
                    <li><code>circle</code> (TEXT): State/Boundary designation (e.g., Maharashtra, Telangana)</li>
                    <li><code>region_name</code> (TEXT): Regional territory (e.g., West, Central, South)</li>
                    <li><code>site_id</code> &amp; <code>site_name</code> (TEXT): Cell tower target site identification</li>
                  </ul>
                </div>
                <div>
                  <h4 style={{ fontSize: '0.88rem', color: '#60a5fa', margin: '8px 0 4px 0', fontWeight: 600 }}>Ageing & Delay SLAs</h4>
                  <ul style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <li><code>po_ageing_days</code> (INTEGER): Open duration in days (anchored to 2026-07-16)</li>
                    <li><code>po_ageing_slab</code> (TEXT): Bracket classification (e.g., '&gt;180 days')</li>
                    <li><code>delivery_delay_days</code> (INTEGER): Delay in days relative to need-by dates</li>
                    <li><code>delayed_po_flag</code> (TEXT): Flag indicator ('Y' or 'N')</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
