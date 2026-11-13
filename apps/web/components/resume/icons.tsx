// Stroke icons for the résumé editor, one set for every action (24 grid, 2px pencil stroke, round
// caps), so rename, hide, move and delete look like they belong together.

const Svg = ({ children, size = 15 }: { children: React.ReactNode; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {children}
  </svg>
);

export const PencilIcon = () => (
  <Svg>
    <path d="M4 20h4L19 9l-4-4L4 16v4Z" />
    <path d="M13.5 6.5l4 4" />
  </Svg>
);
export const StarIcon = ({ filled }: { filled?: boolean }) => (
  <Svg>
    <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9L12 3.5Z" fill={filled ? 'currentColor' : 'none'} />
  </Svg>
);
export const TrashIcon = () => (
  <Svg>
    <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
  </Svg>
);
export const EyeIcon = () => (
  <Svg size={14}>
    <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
    <circle cx="12" cy="12" r="3" />
  </Svg>
);
export const EyeOffIcon = () => (
  <Svg size={14}>
    <path d="M3 3l18 18M10.6 5.1A10.4 10.4 0 0 1 12 5c6.4 0 10 7 10 7a17.6 17.6 0 0 1-3.2 4.1M6.6 6.6C3.8 8.4 2 12 2 12s3.6 7 10 7a9.7 9.7 0 0 0 5.4-1.6" />
  </Svg>
);
export const UpIcon = () => (
  <Svg size={14}>
    <path d="M12 19V5M6 11l6-6 6 6" />
  </Svg>
);
export const DownIcon = () => (
  <Svg size={14}>
    <path d="M12 5v14M6 13l6 6 6-6" />
  </Svg>
);
export const CloseIcon = () => (
  <Svg size={14}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Svg>
);
export const GripIcon = () => (
  <Svg size={14}>
    <path d="M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01" strokeWidth="3" />
  </Svg>
);
export const MoreIcon = () => (
  <Svg>
    <path d="M5 12h.01M12 12h.01M19 12h.01" strokeWidth="3" />
  </Svg>
);
export const UndoIcon = () => (
  <Svg>
    <path d="M9 14L4 9l5-5" />
    <path d="M4 9h10a6 6 0 0 1 0 12h-3" />
  </Svg>
);
export const RedoIcon = () => (
  <Svg>
    <path d="M15 14l5-5-5-5" />
    <path d="M20 9H10a6 6 0 0 0 0 12h3" />
  </Svg>
);
export const DownloadIcon = () => (
  <Svg>
    <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />
  </Svg>
);
export const LineIcon = () => (
  <Svg size={14}>
    <path d="M5 8h14M5 12h14M5 16h9" />
  </Svg>
);
