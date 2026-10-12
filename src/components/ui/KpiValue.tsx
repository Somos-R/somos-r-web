import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import type { SxProps, Theme } from '@mui/material/styles'

export interface KpiValueProps {
  value: string
  label: string
  /** 'large' for a standalone stat card (Dashboard); 'small' for a number inside an already-titled card (Reports). */
  size?: 'small' | 'large'
  sx?: SxProps<Theme>
}

/** The number + its label, the one piece actually shared by every KPI card in the app. The
 * surrounding Card, icon and trend badge differ per screen, so this stays unopinionated about them. */
export function KpiValue({ value, label, size = 'large', sx }: KpiValueProps) {
  return (
    <Box sx={sx}>
      <Typography variant={size === 'large' ? 'h4' : 'h5'} component="p" fontWeight={700}>{value}</Typography>
      <Typography variant="body2" color="text.secondary" mt={size === 'large' ? 0.5 : 0}>{label}</Typography>
    </Box>
  )
}
