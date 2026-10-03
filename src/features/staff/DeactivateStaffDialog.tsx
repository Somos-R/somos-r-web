import { useState } from 'react'
import Typography from '@mui/material/Typography'
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Input } from '../../components/ui'
import { t } from '../../lib/i18n'

interface Props {
  name: string
  busy?: boolean
  onConfirm: (reason: string | undefined) => void
  onClose: () => void
}

/** Deactivating ends the person's sessions, so ask first; the reason is optional (up to 200 characters). */
export default function DeactivateStaffDialog({ name, busy, onConfirm, onClose }: Props) {
  const [reason, setReason] = useState('')

  return (
    <Dialog open onClose={onClose} maxWidth="xs">
      <DialogTitle showClose onClose={onClose}>{t.personal.status_change.deactivateTitle}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" fontWeight={600} mb={0.5}>{name}</Typography>
        <Typography variant="body2" color="text.secondary" mb={2}>{t.personal.status_change.deactivateMessage}</Typography>
        <Input
          label={t.personal.status_change.reasonLabel}
          value={reason}
          onChange={(e) => setReason(e.target.value.slice(0, 200))}
        />
      </DialogContent>
      <DialogActions>
        <Button variant="outlined" onClick={onClose}>{t.common.cancel}</Button>
        <Button variant="destructive" loading={busy} onClick={() => onConfirm(reason.trim() || undefined)}>
          {t.personal.status_change.confirmDeactivate}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
