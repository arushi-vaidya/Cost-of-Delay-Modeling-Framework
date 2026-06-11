import React, { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import './ScenarioComparisonChart.css';

const ScenarioComparisonChart = ({ inputs, calculateMetrics }) => {
  const [activeScenario, setActiveScenario] = useState('comparison');

  // Calculate scenarios
  const currentScenario = calculateMetrics(inputs);
  
  const fixedInputs = { ...inputs, debtRatio: 0.2 }; // Reduce debt to 20%
  const fixedScenario = calculateMetrics(fixedInputs);

  const idealInputs = { ...inputs, debtRatio: 0 }; // Zero debt
  const idealScenario = calculateMetrics(idealInputs);

  const data = [
    {
      name: 'Current',
      'TD-CoDI': currentScenario.tdCoDI,
      'Cycle Time': currentScenario.currentCycleTime,
      'Features/Week': currentScenario.featureVelocity,
    },
    {
      name: 'After Fix',
      'TD-CoDI': fixedScenario.tdCoDI,
      'Cycle Time': fixedScenario.currentCycleTime,
      'Features/Week': fixedScenario.featureVelocity,
    },
    {
      name: 'Ideal (No Debt)',
      'TD-CoDI': idealScenario.tdCoDI,
      'Cycle Time': idealScenario.currentCycleTime,
      'Features/Week': idealScenario.featureVelocity,
    },
  ];

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const savingsFromFix = currentScenario.tdCoDI - fixedScenario.tdCoDI;
  const savingsFromIdeal = currentScenario.tdCoDI - idealScenario.tdCoDI;

  return (
    <div className="chart-container">
      <h3>Scenario Analysis: Fix Debt Now vs Later</h3>
      <p className="chart-description">
        Compare the impact of addressing technical debt at different levels
      </p>

      <div className="scenario-toggle">
        <button
          className={activeScenario === 'comparison' ? 'active' : ''}
          onClick={() => setActiveScenario('comparison')}
        >
          View Comparison
        </button>
      </div>

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
            formatter={(value, name) => {
              if (name === 'TD-CoDI') return [formatCurrency(value), name];
              if (name === 'Cycle Time') return [`${value.toFixed(1)} days`, name];
              if (name === 'Features/Week') return [value.toFixed(2), name];
              return [value, name];
            }}
          />
          <Legend wrapperStyle={{ color: '#999' }} />
          <Bar dataKey="TD-CoDI" fill="#e74c3c" />
        </BarChart>
      </ResponsiveContainer>

      <div className="scenario-insights">
        <div className="scenario-card">
          <div className="scenario-label">💰 Savings from Fixing Debt (to 20%)</div>
          <div className="scenario-value">{formatCurrency(savingsFromFix)}/week</div>
          <div className="scenario-detail">
            {formatCurrency(savingsFromFix * 4)}/month • {formatCurrency(savingsFromFix * 52)}/year
          </div>
        </div>

        <div className="scenario-card">
          <div className="scenario-label">🎯 Maximum Potential Savings (to 0%)</div>
          <div className="scenario-value">{formatCurrency(savingsFromIdeal)}/week</div>
          <div className="scenario-detail">
            {formatCurrency(savingsFromIdeal * 4)}/month • {formatCurrency(savingsFromIdeal * 52)}/year
          </div>
        </div>
      </div>

      <div className="chart-insight">
        <strong>Decision Point:</strong> Every week you delay fixing technical debt costs you {formatCurrency(savingsFromFix)} 
        in opportunity cost. Over a quarter, that's {formatCurrency(savingsFromFix * 13)}.
      </div>
    </div>
  );
};

export default ScenarioComparisonChart;
