/**
 * ============================================================================
 *  TD-CoDI / RADRM Calculation Engine — v2 (fully faithful)
 *  ---------------------------------------------------------------------------
 *  Gupta, Vaidya, Anish, Hebbar, Manas (2026)
 *  "Quantifying the Financial Impact of Technical Debt in Early-Stage
 *   Software Startups: A Cost-of-Delay Modeling Framework"
 *
 *  Updates over v1:
 *    • RADRM DP is now a TRUE 2-D backward induction over (D, R) — matches
 *      Eq. 16–19 literally.
 *    • Monte Carlo simulator with stochastic per-week pivot, returning
 *      percentile fan bands (Section V).
 *    • Both TD-CoDI variants exposed: the dimensional rate form ($/week,
 *      comparable to burn) and the paper's literal Eq. 14 expression
 *      (cumulative $ per pipeline cycle).
 *    • Survival hazard re-derived as a Cox-style proportional hazard with
 *      runway as covariate:  λ(t) = λ₀ · exp(−θ · R(t)/B(t)) clamped to [0,1).
 *
 *  Time unit throughout: WEEKS.
 * ============================================================================
 */

// =============================================================================
//  1. Engineering primitives  (Eq. 4, 5, 9)
// =============================================================================

/** Eq. 5 — Cycle time inflation. CT(t) = CT₀ · exp(α·D). */
export const cycleTime = (ct0, D, alpha) => ct0 * Math.exp(alpha * D);

/** Eq. 4 — Velocity decay. V(t) = V₀ · exp(−α·D). */
export const velocity = (V0, D, alpha) => V0 * Math.exp(-alpha * D);

/** Eq. 9 — Burn amplification. B(t) = B₀·(1 + β·D). */
export const burnRate = (B0, D, beta) => B0 * (1 + beta * D);

// =============================================================================
//  2. Cost of Delay & TD-CoDI  (Eq. 6, 7, 14, 15)
// =============================================================================

/** Eq. 7 — Cost of Delay. dRev/dt = revenuePerFeature · V (in $/week). */
export const costOfDelay = (revenuePerFeature, V) => revenuePerFeature * V;

/**
 * Eq. 14 (RATE form, dimensionally consistent — what the UI compares to burn).
 *
 *   TD-CoDI_rate = ((CT − CT₀) / CT) · CoD · n           [$/week]
 *
 * Interpretation: fraction of each cycle wasted on debt friction × the
 * revenue rate of the active pipeline.
 */
export const tdCoDIRate = (ct, ct0, codPerFeat, n) => {
  if (ct <= 0) return 0;
  const dragFraction = Math.max(0, (ct - ct0) / ct);
  return dragFraction * codPerFeat * n;
};

/**
 * Eq. 14 (LITERAL form as written in the paper).
 *
 *   TD-CoDI_literal = (CT − CT₀) · (CoD / w) · n         [$/pipeline-cycle]
 *
 * Here `w` is the canonical cycle length (defaulting to the baseline
 * cycle time CT₀). Returns the cumulative dollars lost over completing
 * the active pipeline once.
 */
export const tdCoDILiteral = (ct, ct0, codPerFeat, n, w = ct0) => {
  if (w <= 0) return 0;
  const slip = Math.max(0, ct - ct0);
  return slip * (codPerFeat / w) * n;
};

/** Backwards-compatible alias resolves to the rate form. */
export const tdCoDI = tdCoDIRate;

// =============================================================================
//  3. NPV variants  (Eq. 11, 12, 13)
// =============================================================================

export const weeklyDiscount = (annualRate) =>
  Math.pow(1 + annualRate, 1 / 52) - 1;

/** Eq. 11 — Plain NPV. */
export const npv = (stream, rWeek) =>
  stream.reduce(
    (acc, { rev, cost }, t) => acc + (rev - cost) / Math.pow(1 + rWeek, t),
    0
  );

/** Eq. 12 — TD-adjusted NPV. */
export const npvWithTD = (s, beta, rWeek) =>
  s.reduce(
    (acc, { rev, cost, V, V0, D }, t) =>
      acc +
      (rev * (V / V0) - cost * (1 + beta * D)) / Math.pow(1 + rWeek, t),
    0
  );

