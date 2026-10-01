import { useState } from 'react'
import Box from '@mui/material/Box'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'
import MuiTextField from '@mui/material/TextField'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import InventoryTable, { type InventoryItem, type InventorySort } from './InventoryTable'
import { Card, CardContent, Dialog, DialogTitle, DialogContent, DialogActions, Button, Snackbar, Loader } from '../../components/ui'
import { t, interpolate } from '../../lib/i18n'
import { inventoryQueries } from '../../queries/inventory'
import { catalogQueries } from '../../queries/catalogs'
import { AFFECTED, invalidateAffected } from '../../queries/invalidation'
import { inventoryService, type InventoryItemAPI, type InventorySortColumn, type InventoryStatus } from '../../services/inventory'
import { csvFileName, saveBlob } from '../../lib/download'
import { nextSort } from '../../lib/sorting'
import { toPaginationProps, usePagination } from '../../lib/pagination'
import { useRoles } from '../../hooks/useRoles'

function toViewModel(item: InventoryItemAPI): InventoryItem {
  return {
    id: item.id,
    material: { code: item.material_code, label: item.material.label },
    bodega: item.warehouse.name,
    stock_kg: Number(item.stock_kg),
    stock_min_kg: Number(item.stock_min_kg),
    price_per_kg: Number(item.price_per_kg),
    updated_at: item.updated_at,
    status: item.status,
  }
}

interface StatCardProps { label: string; value: string; sub: string; color?: string }
function StatCard({ label, value, sub, color = 'text.primary' }: StatCardProps) {
  return (
    <Card>
      <CardContent>
        <Typography variant="caption" color="text.secondary" textTransform="uppercase" letterSpacing={0.5}>{label}</Typography>
        <Typography variant="h5" component="p" fontWeight={700} color={color} mt={0.5}>{value}</Typography>
        <Typography variant="caption" color="text.secondary">{sub}</Typography>
      </CardContent>
    </Card>
  )
}

