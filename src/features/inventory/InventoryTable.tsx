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

export interface InventoryItem {
  id: string
  material: 'papel' | 'plastico' | 'vidrio' | 'metal' | 'carton' | 'electronico' | 'organico'
  stock_kg: number
  stock_min_kg: number
  precio_kg: number
  bodega: string
  fecha_actualizacion: string
  estado: 'disponible' | 'bajo_stock' | 'agotado'
}

interface InventoryTableProps {
  data: InventoryItem[]
  isLoading?: boolean
  onEdit?: (item: InventoryItem) => void
}

const MATERIAL_CONFIG: Record<InventoryItem['material'], { label: string; color: 'info' | 'primary' | 'success' | 'default' | 'warning' | 'error' }> = {
  papel: { label: t.inventario.materials.papel, color: 'info' },
  plastico: { label: t.inventario.materials.plastico, color: 'primary' },
  vidrio: { label: t.inventario.materials.vidrio, color: 'success' },
  metal: { label: t.inventario.materials.metal, color: 'default' },
  carton: { label: t.inventario.materials.carton, color: 'warning' },
  electronico: { label: t.inventario.materials.electronico, color: 'error' },
  organico: { label: t.inventario.materials.organico, color: 'success' },
}

const ESTADO_CONFIG: Record<InventoryItem['estado'], { label: string; color: 'success' | 'warning' | 'error' }> = {
  disponible: { label: t.inventario.status.disponible, color: 'success' },
  bajo_stock: { label: t.inventario.status.bajo_stock, color: 'warning' },
  agotado: { label: t.inventario.status.agotado, color: 'error' },
}

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
  const [materialFilter, setMaterialFilter] = useState<InventoryItem['material'] | ''>('')
  const [statusFilter, setStatusFilter] = useState<InventoryItem['estado'] | ''>('')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(PAGE_SIZE)

  const filtered = data.filter((item) => {
    const q = search.toLowerCase()
    return (
      (item.bodega.toLowerCase().includes(q) || MATERIAL_CONFIG[item.material].label.toLowerCase().includes(q)) &&
      (materialFilter === '' || item.material === materialFilter) &&
      (statusFilter === '' || item.estado === statusFilter)
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
          onChange={(e) => { setMaterialFilter(e.target.value as InventoryItem['material'] | ''); setPage(0) }}
          sx={{ width: 180 }}
        >
          <MenuItem value="">{t.inventario.filterAllMaterials}</MenuItem>
          {Object.entries(MATERIAL_CONFIG).map(([k, v]) => (
            <MenuItem key={k} value={k}>{v.label}</MenuItem>
          ))}
        </TextField>
        <TextField
          select size="small" value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value as InventoryItem['estado'] | ''); setPage(0) }}
          sx={{ width: 160 }}
        >
          <MenuItem value="">{t.inventario.filterAllStatuses}</MenuItem>
          {Object.entries(ESTADO_CONFIG).map(([k, v]) => (
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
                  <TableCell><Badge label={MATERIAL_CONFIG[item.material].label} color={MATERIAL_CONFIG[item.material].color} /></TableCell>
                  <TableCell sx={{ fontWeight: 500 }}>{item.bodega}</TableCell>
                  <TableCell><StockBar actual={item.stock_kg} minimo={item.stock_min_kg} /></TableCell>
                  <TableCell align="right" sx={{ fontFamily: 'monospace', fontSize: '0.85rem', color: 'text.secondary' }}>{item.stock_min_kg.toLocaleString('es-CO')}</TableCell>
                  <TableCell align="right" sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>${item.precio_kg.toLocaleString('es-CO')}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>${(item.stock_kg * item.precio_kg).toLocaleString('es-CO')}</TableCell>
                  <TableCell sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>
                    {new Date(item.fecha_actualizacion).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </TableCell>
                  <TableCell><Badge label={ESTADO_CONFIG[item.estado].label} color={ESTADO_CONFIG[item.estado].color} /></TableCell>
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
