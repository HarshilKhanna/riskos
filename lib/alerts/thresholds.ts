export type AlertThresholds = {
  var95_limit: number;
  concentration_max: number;
  drawdown_weekly_limit: number;
  beta_max: number;
};

export const DEFAULT_ALERT_THRESHOLDS: AlertThresholds = {
  var95_limit: 60000, // INR 60,000
  concentration_max: 0.35, // 35%
  drawdown_weekly_limit: -0.02, // -2%
  beta_max: 1.5,
};

