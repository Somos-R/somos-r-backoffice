import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import type { SxProps, Theme } from '@mui/material/styles'

export interface SelectOption {
  value: string
  label: string
}

export interface SelectProps {
  label?: string
  value?: string
  onChange?: React.ChangeEventHandler<HTMLInputElement>
  options: SelectOption[]
  required?: boolean
  disabled?: boolean
  error?: boolean
  helperText?: string
  fullWidth?: boolean
  size?: 'small' | 'medium'
  sx?: SxProps<Theme>
}

export function Select({
  label,
  value,
  onChange,
  options,
  required,
  disabled,
  error,
  helperText,
  fullWidth = true,
  size = 'small',
  sx,
}: SelectProps) {
  return (
    <TextField
      select
      label={label}
      value={value}
      onChange={onChange}
      required={required}
      disabled={disabled}
      error={error}
      helperText={helperText}
      fullWidth={fullWidth}
      size={size}
      sx={sx}
    >
      {options.map((opt) => (
        <MenuItem key={opt.value} value={opt.value}>
          {opt.label}
        </MenuItem>
      ))}
    </TextField>
  )
}
