export function PlaceholderPage({ title, eyebrow, copy }: { title: string; eyebrow: string; copy: string }) {
  return (
    <section className="placeholder-page">
      <span className="page-eyebrow">{eyebrow}</span>
      <h1>{title}</h1>
      <p>{copy}</p>
      <div className="placeholder-rule" aria-hidden="true" />
      <small>This surface is intentionally not being rebuilt inside C0170.</small>
    </section>
  );
}
