import { endpoints } from './api';

const functionBase = endpoints.fpl.replace(/\/fpl-api$/, '');

export const analysisEndpoints = {
  betting: `${functionBase}/betting-api`,
  calibration: `${functionBase}/calibration-summary`,
  engineDiagnostics: `${functionBase}/engine-diagnostics-api`,
} as const;
