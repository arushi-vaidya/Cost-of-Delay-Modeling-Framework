import React, { useEffect, useMemo, useRef, useState } from 'react';
import { solveRADRM } from '../utils/calculations';
import './DebtVsCycleTimeChart.css';

const CANVAS_W = 620;
const CANVAS_H = 280;
const COL_DEV = '#4F46E5';
const COL_REM = '#e74c3c';

const RADRMHeatmap = ({ inputs }) => {
  const [timeStep, setTimeStep]   = useState(0);
  const [showValue, setShowValue] = useState(false);
  const canvasRef = useRef(null);

  const cfg = useMemo(() => ({
    horizonWeeks:     inputs.horizonWeeks,
    alpha:            inputs.alpha,
    beta:             inputs.beta,
    i:                inputs.interestRate,
    delta:            inputs.newDebtRate,
    gamma:            inputs.remediationRate,
    V0:               1 / inputs.baselineCycleTime,
    B0:               inputs.burnRate,
    revenuePerFeature: inputs.costOfDelay,
    n:                inputs.featuresInPipeline,
    cremPerWeek:      inputs.cremPerWeek,
    rAnnual:          inputs.discountRate,
    pivotAnnual:      inputs.pivotProb,
    R0:               inputs.burnRate * inputs.runway * 4.345,
    D0:               inputs.debtRatio,
    ct0:              inputs.baselineCycleTime,
    theta:            inputs.hazardTheta ?? 0.25,
  }), [inputs]);

  const optimal = useMemo(() => solveRADRM(cfg), [cfg]);
  const { policy2D, value2D, gridD, gridR } = optimal;
  const nD   = gridD.length;   // 31
  const nR   = gridR.length;   // 21
  const T    = inputs.horizonWeeks;
  const Rmax = gridR[nR - 1];

  // Clamp t to valid range whenever horizonWeeks changes
  const t = Math.min(timeStep, T - 1);

  // Value function min/max at current t (for opacity overlay)
  const valRange = useMemo(() => {
    if (!value2D?.[t]) return { min: 0, max: 1 };
    let min = Infinity, max = -Infinity;
    for (let kD = 0; kD < nD; kD++) {
      for (let kR = 0; kR < nR; kR++) {
        const v = value2D[t][kD][kR];
        if (v < min) min = v;
        if (v > max) max = v;
      }
    }
    return { min, max };
  }, [value2D, t, nD, nR]);

  // Draw the heatmap grid onto the canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !policy2D?.[t]) return;
    const ctx  = canvas.getContext('2d');
    const cw   = canvas.width;
    const ch   = canvas.height;
    const cellW = cw / nD;
    const cellH = ch / nR;
    const { min, max } = valRange;

    ctx.clearRect(0, 0, cw, ch);

    for (let kD = 0; kD < nD; kD++) {
      for (let kR = 0; kR < nR; kR++) {
        const action = policy2D[t][kD][kR];
        const x = kD * cellW;
        // kR=0 → R=0 → bottom of chart; kR=nR-1 → R=Rmax → top
        const y = (nR - 1 - kR) * cellH;

        if (showValue && value2D) {
          const v    = value2D[t][kD][kR];
          ctx.globalAlpha = max > min ? 0.22 + 0.78 * ((v - min) / (max - min)) : 0.7;
        } else {
          ctx.globalAlpha = 0.82;
        }

        ctx.fillStyle = action === 1 ? COL_REM : COL_DEV;
        ctx.fillRect(x, y, cellW + 0.5, cellH + 0.5);
      }
    }
    ctx.globalAlpha = 1;
  }, [policy2D, value2D, t, nD, nR, showValue, valRange]);

  // Count remediation cells in current time slice
  const remCount = useMemo(() => {
    if (!policy2D?.[t]) return 0;
    return policy2D[t].reduce((acc, col) => acc + col.reduce((a, v) => a + v, 0), 0);
  }, [policy2D, t]);

  // Current state dot position as percentage of canvas
  const dotLeftPct = `${(inputs.debtRatio * 100).toFixed(2)}%`;
  const clampedR   = Math.min(cfg.R0, Rmax);
  const dotTopPct  = `${((1 - clampedR / Rmax) * 100).toFixed(2)}%`;

  // Y-axis tick fractions
  const yFracs = [1, 0.75, 0.5, 0.25, 0];

  return (
    <div className="chart-container">
      <h3>
        RADRM — State-Space Policy Heatmap
        <span className="eq-pill">Eq. 16–19 · 2-D</span>
      </h3>
      <p className="chart-description">
        Full π*(t, D, R) backward-induction policy across the entire (Debt, Cash) state space —
        the tensor the DP computes but the 1-D charts cannot show. Blue = Develop (u=0) · Red = Remediate (u=1).
        Drag the slider to watch the remediation frontier evolve as the horizon shrinks.
      </p>

      {/* Controls row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 14, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
            <span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              Week
            </span>
            <span style={{ fontSize: 13, color: 'var(--text-0)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
              {t} / {T - 1}
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={T - 1}
            step={1}
            value={t}
            onChange={(e) => setTimeStep(Number(e.target.value))}
            style={{ width: '100%', accentColor: 'var(--accent)', cursor: 'pointer' }}
          />
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 7, color: 'var(--text-2)', fontSize: 12, cursor: 'pointer', userSelect: 'none', flexShrink: 0 }}>
          <input
            type="checkbox"
            checked={showValue}
            onChange={(e) => setShowValue(e.target.checked)}
            style={{ accentColor: 'var(--accent)', width: 14, height: 14 }}
          />
          Overlay value function V*(t, D, R)
        </label>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 18, marginBottom: 10, flexWrap: 'wrap' }}>
        {[
          { color: COL_DEV, label: 'Develop (u = 0)' },
          { color: COL_REM, label: 'Remediate (u = 1)' },
        ].map(({ color, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 12, height: 12, background: color, borderRadius: 3, opacity: 0.85 }} />
            <span style={{ fontSize: 11, color: 'var(--text-2)' }}>{label}</span>
          </div>
        ))}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: 'white', boxShadow: '0 0 6px rgba(255,255,255,0.7)' }} />
          <span style={{ fontSize: 11, color: 'var(--text-2)' }}>
            Your state (D={Math.round(inputs.debtRatio * 100)}%, R=${(cfg.R0 / 1000).toFixed(0)}k)
          </span>
        </div>
      </div>

      {/* Chart area: y-label | y-ticks | canvas | → x-axis below */}
      <div style={{ display: 'flex', alignItems: 'stretch', gap: 0 }}>

        {/* Y-axis rotated label */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 18, height: CANVAS_H, flexShrink: 0,
          color: 'var(--text-3)', fontSize: 10,
          writingMode: 'vertical-rl', transform: 'rotate(180deg)',
          letterSpacing: '0.1em', textTransform: 'uppercase',
        }}>
          Cash R ($)
        </div>

        {/* Y-axis ticks */}
        <div style={{ position: 'relative', width: 46, height: CANVAS_H, flexShrink: 0 }}>
          {yFracs.map((frac) => (
            <div key={frac} style={{
              position: 'absolute',
              right: 6,
              top: `${(1 - frac) * 100}%`,
              transform: 'translateY(-50%)',
              color: 'var(--text-3)',
              fontSize: 9,
              fontFamily: 'var(--font-mono)',
              whiteSpace: 'nowrap',
            }}>
              ${Math.round(frac * Rmax / 1000)}k
            </div>
          ))}
          {/* Tick marks */}
          {yFracs.map((frac) => (
            <div key={`tick-${frac}`} style={{
              position: 'absolute',
              right: 0,
              top: `${(1 - frac) * 100}%`,
              width: 4, height: 1,
              background: 'var(--line-2)',
              transform: 'translateY(-50%)',
            }} />
          ))}
        </div>

        {/* Canvas + current-state dot + crosshair */}
        <div style={{ flex: 1, position: 'relative', height: CANVAS_H }}>
          <canvas
            ref={canvasRef}
            width={CANVAS_W}
            height={CANVAS_H}
            style={{
              width: '100%', height: '100%', display: 'block',
              borderRadius: 4, border: '1px solid var(--line-1)',
            }}
          />

          {/* Vertical crosshair at current D */}
          <div style={{
            position: 'absolute',
            left: dotLeftPct,
            top: 0, bottom: 0,
            width: 1,
            background: 'rgba(255,255,255,0.12)',
            pointerEvents: 'none',
          }} />

          {/* Current state dot */}
          <div style={{
            position: 'absolute',
            left: dotLeftPct,
            top: dotTopPct,
            transform: 'translate(-50%, -50%)',
            width: 14, height: 14,
            borderRadius: '50%',
            background: 'white',
            boxShadow: '0 0 12px rgba(255,255,255,0.85), 0 0 4px rgba(255,255,255,0.4)',
            zIndex: 3,
            pointerEvents: 'none',
          }}>
            <div style={{
              position: 'absolute',
              width: 5, height: 5,
              borderRadius: '50%',
              background: 'var(--bg-0)',
              top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
            }} />
          </div>
        </div>
      </div>

      {/* X-axis ticks */}
      <div style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: 64, marginTop: 5 }}>
        {[0, 25, 50, 75, 100].map((pct) => (
          <span key={pct} style={{ color: 'var(--text-3)', fontSize: 9, fontFamily: 'var(--font-mono)' }}>
            {pct}%
          </span>
        ))}
      </div>
      <div style={{ textAlign: 'center', paddingLeft: 64, color: 'var(--text-3)', fontSize: 10, marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
        Debt Ratio D
      </div>

      <div className="chart-insight">
        <strong>Week {t} policy:</strong> Remediate is optimal in{' '}
        <strong>{((remCount / (nD * nR)) * 100).toFixed(0)}%</strong> of the ({nD}×{nR}) state space (
        {remCount} of {nD * nR} grid points).{' '}
        {remCount > nD * nR * 0.5
          ? 'High remediation coverage — significant debt burden makes remediation broadly worthwhile.'
          : remCount > nD * nR * 0.2
          ? 'Mixed policy — remediation is optimal only for high-debt or high-cash states.'
          : 'Develop dominates — survival pressure or low debt makes remediation rarely optimal.'}
        {showValue && ' Opacity encodes V*(t,D,R): brighter cells have higher expected discounted value.'}
      </div>
    </div>
  );
};

export default RADRMHeatmap;
