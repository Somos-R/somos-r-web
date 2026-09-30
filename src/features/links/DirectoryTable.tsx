import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import {
  Badge, Button, Input,
  Table, TableHead, TableBody, TableRow, TableCell, TableContainer, TablePagination,
  Loader,
} from '../../components/ui'
import { t } from '../../lib/i18n'
import { PAGE_SIZE_OPTIONS, type PaginationProps } from '../../lib/pagination'
import type { DirectoryEntry } from '../../services/links'
import { STATUS_COLOR, statusLabel } from './linkStatus'

interface Props {
  data: DirectoryEntry[]
  isLoading?: boolean
  isFetching?: boolean
  search: string
  onSearchChange: (text: string) => void
  pagination: PaginationProps
  onRequest: (entry: DirectoryEntry) => void
  /** The association an action is running on. */
  busyId?: string | null
}

// Only these can be asked (again): a pending or active link already exists with the others.
const canRequest = (entry: DirectoryEntry) => entry.link_status === null || entry.link_status === 'rejected' || entry.link_status === 'removed'

export default function DirectoryTable({ data, isLoading, isFetching, search, onSearchChange, pagination, onRequest, busyId }: Props) {
  return (
    <TableContainer sx={{ opacity: isFetching ? 0.6 : 1, transition: 'opacity 120ms' }}>
      <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Input
          placeholder={t.vinculaciones.directory.searchPlaceholder}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          fullWidth={false}
          sx={{ width: 300 }}
        />
      </Box>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <Loader />
        </Box>
      ) : data.length === 0 ? (
        <Box sx={{ py: 6, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            {search.trim() ? t.vinculaciones.directory.empty : t.vinculaciones.directory.emptyList}
          </Typography>
        </Box>
      ) : (
        <>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>{t.vinculaciones.directory.name}</TableCell>
                <TableCell>{t.vinculaciones.table.city}</TableCell>
                <TableCell>{t.vinculaciones.table.status}</TableCell>
                <TableCell>{t.vinculaciones.table.actions}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.map((entry) => (
                <TableRow key={entry.id} hover>
                  <TableCell sx={{ fontWeight: 500 }}>{entry.legal_name}</TableCell>
                  <TableCell>{entry.city ?? t.vinculaciones.noCity}</TableCell>
                  <TableCell>
                    {entry.link_status ? (
                      <Badge label={statusLabel(entry.link_status)} color={STATUS_COLOR[entry.link_status] ?? 'default'} />
                    ) : (
                      t.vinculaciones.noCity
                    )}
                  </TableCell>
                  <TableCell>
                    {canRequest(entry) && (
                      <Button size="small" variant="outlined" loading={busyId === entry.id} disabled={!!busyId} onClick={() => onRequest(entry)}>
                        {entry.link_status === null ? t.vinculaciones.actions.request : t.vinculaciones.actions.requestAgain}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <TablePagination
            count={pagination.total}
            page={pagination.page}
            rowsPerPage={pagination.rowsPerPage}
            rowsPerPageOptions={PAGE_SIZE_OPTIONS}
            onPageChange={(_, page) => pagination.onPageChange(page)}
            onRowsPerPageChange={(e) => pagination.onRowsPerPageChange(+e.target.value)}
          />
        </>
      )}
    </TableContainer>
  )
}
