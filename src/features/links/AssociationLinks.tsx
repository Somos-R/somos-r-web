import { useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { useQuery } from '@tanstack/react-query'
import LinksTable from './LinksTable'
import { ConfirmLinkDialog, RejectLinkDialog } from './LinkDialogs'
import { useLinkActions, type Notify } from './useLinkActions'
import { linksQueries } from '../../queries/links'
import { toPaginationProps, usePagination } from '../../lib/pagination'
import { t } from '../../lib/i18n'
import type { OrganizationLink } from '../../services/links'

/** An Association's side: the requests ECAs made to it, and the ECAs it works with. */
export default function AssociationLinks({ notify }: { notify: Notify }) {
  const actions = useLinkActions(notify)
  // Pending requests first: they are what needs an answer.
  const [status, setStatus] = useState('requested')
  const pagination = usePagination()
  const { data, isLoading, isFetching } = useQuery(
    linksQueries.list({ status, page: pagination.page, rowsPerPage: pagination.rowsPerPage }),
  )
  pagination.clamp(data?.total)

  const [rejecting, setRejecting] = useState<OrganizationLink | null>(null)
  const [removing, setRemoving] = useState<OrganizationLink | null>(null)

  const busyId =
    (actions.accept.isPending && actions.accept.variables) ||
    (actions.reject.isPending && actions.reject.variables?.linkId) ||
    (actions.remove.isPending && actions.remove.variables?.linkId) ||
    null

  return (
    <Box component="section" aria-labelledby="requests" sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Typography id="requests" variant="h6" component="h2" fontWeight={600}>{t.vinculaciones.links.requestsTitle}</Typography>
      <LinksTable
        side="association"
        data={data?.items ?? []}
        isLoading={isLoading}
        isFetching={isFetching}
        status={status}
        onStatusChange={(next) => { setStatus(next); pagination.resetPage() }}
        pagination={toPaginationProps(pagination, data?.total ?? 0)}
        emptyMessage={t.vinculaciones.emptyAssociation}
        onAccept={(link) => actions.accept.mutate(link.id)}
        onReject={setRejecting}
        onRemove={setRemoving}
        busyId={busyId}
      />

      {rejecting && (
        <RejectLinkDialog
          organizationName={rejecting.eca.legal_name}
          onConfirm={(reason) => {
            actions.reject.mutate({ linkId: rejecting.id, reason })
            setRejecting(null)
          }}
          onClose={() => setRejecting(null)}
        />
      )}

      {removing && (
        <ConfirmLinkDialog
          title={t.vinculaciones.confirm.removeTitle}
          message={t.vinculaciones.confirm.removeMessage}
          confirmLabel={t.vinculaciones.confirm.removeButton}
          onConfirm={() => {
            actions.remove.mutate({ linkId: removing.id, cancelling: false })
            setRemoving(null)
          }}
          onClose={() => setRemoving(null)}
        />
      )}
    </Box>
  )
}