/** Eq. 13 — Survival-weighted startup NPV. */
export const npvStartup = (s, beta, rWeek) =>
  s.reduce(
    (acc, { rev, cost, V, V0, D, pSurvive }, t) =>
      acc +
      ((rev * (V / V0) - cost * (1 + beta * D)) * pSurvive) /
        Math.pow(1 + rWeek, t),
    0
  );

// =============================================================================
//  4. Survival, runway, pivot  (Eq. 1, 10)
// =============================================================================

export const cashRemaining = (R0, burnPath) =>
  R0 - burnPath.reduce((a, b) => a + b, 0);

export const debtAdjustedRunway = (R0, B0, beta, D) => {
  const Beff = B0 * (1 + beta * D);
  return Beff > 0 ? R0 / Beff : Infinity;
};

/**
 * Eq. 10 — Cox proportional-hazard survival.
 *
 *   λ(t) = λ₀ · exp(−θ · runway_weeks(t))                       (clamped)
 *
 * The runway covariate (R/B in weeks) means: when cash is plentiful the
 * hazard ≈ baseline pivot rate; as runway → 0 the hazard climbs toward 1.
 */
export const survivalCurve = (
  weeks,
  R0,
  cashPath,
  pivotWeekly,
  burnPath = null,
  theta = 0.25
) => {
  let cum = 1;
  const out = [];
  for (let t = 0; t < weeks; t++) {
    const cash = Math.max(0, cashPath[t] ?? 0);
    const burn = burnPath ? Math.max(1, burnPath[t]) : Math.max(1, R0 / weeks);
    const runwayWeeks = cash / burn;
    let lambda = pivotWeekly * Math.exp(-theta * runwayWeeks);
    if (cash <= 0) lambda = 1; // bankrupt
    lambda = Math.min(0.999, lambda);
    cum *= 1 - lambda;
    out.push(Math.max(0, cum));
  }
  return out;
};

// =============================================================================
//  5. Debt dynamics  (Eq. 3)
// =============================================================================

export const stepDebt = (D, u, { i, delta, gamma }) => {
  const interest = i * D;
  const next = u === 1 ? D + interest - gamma : D + interest + delta;
  return Math.max(0, Math.min(1, next));
};

// =============================================================================
//  6. RADRM — Risk-Adjusted Debt Remediation Model  (Eq. 16 – 20)
// =============================================================================

/** Eq. 20 — Closed-form threshold rule. */
export const thresholdRemediate = (D, p) => {
  const { i, codPerFeat, n, V, copp, pSurvive } = p;
  const cod = codPerFeat * V * n;
  const interestBurden = i * D * cod;
  return interestBurden > copp * pSurvive;
};

const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));

/** Bilinear interpolation on V[kD][kR]. */
const interp2D = (V, gridD, gridR, D, R) => {
  const nD = gridD.length;
  const nR = gridR.length;
  const xD = clamp(
    ((D - gridD[0]) / (gridD[nD - 1] - gridD[0])) * (nD - 1),
    0, nD - 1
  );
  const xR = clamp(
    ((R - gridR[0]) / (gridR[nR - 1] - gridR[0])) * (nR - 1),
    0, nR - 1
  );
  const iD = Math.floor(xD), jD = Math.min(nD - 1, iD + 1);
  const iR = Math.floor(xR), jR = Math.min(nR - 1, iR + 1);
  const tD = xD - iD, tR = xR - iR;
  const v00 = V[iD][iR], v01 = V[iD][jR];
  const v10 = V[jD][iR], v11 = V[jD][jR];
  return (
    v00 * (1 - tD) * (1 - tR) +
    v01 * (1 - tD) * tR +
    v10 * tD * (1 - tR) +
    v11 * tD * tR
  );
};

/**
 * Eq. 16 – 19 — TRUE 2-D RADRM.
 *
 * State s_t = (D_t, R_t); action u_t ∈ {0, 1}.
 *   V*(t, D, R) = max_u  π(D, u) + (1 − λ(D, R)) · γ · V*(t+1, D', R')
 *
 * Returns the full 2-D tensors plus a 1-D *policy projection* π̄(t, D)
 * sampled along the always-develop baseline cash path so existing UI
 * (which expects `policy[t][kD]`) keeps working.
 */
