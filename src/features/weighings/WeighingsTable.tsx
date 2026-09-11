import { useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import CircularProgress from '@mui/material/CircularProgress'
import MenuItem from '@mui/material/MenuItem'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import {
  Input, Badge, Button,
  Table, TableHead, TableBody, TableRow, TableCell, TableContainer, TablePagination,
} from '../../components/ui'
import { t, interpolate } from '../../lib/i18n'

export interface Weighing {
  id: string
  fecha: string
  reciclador_nombre: string
  material: 'papel' | 'plastico' | 'vidrio' | 'metal' | 'carton' | 'electronico' | 'organico'
  kg: number
  precio_kg: number
  estado: 'pendiente' | 'validado' | 'pagado' | 'rechazado'
  rejection_reason?: string | null
}

interface WeighingsTableProps {
  data: Weighing[]
  isLoading?: boolean
  onValidate?: (id: string) => void
  onReject?: (id: string) => void
  onMarkPaid?: (id: string) => void
  actionLoadingId?: string | null
}

const MATERIAL_CONFIG: Record<Weighing['material'], { label: string; color: 'default' | 'info' | 'primary' | 'success' | 'warning' | 'error' }> = {
  papel:      { label: t.pesajes.materials.papel,      color: 'info' },
  plastico:   { label: t.pesajes.materials.plastico,   color: 'primary' },
  vidrio:     { label: t.pesajes.materials.vidrio,     color: 'success' },
  metal:      { label: t.pesajes.materials.metal,      color: 'default' },
  carton:     { label: t.pesajes.materials.carton,     color: 'warning' },
  electronico:{ label: t.pesajes.materials.electronico, color: 'error' },
  organico:   { label: t.pesajes.materials.organico,   color: 'success' },
}

const ESTADO_CONFIG: Record<Weighing['estado'], { label: string; color: 'warning' | 'success' | 'info' | 'error' }> = {
  pendiente: { label: t.pesajes.status.pendiente,  color: 'warning' },
  validado:  { label: t.pesajes.status.validado,   color: 'success' },
  pagado:    { label: t.pesajes.status.pagado,     color: 'info' },
  rechazado: { label: t.pesajes.status.rechazado, color: 'error' },
}

type StatusFilter = '' | Weighing['estado']

const PAGE_SIZE = 8

export default function WeighingsTable({
  data,
  isLoading,
  onValidate,
  onReject,
  onMarkPaid,
  actionLoadingId,
}: WeighingsTableProps) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(PAGE_SIZE)

  const filtered = data.filter((p) => {
    const q = search.toLowerCase()
    const matchesSearch =
      p.reciclador_nombre.toLowerCase().includes(q) ||
      MATERIAL_CONFIG[p.material].label.toLowerCase().includes(q)
    const matchesStatus = statusFilter === '' || p.estado === statusFilter
    return matchesSearch && matchesStatus
  })

  const paginated = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress color="primary" />
      </Box>
    )
  }

  const countLabel = `${filtered.length} ${filtered.length !== 1 ? t.pesajes.countPlural : t.pesajes.countSingular}`
  const hasActions = onValidate || onReject || onMarkPaid

  return (
    <TableContainer>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.5, px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Input
          placeholder={t.pesajes.searchPlaceholder}
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0) }}
          fullWidth={false}
          sx={{ width: 280 }}
        />
        <TextField
          select size="small" value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value as StatusFilter); setPage(0) }}
          sx={{ width: 160 }}
        >
          <MenuItem value="">Todos los estados</MenuItem>
          {Object.entries(ESTADO_CONFIG).map(([k, v]) => (
            <MenuItem key={k} value={k}>{v.label}</MenuItem>
          ))}
        </TextField>
        <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>{countLabel}</Typography>
      </Box>

      {filtered.length === 0 ? (
        <Box sx={{ py: 6, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            {search || statusFilter
              ? interpolate(t.pesajes.emptySearch, { query: search || statusFilter })
              : t.pesajes.emptyState}
          </Typography>
        </Box>
      ) : (
        <>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>{t.pesajes.table.date}</TableCell>
                <TableCell>{t.pesajes.table.recycler}</TableCell>
                <TableCell>{t.pesajes.table.material}</TableCell>
                <TableCell align="right">{t.pesajes.table.kg}</TableCell>
                <TableCell align="right">{t.pesajes.table.pricePerKg}</TableCell>
                <TableCell align="right">{t.pesajes.table.total}</TableCell>
                <TableCell>{t.pesajes.table.status}</TableCell>
                {hasActions && <TableCell align="right">Acciones</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {paginated.map((p) => (
                <TableRow key={p.id} hover>
                  <TableCell sx={{ color: 'text.secondary', fontSize: '0.85rem' }}>
                    {new Date(p.fecha).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 500 }}>{p.reciclador_nombre}</TableCell>
                  <TableCell>
                    <Badge label={MATERIAL_CONFIG[p.material].label} color={MATERIAL_CONFIG[p.material].color} />
                  </TableCell>
                  <TableCell align="right" sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{Number(p.kg).toLocaleString('es-CO')}</TableCell>
                  <TableCell align="right" sx={{ color: 'text.secondary', fontSize: '0.85rem' }}>
                    ${Number(p.precio_kg).toLocaleString('es-CO')}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
                    ${(Number(p.kg) * Number(p.precio_kg)).toLocaleString('es-CO')}
                  </TableCell>
                  <TableCell>
                    {p.estado === 'rechazado' && p.rejection_reason ? (
                      <Tooltip title={p.rejection_reason}>
                        <span>
                          <Badge label={ESTADO_CONFIG[p.estado].label} color={ESTADO_CONFIG[p.estado].color} />
                        </span>
                      </Tooltip>
                    ) : (
                      <Badge label={ESTADO_CONFIG[p.estado].label} color={ESTADO_CONFIG[p.estado].color} />
                    )}
                  </TableCell>
                  {hasActions && (
                    <TableCell align="right">
                      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                        {p.estado === 'pendiente' && onValidate && (
                          <Button
                            size="small"
                            variant="outlined"
                            color="success"
                            disabled={actionLoadingId === p.id}
                            onClick={() => onValidate(p.id)}
                          >
                            Validar
                          </Button>
                        )}
                        {p.estado === 'pendiente' && onReject && (
                          <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            disabled={actionLoadingId === p.id}
                            onClick={() => onReject(p.id)}
                          >
                            Rechazar
                          </Button>
                        )}
                        {p.estado === 'validado' && onMarkPaid && (
                          <Button
                            size="small"
                            variant="outlined"
                            disabled={actionLoadingId === p.id}
                            onClick={() => onMarkPaid(p.id)}
                          >
                            Marcar pagado
                          </Button>
                        )}
                      </Box>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <TablePagination
            count={filtered.length}
            page={page}
            rowsPerPage={rowsPerPage}
            onPageChange={(_, p) => setPage(p)}
            onRowsPerPageChange={(e) => { setRowsPerPage(+e.target.value); setPage(0) }}
          />
        </>
      )}
    </TableContainer>
  )
}
