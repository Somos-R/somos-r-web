import { useState } from 'react'
import Box from '@mui/material/Box'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'
import CircularProgress from '@mui/material/CircularProgress'
import MuiTextField from '@mui/material/TextField'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import InventoryTable, { type InventoryItem } from './InventoryTable'
import { Card, CardContent, Dialog, DialogTitle, DialogContent, DialogActions, Button, Snackbar } from '../../components/ui'
import { t, interpolate } from '../../lib/i18n'
import { inventoryService, type InventoryItemAPI } from '../../services/inventory'

function toViewModel(item: InventoryItemAPI): InventoryItem {
  return {
    id: item.id,
    material: item.material_code as InventoryItem['material'],
    bodega: item.warehouse.name,
    stock_kg: Number(item.stock_kg),
    stock_min_kg: Number(item.stock_min_kg),
    precio_kg: Number(item.precio_kg),
    fecha_actualizacion: item.fecha_actualizacion,
    estado: item.estado,
  }
}

interface StatCardProps { label: string; value: string; sub: string; color?: string }
function StatCard({ label, value, sub, color = 'text.primary' }: StatCardProps) {
  return (
    <Card>
      <CardContent>
        <Typography variant="caption" color="text.secondary" textTransform="uppercase" letterSpacing={0.5}>{label}</Typography>
        <Typography variant="h5" fontWeight={700} color={color} mt={0.5}>{value}</Typography>
        <Typography variant="caption" color="text.secondary">{sub}</Typography>
      </CardContent>
    </Card>
  )
}

export default function Inventory() {
  const queryClient = useQueryClient()

  const [editTarget, setEditTarget] = useState<InventoryItem | null>(null)
  const [editMinKg, setEditMinKg] = useState('')
  const [editPrecioKg, setEditPrecioKg] = useState('')
  const [editError, setEditError] = useState('')
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false, message: '', severity: 'success',
  })

  const { data: listData, isLoading: listLoading } = useQuery({
    queryKey: ['inventory'],
    queryFn: () => inventoryService.list(),
  })

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['inventory', 'stats'],
    queryFn: () => inventoryService.stats(),
  })

  const editMutation = useMutation({
    mutationFn: ({ id, stock_min_kg, precio_kg }: { id: string; stock_min_kg: number; precio_kg: number }) =>
      inventoryService.update(id, { stock_min_kg, precio_kg }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      setEditTarget(null)
      setSnackbar({ open: true, message: 'Ítem actualizado correctamente', severity: 'success' })
    },
    onError: () => {
      setEditError('Error al actualizar. Intente de nuevo.')
    },
  })

  const handleOpenEdit = (item: InventoryItem) => {
    setEditTarget(item)
    setEditMinKg(String(item.stock_min_kg))
    setEditPrecioKg(String(item.precio_kg))
    setEditError('')
  }

  const handleEditSubmit = () => {
    const min = Number(editMinKg)
    const precio = Number(editPrecioKg)
    if (!min || min <= 0 || !precio || precio <= 0) {
      setEditError('Los valores deben ser mayores a cero.')
      return
    }
    if (!editTarget) return
    editMutation.mutate({ id: editTarget.id, stock_min_kg: min, precio_kg: precio })
  }

  const items = (listData?.items ?? []).map(toViewModel)
  const isLoading = listLoading || statsLoading

  const totalKg = stats ? Number(stats.total_stock_kg) : 0
  const totalValue = stats ? Number(stats.total_value) : 0
  const available = stats?.available_count ?? 0
  const alerts = stats ? (stats.low_stock_count + stats.out_of_stock_count) : 0
  const total = listData?.total ?? 0

  if (isLoading && items.length === 0) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box>
        <Typography variant="h5" fontWeight={600}>{t.inventario.title}</Typography>
        <Typography variant="body2" color="text.secondary" mt={0.5}>{t.inventario.subtitle}</Typography>
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

      <InventoryTable data={items} isLoading={listLoading} onEdit={handleOpenEdit} />

      {/* Modal editar ítem */}
      <Dialog open={!!editTarget} onClose={() => setEditTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle showClose onClose={() => setEditTarget(null)}>
          Editar ítem de inventario
        </DialogTitle>
        <DialogContent>
          {editTarget && (
            <Box sx={{ pt: 1 }}>
              <Typography variant="body2" color="text.secondary" mb={2}>
                <strong>{t.inventario.materials[editTarget.material as keyof typeof t.inventario.materials]}</strong> — {editTarget.bodega}
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <MuiTextField
                  fullWidth size="small"
                  label="Stock mínimo (kg)"
                  type="number"
                  value={editMinKg}
                  onChange={(e) => { setEditMinKg(e.target.value); setEditError('') }}
                  inputProps={{ min: 1, step: 1 }}
                  helperText="Umbral para alerta de bajo stock"
                />
                <MuiTextField
                  fullWidth size="small"
                  label="Precio por kg ($)"
                  type="number"
                  value={editPrecioKg}
                  onChange={(e) => { setEditPrecioKg(e.target.value); setEditError('') }}
                  inputProps={{ min: 1, step: 10 }}
                  helperText="Precio de referencia para compras y ventas"
                />
                {editError && (
                  <Typography variant="caption" color="error">{editError}</Typography>
                )}
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={() => setEditTarget(null)}>Cancelar</Button>
          <Button disabled={editMutation.isPending} onClick={handleEditSubmit}>
            {editMutation.isPending ? 'Guardando…' : 'Guardar cambios'}
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
