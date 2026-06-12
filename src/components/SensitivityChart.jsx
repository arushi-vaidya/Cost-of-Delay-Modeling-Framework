import React, { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Cell, Legend,
} from 'recharts';
import { runSensitivity } from '../utils/calculations';
import './DebtVsCycleTimeChart.css';

const fmtDelta = (v) => {
  const abs = Math.abs(v);
  const sign = v >= 0 ? '+' : '−';
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${sign}$${(abs / 1e3).toFixed(1)}k`;
  return `${sign}$${Math.round(abs)}`;
};

const fmtVal = (v, key) => {
  const pctKeys = ['debtRatio', 'interestRate', 'remediationRate', 'newDebtRate', 'discountRate', 'pivotProb'];
  if (pctKeys.includes(key)) return `${(v * 100).toFixed(1)}%`;
  if (['burnRate', 'costOfDelay', 'cremPerWeek'].includes(key)) return `$${(v / 1000).toFixed(1)}k`;
  return v.toFixed(2);
};

const CustomTooltip = ({ active, payload, label, extraData }) => {
  if (!active || !payload?.length) return null;
  const row = extraData?.find((d) => d.param === label);
  return (
    <div style={{
      background: 'var(--bg-1)', border: '1px solid var(--line-2)',
      borderRadius: 8, padding: '12px 14px', fontSize: 12,
      color: 'var(--text-1)', minWidth: 220,
      boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
    }}>
      <div style={{ fontWeight: 600, color: 'var(--text-0)', marginBottom: 8 }}>{label}</div>
      {row && (
        <>
          <div style={{ color: 'var(--text-3)', fontSize: 11, marginBottom: 6 }}>
            Base value: {fmtVal(row.baseVal, row.key)}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
              <span style={{ color: 'var(--text-2)' }}>−20% → {fmtVal(row.lowVal, row.key)}</span>
              <span style={{ fontFamily: 'var(--font-mono)', color: row.lowDelta >= 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }}>
                {fmtDelta(row.lowDelta)}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
              <span style={{ color: 'var(--text-2)' }}>+20% → {fmtVal(row.highVal, row.key)}</span>
              <span style={{ fontFamily: 'var(--font-mono)', color: row.highDelta >= 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }}>
                {fmtDelta(row.highDelta)}
              </span>
            </div>
          </div>
          <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--line-1)', color: 'var(--text-3)', fontSize: 11 }}>
            Total swing: {fmtDelta(row.range)}
          </div>
        </>
      )}
    </div>
  );
};

const SensitivityChart = ({ inputs }) => {
  const { results, baseNPV } = useMemo(() => runSensitivity(inputs, 0.2), [inputs]);

  const chartData = results.map((r) => ({
    param:     r.label,
    lowDelta:  r.lowDelta,
    highDelta: r.highDelta,
    // keep originals for tooltip
    ...r,
  }));

  const maxAbs = Math.max(
    ...chartData.flatMap((d) => [Math.abs(d.lowDelta), Math.abs(d.highDelta)]),
    1
  );
  const xDomain = [-maxAbs * 1.12, maxAbs * 1.12];
  const barHeight = 36;
  const chartHeight = results.length * barHeight + 70;

  const tickFmt = (v) => {
    const abs = Math.abs(v);
    if (abs === 0) return '$0';
    if (abs >= 1e6) return `${v < 0 ? '−' : ''}$${(abs / 1e6).toFixed(1)}M`;
    if (abs >= 1e3) return `${v < 0 ? '−' : ''}$${(abs / 1e3).toFixed(0)}k`;
    return `${v < 0 ? '−' : ''}$${Math.round(abs)}`;
  };

  return (
    <div className="chart-container">
      <h3>
        Sensitivity Analysis — Tornado Chart
        <span className="eq-pill">OAT ±20%</span>
      </h3>
      <p className="chart-description">
        One-at-a-time (OAT) ±20% perturbation of each model parameter. Bars show the
        change in discounted profit vs. the baseline of{' '}
        <strong style={{ color: 'var(--text-0)' }}>{fmtDelta(0).replace('+', '')}${(Math.abs(baseNPV) / 1000).toFixed(1)}k</strong>{' '}
        under the always-develop policy. Parameters sorted by total impact range (widest bar = most influential).
        Green = NPV improves · Red = NPV falls.
      </p>

      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart
          layout="vertical"
          data={chartData}
          margin={{ top: 8, right: 48, left: 168, bottom: 8 }}
          barSize={11}
          barGap={3}
        >
          <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="var(--line-1)" />
          <XAxis
            type="number"
            domain={xDomain}
            tickFormatter={tickFmt}
            stroke="var(--line-2)"
            tick={{ fill: 'var(--text-3)', fontSize: 10, fontFamily: 'var(--font-mono)' }}
            tickLine={{ stroke: 'var(--line-2)' }}
          />
          <YAxis
            type="category"
            dataKey="param"
            width={163}
            stroke="var(--line-2)"
            tick={{ fill: 'var(--text-2)', fontSize: 11 }}
            tickLine={false}
          />
          <Tooltip
            content={<CustomTooltip extraData={results} />}
            cursor={{ fill: 'rgba(255,255,255,0.03)' }}
          />
          <ReferenceLine x={0} stroke="var(--text-3)" strokeDasharray="4 2" strokeWidth={1} />

          {/* −20% bars */}
          <Bar dataKey="lowDelta" name="−20% perturbation" radius={[2, 2, 2, 2]}>
            {chartData.map((entry, idx) => (
              <Cell
                key={`low-${idx}`}
                fill={entry.lowDelta >= 0 ? 'var(--success)' : 'var(--danger)'}
                opacity={0.82}
              />
            ))}
          </Bar>

          {/* +20% bars */}
          <Bar dataKey="highDelta" name="+20% perturbation" radius={[2, 2, 2, 2]}>
            {chartData.map((entry, idx) => (
              <Cell
                key={`high-${idx}`}
                fill={entry.highDelta >= 0 ? 'var(--success)' : 'var(--danger)'}
                opacity={0.82}
              />
            ))}
          </Bar>

          <Legend
            iconType="rect"
            iconSize={10}
            wrapperStyle={{ fontSize: 11, color: 'var(--text-2)', paddingTop: 10 }}
          />
        </BarChart>
      </ResponsiveContainer>

      {/* Top-3 summary callouts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10, marginTop: 18 }}>
        {results.slice(0, 3).map((r, rank) => (
          <div key={r.key} style={{
            padding: '12px 14px',
            background: 'var(--bg-1)',
            border: '1px solid var(--line-1)',
            borderLeft: `2px solid ${rank === 0 ? 'var(--danger)' : rank === 1 ? 'var(--warning)' : 'var(--accent)'}`,
            borderRadius: 'var(--r-sm)',
            fontSize: 11,
          }}>
            <div style={{ color: 'var(--text-3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>
              #{rank + 1} most influential
            </div>
            <div style={{ color: 'var(--text-0)', fontWeight: 600, marginBottom: 2 }}>{r.label}</div>
            <div style={{ color: 'var(--text-2)', fontFamily: 'var(--font-mono)' }}>
              swing: {fmtDelta(Math.round(r.range))}
            </div>
          </div>
        ))}
      </div>

      <div className="chart-insight">
        <strong>Most sensitive:</strong> {results[0]?.label} dominates with a total NPV swing of{' '}
        <strong>{fmtDelta(Math.round(results[0]?.range ?? 0))}</strong> across the ±20% range.{' '}
        <strong>Least sensitive:</strong> {results[results.length - 1]?.label} (swing:{' '}
        {fmtDelta(Math.round(results[results.length - 1]?.range ?? 0))}). Focus model calibration effort
        on the top parameters — errors there propagate most into the financial recommendation.
      </div>
    </div>
  );
};

export default SensitivityChart;
