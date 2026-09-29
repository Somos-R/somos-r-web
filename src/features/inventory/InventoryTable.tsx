import { useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import CircularProgress from '@mui/material/CircularProgress'
import MenuItem from '@mui/material/MenuItem'
import TextField from '@mui/material/TextField'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import { Pencil } from 'lucide-react'
import {
  Badge, Input,
  Table, TableHead, TableBody, TableRow, TableCell, TableContainer, TablePagination,
} from '../../components/ui'
import { t } from '../../lib/i18n'
import { getMaterialColor, getStatusStyle, type CatalogRef } from '../../lib/catalog'
import type { InventoryStatus } from '../../services/inventory'

export interface InventoryItem {
  id: string
  material: CatalogRef
  stock_kg: number
  stock_min_kg: number
  price_per_kg: number
  bodega: string
  updated_at: string
  status: InventoryStatus
}

interface InventoryTableProps {
  data: InventoryItem[]
  isLoading?: boolean
  onEdit?: (item: InventoryItem) => void
}

const STATUS_CONFIG: Record<InventoryStatus, { label: string; color: 'success' | 'warning' | 'error' | 'default' }> = {
  available:    { label: t.inventario.status.available,    color: 'success' },
  low_stock:    { label: t.inventario.status.low_stock,    color: 'warning' },
  out_of_stock: { label: t.inventario.status.out_of_stock, color: 'error' },
}

const statusStyle = (status: string) => getStatusStyle(STATUS_CONFIG, status, 'default' as const)

function StockBar({ actual, minimo }: { actual: number; minimo: number }) {
  const max = Math.max(actual, minimo) * 1.5 || 1
  const pct = Math.min((actual / max) * 100, 100)
  const color = actual === 0 ? '#f87171' : actual < minimo ? '#fbbf24' : '#34d399'
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Box sx={{ width: 64, height: 8, backgroundColor: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
        <Box sx={{ height: '100%', width: `${pct}%`, backgroundColor: color, borderRadius: 4 }} />
      </Box>
      <Typography variant="caption" fontFamily="monospace">{actual.toLocaleString('es-CO')} kg</Typography>
    </Box>
  )
}

const PAGE_SIZE = 8

export default function InventoryTable({ data, isLoading, onEdit }: InventoryTableProps) {
  const [search, setSearch] = useState('')
  const [materialFilter, setMaterialFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<InventoryStatus | ''>('')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(PAGE_SIZE)

  // Filter options come from the materials present in the data, not from a hardcoded list.
  const materialOptions = [...new Map(data.map((item) => [item.material.code, item.material])).values()]

  const filtered = data.filter((item) => {
    const q = search.toLowerCase()
    return (
      (item.bodega.toLowerCase().includes(q) || item.material.label.toLowerCase().includes(q)) &&
      (materialFilter === '' || item.material.code === materialFilter) &&
      (statusFilter === '' || item.status === statusFilter)
    )
  })

  const paginated = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)

  if (isLoading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
  }

  const countLabel = `${filtered.length} ${filtered.length !== 1 ? t.inventario.countPlural : t.inventario.countSingular}`

  return (
    <TableContainer>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.5, px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Input
          placeholder={t.inventario.searchPlaceholder}
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0) }}
          fullWidth={false}
          sx={{ width: 240 }}
        />
        <TextField
          select size="small" value={materialFilter}
          onChange={(e) => { setMaterialFilter(e.target.value); setPage(0) }}
          sx={{ width: 180 }}
        >
          <MenuItem value="">{t.inventario.filterAllMaterials}</MenuItem>
          {materialOptions.map((m) => (
            <MenuItem key={m.code} value={m.code}>{m.label}</MenuItem>
          ))}
        </TextField>
        <TextField
          select size="small" value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value as InventoryStatus | ''); setPage(0) }}
          sx={{ width: 160 }}
        >
          <MenuItem value="">{t.inventario.filterAllStatuses}</MenuItem>
          {Object.entries(STATUS_CONFIG).map(([k, v]) => (
            <MenuItem key={k} value={k}>{v.label}</MenuItem>
          ))}
        </TextField>
        <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
          {countLabel}
        </Typography>
      </Box>

      {filtered.length === 0 ? (
        <Box sx={{ py: 6, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            {search || materialFilter || statusFilter
              ? t.inventario.emptySearch
              : t.inventario.emptyState}
          </Typography>
        </Box>
      ) : (
        <>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>{t.inventario.table.material}</TableCell>
                <TableCell>{t.inventario.table.warehouse}</TableCell>
                <TableCell>{t.inventario.table.currentStock}</TableCell>
                <TableCell align="right">{t.inventario.table.minimum}</TableCell>
                <TableCell align="right">{t.inventario.table.pricePerKg}</TableCell>
                <TableCell align="right">{t.inventario.table.totalValue}</TableCell>
                <TableCell>{t.inventario.table.updated}</TableCell>
                <TableCell>{t.inventario.table.status}</TableCell>
                {onEdit && <TableCell />}
              </TableRow>
            </TableHead>
            <TableBody>
              {paginated.map((item) => (
                <TableRow key={item.id} hover>
                  <TableCell><Badge label={item.material.label} color={getMaterialColor(item.material.code)} /></TableCell>
                  <TableCell sx={{ fontWeight: 500 }}>{item.bodega}</TableCell>
                  <TableCell><StockBar actual={item.stock_kg} minimo={item.stock_min_kg} /></TableCell>
                  <TableCell align="right" sx={{ fontFamily: 'monospace', fontSize: '0.85rem', color: 'text.secondary' }}>{item.stock_min_kg.toLocaleString('es-CO')}</TableCell>
                  <TableCell align="right" sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>${item.price_per_kg.toLocaleString('es-CO')}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>${(item.stock_kg * item.price_per_kg).toLocaleString('es-CO')}</TableCell>
                  <TableCell sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>
                    {new Date(item.updated_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </TableCell>
                  <TableCell><Badge label={statusStyle(item.status).label} color={statusStyle(item.status).color} /></TableCell>
                  {onEdit && (
                    <TableCell align="right" sx={{ py: 0.5 }}>
                      <Tooltip title="Editar mínimo y precio">
                        <IconButton size="small" onClick={() => onEdit(item)}>
                          <Pencil size={15} />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <TablePagination
            count={filtered.length} page={page} rowsPerPage={rowsPerPage}
            onPageChange={(_, p) => setPage(p)}
            onRowsPerPageChange={(e) => { setRowsPerPage(+e.target.value); setPage(0) }}
          />
        </>
      )}
    </TableContainer>
  )
}
