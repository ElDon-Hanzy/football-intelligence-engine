import { useState } from 'react';
import type { RecentTeamResultSchema } from '../../lib/contracts';
import type { z } from 'zod';

type RecentResult = z.infer<typeof RecentTeamResultSchema>;

export function FormStrip({ teamName, recent }: { teamName: string; recent: RecentResult[] }) {
  const [selected, setSelected] = useState<number | null>(null);
  const results = [...recent].sort((a, b) => a.sequence_no - b.sequence_no).slice(0, 5);
  if (!results.length) return <div className="form-row is-empty"><span>{teamName}</span><small>Form unavailable</small></div>;
  const selectedResult = selected == null ? null : results[selected] ?? null;
  return <div className="form-block">
    <div className="form-row">
      <span className="form-team">{teamName}</span>
      <div className="form-results" aria-label={`${teamName} last five league results`}>
        {results.map((result, index) => <button
          key={`${result.fixture_kickoff}-${index}`}
          className={`form-result-button is-${result.result.toLowerCase()}`}
          type="button"
          aria-label={resultAriaLabel(teamName, result)}
          aria-pressed={selected === index}
          onClick={() => setSelected(selected === index ? null : index)}
        ><span className="form-result-dot" aria-hidden="true">{result.result}</span></button>)}
      </div>
    </div>
    {selectedResult ? <div className="form-detail" role="status">{resultDetail(selectedResult)}</div> : null}
  </div>;
}

function resultAriaLabel(teamName: string, result: RecentResult): string {
  const opponent = result.opponent_name ?? 'opponent';
  return `${teamName} ${result.result} versus ${opponent}, ${result.goals_for}-${result.goals_against}, ${formatDate(result.fixture_kickoff)}`;
}

function resultDetail(result: RecentResult): string {
  const venue = result.venue === 'H' ? 'home' : result.venue === 'A' ? 'away' : 'league';
  return `${formatDate(result.fixture_kickoff)} · ${venue} vs ${result.opponent_name ?? 'unknown opponent'} · ${result.goals_for}-${result.goals_against}`;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' }).format(new Date(value));
}
