import React, { useState } from 'react';
import {
  ResponsiveContainer,
  BarChart, Bar,
  LineChart, Line,
  AreaChart, Area,
  PieChart, Pie, Cell,
  ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts';
import { ChevronDown, ChevronUp, BarChart2 } from 'lucide-react';

export default function ChartRenderer({ chartSpec, data }) {
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (!chartSpec || !chartSpec.type || !data || data.length === 0) {
    return (
      <div className="empty-visualizer">
        <p style={{ fontWeight: 600 }}>No Active Chart Visualization</p>
        <p style={{ fontSize: '0.8rem', color: '#6b7280' }}>
          Select or write a comparison/trend query to populate data and render charts dynamically.
        </p>
      </div>
    );
  }

  const { type, x, y, title } = chartSpec;

  // Custom tooltips to match dark themes
  const customTooltipStyle = {
    backgroundColor: '#1f2937',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '0.85rem'
  };

  // Curated color scheme
  const COLORS = ['#3b82f6', '#10b981', '#06b6d4', '#f59e0b', '#8b5cf6', '#ef4444'];

  const formatValue = (val) => {
    if (typeof val !== 'number') return val;
    if (val >= 10000000) {
      return `₹${(val / 10000000).toFixed(2)} Cr`;
    } else if (val >= 100000) {
      return `₹${(val / 100000).toFixed(2)} L`;
    }
    return `₹${val.toLocaleString()}`;
  };

  const CustomDot = (props) => {
    const { cx, cy, index } = props;
    const isHovered = index === hoveredIndex;
    return (
      <circle 
        cx={cx} 
        cy={cy} 
        r={isHovered ? 6 : 3} 
        fill={isHovered ? '#fff' : '#3b82f6'} 
        stroke={isHovered ? '#3b82f6' : '#fff'} 
        strokeWidth={isHovered ? 2 : 1}
        style={{ cursor: 'pointer', transition: 'all 0.15s ease' }}
      />
    );
  };

  // Custom X-Axis Tick that shows all labels, and rotates them when there are more than 6 to avoid overlap
  const CustomXAxisTick = (props) => {
    const { x: tickX, y: tickY, payload, index } = props;
    const isHovered = hoveredIndex === index;
    const rotate = data.length > 6;
    
    return (
      <g transform={`translate(${tickX},${tickY})`}>
        <text
          x={0}
          y={0}
          dy={rotate ? 8 : 12}
          dx={rotate ? -8 : 0}
          textAnchor={rotate ? "end" : "middle"}
          transform={rotate ? "rotate(-35)" : ""}
          fill={isHovered ? "#60a5fa" : "#9ca3af"}
          fontSize={9}
          fontWeight={isHovered ? "bold" : "normal"}
          style={{ transition: 'all 0.15s ease' }}
        >
          {payload.value && payload.value.length > 12 ? `${payload.value.substring(0, 12)}...` : payload.value}
        </text>
      </g>
    );
  };

  // Custom Y-Axis Tick for horizontal category charts, shows all labels to prevent missing info
  const CustomYAxisTick = (props) => {
    const { x: tickX, y: tickY, payload, index } = props;
    const isHovered = hoveredIndex === index;
    
    return (
      <g transform={`translate(${tickX},${tickY})`}>
        <text
          x={-8}
          y={0}
          dy={4}
          textAnchor="end"
          fill={isHovered ? "#60a5fa" : "#9ca3af"}
          fontSize={10}
          fontWeight={isHovered ? "bold" : "normal"}
          style={{ transition: 'all 0.15s ease' }}
        >
          {payload.value && payload.value.length > 20 ? `${payload.value.substring(0, 20)}...` : payload.value}
        </text>
      </g>
    );
  };

  const renderChart = () => {
    switch (type.toLowerCase()) {
      case 'scatter':
        return (
          <ScatterChart 
            data={data} 
            margin={{ top: 10, right: 20, left: 10, bottom: 20 }}
            onMouseMove={(state) => {
              if (state && state.activeTooltipIndex !== undefined) {
                setHoveredIndex(state.activeTooltipIndex);
              } else {
                setHoveredIndex(null);
              }
            }}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
            {/* Scatter charts correlate two numeric variables */}
            <XAxis type="number" dataKey={x} name={x.replace(/_/g, ' ').toUpperCase()} stroke="#9ca3af" fontSize={11} tickLine={false} tickFormatter={formatValue} />
            <YAxis type="number" dataKey={y} name={y.replace(/_/g, ' ').toUpperCase()} stroke="#9ca3af" fontSize={11} tickLine={false} tickFormatter={formatValue} />
            <Tooltip contentStyle={customTooltipStyle} cursor={{ strokeDasharray: '3 3' }} />
            <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
            <Scatter name={title || "Correlation"} data={data} fill="#3b82f6" />
          </ScatterChart>
        );
      case 'line':
        return (
          <LineChart 
            data={data} 
            margin={{ top: 10, right: 20, left: 10, bottom: 20 }}
            onMouseMove={(state) => {
              if (state && state.activeTooltipIndex !== undefined) {
                setHoveredIndex(state.activeTooltipIndex);
              } else {
                setHoveredIndex(null);
              }
            }}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
            <XAxis dataKey={x} stroke="#9ca3af" fontSize={11} tickLine={false} tick={<CustomXAxisTick />} />
            <YAxis stroke="#9ca3af" fontSize={11} tickLine={false} tickFormatter={formatValue} />
            <Tooltip contentStyle={customTooltipStyle} formatter={(val) => [formatValue(val), y.replace(/_/g, ' ').toUpperCase()]} cursor={{ stroke: 'rgba(255, 255, 255, 0.1)', strokeWidth: 1 }} />
            <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
            <Line type="monotone" dataKey={y} stroke="#3b82f6" strokeWidth={2.5} activeDot={{ r: 6 }} dot={<CustomDot />} name={y.replace(/_/g, ' ').toUpperCase()} />
          </LineChart>
        );
      case 'area':
        return (
          <AreaChart 
            data={data} 
            margin={{ top: 10, right: 20, left: 10, bottom: 20 }}
            onMouseMove={(state) => {
              if (state && state.activeTooltipIndex !== undefined) {
                setHoveredIndex(state.activeTooltipIndex);
              } else {
                setHoveredIndex(null);
              }
            }}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <defs>
              <linearGradient id="colorArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
            <XAxis dataKey={x} stroke="#9ca3af" fontSize={11} tickLine={false} tick={<CustomXAxisTick />} />
            <YAxis stroke="#9ca3af" fontSize={11} tickLine={false} tickFormatter={formatValue} />
            <Tooltip contentStyle={customTooltipStyle} formatter={(val) => [formatValue(val), y.replace(/_/g, ' ').toUpperCase()]} cursor={{ stroke: 'rgba(255, 255, 255, 0.1)', strokeWidth: 1 }} />
            <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
            <Area type="monotone" dataKey={y} stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorArea)" dot={<CustomDot />} name={y.replace(/_/g, ' ').toUpperCase()} />
          </AreaChart>
        );
      case 'pie':
        return (
          <PieChart>
            <Pie
              data={data}
              dataKey={y}
              nameKey={x}
              cx="50%"
              cy="45%"
              outerRadius={75}
              label={({ name, percent }) => `${name.length > 15 ? name.substring(0, 15) + '...' : name} (${(percent * 100).toFixed(0)}%)`}
              labelLine={true}
              fontSize={10}
              stroke="rgba(255, 255, 255, 0.05)"
            >
              {data.map((entry, index) => (
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
            <Tooltip contentStyle={customTooltipStyle} formatter={(val) => [formatValue(val), y.replace(/_/g, ' ').toUpperCase()]} />
            <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
          </PieChart>
        );
      case 'horizontal_bar':
      case 'horizontal-bar':
        return (
          <BarChart 
            data={data} 
            layout="vertical"
            margin={{ top: 10, right: 20, left: 10, bottom: 20 }}
            onMouseMove={(state) => {
              if (state && state.activeTooltipIndex !== undefined) {
                setHoveredIndex(state.activeTooltipIndex);
              } else {
                setHoveredIndex(null);
              }
            }}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
            <XAxis type="number" stroke="#9ca3af" fontSize={11} tickLine={false} tickFormatter={formatValue} />
            <YAxis dataKey={x} type="category" stroke="#9ca3af" fontSize={11} tickLine={false} width={120} tick={<CustomYAxisTick />} />
            <Tooltip contentStyle={customTooltipStyle} formatter={(val) => [formatValue(val), y.replace(/_/g, ' ').toUpperCase()]} cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }} />
            <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
            <Bar dataKey={y} fill="#3b82f6" radius={[0, 4, 4, 0]} name={y.replace(/_/g, ' ').toUpperCase()}>
              {data.map((entry, index) => (
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
        );
      case 'bar':
      default:
        return (
          <BarChart 
            data={data} 
            margin={{ top: 10, right: 20, left: 10, bottom: 20 }}
            onMouseMove={(state) => {
              if (state && state.activeTooltipIndex !== undefined) {
                setHoveredIndex(state.activeTooltipIndex);
              } else {
                setHoveredIndex(null);
              }
            }}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
            <XAxis dataKey={x} stroke="#9ca3af" fontSize={11} tickLine={false} tick={<CustomXAxisTick />} />
            <YAxis stroke="#9ca3af" fontSize={11} tickLine={false} tickFormatter={formatValue} />
            <Tooltip contentStyle={customTooltipStyle} formatter={(val) => [formatValue(val), y.replace(/_/g, ' ').toUpperCase()]} cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }} />
            <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
            <Bar dataKey={y} fill="#3b82f6" radius={[4, 4, 0, 0]} name={y.replace(/_/g, ' ').toUpperCase()}>
              {data.map((entry, index) => (
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
        );
    }
  };

  const renderLabelsList = () => {
    return (
      <div style={{
        marginTop: '16px',
        borderTop: '1px solid rgba(255, 255, 255, 0.05)',
        paddingTop: '12px'
      }}>
        <div style={{
          fontSize: '0.8rem',
          color: '#9ca3af',
          marginBottom: '8px',
          fontWeight: 500,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>All Items ({data.length})</span>
          {hoveredIndex !== null && data[hoveredIndex] && (
            <span style={{ fontSize: '0.75rem', color: '#60a5fa', fontWeight: 600 }}>
              Active: {data[hoveredIndex][x] || data[hoveredIndex].name}
            </span>
          )}
        </div>
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px',
          maxHeight: '120px',
          overflowY: 'auto',
          paddingRight: '4px'
        }}>
          {data.map((entry, index) => {
            const label = entry[x] || entry.name || `Item ${index + 1}`;
            const val = entry[y] || entry.value;
            const isHovered = hoveredIndex === index;
            const color = COLORS[index % COLORS.length];

            return (
              <div
                key={index}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  backgroundColor: isHovered ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                  border: isHovered ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid rgba(255, 255, 255, 0.04)',
                  transition: 'all 0.15s ease',
                  opacity: hoveredIndex === null || isHovered ? 1 : 0.4
                }}
              >
                <span style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: color,
                  display: 'inline-block'
                }} />
                <span style={{
                  color: isHovered ? '#fff' : '#9ca3af',
                  fontWeight: isHovered ? 500 : 400
                }}>
                  {label}:
                </span>
                <strong style={{ color: isHovered ? '#60a5fa' : '#f3f4f6' }}>
                  {formatValue(val)}
                </strong>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="panel-card" style={{ display: 'flex', flexDirection: 'column', minHeight: isCollapsed ? 'auto' : '360px', flexShrink: 0 }}>
      <div 
        className="panel-header" 
        style={{ 
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <h3 className="panel-title" style={{ fontSize: '1rem', borderBottom: isCollapsed ? 'none' : '1px solid rgba(255,255,255,0.05)', paddingBottom: '6px', width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: 0 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BarChart2 size={16} style={{ color: '#60a5fa' }} />
            {title || 'Active Visualization'}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', color: 'var(--text-secondary)' }}>
            {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </span>
        </h3>
      </div>
      
      {!isCollapsed && (
        <>
          <div style={{ flex: 1, width: '100%', height: '100%', minHeight: '280px', marginTop: '12px' }}>
            <ResponsiveContainer width="100%" height="100%">
              {renderChart()}
            </ResponsiveContainer>
          </div>
          {renderLabelsList()}
        </>
      )}
    </div>
  );
}
