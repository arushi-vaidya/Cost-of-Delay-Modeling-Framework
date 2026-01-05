/**
 * Core TD-CoDI Calculation Engine
 * Implements the Technical Debt Cost-of-Delay Index formula
 */

/**
 * Calculate current cycle time based on technical debt
 * Formula: CT = CT₀ × e^(αD)
 * 
 * @param {number} baselineCycleTime - CT₀ (baseline cycle time in days)
 * @param {number} debtRatio - D (technical debt ratio, 0-1)
 * @param {number} alpha - α (debt sensitivity coefficient)
 * @returns {number} Current cycle time in days
 */
export const calculateCycleTime = (baselineCycleTime, debtRatio, alpha) => {
  return baselineCycleTime * Math.exp(alpha * debtRatio);
};

/**
 * Calculate TD-CoDI (Technical Debt Cost-of-Delay Index)
 * Formula: TD-CoDI = (CT - CT₀) × (CoD/w) × n
 * 
 * @param {number} currentCycleTime - CT (current cycle time in days)
 * @param {number} baselineCycleTime - CT₀ (baseline cycle time in days)
 * @param {number} costOfDelay - CoD (cost per feature delay in $)
 * @param {number} featuresInPipeline - n (number of features)
 * @returns {number} TD-CoDI in $/week
 */
export const calculateTDCoDI = (
  currentCycleTime,
  baselineCycleTime,
  costOfDelay,
  featuresInPipeline
) => {
  // Calculate weeks per cycle
  const weeksPerCycle = currentCycleTime / 7;
  
  // Calculate delay in days
  const delayDays = currentCycleTime - baselineCycleTime;
  
  // TD-CoDI formula
  const tdCoDI = delayDays * (costOfDelay / weeksPerCycle) * featuresInPipeline;
  
  return Math.max(0, tdCoDI); // Ensure non-negative
};

/**
 * Calculate feature velocity (features per week)
 * 
 * @param {number} cycleTime - Cycle time in days
 * @returns {number} Features per week
 */
export const calculateFeatureVelocity = (cycleTime) => {
  return 7 / cycleTime;
};

/**
 * Calculate revenue lost over different time periods
 * 
 * @param {number} tdCoDI - TD-CoDI in $/week
 * @returns {object} Revenue lost for different periods
 */
export const calculateRevenueLost = (tdCoDI) => {
  return {
    weekly: tdCoDI,
    monthly: tdCoDI * 4,
    quarterly: tdCoDI * 13,
  };
};

/**
 * Calculate runway erosion due to technical debt
 * 
 * @param {number} runway - Current runway in months
 * @param {number} tdCoDI - TD-CoDI in $/week
 * @param {number} burnRate - Weekly burn rate in $
 * @returns {object} Runway metrics
 */
export const calculateRunwayErosion = (runway, tdCoDI, burnRate) => {
  // Total weekly cash consumption (burn + debt cost)
  const totalWeeklyCost = burnRate + tdCoDI;
  
  // Calculate how much faster runway is depleting
  const accelerationFactor = totalWeeklyCost / burnRate;
  
  // Adjusted runway
  const adjustedRunway = runway / accelerationFactor;
  
  // Runway lost due to debt
  const runwayErosion = runway - adjustedRunway;
  
  return {
    adjustedRunway,
    runwayErosion,
    accelerationFactor,
  };
};

/**
 * Main calculation function that computes all metrics
 * 
 * @param {object} inputs - All input parameters
 * @returns {object} All calculated metrics
 */
export const calculateAllMetrics = (inputs) => {
  const {
    debtRatio,
    baselineCycleTime,
    costOfDelay,
    featuresInPipeline,
    burnRate,
    runway,
    alpha,
  } = inputs;

  // Step 1: Calculate current cycle time
  const currentCycleTime = calculateCycleTime(baselineCycleTime, debtRatio, alpha);

  // Step 2: Calculate TD-CoDI
  const tdCoDI = calculateTDCoDI(
    currentCycleTime,
    baselineCycleTime,
    costOfDelay,
    featuresInPipeline
  );

  // Step 3: Calculate feature velocity
  const featureVelocity = calculateFeatureVelocity(currentCycleTime);

  // Step 4: Calculate revenue lost
  const revenueLost = calculateRevenueLost(tdCoDI);

  // Step 5: Calculate runway erosion
  const runwayMetrics = calculateRunwayErosion(runway, tdCoDI, burnRate);

  return {
    currentCycleTime,
    tdCoDI,
    featureVelocity,
    revenueLost,
    ...runwayMetrics,
  };
};

/**
 * Get default input values for the dashboard
 */
export const getDefaultInputs = () => ({
  debtRatio: 0.4, // 40% technical debt
  baselineCycleTime: 5, // 5 days baseline
  costOfDelay: 10000, // $10k per feature per week
  featuresInPipeline: 8, // 8 features in pipeline
  burnRate: 25000, // $25k/week
  runway: 12, // 12 months
  alpha: 3, // Sensitivity coefficient
});
