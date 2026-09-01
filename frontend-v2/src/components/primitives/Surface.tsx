import type { HTMLAttributes } from 'react';

export function Surface({ className = '', ...props }: HTMLAttributes<HTMLElement>) {
  return <article {...props} className={`surface ${className}`.trim()} />;
}