export default function Inventory() {
  const { can } = useRoles()
  const queryClient = useQueryClient()

  const [editTarget, setEditTarget] = useState<InventoryItem | null>(null)
  const [editMinKg, setEditMinKg] = useState('')
  const [editPricePerKg, setEditPricePerKg] = useState('')
  const [editError, setEditError] = useState('')
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false, message: '', severity: 'success',
  })

  const [status, setStatus] = useState<InventoryStatus | ''>('')
  const [materialCode, setMaterialCode] = useState('')
  const [warehouseId, setWarehouseId] = useState('')
  // A to Z by material, as the server does when nothing is asked.
  const [sort, setSort] = useState<InventorySort>({ column: 'material', direction: 'asc' })
  const pagination = usePagination()

  const handleSortChange = (column: InventorySortColumn) => {
    setSort((current) => nextSort(current, column, 'updated_at'))
    pagination.resetPage()
  }

  // The server filters and paginates; the previous page stays on screen while the next loads.
  const { data: listData, isLoading: listLoading, isFetching: listFetching } = useQuery(
    inventoryQueries.list({
      status, materialCode, warehouseId, sort: sort.column, order: sort.direction,
      page: pagination.page, rowsPerPage: pagination.rowsPerPage,
    }),
  )
  pagination.clamp(listData?.total)

  // Filter options come from the catalogs, not from whatever happens to be on the current page.
  const { data: materials = [] } = useQuery(catalogQueries.materials())
  const { data: warehouses = [] } = useQuery(catalogQueries.warehouses())

  const { data: stats, isLoading: statsLoading } = useQuery(inventoryQueries.stats())

  const editMutation = useMutation({
    meta: { silent: true },
    mutationFn: ({ id, stock_min_kg, price_per_kg }: { id: string; stock_min_kg: number; price_per_kg: number }) =>
      inventoryService.update(id, { stock_min_kg, price_per_kg }),
    onSuccess: () => {
      invalidateAffected(queryClient, AFFECTED.inventoryEdited)
      setEditTarget(null)
      setSnackbar({ open: true, message: t.inventario.updated, severity: 'success' })
    },
    onError: () => {
      setEditError(t.inventario.updateError)
    },
  })

  // The file holds every inventory row matching the filters and order on screen, not just the visible page.
  // A failure (too many rows) is reported by the global handler.
  const exportMutation = useMutation({
    mutationFn: () =>
      inventoryService.exportCsv({
        status: status || undefined,
        material_code: materialCode || undefined,
        warehouse_id: warehouseId || undefined,
        sort: sort.column,
        order: sort.direction,
      }),
    onSuccess: (file) => saveBlob(file, csvFileName(t.inventario.exportFile)),
  })

  const handleOpenEdit = (item: InventoryItem) => {
    setEditTarget(item)
    setEditMinKg(String(item.stock_min_kg))
    setEditPricePerKg(String(item.price_per_kg))
    setEditError('')
  }

  const handleEditSubmit = () => {
    const min = Number(editMinKg)
    const price = Number(editPricePerKg)
    if (!min || min <= 0 || !price || price <= 0) {
      setEditError(t.inventario.positiveValues)
      return
    }
    if (!editTarget) return
    editMutation.mutate({ id: editTarget.id, stock_min_kg: min, price_per_kg: price })
  }

  const items = (listData?.items ?? []).map(toViewModel)
  const isLoading = listLoading || statsLoading

  const totalKg = stats ? Number(stats.total_stock_kg) : 0
  const totalValue = stats ? Number(stats.total_value) : 0
  const available = stats?.available_count ?? 0
  const alerts = stats ? (stats.low_stock_count + stats.out_of_stock_count) : 0
  const total = listData?.total ?? 0

  if (isLoading && items.length === 0) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><Loader /></Box>
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="h5" component="h1" fontWeight={600}>{t.inventario.title}</Typography>
          <Typography variant="body2" color="text.secondary" mt={0.5}>{t.inventario.subtitle}</Typography>
        </Box>
        {can('inventory.view') && (
          <Button variant="outlined" disabled={exportMutation.isPending} onClick={() => exportMutation.mutate()}>
            {exportMutation.isPending ? t.common.exportCsv.busy : t.common.exportCsv.button}
          </Button>
        )}
      </Box>

      <Grid container spacing={2}>
        <Grid item xs={6} sm={3}>
          <StatCard label={t.inventario.stats.totalStock} value={`${totalKg.toLocaleString('es-CO')} kg`} sub={t.inventario.stats.totalStockSub} />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard label={t.inventario.stats.inventoryValue} value={`$${totalValue.toLocaleString('es-CO')}`} sub={t.inventario.stats.inventoryValueSub} color="success.dark" />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard label={t.inventario.stats.available} value={String(available)} sub={interpolate(t.inventario.stats.availableSub, { total })} color="success.main" />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard label={t.inventario.stats.alerts} value={String(alerts)} sub={t.inventario.stats.alertsSub} color={alerts > 0 ? 'error.main' : 'text.disabled'} />
        </Grid>
      </Grid>

      <InventoryTable
        data={items}
        isLoading={listLoading}
        isFetching={listFetching}
        status={status}
        onStatusChange={(next) => { setStatus(next); pagination.resetPage() }}
        materialCode={materialCode}
        onMaterialChange={(code) => { setMaterialCode(code); pagination.resetPage() }}
        materialOptions={materials}
        warehouseId={warehouseId}
        onWarehouseChange={(id) => { setWarehouseId(id); pagination.resetPage() }}
        warehouseOptions={warehouses}
        sort={sort}
        onSortChange={handleSortChange}
        pagination={toPaginationProps(pagination, listData?.total ?? 0)}
        onEdit={can('inventory.edit') ? handleOpenEdit : undefined}
      />

      {/* Modal editar ítem */}
      <Dialog open={!!editTarget} onClose={() => setEditTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle showClose onClose={() => setEditTarget(null)}>
          {t.inventario.editItem}
        </DialogTitle>
        <DialogContent>
          {editTarget && (
            <Box sx={{ pt: 1 }}>
              <Typography variant="body2" color="text.secondary" mb={2}>
                <strong>{editTarget.material.label}</strong> — {editTarget.bodega}
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <MuiTextField
                  fullWidth size="small"
                  label={t.inventario.minStockLabel}
                  type="number"
                  value={editMinKg}
                  onChange={(e) => { setEditMinKg(e.target.value); setEditError('') }}
                  inputProps={{ min: 1, step: 1 }}
                  helperText={t.inventario.minStockHelp}
                />
                <MuiTextField
                  fullWidth size="small"
                  label={t.inventario.priceLabel}
                  type="number"
                  value={editPricePerKg}
                  onChange={(e) => { setEditPricePerKg(e.target.value); setEditError('') }}
                  inputProps={{ min: 1, step: 10 }}
                  helperText={t.inventario.priceHelp}
                />
                {editError && (
                  <Typography variant="caption" color="error">{editError}</Typography>
                )}
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={() => setEditTarget(null)}>{t.common.cancel}</Button>
          <Button disabled={editMutation.isPending} onClick={handleEditSubmit}>
            {editMutation.isPending ? t.common.saving : t.common.saveChanges}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        message={snackbar.message}
        severity={snackbar.severity}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
      />
    </Box>
  )
}