export const solveRADRM = (cfg) => {
  const {
    horizonWeeks, alpha, beta, i, delta, gamma,
    V0, B0, revenuePerFeature, n, cremPerWeek,
    rAnnual, pivotAnnual, R0, D0,
    theta = 0.25,
    gridSizeD = 31,
    gridSizeR = 21,
  } = cfg;

  const rWeek = weeklyDiscount(rAnnual);
  const pivotWeekly = pivotAnnual / 52;
  const disc = 1 / (1 + rWeek);

  const gridD = Array.from({ length: gridSizeD }, (_, k) => k / (gridSizeD - 1));
  const Rmax = R0 * 1.1;
  const gridR = Array.from({ length: gridSizeR }, (_, k) =>
    (k / (gridSizeR - 1)) * Rmax
  );

  const value = Array.from({ length: horizonWeeks + 1 }, () =>
    Array.from({ length: gridSizeD }, () => new Array(gridSizeR).fill(0))
  );
  const policy = Array.from({ length: horizonWeeks }, () =>
    Array.from({ length: gridSizeD }, () => new Array(gridSizeR).fill(0))
  );

  // Terminal: residual cash if alive
  for (let kD = 0; kD < gridSizeD; kD++)
    for (let kR = 0; kR < gridSizeR; kR++)
      value[horizonWeeks][kD][kR] = Math.max(0, gridR[kR]);

  // Backward induction
  for (let t = horizonWeeks - 1; t >= 0; t--) {
    for (let kD = 0; kD < gridSizeD; kD++) {
      const D = gridD[kD];
      const V = velocity(V0, D, alpha);
      const b = burnRate(B0, D, beta);
      const revDev = revenuePerFeature * V * n;
      const Dnext0 = stepDebt(D, 0, { i, delta, gamma });
      const Dnext1 = stepDebt(D, 1, { i, delta, gamma });

      for (let kR = 0; kR < gridSizeR; kR++) {
        const R = gridR[kR];
        if (R <= 0) {
          value[t][kD][kR] = 0;
          policy[t][kD][kR] = 0;
          continue;
        }

        const runwayWeeks = R / Math.max(1, b);
        const lambda = Math.min(
          0.999,
          pivotWeekly * Math.exp(-theta * runwayWeeks)
        );
        const surv = 1 - lambda;

        const Rnext0 = Math.max(0, R - b);
        const Vdev = (revDev - b) +
          surv * disc * interp2D(value[t + 1], gridD, gridR, Dnext0, Rnext0);

        const costRem = cremPerWeek + b;
        const Rnext1 = Math.max(0, R - costRem);
        const Vrem = -costRem +
          surv * disc * interp2D(value[t + 1], gridD, gridR, Dnext1, Rnext1);

        if (Vrem > Vdev) {
          value[t][kD][kR] = Vrem;
          policy[t][kD][kR] = 1;
        } else {
          value[t][kD][kR] = Vdev;
          policy[t][kD][kR] = 0;
        }
      }
    }
  }

  // ----- 1-D projection along baseline-develop cash path -----
  const baselineCash = [];
  const baselineBurn = [];
  {
    let Dx = D0, Rx = R0;
    for (let t = 0; t < horizonWeeks; t++) {
      const bx = burnRate(B0, Dx, beta);
      baselineCash.push(Rx);
      baselineBurn.push(bx);
      Rx = Math.max(0, Rx - bx);
      Dx = stepDebt(Dx, 0, { i, delta, gamma });
    }
  }
  const survival1D = survivalCurve(
    horizonWeeks, R0, baselineCash, pivotWeekly, baselineBurn, theta
  );

  const projPolicy = Array.from({ length: horizonWeeks }, () =>
    new Array(gridSizeD).fill(0)
  );
  const projValue = Array.from({ length: horizonWeeks + 1 }, () =>
    new Array(gridSizeD).fill(0)
  );
  for (let t = 0; t < horizonWeeks; t++) {
    const Rt = baselineCash[t];
    const xR = clamp(
      ((Rt - gridR[0]) / (gridR[gridSizeR - 1] - gridR[0])) * (gridSizeR - 1),
      0, gridSizeR - 1
    );
    const kR = Math.round(xR);
    for (let kD = 0; kD < gridSizeD; kD++) {
      projPolicy[t][kD] = policy[t][kD][kR];
      projValue[t][kD] = value[t][kD][kR];
    }
  }

  return {
    policy2D: policy,
    value2D: value,
    gridD, gridR,
    policy: projPolicy,
    value: projValue,
    grid: gridD,
    survival: survival1D,
    horizonWeeks,
    baselineCash,
  };
};

