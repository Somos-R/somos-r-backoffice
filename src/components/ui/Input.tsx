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
      slotProps={{
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
