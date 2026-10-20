import type { CSSProperties, KeyboardEventHandler, MouseEventHandler, PointerEventHandler, ReactNode } from 'react';
import { cx } from '../cx';
import { Brackets, GripDots } from './marks';

export type EditableBlockProps = {
  /** Pencil brackets around it; the composer edits this block. */
  selected?: boolean;
  /** Lit from a receipt hover. */
  hovered?: boolean;
  /** Being dragged. */
  lifted?: boolean;
  /** Accessible name for the drag handle; omit for blocks that cannot move. */
  gripLabel?: string;
  onGripPointerDown?: PointerEventHandler<HTMLButtonElement>;
  onGripKeyDown?: KeyboardEventHandler<HTMLButtonElement>;
  onSelect?: MouseEventHandler<HTMLElement>;
  as?: 'section' | 'div' | 'article';
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
  'data-id'?: string;
};

/** A block of the portrait that can be picked, bracketed and dragged by its grip (`.blk`). */
export function EditableBlock({
  selected,
  hovered,
  lifted,
  gripLabel,
  onGripPointerDown,
  onGripKeyDown,
  onSelect,
  as: Tag = 'section',
  className,
  style,
  children,
  ...data
}: EditableBlockProps) {
  return (
    <Tag
      className={cx('blk', selected && 'sel', hovered && 'hov', lifted && 'lift', className)}
      style={style}
      onClick={onSelect}
      {...data}
    >
      <Brackets />
      {gripLabel ? (
        <button
          type="button"
          className="grip"
          aria-label={gripLabel}
          onPointerDown={onGripPointerDown}
          onKeyDown={onGripKeyDown}
          onClick={(e) => e.stopPropagation()}
        >
          <GripDots />
        </button>
      ) : null}
      {children}
    </Tag>
  );
}
