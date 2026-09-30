/**
 * Hides content visually but keeps it for screen readers (an icon-only column header, a label that
 * a sighted user gets from the layout). Same technique as MUI's `visuallyHidden`, which we can't
 * import: `@mui/utils` is not a direct dependency.
 */
export const visuallyHidden = {
  border: 0,
  clip: 'rect(0 0 0 0)',
  height: '1px',
  margin: '-1px',
  overflow: 'hidden',
  padding: 0,
  position: 'absolute',
  whiteSpace: 'nowrap',
  width: '1px',
} as const
