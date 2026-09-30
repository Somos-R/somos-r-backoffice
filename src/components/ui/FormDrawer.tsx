import { useState, useEffect, useRef } from 'react'
import Drawer from '@mui/material/Drawer'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import { X, Eye, EyeOff } from 'lucide-react'
import { Input } from './Input'
import { Select, type SelectOption } from './Select'
import { Button } from './Button'
import { t, interpolate } from '../../lib/i18n'

export type { SelectOption }

export interface FormFieldDef {
  name: string
  label: string
  type: 'text' | 'email' | 'password' | 'select' | 'tel' | 'number'
  placeholder?: string
  required?: boolean
  options?: SelectOption[]
  validate?: (value: string) => string | undefined
}

export interface FormDrawerProps {
  open: boolean
  onClose: () => void
  title: string
  fields: FormFieldDef[]
  onSubmit: (values: Record<string, string>) => void
  isSubmitting?: boolean
  submitLabel?: string
  width?: number
}

function runValidation(field: FormFieldDef, value: string): string | undefined {
  if (field.required && !value.trim()) return interpolate(t.ui.formDrawer.requiredField, { field: field.label })
  if (field.validate) return field.validate(value)
}

export function FormDrawer({
  open,
  onClose,
  title,
  fields,
  onSubmit,
  isSubmitting = false,
  submitLabel = t.ui.formDrawer.save,
  width = 420,
}: FormDrawerProps) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(fields.map((f) => [f.name, '']))
  )
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({})
  const fieldsRef = useRef(fields)

  useEffect(() => {
    fieldsRef.current = fields
  })

  useEffect(() => {
    if (!open) {
      setValues(Object.fromEntries(fieldsRef.current.map((f) => [f.name, ''])))
      setErrors({})
      setShowPassword({})
    }
  }, [open])

  const handleChange = (name: string, value: string) => {
    setValues((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }))
  }

  const handleSubmit = () => {
    const newErrors: Record<string, string> = {}
    for (const field of fields) {
      const err = runValidation(field, values[field.name] ?? '')
      if (err) newErrors[field.name] = err
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }
    onSubmit(values)
  }

  const isFormValid = fields
    .filter((f) => f.required)
    .every((f) => (values[f.name] ?? '').trim().length > 0)

  const handleClose = () => {
    if (isSubmitting) return
    onClose()
  }

  return (
    <Drawer anchor="right" open={open} onClose={handleClose} PaperProps={{ sx: { width } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 3, py: 2 }}>
        <Typography variant="h6" component="h2" fontWeight={600}>{title}</Typography>
        <IconButton onClick={handleClose} size="small" disabled={isSubmitting} aria-label={t.ui.formDrawer.close}>
          <X size={18} />
        </IconButton>
      </Box>

      <Divider />

      <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2.5, overflowY: 'auto', flex: 1 }}>
        {fields.map((field) => {
          const value = values[field.name] ?? ''
          const hasError = !!errors[field.name]
          const helperText = errors[field.name]
          const onChange = (e: React.ChangeEvent<HTMLInputElement>) => handleChange(field.name, e.target.value)

          if (field.type === 'select') {
            return (
              <Select
                key={field.name}
                label={field.label}
                options={field.options ?? []}
                value={value}
                onChange={onChange}
                required={field.required}
                error={hasError}
                helperText={helperText}
              />
            )
          }

          if (field.type === 'password') {
            const visible = showPassword[field.name] ?? false
            return (
              <Input
                key={field.name}
                label={field.label}
                placeholder={field.placeholder}
                type={visible ? 'text' : 'password'}
                value={value}
                onChange={onChange}
                required={field.required}
                error={hasError}
                helperText={helperText}
                endAdornment={
                  <IconButton
                    onClick={() => setShowPassword((p) => ({ ...p, [field.name]: !p[field.name] }))}
                    size="small"
                    edge="end"
                    aria-label={t.ui.formDrawer.togglePasswordVisibility}
                  >
                    {visible ? <EyeOff size={16} /> : <Eye size={16} />}
                  </IconButton>
                }
              />
            )
          }

          return (
            <Input
              key={field.name}
              label={field.label}
              placeholder={field.placeholder}
              type={field.type}
              value={value}
              onChange={onChange}
              required={field.required}
              error={hasError}
              helperText={helperText}
            />
          )
        })}
      </Box>

      <Divider />

      <Box sx={{ px: 3, py: 2, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
        <Button variant="outlined" onClick={handleClose} disabled={isSubmitting}>
          {t.ui.formDrawer.cancel}
        </Button>
        <Button onClick={handleSubmit} loading={isSubmitting} disabled={!isFormValid}>
          {submitLabel}
        </Button>
      </Box>
    </Drawer>
  )
}