/** Deterministic forward trajectory along a chosen policy. */
export const simulateTrajectory = (cfg, kind, optimal) => {
  const {
    horizonWeeks, alpha, beta, i, delta, gamma,
    V0, B0, revenuePerFeature, n, cremPerWeek,
    rAnnual, pivotAnnual, R0, D0, theta = 0.25,
  } = cfg;

  const rWeek = weeklyDiscount(rAnnual);
  const pivotWeekly = pivotAnnual / 52;

  let D = D0;
  let cash = R0;
  let cumRev = 0;
  let cumProfit = 0;
  const out = [];

  // Reference survival from develop-only baseline
  const burnPathS = [];
  {
    let Ds = D0;
    for (let t = 0; t < horizonWeeks; t++) {
      burnPathS.push(burnRate(B0, Ds, beta));
      Ds = stepDebt(Ds, 0, { i, delta, gamma });
    }
  }
  const cashPathS = burnPathS.reduce(
    (acc, b) => [...acc, (acc.length ? acc[acc.length - 1] : R0) - b],
    []
  );
  const surv = survivalCurve(
    horizonWeeks, R0, cashPathS, pivotWeekly, burnPathS, theta
  );

  for (let t = 0; t < horizonWeeks; t++) {
    const V = velocity(V0, D, alpha);
    const ct = cycleTime(cfg.ct0, D, alpha);
    const b = burnRate(B0, D, beta);
    const codFeat = revenuePerFeature;
    const codWeekly = codFeat * V * n;
    const codi = tdCoDIRate(ct, cfg.ct0, codFeat, n);

    let u = 0;
    if (kind === 'develop') u = 0;
    else if (kind === 'remediate') u = 1;
    else if (kind === 'threshold') {
      u = thresholdRemediate(D, {
        i, codPerFeat: codFeat, n, V,
        copp: cremPerWeek, pSurvive: surv[t],
      }) ? 1 : 0;
    } else if (kind === 'optimal' && optimal) {
      const nD = optimal.gridD?.length ?? optimal.grid.length;
      const kD = Math.round(clamp(D * (nD - 1), 0, nD - 1));
      if (optimal.policy2D) {
        const nR = optimal.gridR.length;
        const Rmax = optimal.gridR[nR - 1];
        const kR = Math.round(clamp((cash / Rmax) * (nR - 1), 0, nR - 1));
        u = optimal.policy2D[t]?.[kD]?.[kR] ?? 0;
      } else {
        u = optimal.policy[t]?.[kD] ?? 0;
      }
    }

    const revThis = u === 0 ? revenuePerFeature * V * n : 0;
    const costThis = u === 1 ? cremPerWeek + b : b;
    cash -= costThis;
    cumRev += revThis;
    cumProfit += (revThis - costThis) / Math.pow(1 + rWeek, t);

    out.push({
      week: t, D, V, ct, burn: b, cash, action: u,
      revenue: revThis, cost: costThis, cumRevenue: cumRev,
      tdCoDI: codi, pSurvive: surv[t], codWeekly,
    });

    D = stepDebt(D, u, { i, delta, gamma });
    if (cash <= 0) {
      for (let s = t + 1; s < horizonWeeks; s++) {
        out.push({
          week: s, D, V: 0, ct, burn: 0, cash: 0, action: 0,
          revenue: 0, cost: 0, cumRevenue: cumRev,
          tdCoDI: 0, pSurvive: 0, codWeekly: 0,
        });
      }
      break;
    }
  }
  return { trajectory: out, cumProfit, finalDebt: D, finalCash: cash };
};

