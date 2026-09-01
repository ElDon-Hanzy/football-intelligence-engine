import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';

type CommonProps = {
  children: ReactNode;
  variant?: 'primary' | 'secondary';
};

type AnchorProps = CommonProps & AnchorHTMLAttributes<HTMLAnchorElement> & { as: 'a' };
type NativeButtonProps = CommonProps & ButtonHTMLAttributes<HTMLButtonElement> & { as?: 'button' };
type ButtonProps = AnchorProps | NativeButtonProps;

export function Button(props: ButtonProps) {
  const variant = props.variant ?? 'primary';
  const className = `button button--${variant} ${props.className ?? ''}`.trim();

  if (props.as === 'a') {
    const { as: _as, variant: _variant, ...anchorProps } = props;
    return <a {...anchorProps} className={className} />;
  }

  const { as: _as, variant: _variant, type = 'button', ...buttonProps } = props;
  return <button {...buttonProps} type={type} className={className} />;
}
