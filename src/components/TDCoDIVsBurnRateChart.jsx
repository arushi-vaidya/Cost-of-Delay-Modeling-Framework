import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import './TDCoDIVsBurnRateChart.css';

const TDCoDIVsBurnRateChart = ({ tdCoDI, burnRate }) => {
  const data = [
    {
      name: 'Burn Rate',
      value: burnRate,
      description: 'Weekly operational costs',
    },
    {
      name: 'TD-CoDI',
      value: tdCoDI,
      description: 'Weekly cost of technical debt',
    },
  ];

  const COLORS = ['#666', '#e74c3c'];

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="chart-container">
      <h3>Weekly TD-CoDI vs Burn Rate</h3>
      <p className="chart-description">
        How much is technical debt costing you compared to your operational expenses?
      </p>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#222" />
          <XAxis dataKey="name" stroke="#444" tick={{ fill: '#666' }} />
          <YAxis
            stroke="#444"
            tick={{ fill: '#666' }}
            tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
          />
          <Tooltip
            contentStyle={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: '2px' }}
            labelStyle={{ color: '#999' }}
            itemStyle={{ color: '#e5e5e5' }}
            formatter={(value, name, props) => [
              formatCurrency(value),
              props.payload.description,
            ]}
          />
          <Legend wrapperStyle={{ color: '#999' }} />
          <Bar dataKey="value" name="Cost per Week">
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="chart-insight">
        <strong>Key Insight:</strong> If TD-CoDI exceeds burn rate, you're losing more from delayed
        revenue than from operational costs.
      </div>
    </div>
  );
};

export default TDCoDIVsBurnRateChart;
