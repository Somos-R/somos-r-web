import { useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Grid from '@mui/material/Grid'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Tooltip from '@mui/material/Tooltip'
import CircularProgress from '@mui/material/CircularProgress'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Table, TableHead, TableBody, TableRow, TableCell, TableContainer, TablePagination,
  Badge, Button, Input, Select, Dialog, DialogTitle, DialogContent, DialogActions, Card, CardContent,
} from '../../components/ui'
import { t, interpolate } from '../../lib/i18n'
import {
  transactionsService,
  type TransactionAPI,
  type TransactionStatus,
  type CreateVentaPayload,
} from '../../services/transactions'
import { inventoryService } from '../../services/inventory'

type MaterialCode = 'papel' | 'plastico' | 'vidrio' | 'metal' | 'carton' | 'electronico' | 'organico'

const MATERIAL_CONFIG: Record<MaterialCode, { label: string }> = {
  papel:       { label: t.inventario.materials.papel },
  plastico:    { label: t.inventario.materials.plastico },
  vidrio:      { label: t.inventario.materials.vidrio },
  metal:       { label: t.inventario.materials.metal },
  carton:      { label: t.inventario.materials.carton },
  electronico: { label: t.inventario.materials.electronico },
  organico:    { label: t.inventario.materials.organico },
}

const STATUS_CONFIG: Record<string, { label: string; color: 'warning' | 'success' | 'info' | 'error' | 'default' }> = {
  pendiente:  { label: t.transacciones.status.pendiente,  color: 'warning' },
  pagado:     { label: t.transacciones.status.pagado,     color: 'success' },
  cancelado:  { label: t.transacciones.status.cancelado,  color: 'error' },
  entregado:  { label: t.transacciones.status.entregado,  color: 'success' },
}

const MATERIAL_OPTIONS = Object.entries(MATERIAL_CONFIG).map(([v, c]) => ({ value: v, label: c.label }))

interface StatCardProps { label: string; value: string; sub: string; color?: string }
function StatCard({ label, value, sub, color = 'text.primary' }: StatCardProps) {
  return (
    <Card>
      <CardContent>
        <Typography variant="caption" color="text.secondary" textTransform="uppercase">{label}</Typography>
        <Typography variant="h5" fontWeight={700} color={color} mt={0.5}>{value}</Typography>
        <Typography variant="caption" color="text.secondary">{sub}</Typography>
      </CardContent>
    </Card>
  )
}

const EMPTY_VENTA: CreateVentaPayload = { material_code: 'papel', warehouse_id: '', kg: 0, precio_kg: 0 }

