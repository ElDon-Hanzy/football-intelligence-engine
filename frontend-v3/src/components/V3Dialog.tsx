import { useEffect, useRef, type ReactNode } from 'react';

export function V3Dialog({
  open,
  onClose,
  title,
  eyebrow,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  eyebrow?: string;
  children: ReactNode;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return undefined;
    const previous = document.activeElement as HTMLElement | null;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = originalOverflow;
      previous?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="v3-dialog-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.currentTarget === event.target) onClose();
    }}>
      <section className="v3-dialog" role="dialog" aria-modal="true" aria-labelledby="v3-dialog-title">
        <header className="v3-dialog-head">
          <div>
            {eyebrow ? <span className="v3-kicker">{eyebrow}</span> : null}
            <h2 id="v3-dialog-title">{title}</h2>
          </div>
          <button ref={closeRef} type="button" className="v3-dialog-close" onClick={onClose} aria-label="Close dialog">×</button>
        </header>
        <div className="v3-dialog-body">{children}</div>
      </section>
    </div>
  );
}