// =============================================================================
//  7. Monte Carlo  (Section V — stochastic pivot & cash exhaustion)
// =============================================================================

/**
 * N stochastic forward simulations. Each week, Bernoulli pivot at the
 * Cox hazard. Bankruptcy ends the trajectory. Returns percentile bands
 * for cumulative profit and survivor fraction over time.
 */
export const monteCarlo = (cfg, kind, optimal, N = 500, seed = null) => {
  const {
    horizonWeeks, alpha, beta, i, delta, gamma,
    V0, B0, revenuePerFeature, n, cremPerWeek,
    rAnnual, pivotAnnual, R0, D0, theta = 0.25,
  } = cfg;

  const rWeek = weeklyDiscount(rAnnual);
  const pivotWeekly = pivotAnnual / 52;

  // Mulberry32 PRNG
  let s = seed ?? ((Math.random() * 1e9) | 0);
  const rand = () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let r = Math.imul(s ^ (s >>> 15), 1 | s);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };

  const profitMatrix = Array.from({ length: horizonWeeks }, () => []);
  const survivors = new Array(horizonWeeks).fill(0);
  const profitFinal = [];

  for (let k = 0; k < N; k++) {
    let D = D0, cash = R0, cumProfit = 0, alive = true;

    for (let t = 0; t < horizonWeeks; t++) {
      if (!alive) {
        profitMatrix[t].push(cumProfit);
        continue;
      }

      const V = velocity(V0, D, alpha);
      const b = burnRate(B0, D, beta);

      let u = 0;
      if (kind === 'develop') u = 0;
      else if (kind === 'remediate') u = 1;
      else if (kind === 'threshold') {
        u = thresholdRemediate(D, {
          i, codPerFeat: revenuePerFeature, n, V,
          copp: cremPerWeek, pSurvive: 1,
        }) ? 1 : 0;
      } else if (kind === 'optimal' && optimal?.policy2D) {
        const nD = optimal.gridD.length;
        const nR = optimal.gridR.length;
        const Rmax = optimal.gridR[nR - 1];
        const kD = Math.round(clamp(D * (nD - 1), 0, nD - 1));
        const kR = Math.round(clamp((cash / Rmax) * (nR - 1), 0, nR - 1));
        u = optimal.policy2D[t][kD][kR];
      } else if (kind === 'optimal' && optimal) {
        const nD = optimal.grid.length;
        const kD = Math.round(clamp(D * (nD - 1), 0, nD - 1));
        u = optimal.policy[t][kD];
      }

      const rev = u === 0 ? revenuePerFeature * V * n : 0;
      const cost = u === 1 ? cremPerWeek + b : b;
      cash -= cost;
      cumProfit += (rev - cost) / Math.pow(1 + rWeek, t);

      const runwayWeeks = Math.max(0, cash) / Math.max(1, b);
      const lambda = Math.min(
        0.999,
        pivotWeekly * Math.exp(-theta * runwayWeeks)
      );

      profitMatrix[t].push(cumProfit);
      if (cash > 0 && rand() > lambda) {
        survivors[t] += 1;
      } else {
        alive = false;
      }

      D = stepDebt(D, u, { i, delta, gamma });
    }

    profitFinal.push(cumProfit);
  }

  const bands = profitMatrix.map((col, t) => {
    const sorted = [...col].sort((a, b) => a - b);
    const q = (p) => sorted[clamp(Math.floor(p * (sorted.length - 1)), 0, sorted.length - 1)];
    const mean = sorted.reduce((a, b) => a + b, 0) / sorted.length;
    return {
      week: t,
      p10: q(0.1),
      p25: q(0.25),
      p50: q(0.5),
      p75: q(0.75),
      p90: q(0.9),
      mean,
      pSurvive: survivors[t] / N,
    };
  });

  const meanProfit = profitFinal.reduce((a, b) => a + b, 0) / N;
  const sortedFinal = [...profitFinal].sort((a, b) => a - b);
  const idx = (p) => sortedFinal[clamp(Math.floor(p * (N - 1)), 0, N - 1)];

  return {
    bands,
    meanProfit,
    profitSamples: profitFinal,
    profitP10: idx(0.1),
    profitP50: idx(0.5),
    profitP90: idx(0.9),
    pSurviveFinal: survivors[horizonWeeks - 1] / N,
    N,
  };
};

