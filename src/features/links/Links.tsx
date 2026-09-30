import { useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import EcaLinks from './EcaLinks'
import AssociationLinks from './AssociationLinks'
import { Snackbar } from '../../components/ui'
import { useRoles } from '../../hooks/useRoles'
import { t } from '../../lib/i18n'

export default function Links() {
  const { can } = useRoles()
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  })
  const notify = (message: string, severity: 'success' | 'error') => setSnackbar({ open: true, message, severity })

  // The server decides who may do what: the ECA asks (`links.request`), the Association decides
  // (`links.decide`). Someone with only `links.view` gets nothing to act on here.
  const asEca = can('links.request')
  const asAssociation = !asEca && can('links.decide')

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box>
        <Typography variant="h5" component="h1" fontWeight={600}>{t.vinculaciones.title}</Typography>
        <Typography variant="body2" color="text.secondary" mt={0.5}>
          {asEca ? t.vinculaciones.subtitleEca : t.vinculaciones.subtitleAssociation}
        </Typography>
      </Box>

      {asEca && <EcaLinks notify={notify} />}
      {asAssociation && <AssociationLinks notify={notify} />}

      <Snackbar
        open={snackbar.open}
        message={snackbar.message}
        severity={snackbar.severity}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
      />
    </Box>
  )
}
