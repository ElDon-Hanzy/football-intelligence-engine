export function PredictionAuditMark({ correct, label }: { correct: boolean; label: string }) {
  return <span className={`inline-audit-mark ${correct ? 'is-correct' : 'is-wrong'}`} aria-label={`${label} ${correct ? 'correct' : 'incorrect'}`}>{correct ? '✓' : '×'}</span>;
}