// =============================================================================
//  8. TD → SaaS causal chain  (Eq. 21, 22)
// =============================================================================

export const causalChain = (beta) => {
  const labels = [
    'Cycle Time',
    'Feature Velocity',
    'Defect Escape Rate',
    'Customer Churn',
    'NRR / ARR',
  ];
  const steps = beta.map((b, i) => ({ name: labels[i], coef: b }));
  const total = beta.reduce((a, b) => a * b, 1);
  return { steps, total };
};

// =============================================================================
//  9. Orchestration — dashboard snapshot
// =============================================================================

export const calculateAllMetrics = (inp) => {
  const {
    debtRatio: D,
    baselineCycleTime: ct0,
    costOfDelay: codPerFeat,
    featuresInPipeline: n,
    burnRate: B0,
    runway: runwayMonths,
    alpha,
    beta,
    interestRate: i,
    pivotProb: pivotAnnual,
    horizonWeeks,
    initialCash: R0,
    cremPerWeek,
    causalCoefs,
    tdCoDIVariant = 'rate',
  } = inp;

  const V0 = 1 / ct0;
  const V = velocity(V0, D, alpha);
  const ct = cycleTime(ct0, D, alpha);
  const beff = burnRate(B0, D, beta);
  const codW = costOfDelay(codPerFeat, V) * n;
  const codiRate = tdCoDIRate(ct, ct0, codPerFeat, n);
  const codiLiteral = tdCoDILiteral(ct, ct0, codPerFeat, n, ct0);
  const codi = tdCoDIVariant === 'literal' ? codiLiteral : codiRate;

  const baselineRunwayWeeks = runwayMonths * 4.345;
  const adjustedRunwayWeeks = debtAdjustedRunway(
    B0 * baselineRunwayWeeks, B0, beta, D
  );
  const erosionWeeks = baselineRunwayWeeks - adjustedRunwayWeeks;

  const chain = causalChain(causalCoefs);

  const pivotWeekly = pivotAnnual / 52;
  const pS0 = 1 - pivotWeekly;
  const recommend = thresholdRemediate(D, {
    i, codPerFeat, n, V, copp: cremPerWeek, pSurvive: pS0,
  }) ? 'remediate' : 'develop';

  return {
    currentCycleTime: ct,
    baselineCycleTime: ct0,
    velocity: V,
    baselineVelocity: V0,
    burn: beff,
    burnBase: B0,
    codWeekly: codW,
    tdCoDI: codi,
    tdCoDIRate: codiRate,
    tdCoDILiteral: codiLiteral,
    tdCoDIVariant,
    revenueLost: {
      weekly: codiRate,
      monthly: codiRate * 4.345,
      quarterly: codiRate * 13,
      annual: codiRate * 52,
    },
    adjustedRunwayMonths: adjustedRunwayWeeks / 4.345,
    runwayErosionMonths: erosionWeeks / 4.345,
    chain,
    recommendation: recommend,
    inputs: inp,
    horizonWeeks,
    R0: R0 ?? B0 * baselineRunwayWeeks,
  };
};

// =============================================================================
//  10. Defaults
// =============================================================================

export const getDefaultInputs = () => ({
  debtRatio: 0.4,
  alpha: 2.5,
  beta: 0.6,
  interestRate: 0.02,
  newDebtRate: 0.005,
  remediationRate: 0.04,

  baselineCycleTime: 1.0,
  featuresInPipeline: 8,

  costOfDelay: 4000,
  burnRate: 25000,
  cremPerWeek: 18000,
  runway: 12,
  initialCash: null,

  discountRate: 0.6,
  pivotProb: 0.7,
  horizonWeeks: 52,
  hazardTheta: 0.25,

  causalCoefs: [0.8, -0.7, -0.5, 0.4, -0.6],

  tdCoDIVariant: 'rate',
  mcSamples: 500,
});
