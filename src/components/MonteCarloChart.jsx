import React, { useMemo, useState } from 'react';
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion';
import { monteCarlo, solveRADRM } from '../utils/calculations';
import './DebtVsCycleTimeChart.css';

const POLICIES = [
  { id: 'develop',  label: 'Develop only' },
  { id: 'optimal',  label: 'RADRM optimal' },
  { id: 'threshold', label: 'Threshold (Eq. 20)' },
  { id: 'remediate', label: 'Remediate only' },
];

const fmtK = (v) => {
  if (!Number.isFinite(v)) return '–';
  const abs = Math.abs(v);
  if (abs >= 1e6) return `${v < 0 ? '-' : ''}$${(abs / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${v < 0 ? '-' : ''}$${(abs / 1e3).toFixed(1)}k`;
  return `$${v.toFixed(0)}`;
};

const MonteCarloChart = ({ inputs }) => {
  const [policy, setPolicy] = useState('optimal');

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
      theta: inputs.hazardTheta ?? 0.25,
    }),
    [inputs]
  );

  const optimal = useMemo(
    () => (policy === 'optimal' ? solveRADRM(cfg) : null),
    [cfg, policy]
  );

  const N = Math.max(50, Math.min(2000, inputs.mcSamples ?? 500));

  const mc = useMemo(
    () => monteCarlo(cfg, policy, optimal, N, 0xC0DE),
    [cfg, policy, optimal, N]
  );

  // Build chart data: profit fan + survival
  const data = mc.bands.map((b) => ({
    week: b.week,
    p10: b.p10,
    p90: b.p90,
    p50: b.p50,
    mean: b.mean,
    survive: b.pSurvive * 100,
    // recharts stacks Area dataKeys — encode the 80% band as (p10, p90-p10)
    bandLo: b.p10,
    bandHi: b.p90 - b.p10,
  }));

  const finalProfit = mc.profitP50;
  const ci80 = mc.profitP90 - mc.profitP10;

  return (
    <motion.div
      className="chart-container"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <h3>
        Monte Carlo — Stochastic Pivot Risk
        <span className="eq-pill">Section V · N = {N}</span>
      </h3>
      <p className="chart-description">
        {N} sample paths with Bernoulli pivot per week drawn from the Cox
        hazard λ(t) = λ₀ · exp(−θ · R(t)/B(t)). Bands show 10th / 50th /
        90th percentile cumulative discounted profit; the right axis is the
        survivor fraction over time.
      </p>

      <div className="scenario-toggle" style={{ marginBottom: 18 }}>
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

      <ResponsiveContainer width="100%" height={320}>
        <ComposedChart data={data} margin={{ top: 5, right: 60, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="week"
            label={{ value: 'Week', position: 'insideBottom', offset: -5 }}
          />
          <YAxis
            yAxisId="left"
            tickFormatter={fmtK}
            label={{ value: 'Cum. discounted profit ($)', angle: -90, position: 'insideLeft', offset: 10 }}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            domain={[0, 100]}
            tickFormatter={(v) => `${v}%`}
            label={{ value: 'P(survive) %', angle: 90, position: 'insideRight', offset: 10 }}
          />
          <Tooltip
            formatter={(v, name) => {
              if (name === 'P(survive)') return [`${v.toFixed(1)}%`, name];
              return [fmtK(v), name];
            }}
            labelFormatter={(w) => `Week ${w}`}
          />
          <Legend wrapperStyle={{ paddingTop: 8 }} />

          {/* 80% confidence band (stacked area trick) */}
          <Area
            yAxisId="left"
            type="monotone"
            dataKey="bandLo"
            stackId="band"
            stroke="none"
            fill="transparent"
            legendType="none"
            isAnimationActive={false}
          />
          <Area
            yAxisId="left"
            type="monotone"
            dataKey="bandHi"
            stackId="band"
            stroke="none"
            fill="#818cf8"
            fillOpacity={0.18}
            name="80% CI (P10–P90)"
            isAnimationActive={false}
          />

          <Line
            yAxisId="left"
            type="monotone"
            dataKey="p50"
            stroke="#818cf8"
            strokeWidth={2.5}
            dot={false}
            name="Median profit"
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="mean"
            stroke="#34d399"
            strokeWidth={1.5}
            strokeDasharray="4 4"
            dot={false}
            name="Mean profit"
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="survive"
            stroke="#fbbf24"
            strokeWidth={2}
            dot={false}
            name="P(survive)"
          />
          <ReferenceLine yAxisId="left" y={0} stroke="#444" strokeDasharray="2 4" />
        </ComposedChart>
      </ResponsiveContainer>

      <div className="chart-insight">
        <strong>{POLICIES.find((p) => p.id === policy)?.label}</strong> over{' '}
        {inputs.horizonWeeks} weeks · {N} sample paths:
        <ul>
          <li>
            Median terminal profit <code>{fmtK(finalProfit)}</code> · mean{' '}
            <code>{fmtK(mc.meanProfit)}</code>
          </li>
          <li>
            80% CI: <code>{fmtK(mc.profitP10)}</code> →{' '}
            <code>{fmtK(mc.profitP90)}</code> (width{' '}
            <code>{fmtK(ci80)}</code>)
          </li>
          <li>
            Final survivor fraction <code>{(mc.pSurviveFinal * 100).toFixed(1)}%</code>
          </li>
        </ul>
      </div>
    </motion.div>
  );
};

export default MonteCarloChart;
