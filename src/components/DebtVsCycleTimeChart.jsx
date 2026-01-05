import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import './DebtVsCycleTimeChart.css';

const DebtVsCycleTimeChart = ({ baselineCycleTime, alpha }) => {
  // Generate data points for the exponential curve
  const data = [];
  for (let d = 0; d <= 100; d += 5) {
    const debtRatio = d / 100;
    const cycleTime = baselineCycleTime * Math.exp(alpha * debtRatio);
    data.push({
      debt: d,
      cycleTime: cycleTime.toFixed(2),
    });
  }

  return (
    <div className="chart-container">
      <h3>Technical Debt vs Cycle Time</h3>
      <p className="chart-description">
        Exponential relationship: CT = CT₀ × e^(αD)
      </p>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#222" />
          <XAxis
            dataKey="debt"
            label={{ value: 'Technical Debt (%)', position: 'insideBottom', offset: -5, fill: '#666' }}
            stroke="#444"
            tick={{ fill: '#666' }}
          />
          <YAxis
            label={{ value: 'Cycle Time (days)', angle: -90, position: 'insideLeft', fill: '#666' }}
            stroke="#444"
            tick={{ fill: '#666' }}
          />
          <Tooltip
            contentStyle={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: '2px' }}
            labelStyle={{ color: '#999' }}
            itemStyle={{ color: '#e5e5e5' }}
            formatter={(value) => [`${value} days`, 'Cycle Time']}
            labelFormatter={(label) => `Debt: ${label}%`}
          />
          <Legend wrapperStyle={{ color: '#999' }} />
          <Line
            type="monotone"
            dataKey="cycleTime"
            stroke="#e74c3c"
            strokeWidth={2}
            name="Cycle Time"
            dot={false}
            activeDot={{ r: 4, fill: '#e74c3c', stroke: '#fff', strokeWidth: 1 }}
          />
        </LineChart>
      </ResponsiveContainer>
      <div className="chart-insight">
        <strong>Key Insight:</strong> As technical debt increases, cycle time grows exponentially,
        not linearly. Small amounts of debt compound quickly.
      </div>
    </div>
  );
};

export default DebtVsCycleTimeChart;
