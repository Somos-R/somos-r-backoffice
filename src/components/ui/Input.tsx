import TextField from '@mui/material/TextField'
import InputAdornment from '@mui/material/InputAdornment'
import type { SxProps, Theme } from '@mui/material/styles'

export interface InputProps {
  label?: string
  placeholder?: string
  /** Accepts number for numeric fields (e.g. kg, precio) — MUI renders it as text either way. */
  value?: string | number
  onChange?: React.ChangeEventHandler<HTMLInputElement>
  type?: string
  required?: boolean
  disabled?: boolean
  error?: boolean
  helperText?: string
  fullWidth?: boolean
  size?: 'small' | 'medium'
  startAdornment?: React.ReactNode
  endAdornment?: React.ReactNode
  /** Browser hint: `one-time-code` lets the phone offer the code it just received. */
  autoComplete?: string
  inputMode?: 'text' | 'numeric' | 'email' | 'tel'
  autoFocus?: boolean
  sx?: SxProps<Theme>
}

export function Input({
  label,
  placeholder,
  value,
  onChange,
  type = 'text',
  required,
  disabled,
  error,
  helperText,
  fullWidth = true,
  size = 'small',
  startAdornment,
  endAdornment,
  autoComplete,
  inputMode,
  autoFocus,
  sx,
}: InputProps) {
  return (
    <TextField
      label={label}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      type={type}
      required={required}
      disabled={disabled}
      error={error}
      helperText={helperText}
      fullWidth={fullWidth}
      size={size}
      sx={sx}
      autoFocus={autoFocus}
      slotProps={{
        // A date field always shows its format, so the label must not sit on top of it.
        inputLabel: type === 'date' ? { shrink: true } : undefined,
        htmlInput: { autoComplete, inputMode },
        input: {
          startAdornment: startAdornment ? (
            <InputAdornment position="start">{startAdornment}</InputAdornment>
          ) : undefined,
          endAdornment: endAdornment ? (
            <InputAdornment position="end">{endAdornment}</InputAdornment>
          ) : undefined,
        },
      }}
    />
  )
}
