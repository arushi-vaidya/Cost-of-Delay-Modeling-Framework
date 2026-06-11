import React, { useMemo, useState } from 'react';
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
import { simulateTrajectory, solveRADRM } from '../utils/calculations';
import './DebtVsCycleTimeChart.css';

/**
 * Forward simulation of debt dynamics (paper Eq. 3) under a chosen
 * RADRM policy. Shows D(t), V(t), burn(t), cash(t) over the horizon.
 */
const POLICIES = [
  { id: 'develop', label: 'Always Develop' },
  { id: 'remediate', label: 'Always Remediate' },
  { id: 'threshold', label: 'Threshold Rule (Eq. 20)' },
  { id: 'optimal', label: 'Optimal DP (Eq. 16–19)' },
];

const DebtDynamicsChart = ({ inputs }) => {
  const [policy, setPolicy] = useState('threshold');

  const cfg = useMemo(
    () => ({
      horizonWeeks: inputs.horizonWeeks,
      alpha: inputs.alpha,
      beta: inputs.beta,
      i: inputs.interestRate,
      delta: inputs.newDebtRate,
      gamma: inputs.remediationRate,
      V0: 1 / inputs.baselineCycleTime,
      B0: inputs.burnRate,
      revenuePerFeature: inputs.costOfDelay,
      n: inputs.featuresInPipeline,
      cremPerWeek: inputs.cremPerWeek,
      rAnnual: inputs.discountRate,
      pivotAnnual: inputs.pivotProb,
      R0: inputs.burnRate * inputs.runway * 4.345,
      D0: inputs.debtRatio,
      ct0: inputs.baselineCycleTime,
    }),
    [inputs]
  );

  const optimal = useMemo(
    () => (policy === 'optimal' ? solveRADRM(cfg) : null),
    [policy, cfg]
  );

  const sim = useMemo(
    () => simulateTrajectory(cfg, policy, optimal),
    [cfg, policy, optimal]
  );

  const data = sim.trajectory.map((row) => ({
    week: row.week,
    D: +(row.D * 100).toFixed(2),
    V: +(row.V).toFixed(3),
    burn: Math.round(row.burn),
    cash: Math.round(row.cash),
    pSurvive: +(row.pSurvive * 100).toFixed(1),
    action: row.action,
  }));

  const fmtCurrency = (v) => `$${(v / 1000).toFixed(0)}k`;

  return (
    <div className="chart-container">
      <h3>Debt Dynamics — Forward Simulation</h3>
      <p className="chart-description">
        Eq. 3: dD/dt = i·D + δ (develop) or i·D − γ (remediate). Cash drains
        via Eq. 10. Survival per Section IV.
      </p>

      <div className="scenario-toggle" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {POLICIES.map((p) => (
          <button
            key={p.id}
            className={policy === p.id ? 'active' : ''}
            onClick={() => setPolicy(p.id)}
          >
            {p.label}
          </button>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#222" />
          <XAxis
            dataKey="week"
            stroke="#444"
            tick={{ fill: '#666' }}
            label={{ value: 'Weeks', position: 'insideBottom', offset: -5, fill: '#666' }}
          />
          <YAxis
            yAxisId="left"
            stroke="#444"
            tick={{ fill: '#666' }}
            tickFormatter={(v) => `${v}%`}
            label={{ value: 'D (%)  /  P(survive) %', angle: -90, position: 'insideLeft', fill: '#666' }}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            stroke="#444"
            tick={{ fill: '#666' }}
            tickFormatter={fmtCurrency}
            label={{ value: 'Cash ($)', angle: 90, position: 'insideRight', fill: '#666' }}
          />
          <Tooltip
            contentStyle={{ background: '#1a1a1a', border: '1px solid #333' }}
            labelStyle={{ color: '#999' }}
            itemStyle={{ color: '#e5e5e5' }}
          />
          <Legend wrapperStyle={{ color: '#999' }} />
          <Line yAxisId="left" type="monotone" dataKey="D" name="Debt D (%)" stroke="#e74c3c" strokeWidth={2.5} dot={false} />
          <Line yAxisId="left" type="monotone" dataKey="pSurvive" name="P(survive) (%)" stroke="#4F46E5" strokeWidth={1.8} strokeDasharray="4 4" dot={false} />
          <Line yAxisId="right" type="monotone" dataKey="cash" name="Cash ($)" stroke="#10B981" strokeWidth={1.8} dot={false} />
        </LineChart>
      </ResponsiveContainer>

      <div className="chart-insight">
        <strong>Cumulative discounted profit ({policy}):</strong>{' '}
        ${(sim.cumProfit / 1000).toFixed(1)}k · final debt{' '}
        {(sim.finalDebt * 100).toFixed(1)}% · final cash $
        {(sim.finalCash / 1000).toFixed(1)}k
      </div>
    </div>
  );
};

export default DebtDynamicsChart;
