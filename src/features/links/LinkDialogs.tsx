import { useState } from 'react'
import Typography from '@mui/material/Typography'
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Input } from '../../components/ui'
import { t } from '../../lib/i18n'

interface ConfirmProps {
  title: string
  message: string
  confirmLabel: string
  onConfirm: () => void
  onClose: () => void
}

/** Ending a link (or cancelling a request) can't be undone with one click: ask first. */
export function ConfirmLinkDialog({ title, message, confirmLabel, onConfirm, onClose }: ConfirmProps) {
  return (
    <Dialog open onClose={onClose} maxWidth="xs">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary">{message}</Typography>
      </DialogContent>
      <DialogActions>
        <Button variant="outlined" onClick={onClose}>{t.vinculaciones.confirm.keep}</Button>
        <Button variant="destructive" onClick={onConfirm}>{confirmLabel}</Button>
      </DialogActions>
    </Dialog>
  )
}

interface RejectProps {
  organizationName: string
  onConfirm: (reason: string | undefined) => void
  onClose: () => void
}

/** The Association may say why, so the ECA sees it; the server accepts up to 200 characters. */
export function RejectLinkDialog({ organizationName, onConfirm, onClose }: RejectProps) {
  const [reason, setReason] = useState('')

  return (
    <Dialog open onClose={onClose} maxWidth="xs">
      <DialogTitle showClose onClose={onClose}>{t.vinculaciones.reject.title}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" fontWeight={600} mb={0.5}>{organizationName}</Typography>
        <Typography variant="body2" color="text.secondary" mb={2}>{t.vinculaciones.reject.message}</Typography>
        <Input
          label={t.vinculaciones.reject.reasonLabel}
          value={reason}
          onChange={(e) => setReason(e.target.value.slice(0, 200))}
        />
      </DialogContent>
      <DialogActions>
        <Button variant="outlined" onClick={onClose}>{t.common.cancel}</Button>
        <Button variant="destructive" onClick={() => onConfirm(reason.trim() || undefined)}>
          {t.vinculaciones.reject.confirmButton}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
