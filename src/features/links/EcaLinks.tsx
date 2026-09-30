import { useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { useQuery } from '@tanstack/react-query'
import LinksTable from './LinksTable'
import DirectoryTable from './DirectoryTable'
import { ConfirmLinkDialog } from './LinkDialogs'
import { useLinkActions, type Notify } from './useLinkActions'
import { linksQueries } from '../../queries/links'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import { toPaginationProps, usePagination } from '../../lib/pagination'
import { t } from '../../lib/i18n'
import type { OrganizationLink } from '../../services/links'

/** An ECA's side: its own links, and the directory of associations it can ask to link with. */
export default function EcaLinks({ notify }: { notify: Notify }) {
  const actions = useLinkActions(notify)

  // The ECA's links.
  const [status, setStatus] = useState('')
  const linksPagination = usePagination()
  const { data: links, isLoading: linksLoading, isFetching: linksFetching } = useQuery(
    linksQueries.list({ status, page: linksPagination.page, rowsPerPage: linksPagination.rowsPerPage }),
  )
  linksPagination.clamp(links?.total)

  // The directory.
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search.trim())
  const directoryPagination = usePagination(10)
  const { data: directory, isLoading: directoryLoading, isFetching: directoryFetching } = useQuery(
    linksQueries.directory({ search: debouncedSearch, page: directoryPagination.page, rowsPerPage: directoryPagination.rowsPerPage }),
  )
  directoryPagination.clamp(directory?.total)

  const [ending, setEnding] = useState<OrganizationLink | null>(null)
  const busyLinkId = actions.remove.isPending ? (actions.remove.variables?.linkId ?? null) : null
  const busyAssociationId = actions.request.isPending ? (actions.request.variables?.associationId ?? null) : null

  const confirmEnd = () => {
    if (!ending) return
    actions.remove.mutate({ linkId: ending.id, cancelling: ending.status === 'requested' })
    setEnding(null)
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <Box component="section" aria-labelledby="my-links" sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Typography id="my-links" variant="h6" component="h2" fontWeight={600}>{t.vinculaciones.links.title}</Typography>
        <LinksTable
          side="eca"
          data={links?.items ?? []}
          isLoading={linksLoading}
          isFetching={linksFetching}
          status={status}
          onStatusChange={(next) => { setStatus(next); linksPagination.resetPage() }}
          pagination={toPaginationProps(linksPagination, links?.total ?? 0)}
          emptyMessage={t.vinculaciones.emptyEca}
          onRemove={setEnding}
          busyId={busyLinkId}
        />
      </Box>

      <Box component="section" aria-labelledby="directory" sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Typography id="directory" variant="h6" component="h2" fontWeight={600}>{t.vinculaciones.directory.title}</Typography>
        <DirectoryTable
          data={directory?.items ?? []}
          isLoading={directoryLoading}
          isFetching={directoryFetching}
          search={search}
          onSearchChange={(text) => { setSearch(text); directoryPagination.resetPage() }}
          pagination={toPaginationProps(directoryPagination, directory?.total ?? 0)}
          onRequest={(entry) => actions.request.mutate({ associationId: entry.id, name: entry.legal_name })}
          busyId={busyAssociationId}
        />
      </Box>

      {ending && (
        <ConfirmLinkDialog
          title={ending.status === 'requested' ? t.vinculaciones.confirm.cancelTitle : t.vinculaciones.confirm.removeTitle}
          message={ending.status === 'requested' ? t.vinculaciones.confirm.cancelMessage : t.vinculaciones.confirm.removeMessage}
          confirmLabel={ending.status === 'requested' ? t.vinculaciones.confirm.cancelButton : t.vinculaciones.confirm.removeButton}
          onConfirm={confirmEnd}
          onClose={() => setEnding(null)}
        />
      )}
    </Box>
  )
}
