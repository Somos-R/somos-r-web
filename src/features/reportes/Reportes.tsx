import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { Card, CardContent } from '../../components/ui'

export default function Reportes() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box>
        <Typography variant="h5" fontWeight={600}>Reportes</Typography>
        <Typography variant="body2" color="text.secondary" mt={0.5}>Estadísticas y exportación de datos</Typography>
      </Box>
      <Card>
        <CardContent sx={{ py: 6, textAlign: 'center' }}>
          <Typography color="text.disabled">
            Reportes y exportación — disponible cuando se conecte el backend
          </Typography>
        </CardContent>
      </Card>
    </Box>
  )
}
