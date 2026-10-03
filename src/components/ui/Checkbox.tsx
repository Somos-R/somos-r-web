import MuiCheckbox from '@mui/material/Checkbox'
import FormControl from '@mui/material/FormControl'
import FormControlLabel from '@mui/material/FormControlLabel'
import FormHelperText from '@mui/material/FormHelperText'

export interface CheckboxProps {
  label: React.ReactNode
  checked: boolean
  onChange: (checked: boolean) => void
  required?: boolean
  disabled?: boolean
  error?: boolean
  helperText?: string
}

/** A labelled checkbox; the label is clickable and the error text is tied to it. */
export function Checkbox({ label, checked, onChange, required, disabled, error, helperText }: CheckboxProps) {
  return (
    <FormControl error={error} required={required} disabled={disabled}>
      <FormControlLabel
        control={<MuiCheckbox checked={checked} onChange={(e) => onChange(e.target.checked)} size="small" />}
        label={label}
      />
      {helperText && <FormHelperText>{helperText}</FormHelperText>}
    </FormControl>
  )
}
