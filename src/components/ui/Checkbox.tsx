import FormControlLabel from '@mui/material/FormControlLabel'
import MuiCheckbox from '@mui/material/Checkbox'

export interface CheckboxProps {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
}

export function Checkbox({ label, checked, onChange, disabled }: CheckboxProps) {
  return (
    <FormControlLabel
      label={label}
      disabled={disabled}
      control={<MuiCheckbox checked={checked} onChange={(e) => onChange(e.target.checked)} />}
    />
  )
}
