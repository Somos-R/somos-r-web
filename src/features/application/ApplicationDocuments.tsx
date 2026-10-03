import { useRef, useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, Badge, Button, Loader, Snackbar } from '../../components/ui'
import { visuallyHidden } from '../../lib/a11y'
import { interpolate, t } from '../../lib/i18n'
import { applicationsQueries } from '../../queries/applications'
import { AFFECTED, invalidateAffected } from '../../queries/invalidation'
import {
  applicationsService, type DocumentSlot, type DocumentStatus,
} from '../../services/applications'
import { DOCUMENT_ACCEPT, documentFileProblem, formatBytes, MAX_DOCUMENT_MB } from './documentFiles'

const copy = t.solicitud.documents

// What the reviewer decided about a file; `pending` is just "uploaded, not looked at yet", so it carries no verdict.
const VERDICT_COLOR: Record<Exclude<DocumentStatus, 'pending'>, 'success' | 'warning' | 'error'> = {
  ok: 'success',
  missing: 'warning',
  not_compliant: 'error',
}

interface SlotProps {
  slot: DocumentSlot
  canEdit: boolean
  busy: boolean
  onUpload: (code: string, file: File) => void
  onRemove: (code: string) => void
}

function Slot({ slot, canEdit, busy, onUpload, onRemove }: SlotProps) {
  const { document_type: type, document } = slot
  const [problem, setProblem] = useState<string | undefined>()
  const inputRef = useRef<HTMLInputElement>(null)

  const choose = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // choosing the same file again must work
    if (!file) return
    const found = documentFileProblem(file)
    setProblem(found)
    if (!found) onUpload(type.code, file)
  }

  const action = document ? copy.replace : copy.upload
  const actionFor = interpolate(document ? copy.replaceFor : copy.uploadFor, { label: type.label })

  return (
    <Box component="li" sx={{ listStyle: 'none', border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1.5 }}>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <Typography variant="body2" fontWeight={600}>{type.label}</Typography>
          <Badge label={type.is_required ? copy.required : copy.optional} color={type.is_required ? 'warning' : 'default'} />
        </Box>
        {canEdit && (
          <Box sx={{ display: 'flex', gap: 1 }}>
            {/* The button opens the browser's file picker; the real input stays out of the way (and out of the tab order). */}
            <Button variant="outlined" size="small" disabled={busy} aria-label={actionFor} onClick={() => inputRef.current?.click()}>
              {action}
            </Button>
            <Box
              component="input"
              ref={inputRef}
              type="file"
              accept={DOCUMENT_ACCEPT}
              onChange={choose}
              disabled={busy}
              tabIndex={-1}
              aria-hidden
              data-testid={`document-file-${type.code}`}
              sx={visuallyHidden}
            />
            {document && (
              <Button
                variant="text"
                size="small"
                color="error"
                disabled={busy}
                aria-label={interpolate(copy.removeFor, { label: type.label })}
                onClick={() => onRemove(type.code)}
              >
                {copy.remove}
              </Button>
            )}
          </Box>
        )}
      </Box>

      {document ? (
        <Box sx={{ mt: 1 }}>
          <Typography variant="body2">
            {document.original_name} <Typography component="span" variant="caption" color="text.secondary">· {formatBytes(document.size_bytes)}</Typography>
          </Typography>
          {document.status !== 'pending' && (
            <Box sx={{ mt: 0.5 }}>
              <Badge label={copy.status[document.status] ?? document.status} color={VERDICT_COLOR[document.status] ?? 'default'} />
            </Box>
          )}
          {document.review_comment && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, whiteSpace: 'pre-wrap' }}>
              {copy.reviewerComment}: {document.review_comment}
            </Typography>
          )}
        </Box>
      ) : (
        <Typography variant="caption" color="text.secondary" component="p" sx={{ mt: 0.5 }}>{copy.none}</Typography>
      )}

      {problem && <Alert severity="error">{problem}</Alert>}
    </Box>
  )
}

/**
 * The documents Somos R asks for. The list is not fixed here: it is a catalog the backoffice edits, so every
 * slot (label, required or not) is drawn from the server's answer. One file per document; uploading again replaces it.
 */
export default function ApplicationDocuments({ token, canEdit }: { token: string; canEdit: boolean }) {
  const queryClient = useQueryClient()
  const [notice, setNotice] = useState('')
  const { data: slots, isLoading, error, refetch } = useQuery(applicationsQueries.documents(token))

  // A change also moves what is missing to send the application, so both queries are read again. A failure
  // (too big, wrong kind, the application got locked) is reported by the global handler.
  const refresh = () => invalidateAffected(queryClient, AFFECTED.applicationChanged)

  const upload = useMutation({
    meta: { refreshOnError: AFFECTED.applicationChanged },
    mutationFn: ({ code, file }: { code: string; file: File }) => applicationsService.uploadDocument(token, code, file),
    onSuccess: () => { refresh(); setNotice(copy.uploaded) },
  })
  const remove = useMutation({
    meta: { refreshOnError: AFFECTED.applicationChanged },
    mutationFn: (code: string) => applicationsService.deleteDocument(token, code),
    onSuccess: () => { refresh(); setNotice(copy.removed) },
  })
  const busy = upload.isPending || remove.isPending

  if (isLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}><Loader /></Box>
  if (error || !slots) {
    return (
      <Alert severity="error">
        {copy.loadError} <Button variant="text" size="small" onClick={() => refetch()}>{copy.retry}</Button>
      </Alert>
    )
  }
  if (slots.length === 0) return <Typography variant="body2" color="text.secondary">{copy.empty}</Typography>

  return (
    <Box component="section" aria-labelledby="documents-title" sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Box>
        <Typography id="documents-title" variant="subtitle1" component="h2" fontWeight={600}>{copy.title}</Typography>
        <Typography variant="body2" color="text.secondary">{interpolate(copy.subtitle, { max: MAX_DOCUMENT_MB })}</Typography>
      </Box>
      <Box component="ul" sx={{ m: 0, p: 0, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {slots.map((slot) => (
          <Slot
            key={slot.document_type.code}
            slot={slot}
            canEdit={canEdit}
            busy={busy}
            onUpload={(code, file) => upload.mutate({ code, file })}
            onRemove={(code) => remove.mutate(code)}
          />
        ))}
      </Box>
      <Snackbar open={notice !== ''} message={notice} severity="success" onClose={() => setNotice('')} />
    </Box>
  )
}
