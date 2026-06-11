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
import './FeatureDeliveryChart.css';

const FeatureDeliveryChart = ({ baselineCycleTime, currentCycleTime, alpha }) => {
  // Generate data showing cumulative features delivered over 26 weeks.
  // Cycle times here are already in WEEKS, matching the new engine.
  const weeks = 26;
  const data = [];

  for (let week = 0; week <= weeks; week++) {
    const baselineFeatures = week / baselineCycleTime;
    const currentFeatures = week / currentCycleTime;
    const fixedCycleTime = baselineCycleTime * Math.exp(alpha * 0.2);
    const fixedFeatures = week / fixedCycleTime;

    data.push({
      week,
      baseline: baselineFeatures.toFixed(1),
      current: currentFeatures.toFixed(1),
      fixed: fixedFeatures.toFixed(1),
    });
  }

  return (
    <div className="chart-container">
      <h3>Cumulative Feature Delivery</h3>
      <p className="chart-description">
        Eq. 4 in action: features shipped over time at baseline V₀, current V(D), and after partial remediation to D = 20%.
      </p>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#222" />
          <XAxis
            dataKey="week"
            label={{ value: 'Weeks', position: 'insideBottom', offset: -5, fill: '#666' }}
            stroke="#444"
            tick={{ fill: '#666' }}
          />
          <YAxis
            label={{ value: 'Cumulative Features', angle: -90, position: 'insideLeft', fill: '#666' }}
            stroke="#444"
            tick={{ fill: '#666' }}
          />
          <Tooltip
            contentStyle={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: '2px' }}
            labelStyle={{ color: '#999' }}
            itemStyle={{ color: '#e5e5e5' }}
            formatter={(value, name) => [value, name]}
            labelFormatter={(label) => `Week ${label}`}
          />
          <Legend wrapperStyle={{ color: '#999' }} />
          <Line
            type="monotone"
            dataKey="baseline"
            stroke="#666"
            strokeWidth={1.5}
            name="Zero Debt (Ideal)"
            strokeDasharray="5 5"
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="current"
            stroke="#e74c3c"
            strokeWidth={2.5}
            name="Current (With Debt)"
            dot={false}
            activeDot={{ r: 4, fill: '#e74c3c', stroke: '#fff', strokeWidth: 1 }}
          />
          <Line
            type="monotone"
            dataKey="fixed"
            stroke="#4F46E5"
            strokeWidth={2}
            name="After Fixing Debt"
            dot={false}
            activeDot={{ r: 4, fill: '#4F46E5', stroke: '#fff', strokeWidth: 1 }}
          />
        </LineChart>
      </ResponsiveContainer>
      <div className="chart-insight">
        <strong>Key Insight:</strong> The gap between lines shows features you're NOT shipping due
        to technical debt—each one is a revenue opportunity lost.
      </div>
    </div>
  );
};

export default FeatureDeliveryChart;
