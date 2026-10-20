import type { ComponentPropsWithRef } from 'react';
import { cx } from '../cx';

export type ButtonVariant = 'primary' | 'secondary' | 'wall' | 'quiet';
export type ButtonSize = 'md' | 'sm';

const VARIANT: Record<ButtonVariant, string> = {
  primary: 'btn-p',
  secondary: 'btn-s',
  wall: 'btn-w',
  quiet: 'btn-q',
};

export type ButtonStyleProps = {
  /** primary = ink, secondary = trim, wall = wall-2, quiet = underlined text */
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Square icon button (44 × 44, or 40 × 40 with `size="sm"` composer send). */
  icon?: boolean;
  className?: string;
};

/** Class string for anything that should look like a button — e.g. a Next <Link>. */
export function buttonClass({ variant = 'primary', size = 'md', icon, className }: ButtonStyleProps = {}) {
  return cx('btn', VARIANT[variant], size === 'sm' && 'btn-sm', icon && 'btn-i', className);
}

export type ButtonProps = ComponentPropsWithRef<'button'> & ButtonStyleProps;

/** Square-cornered button that presses to 0.98. */
export function Button({ variant, size, icon, className, type = 'button', ...rest }: ButtonProps) {
  return <button type={type} className={buttonClass({ variant, size, icon, className })} {...rest} />;
}

/** A plain anchor styled as a button (for links that leave the app). */
export function ButtonAnchor({
  variant,
  size,
  icon,
  className,
  ...rest
}: ComponentPropsWithRef<'a'> & ButtonStyleProps) {
  return <a className={buttonClass({ variant, size, icon, className })} {...rest} />;
}

/** A button that reads as an underlined word inside a sentence ("· undo"). */
export function LinkButton({ className, type = 'button', ...rest }: ComponentPropsWithRef<'button'>) {
  return <button type={type} className={cx('linklike', className)} {...rest} />;
}

export type ChipStyleProps = {
  /** Selected: ink background. */
  on?: boolean;
  /** `wall` sits on trim surfaces (wall-2 background). */
  tone?: 'trim' | 'wall';
  size?: 'md' | 'sm';
  className?: string;
};

export function chipClass({ on, tone = 'trim', size = 'md', className }: ChipStyleProps = {}) {
  return cx('chip', tone === 'wall' && 'w', size === 'sm' && 'sm', on && 'on', className);
}

export type ChipProps = ComponentPropsWithRef<'button'> & ChipStyleProps;

/** Tag or suggestion chip. Pass `aria-pressed` when it toggles. */
export function Chip({ on, tone, size, className, type = 'button', ...rest }: ChipProps) {
  return <button type={type} className={chipClass({ on, tone, size, className })} {...rest} />;
}

/** A chip that only labels something (not clickable). */
export function ChipTag({
  on,
  tone,
  size,
  className,
  style,
  ...rest
}: ComponentPropsWithRef<'span'> & ChipStyleProps) {
  return <span className={chipClass({ on, tone, size, className })} style={{ cursor: 'inherit', ...style }} {...rest} />;
}

export type SlotProps = ComponentPropsWithRef<'button'> & { on?: boolean };

/** A time slot for booking a coffee chat; `on` when picked (sets aria-pressed). */
export function Slot({ on, className, type = 'button', ...rest }: SlotProps) {
  return <button type={type} className={cx('slot', on && 'on', className)} aria-pressed={on} {...rest} />;
}
