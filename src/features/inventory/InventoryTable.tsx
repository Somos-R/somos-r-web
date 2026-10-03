import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import MenuItem from '@mui/material/MenuItem'
import TextField from '@mui/material/TextField'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import { Pencil } from 'lucide-react'
import {
  Badge,
  Table, TableHead, TableBody, TableRow, TableCell, SortableTableCell, TableContainer, TablePagination,
  Loader,
} from '../../components/ui'
import { t } from '../../lib/i18n'
import { visuallyHidden } from '../../lib/a11y'
import { getMaterialColor, getStatusStyle, type CatalogRef } from '../../lib/catalog'
import type { SortState } from '../../lib/sorting'
import type { InventorySortColumn, InventoryStatus } from '../../services/inventory'
import { PAGE_SIZE_OPTIONS, type PaginationProps } from '../../lib/pagination'

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

/** The column the server orders by and which way. */
export type InventorySort = SortState<InventorySortColumn>

interface InventoryTableProps {
  /** The rows of the current page, already filtered by the server. */
  data: InventoryItem[]
  isLoading?: boolean
  /** A new page or filter is loading while the previous rows are still shown. */
  isFetching?: boolean
  status: InventoryStatus | ''
  onStatusChange: (status: InventoryStatus | '') => void
  materialCode: string
  onMaterialChange: (code: string) => void
  materialOptions: CatalogRef[]
  warehouseId: string
  onWarehouseChange: (id: string) => void
  warehouseOptions: { id: string; name: string }[]
  sort: InventorySort
  onSortChange: (column: InventorySortColumn) => void
  pagination: PaginationProps
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

export default function InventoryTable({
  data,
  isLoading,
  isFetching,
  status,
  onStatusChange,
  materialCode,
  onMaterialChange,
  materialOptions,
  warehouseId,
  onWarehouseChange,
  warehouseOptions,
  sort,
  onSortChange,
  pagination,
  onEdit,
}: InventoryTableProps) {
  if (isLoading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><Loader /></Box>
  }

  const total = pagination.total
  const countLabel = `${total.toLocaleString('es-CO')} ${total !== 1 ? t.inventario.countPlural : t.inventario.countSingular}`
  const hasFilters = status !== '' || materialCode !== '' || warehouseId !== ''
  const sortHeader = (column: InventorySortColumn, label: string, align?: 'right') => (
    <SortableTableCell align={align} active={sort.column === column} direction={sort.direction} onSort={() => onSortChange(column)}>
      {label}
    </SortableTableCell>
  )

  return (
    <TableContainer sx={{ opacity: isFetching ? 0.6 : 1, transition: 'opacity 120ms' }}>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.5, px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
        <TextField
          select size="small" SelectProps={{ displayEmpty: true, inputProps: { 'aria-label': t.common.filterByMaterial } }} value={materialCode}
          onChange={(e) => onMaterialChange(e.target.value)}
          sx={{ width: 180 }}
        >
          <MenuItem value="">{t.inventario.filterAllMaterials}</MenuItem>
          {materialOptions.map((m) => (
            <MenuItem key={m.code} value={m.code}>{m.label}</MenuItem>
          ))}
        </TextField>
        <TextField
          select size="small" SelectProps={{ displayEmpty: true, inputProps: { 'aria-label': t.common.filterByWarehouse } }} value={warehouseId}
          onChange={(e) => onWarehouseChange(e.target.value)}
          sx={{ width: 180 }}
        >
          <MenuItem value="">{t.inventario.filterAllWarehouses}</MenuItem>
          {warehouseOptions.map((w) => (
            <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>
          ))}
        </TextField>
        <TextField
          select size="small" SelectProps={{ displayEmpty: true, inputProps: { 'aria-label': t.common.filterByStatus } }} value={status}
          onChange={(e) => onStatusChange(e.target.value as InventoryStatus | '')}
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

      {data.length === 0 ? (
        <Box sx={{ py: 6, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            {hasFilters
              ? t.inventario.emptySearch
              : t.inventario.emptyState}
          </Typography>
        </Box>
      ) : (
        <>
          <Table>
            <TableHead>
              <TableRow>
                {sortHeader('material', t.inventario.table.material)}
                {sortHeader('warehouse', t.inventario.table.warehouse)}
                {sortHeader('stock_kg', t.inventario.table.currentStock)}
                <TableCell align="right">{t.inventario.table.minimum}</TableCell>
                {sortHeader('price_per_kg', t.inventario.table.pricePerKg, 'right')}
                {sortHeader('total_value', t.inventario.table.totalValue, 'right')}
                {sortHeader('updated_at', t.inventario.table.updated)}
                {sortHeader('status', t.inventario.table.status)}
                {onEdit && (
                  <TableCell>
                    <Box component="span" sx={visuallyHidden}>{t.common.actions}</Box>
                  </TableCell>
                )}
              </TableRow>
            </TableHead>
            <TableBody>
              {data.map((item) => (
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
                      <Tooltip title={t.inventario.editTooltip}>
                        <IconButton size="small" aria-label={t.inventario.editTooltip} onClick={() => onEdit(item)}>
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
