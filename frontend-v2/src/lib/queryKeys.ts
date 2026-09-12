export const apiQueryKeys = {
  gameweekStatus: ['api', 'gameweek-status'] as const,
  fpl: (gameweek: number) => ['api', 'fpl', gameweek] as const,
  managerPlan: (gameweek: number) => ['api', 'manager-plan', gameweek] as const,
  fixtureFacts: (gameweek: number) => ['api', 'fixture-facts', gameweek] as const,
  fixtureIntelligence: (gameweek: number) => ['api', 'fixture-intelligence', gameweek] as const,
  betting: (gameweek: number) => ['api', 'betting', gameweek] as const,
  humanInsights: (gameweek: number) => ['api', 'human-insights', gameweek] as const,
  calibration: (gameweek: number) => ['api', 'calibration', gameweek] as const,
  engineDiagnostics: (gameweek: number) => ['api', 'engine-diagnostics', gameweek] as const,
} as const;
