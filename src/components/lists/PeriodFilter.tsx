import { Input } from '../ui'
import { t } from '../../lib/i18n'
import { isBackwards } from '../../lib/period'

interface PeriodFilterProps {
  /** Calendar days as typed in the boxes ("YYYY-MM-DD"); '' leaves that side open. */
  from: string
  to: string
  onFromChange: (day: string) => void
  onToChange: (day: string) => void
}

/** Two date boxes that bound a list to a period; the screen owns the values and sends them to the server. */
export default function PeriodFilter({ from, to, onFromChange, onToChange }: PeriodFilterProps) {
  const backwards = isBackwards(from, to)
  return (
    <>
      <Input
        label={t.common.period.from}
        type="date"
        value={from}
        onChange={(e) => onFromChange(e.target.value)}
        fullWidth={false}
        sx={{ width: 160 }}
      />
      <Input
        label={t.common.period.to}
        type="date"
        value={to}
        onChange={(e) => onToChange(e.target.value)}
        error={backwards}
        helperText={backwards ? t.common.period.backwards : undefined}
        fullWidth={false}
        sx={{ width: 160 }}
      />
    </>
  )
}
