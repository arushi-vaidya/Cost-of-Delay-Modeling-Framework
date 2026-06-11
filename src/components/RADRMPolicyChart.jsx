import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceArea,
  ComposedChart,
  Area,
  Line,
  Cell,
} from 'recharts';
import { simulateTrajectory, solveRADRM } from '../utils/calculations';
import './DebtVsCycleTimeChart.css';

/**
 * RADRM policy visualisation. Two panels:
 *   1. Policy heat-strip   — at week 0, which D values trigger remediation
 *      under the optimal DP.
 *   2. NPV comparison      — develop / remediate / threshold / optimal.
 */
const RADRMPolicyChart = ({ inputs }) => {
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

  // % of horizon weeks at each D value where the optimal action is REMEDIATE
  const policyData = optimal.grid.map((D, k) => {
    const T = optimal.policy.length;
    let remediateCount = 0;
    for (let t = 0; t < T; t++) {
      if (optimal.policy[t][k] === 1) remediateCount += 1;
    }
    return {
      D: +(D * 100).toFixed(1),
      remediate: +((remediateCount / T) * 100).toFixed(1),
      value: Math.round(optimal.value[0][k]),
    };
  });

  // NPVs (=value at t=0 from a forward sim along each policy starting at D0)
  const policies = ['develop', 'remediate', 'threshold', 'optimal'];
  const npvs = policies.map((p) => {
    const sim = simulateTrajectory(cfg, p, p === 'optimal' ? optimal : null);
    return {
      name:
        p === 'optimal'
          ? 'Optimal DP'
          : p === 'threshold'
          ? 'Threshold'
          : p === 'remediate'
          ? 'Remediate'
          : 'Develop',
      npv: Math.round(sim.cumProfit),
      finalDebt: +(sim.finalDebt * 100).toFixed(1),
    };
  });

  const best = Math.max(...npvs.map((x) => x.npv));
  const COLORS = ['#666', '#e74c3c', '#F59E0B', '#4F46E5'];

  return (
    <div className="chart-container">
      <h3>RADRM — Optimal Policy &amp; Value Comparison</h3>
      <p className="chart-description">
        Backward-induction DP over a {inputs.horizonWeeks}-week horizon
        (Eq. 16–19). VC discount = {(inputs.discountRate * 100).toFixed(0)}%/yr,
        pivot prob = {(inputs.pivotProb * 100).toFixed(0)}%/yr.
      </p>

      {/* ---- Panel 1: policy fraction ---- */}
      <h4 style={{ color: '#bbb', margin: '12px 0 6px 0', fontSize: 13, letterSpacing: '0.05em' }}>
        % of weeks where REMEDIATE is optimal, by initial debt D₀
      </h4>
      <ResponsiveContainer width="100%" height={220}>
        <ComposedChart data={policyData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#222" />
          <XAxis
            dataKey="D"
            stroke="#444"
            tick={{ fill: '#666' }}
            label={{ value: 'D (%)', position: 'insideBottom', offset: -5, fill: '#666' }}
          />
          <YAxis
            stroke="#444"
            tick={{ fill: '#666' }}
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip
            contentStyle={{ background: '#1a1a1a', border: '1px solid #333' }}
            labelStyle={{ color: '#999' }}
            itemStyle={{ color: '#e5e5e5' }}
            formatter={(v, name) => [`${v}%`, name]}
            labelFormatter={(l) => `D = ${l}%`}
          />
          <Area type="monotone" dataKey="remediate" name="Remediate (%)" stroke="#F59E0B" fill="rgba(245, 158, 11, 0.2)" />
          <ReferenceArea
            x1={inputs.debtRatio * 100 - 1.25}
            x2={inputs.debtRatio * 100 + 1.25}
            strokeOpacity={0}
            fill="#4F46E5"
            fillOpacity={0.18}
          />
        </ComposedChart>
      </ResponsiveContainer>
      <p style={{ color: '#666', fontSize: 11, margin: '4px 0 16px 0' }}>
        Blue band marks current D = {(inputs.debtRatio * 100).toFixed(0)}%.
      </p>

      {/* ---- Panel 2: NPV comparison ---- */}
      <h4 style={{ color: '#bbb', margin: '8px 0 6px 0', fontSize: 13, letterSpacing: '0.05em' }}>
        Discounted profit under each policy (higher = better)
      </h4>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={npvs} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#222" />
          <XAxis dataKey="name" stroke="#444" tick={{ fill: '#666' }} />
          <YAxis
            stroke="#444"
            tick={{ fill: '#666' }}
            tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
          />
          <Tooltip
            contentStyle={{ background: '#1a1a1a', border: '1px solid #333' }}
            labelStyle={{ color: '#999' }}
            itemStyle={{ color: '#e5e5e5' }}
            formatter={(v, name) => {
              if (name === 'npv') return [`$${(v / 1000).toFixed(1)}k`, 'NPV'];
              return [v, name];
            }}
          />
          <Bar dataKey="npv" name="NPV">
            {npvs.map((entry, idx) => (
              <Cell
                key={idx}
                fill={entry.npv === best ? '#10B981' : COLORS[idx]}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div className="chart-insight">
        <strong>Optimal-policy NPV gain over &quot;always develop&quot;:</strong>{' '}
        ${((npvs[3].npv - npvs[0].npv) / 1000).toFixed(1)}k over{' '}
        {inputs.horizonWeeks} weeks. Threshold rule captures{' '}
        {npvs[3].npv > npvs[0].npv
          ? (
              ((npvs[2].npv - npvs[0].npv) /
                Math.max(1, npvs[3].npv - npvs[0].npv)) *
              100
            ).toFixed(0)
          : 0}
        % of that gain.
      </div>
    </div>
  );
};

export default RADRMPolicyChart;
