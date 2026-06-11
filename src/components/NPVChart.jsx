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
import { simulateTrajectory, solveRADRM, weeklyDiscount } from '../utils/calculations';
import './DebtVsCycleTimeChart.css';

/**
 * Cumulative discounted profit trajectory under each RADRM policy.
 * Implements the running form of Eq. 12 (with TD drag) and Eq. 13
 * (survival-weighted) — both available via toggle.
 */
const NPVChart = ({ inputs }) => {
  const [survival, setSurvival] = useState(true);

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

  const optimal = useMemo(() => solveRADRM(cfg), [cfg]);
  const rWeek = weeklyDiscount(cfg.rAnnual);

  const buildCurve = (kind, opt) => {
    const sim = simulateTrajectory(cfg, kind, opt);
    let cum = 0;
    return sim.trajectory.map((row) => {
      const w = (row.revenue - row.cost) * (survival ? row.pSurvive : 1);
      cum += w / Math.pow(1 + rWeek, row.week);
      return { week: row.week, value: Math.round(cum) };
    });
  };

  const develop = buildCurve('develop', null);
  const remediate = buildCurve('remediate', null);
  const threshold = buildCurve('threshold', null);
  const opt = buildCurve('optimal', optimal);

  const data = develop.map((row, idx) => ({
    week: row.week,
    develop: develop[idx].value,
    remediate: remediate[idx].value,
    threshold: threshold[idx].value,
    optimal: opt[idx].value,
  }));

  return (
    <div className="chart-container">
      <h3>NPV Trajectory — Policy Comparison</h3>
      <p className="chart-description">
        Cumulative discounted profit at weekly rate {(rWeek * 100).toFixed(2)}%
        ({(cfg.rAnnual * 100).toFixed(0)}% / yr). Toggle to apply
        survival-weighting from Eq. 13.
      </p>

      <div className="scenario-toggle">
        <button className={survival ? 'active' : ''} onClick={() => setSurvival(true)}>
          NPVₛₜₐᵣₜᵤₚ (survival-weighted, Eq. 13)
        </button>
        <button className={!survival ? 'active' : ''} onClick={() => setSurvival(false)}>
          NPVₜD (TD-adjusted, Eq. 12)
        </button>
      </div>

      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={data} margin={{ top: 5, right: 30, left: 30, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#222" />
          <XAxis
            dataKey="week"
            stroke="#444"
            tick={{ fill: '#666' }}
            label={{ value: 'Weeks', position: 'insideBottom', offset: -5, fill: '#666' }}
          />
          <YAxis
            stroke="#444"
            tick={{ fill: '#666' }}
            tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
            label={{ value: 'Discounted Profit ($)', angle: -90, position: 'insideLeft', fill: '#666' }}
          />
          <Tooltip
            contentStyle={{ background: '#1a1a1a', border: '1px solid #333' }}
            labelStyle={{ color: '#999' }}
            itemStyle={{ color: '#e5e5e5' }}
            formatter={(v) => `$${(v / 1000).toFixed(1)}k`}
            labelFormatter={(l) => `Week ${l}`}
          />
          <Legend wrapperStyle={{ color: '#999' }} />
          <Line type="monotone" dataKey="develop" name="Always Develop" stroke="#666" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="remediate" name="Always Remediate" stroke="#e74c3c" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="threshold" name="Threshold (Eq. 20)" stroke="#F59E0B" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="optimal" name="Optimal DP" stroke="#10B981" strokeWidth={2.5} dot={false} />
        </LineChart>
      </ResponsiveContainer>

      <div className="chart-insight">
        <strong>Read this chart:</strong> the optimal-DP curve is the upper
        envelope of what is achievable under the survival constraint.
        The gap between it and "always develop" is the value the framework
        unlocks; the gap between threshold and optimal measures how close
        the simple rule gets to the dynamic-programming bound.
      </div>
    </div>
  );
};

export default NPVChart;