export default function Transactions() {
  const queryClient = useQueryClient()
  const [tab, setTab] = useState(0)
  const [showVentaModal, setShowVentaModal] = useState(false)
  const [ventaForm, setVentaForm] = useState<CreateVentaPayload>(EMPTY_VENTA)
  const [ventaError, setVentaError] = useState('')

  const [cancelTargetId, setCancelTargetId] = useState<string | null>(null)
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)

  const [purchasePage, setPurchasePage] = useState(0)
  const [salePage, setSalePage] = useState(0)

  const { data: comprasData, isLoading: comprasLoading } = useQuery({
    queryKey: ['transactions', 'compra'],
    queryFn: () => transactionsService.list({ type: 'compra', limit: 100 }),
  })

  const { data: ventasData, isLoading: ventasLoading } = useQuery({
    queryKey: ['transactions', 'venta'],
    queryFn: () => transactionsService.list({ type: 'venta', limit: 100 }),
  })

  const { data: stats } = useQuery({
    queryKey: ['transactions', 'stats'],
    queryFn: () => transactionsService.stats(),
  })

  const { data: warehouses = [] } = useQuery({
    queryKey: ['inventory', 'warehouses'],
    queryFn: () => inventoryService.warehouses(),
  })

  const warehouseOptions = warehouses.map((w) => ({ value: w.id, label: w.name }))

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['transactions'] })
    queryClient.invalidateQueries({ queryKey: ['inventory'] })
    queryClient.invalidateQueries({ queryKey: ['weighings'] })
  }

  const createVentaMutation = useMutation({
    mutationFn: (payload: CreateVentaPayload) => transactionsService.createVenta(payload),
    onSuccess: () => { invalidate(); setShowVentaModal(false); setVentaForm(EMPTY_VENTA) },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setVentaError(msg || 'Error al crear la venta. Intente de nuevo.')
    },
  })

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: TransactionStatus }) =>
      transactionsService.updateStatus(id, status),
    onSuccess: () => { invalidate(); setActionLoadingId(null); setCancelTargetId(null) },
    onError: () => setActionLoadingId(null),
  })

  const handleVentaSubmit = () => {
    if (!ventaForm.warehouse_id || !ventaForm.kg || !ventaForm.precio_kg) {
      setVentaError(t.transacciones.registerPurchase.validationError)
      return
    }
    createVentaMutation.mutate(ventaForm)
  }

  const handleUpdateStatus = (id: string, status: TransactionStatus) => {
    setActionLoadingId(id)
    updateStatusMutation.mutate({ id, status })
  }

  const handleConfirmCancel = () => {
    if (!cancelTargetId) return
    handleUpdateStatus(cancelTargetId, 'cancelado')
  }

  const compras = comprasData?.items ?? []
  const ventas = ventasData?.items ?? []

  const totalKgCompras = stats ? Number(stats.total_kg_compras) : compras.reduce((s, c) => s + Number(c.kg), 0)
  const totalValueCompras = stats ? Number(stats.total_value_compras) : compras.reduce((s, c) => s + Number(c.total_value), 0)
  const pendingCompras = compras.filter((c) => c.status === 'pendiente').length

  const totalKgVentas = stats ? Number(stats.total_kg_ventas) : ventas.reduce((s, v) => s + Number(v.kg), 0)
  const totalValueVentas = stats ? Number(stats.total_value_ventas) : ventas.reduce((s, v) => s + Number(v.total_value), 0)
  const pendingVentas = ventas.filter((v) => v.status === 'pendiente').length

  const renderPurchaseActions = (tx: TransactionAPI) => {
    if (tx.status === 'pendiente') {
      return (
        <Button size="small" variant="outlined" disabled={actionLoadingId === tx.id} onClick={() => handleUpdateStatus(tx.id, 'pagado')}>
          Marcar pagada
        </Button>
      )
    }
    return <Typography variant="caption" color="text.disabled">—</Typography>
  }

  const renderSaleActions = (tx: TransactionAPI) => {
    if (tx.status === 'pendiente') {
      return (
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button size="small" variant="outlined" disabled={actionLoadingId === tx.id} onClick={() => handleUpdateStatus(tx.id, 'entregado')}>
            Entregar
          </Button>
          <Button size="small" variant="destructive" disabled={actionLoadingId === tx.id} onClick={() => setCancelTargetId(tx.id)}>
            Cancelar
          </Button>
        </Box>
      )
    }
    return <Typography variant="caption" color="text.disabled">—</Typography>
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box>
        <Typography variant="h5" fontWeight={600}>{t.transacciones.title}</Typography>
        <Typography variant="body2" color="text.secondary" mt={0.5}>{t.transacciones.subtitle}</Typography>
      </Box>

      <Tabs value={tab} onChange={(_, v) => setTab(v)}>
        <Tab label={t.transacciones.tabs.purchases} />
        <Tab label={t.transacciones.tabs.sales} />
      </Tabs>

      {/* ───── COMPRAS ───── */}
      {tab === 0 && (
        <>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <StatCard label={t.transacciones.purchaseStats.totalPurchased} value={`${totalKgCompras.toLocaleString('es-CO')} kg`} sub={t.transacciones.purchaseStats.totalPurchasedSub} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <StatCard label={t.transacciones.purchaseStats.valuePaid} value={`$${totalValueCompras.toLocaleString('es-CO')}`} sub={t.transacciones.purchaseStats.valuePaidSub} color="error.main" />
            </Grid>
            <Grid item xs={12} sm={4}>
              <StatCard label={t.transacciones.purchaseStats.pendingPayment} value={String(pendingCompras)} sub={interpolate(t.transacciones.purchaseStats.pendingPaymentSub, { total: compras.length })} color="warning.main" />
            </Grid>
          </Grid>

          {comprasLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>{t.transacciones.table.date}</TableCell>
                    <TableCell>{t.transacciones.table.recycler}</TableCell>
                    <TableCell>{t.transacciones.table.material}</TableCell>
                    <TableCell align="right">{t.transacciones.table.kg}</TableCell>
                    <TableCell align="right">{t.transacciones.table.pricePerKg}</TableCell>
                    <TableCell align="right">{t.transacciones.table.total}</TableCell>
                    <TableCell>{t.transacciones.table.status}</TableCell>
                    <TableCell>Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {compras.slice(purchasePage * 8, purchasePage * 8 + 8).map((c) => (
                    <TableRow key={c.id} hover>
                      <TableCell sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>
                        {new Date(c.fecha).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 500 }}>{c.recycler?.full_name ?? '—'}</TableCell>
                      <TableCell>
                        <Badge label={c.material.label} color="default" />
                      </TableCell>
                      <TableCell align="right" sx={{ fontFamily: 'monospace' }}>{Number(c.kg).toLocaleString('es-CO')}</TableCell>
                      <TableCell align="right" sx={{ color: 'text.secondary' }}>${Number(c.precio_kg).toLocaleString('es-CO')}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>${Number(c.total_value).toLocaleString('es-CO')}</TableCell>
                      <TableCell><Badge label={STATUS_CONFIG[c.status]?.label ?? c.status} color={STATUS_CONFIG[c.status]?.color ?? 'default'} /></TableCell>
                      <TableCell>{renderPurchaseActions(c)}</TableCell>
                    </TableRow>
                  ))}
                  {compras.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                        No hay compras registradas. Se crean automáticamente al validar pesajes.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              <TablePagination count={compras.length} page={purchasePage} rowsPerPage={8} onPageChange={(_, p) => setPurchasePage(p)} />
            </TableContainer>
          )}
        </>
      )}

      {/* ───── VENTAS ───── */}
      {tab === 1 && (
        <>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <StatCard label={t.transacciones.saleStats.totalSold} value={`${totalKgVentas.toLocaleString('es-CO')} kg`} sub={t.transacciones.saleStats.totalSoldSub} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <StatCard label={t.transacciones.saleStats.valueCharged} value={`$${totalValueVentas.toLocaleString('es-CO')}`} sub={t.transacciones.saleStats.valueChargedSub} color="primary.main" />
            </Grid>
            <Grid item xs={12} sm={4}>
              <StatCard label={t.transacciones.saleStats.toInvoice} value={String(pendingVentas)} sub={interpolate(t.transacciones.saleStats.toInvoiceSub, { total: ventas.length })} color="warning.main" />
            </Grid>
          </Grid>

          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button onClick={() => {
              setVentaForm({ ...EMPTY_VENTA, warehouse_id: warehouses[0]?.id ?? '' })
              setVentaError('')
              setShowVentaModal(true)
            }}>{t.transacciones.newSale}</Button>
          </Box>

          {ventasLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>{t.transacciones.table.date}</TableCell>
                    <TableCell>{t.transacciones.table.company}</TableCell>
                    <TableCell>{t.transacciones.table.material}</TableCell>
                    <TableCell align="right">{t.transacciones.table.kg}</TableCell>
                    <TableCell align="right">{t.transacciones.table.pricePerKg}</TableCell>
                    <TableCell align="right">{t.transacciones.table.total}</TableCell>
                    <TableCell>{t.transacciones.table.status}</TableCell>
                    <TableCell>Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {ventas.slice(salePage * 8, salePage * 8 + 8).map((v) => (
                    <TableRow key={v.id} hover>
                      <TableCell sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>
                        {new Date(v.fecha).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 500 }}>
                        {v.buyer_name ? (
                          <Tooltip title={`NIT: ${v.buyer_nit ?? '—'}`}><span>{v.buyer_name}</span></Tooltip>
                        ) : '—'}
                      </TableCell>
                      <TableCell><Badge label={v.material.label} color="default" /></TableCell>
                      <TableCell align="right" sx={{ fontFamily: 'monospace' }}>{Number(v.kg).toLocaleString('es-CO')}</TableCell>
                      <TableCell align="right" sx={{ color: 'text.secondary' }}>${Number(v.precio_kg).toLocaleString('es-CO')}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>${Number(v.total_value).toLocaleString('es-CO')}</TableCell>
                      <TableCell><Badge label={STATUS_CONFIG[v.status]?.label ?? v.status} color={STATUS_CONFIG[v.status]?.color ?? 'default'} /></TableCell>
                      <TableCell>{renderSaleActions(v)}</TableCell>
                    </TableRow>
                  ))}
                  {ventas.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                        No hay ventas registradas aún.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              <TablePagination count={ventas.length} page={salePage} rowsPerPage={8} onPageChange={(_, p) => setSalePage(p)} />
            </TableContainer>
          )}
        </>
      )}

      {/* ── MODAL: Nueva venta ── */}
      <Dialog open={showVentaModal} onClose={() => setShowVentaModal(false)} maxWidth="sm">
        <DialogTitle showClose onClose={() => setShowVentaModal(false)}>{t.transacciones.registerSale.title}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, pt: 1 }}>
            <Select
              label={t.transacciones.registerPurchase.materialField}
              value={ventaForm.material_code}
              onChange={(e) => setVentaForm((p) => ({ ...p, material_code: e.target.value }))}
              options={MATERIAL_OPTIONS}
            />
            <Select
              label="Bodega"
              value={ventaForm.warehouse_id}
              onChange={(e) => setVentaForm((p) => ({ ...p, warehouse_id: e.target.value }))}
              options={warehouseOptions}
            />
            <Input
              label={t.transacciones.registerPurchase.quantityField}
              type="number"
              value={ventaForm.kg || ''}
              onChange={(e) => { setVentaForm((p) => ({ ...p, kg: Number(e.target.value) })); setVentaError('') }}
            />
            <Input
              label={t.transacciones.registerPurchase.priceField}
              type="number"
              value={ventaForm.precio_kg || ''}
              onChange={(e) => setVentaForm((p) => ({ ...p, precio_kg: Number(e.target.value) }))}
            />
            <Box sx={{ gridColumn: 'span 2' }}>
              <Input
                label={t.transacciones.registerSale.companyField}
                placeholder={t.transacciones.registerSale.companyPlaceholder}
                value={ventaForm.buyer_name ?? ''}
                onChange={(e) => setVentaForm((p) => ({ ...p, buyer_name: e.target.value }))}
              />
            </Box>
          </Box>
          {ventaError && <Typography variant="caption" color="error" mt={1} display="block">{ventaError}</Typography>}
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={() => setShowVentaModal(false)}>{t.common.cancel}</Button>
          <Button disabled={createVentaMutation.isPending} onClick={handleVentaSubmit}>{t.transacciones.registerSale.submitLabel}</Button>
        </DialogActions>
      </Dialog>

      {/* ── CONFIRM: Cancelar venta ── */}
      <Dialog open={!!cancelTargetId} onClose={() => setCancelTargetId(null)} maxWidth="xs">
        <DialogTitle>Cancelar venta</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Se cancelará esta venta y se restaurará el stock descontado del inventario.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={() => setCancelTargetId(null)}>Volver</Button>
          <Button variant="destructive" disabled={updateStatusMutation.isPending} onClick={handleConfirmCancel}>Confirmar cancelación</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
