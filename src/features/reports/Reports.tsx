import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { Card, CardContent } from '../../components/ui'
import { t } from '../../lib/i18n'

export default function Reports() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box>
        <Typography variant="h5" fontWeight={600}>{t.reportes.title}</Typography>
        <Typography variant="body2" color="text.secondary" mt={0.5}>{t.reportes.subtitle}</Typography>
      </Box>
      <Card>
        <CardContent sx={{ py: 6, textAlign: 'center' }}>
          <Typography color="text.disabled">{t.reportes.placeholder}</Typography>
        </CardContent>
      </Card>
    </Box>
  )
}
