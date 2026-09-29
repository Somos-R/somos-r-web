import MuiAutocomplete from '@mui/material/Autocomplete'
import TextField from '@mui/material/TextField'
import type { SelectOption } from './Select'

export interface AutocompleteProps {
  label: string
  /** The options the server returned for the current text. They are not filtered again here. */
  options: SelectOption[]
  /** The chosen option, or null. Kept by the caller so it survives the options changing. */
  value: SelectOption | null
  onChange: (option: SelectOption | null) => void
  /** Called with what the user types, to search on the server. */
  onInputChange: (text: string) => void
  loading?: boolean
  required?: boolean
  error?: boolean
  helperText?: string
  placeholder?: string
  noOptionsText: string
  loadingText: string
}

/** A search-as-you-type picker whose options come from the server (the list may be too long to load whole). */
export function Autocomplete({
  label,
  options,
  value,
  onChange,
  onInputChange,
  loading,
  required,
  error,
  helperText,
  placeholder,
  noOptionsText,
  loadingText,
}: AutocompleteProps) {
  return (
    <MuiAutocomplete
      size="small"
      fullWidth
      options={options}
      value={value}
      loading={loading}
      noOptionsText={noOptionsText}
      loadingText={loadingText}
      filterOptions={(all) => all}
      isOptionEqualToValue={(a, b) => a.value === b.value}
      onChange={(_, option) => onChange(option)}
      onInputChange={(_, text, reason) => {
        // 'reset' fires when an option is picked or the value is cleared: not a search.
        if (reason === 'input') onInputChange(text)
        if (reason === 'clear') onInputChange('')
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          required={required}
          error={error}
          helperText={helperText}
          placeholder={placeholder}
        />
      )}
    />
  )
}
