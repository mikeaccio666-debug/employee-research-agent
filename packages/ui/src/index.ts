// Portrait design system v0.2 (身高线 × 晨光) — React primitives over the classes in
// ./styles/system.css. Import the stylesheet once from the app: "@portrait/ui/styles.css".
export { cx, type ClassValue } from './cx';
export { prefersReducedMotion, useReducedMotion, withViewTransition, useFlash, useToggle } from './motion';
export {
  Ruler,
  PencilMark,
  SectionMark,
  pencilPath,
  Tally,
  Tick,
  Stroke,
  Brackets,
  GripDots,
  Wave,
  Kbd,
  type PencilMarkProps,
  type TallyProps,
} from './components/marks';
export { Band, Pending, BasisMark, BASIS_LABEL, DateNote, MarginNote, Alias, type Basis } from './components/text';
export {
  Button,
  ButtonAnchor,
  buttonClass,
  LinkButton,
  Chip,
  ChipTag,
  chipClass,
  Slot,
  type ButtonProps,
  type ButtonVariant,
  type ButtonSize,
  type ButtonStyleProps,
  type ChipProps,
  type ChipStyleProps,
  type SlotProps,
} from './components/buttons';
export {
  Segmented,
  Switch,
  TextInput,
  Field,
  OptionGroup,
  type SegmentOption,
  type SegmentedProps,
  type SwitchProps,
  type TextInputProps,
  type FieldProps,
  type OptionItem,
  type OptionGroupProps,
} from './components/controls';
export {
  Grow,
  FootnoteButton,
  SourceCard,
  Footnoted,
  ExpandRow,
  type FootnoteButtonProps,
  type SourceCardProps,
  type FootnotedProps,
  type ExpandRowProps,
} from './components/fold';
export {
  Thread,
  AgentMessage,
  UserMessage,
  Receipt,
  StatusLine,
  ContextTag,
  Composer,
  type ReceiptProps,
  type ComposerProps,
} from './components/conversation';
export { EditableBlock, type EditableBlockProps } from './components/editing';
export { Frame, MustHaves, mustCount, type FrameProps, type MustMark } from './components/sheet';
