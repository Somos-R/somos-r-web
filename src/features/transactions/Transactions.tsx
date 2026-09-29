import { useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Grid from '@mui/material/Grid'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Tooltip from '@mui/material/Tooltip'
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import {
  Table, TableHead, TableBody, TableRow, TableCell, TableContainer, TablePagination,
  Badge, Button, Input, Select, Dialog, DialogTitle, DialogContent, DialogActions, Card, CardContent,
  Loader,
} from '../../components/ui'
import { t, interpolate } from '../../lib/i18n'
import {
  transactionsService,
  type TransactionAPI,
  type TransactionStatus,
  type CreateSalePayload,
} from '../../services/transactions'
import { inventoryService } from '../../services/inventory'
import { getApiErrorMessage } from '../../lib/apiError'
import { useRoles } from '../../hooks/useRoles'
import { PAGE_SIZE_OPTIONS, usePagination } from '../../lib/pagination'

const STATUS_CONFIG: Record<string, { label: string; color: 'warning' | 'success' | 'info' | 'error' | 'default' }> = {
  pending:   { label: t.transacciones.status.pending,   color: 'warning' },
  paid:      { label: t.transacciones.status.paid,      color: 'success' },
  cancelled: { label: t.transacciones.status.cancelled, color: 'error' },
  delivered: { label: t.transacciones.status.delivered, color: 'success' },
}

interface StatCardProps { label: string; value: string; sub: string; color?: string }
function StatCard({ label, value, sub, color = 'text.primary' }: StatCardProps) {
  return (
    <Card>
      <CardContent>
        <Typography variant="caption" color="text.secondary" textTransform="uppercase">{label}</Typography>
        <Typography variant="h5" component="p" fontWeight={700} color={color} mt={0.5}>{value}</Typography>
        <Typography variant="caption" color="text.secondary">{sub}</Typography>
      </CardContent>
    </Card>
  )
}

const EMPTY_SALE: CreateSalePayload = { material_code: '', warehouse_id: '', kg: 0, price_per_kg: 0 }

export default function Transactions() {
  const { can } = useRoles()
  const queryClient = useQueryClient()
  const [tab, setTab] = useState(0)
  const [showSaleModal, setShowSaleModal] = useState(false)
  const [saleForm, setSaleForm] = useState<CreateSalePayload>(EMPTY_SALE)
  const [saleError, setSaleError] = useState('')

  const [cancelTargetId, setCancelTargetId] = useState<string | null>(null)
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)

  // Each tab pages on its own: the server sends one page at a time and the total for that type.
  const purchasePagination = usePagination()
  const salePagination = usePagination()

  const { data: purchasesData, isLoading: purchasesLoading, isFetching: purchasesFetching } = useQuery({
    queryKey: ['transactions', 'list', 'purchase', { page: purchasePagination.page, rowsPerPage: purchasePagination.rowsPerPage }],
    queryFn: ({ signal }) =>
      transactionsService.list({ type: 'purchase', limit: purchasePagination.limit, offset: purchasePagination.offset }, { signal }),
    placeholderData: keepPreviousData,
  })
  purchasePagination.clamp(purchasesData?.total)

  const { data: salesData, isLoading: salesLoading, isFetching: salesFetching } = useQuery({
    queryKey: ['transactions', 'list', 'sale', { page: salePagination.page, rowsPerPage: salePagination.rowsPerPage }],
    queryFn: ({ signal }) =>
      transactionsService.list({ type: 'sale', limit: salePagination.limit, offset: salePagination.offset }, { signal }),
    placeholderData: keepPreviousData,
  })
  salePagination.clamp(salesData?.total)

  // "How many are pending" must be a count over ALL rows, not over the page on screen.
  const { data: pendingPurchasesData } = useQuery({
    queryKey: ['transactions', 'count', 'purchase', 'pending'],
    queryFn: ({ signal }) => transactionsService.list({ type: 'purchase', status: 'pending', limit: 1 }, { signal }),
  })
  const { data: pendingSalesData } = useQuery({
    queryKey: ['transactions', 'count', 'sale', 'pending'],
    queryFn: ({ signal }) => transactionsService.list({ type: 'sale', status: 'pending', limit: 1 }, { signal }),
  })

  const { data: stats } = useQuery({
    queryKey: ['transactions', 'stats'],
    queryFn: ({ signal }) => transactionsService.stats({ signal }),
  })

  const { data: warehouses = [] } = useQuery({
    queryKey: ['inventory', 'warehouses'],
    queryFn: ({ signal }) => inventoryService.warehouses({ signal }),
  })

  const { data: materials = [] } = useQuery({
    queryKey: ['inventory', 'materials'],
    queryFn: ({ signal }) => inventoryService.materials({ signal }),
  })

  const warehouseOptions = warehouses.map((w) => ({ value: w.id, label: w.name }))
  const materialOptions = materials.map((m) => ({ value: m.code, label: m.label }))

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['transactions'] })
    queryClient.invalidateQueries({ queryKey: ['inventory'] })
    queryClient.invalidateQueries({ queryKey: ['weighings'] })
  }

  const createSaleMutation = useMutation({
    // Shown inline in the sale modal; a failed sale usually means the stock changed.
    meta: { silent: true, refreshOnError: [['inventory']] },
    mutationFn: (payload: CreateSalePayload) => transactionsService.createSale(payload),
    onSuccess: () => { invalidate(); setShowSaleModal(false); setSaleForm(EMPTY_SALE) },
    onError: (err: unknown) => {
      setSaleError(getApiErrorMessage(err, t.transacciones.createSaleError))
    },
  })

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: TransactionStatus }) =>
      transactionsService.updateStatus(id, status),
    meta: { refreshOnError: [['transactions'], ['inventory'], ['weighings']] },
    onSuccess: invalidate,
    // Also closes the cancel dialog so the error notification isn't hidden behind it.
    onSettled: () => { setActionLoadingId(null); setCancelTargetId(null) },
  })

  const handleSaleSubmit = () => {
    if (!saleForm.warehouse_id || !saleForm.kg || !saleForm.price_per_kg) {
      setSaleError(t.transacciones.registerPurchase.validationError)
      return
    }
    createSaleMutation.mutate(saleForm)
  }

  const handleUpdateStatus = (id: string, status: TransactionStatus) => {
    setActionLoadingId(id)
    updateStatusMutation.mutate({ id, status })
  }

  const handleConfirmCancel = () => {
    if (!cancelTargetId) return
    handleUpdateStatus(cancelTargetId, 'cancelled')
  }

  const purchases = purchasesData?.items ?? []
  const sales = salesData?.items ?? []

  // Totals come from the server's stats: summing the rows loaded would only cover one page.
  const totalKgPurchases = Number(stats?.total_kg_purchases ?? 0)
  const totalValuePurchases = Number(stats?.total_value_purchases ?? 0)
  const pendingPurchases = pendingPurchasesData?.total ?? 0
  const purchasesTotal = purchasesData?.total ?? 0

  const totalKgSales = Number(stats?.total_kg_sales ?? 0)
  const totalValueSales = Number(stats?.total_value_sales ?? 0)
  const pendingSales = pendingSalesData?.total ?? 0
  const salesTotal = salesData?.total ?? 0

  const renderPurchaseActions = (tx: TransactionAPI) => {
    if (tx.status === 'pending' && can('transactions.pay')) {
      return (
        <Button size="small" variant="outlined" disabled={actionLoadingId === tx.id} onClick={() => handleUpdateStatus(tx.id, 'paid')}>
          {t.transacciones.actions.markPaid}
        </Button>
      )
    }
    return <Typography variant="caption" color="text.disabled">—</Typography>
  }

  const renderSaleActions = (tx: TransactionAPI) => {
    if (tx.status === 'pending' && can('transactions.manage')) {
      return (
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button size="small" variant="outlined" disabled={actionLoadingId === tx.id} onClick={() => handleUpdateStatus(tx.id, 'delivered')}>
            {t.transacciones.actions.deliver}
          </Button>
          <Button size="small" variant="destructive" disabled={actionLoadingId === tx.id} onClick={() => setCancelTargetId(tx.id)}>
            {t.transacciones.actions.cancel}
          </Button>
        </Box>
      )
    }
    return <Typography variant="caption" color="text.disabled">—</Typography>
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box>
        <Typography variant="h5" component="h1" fontWeight={600}>{t.transacciones.title}</Typography>
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
              <StatCard label={t.transacciones.purchaseStats.totalPurchased} value={`${totalKgPurchases.toLocaleString('es-CO')} kg`} sub={t.transacciones.purchaseStats.totalPurchasedSub} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <StatCard label={t.transacciones.purchaseStats.valuePaid} value={`$${totalValuePurchases.toLocaleString('es-CO')}`} sub={t.transacciones.purchaseStats.valuePaidSub} color="error.main" />
            </Grid>
            <Grid item xs={12} sm={4}>
              <StatCard label={t.transacciones.purchaseStats.pendingPayment} value={String(pendingPurchases)} sub={interpolate(t.transacciones.purchaseStats.pendingPaymentSub, { total: purchasesTotal })} color="warning.main" />
            </Grid>
          </Grid>

          {purchasesLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><Loader /></Box>
          ) : (
            <TableContainer sx={{ opacity: purchasesFetching ? 0.6 : 1, transition: 'opacity 120ms' }}>
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
                    <TableCell>{t.common.actions}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {purchases.map((c) => (
                    <TableRow key={c.id} hover>
                      <TableCell sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>
                        {new Date(c.occurred_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 500 }}>{c.recycler?.full_name ?? '—'}</TableCell>
                      <TableCell>
                        <Badge label={c.material.label} color="default" />
                      </TableCell>
                      <TableCell align="right" sx={{ fontFamily: 'monospace' }}>{Number(c.kg).toLocaleString('es-CO')}</TableCell>
                      <TableCell align="right" sx={{ color: 'text.secondary' }}>${Number(c.price_per_kg).toLocaleString('es-CO')}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>${Number(c.total_value).toLocaleString('es-CO')}</TableCell>
                      <TableCell><Badge label={STATUS_CONFIG[c.status]?.label ?? c.status} color={STATUS_CONFIG[c.status]?.color ?? 'default'} /></TableCell>
                      <TableCell>{renderPurchaseActions(c)}</TableCell>
                    </TableRow>
                  ))}
                  {purchases.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                        {t.transacciones.noPurchases}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              <TablePagination
                count={purchasesTotal}
                page={purchasePagination.page}
                rowsPerPage={purchasePagination.rowsPerPage}
                rowsPerPageOptions={PAGE_SIZE_OPTIONS}
                onPageChange={(_, p) => purchasePagination.setPage(p)}
                onRowsPerPageChange={(e) => purchasePagination.setRowsPerPage(+e.target.value)}
              />
            </TableContainer>
          )}
        </>
      )}

      {/* ───── VENTAS ───── */}
      {tab === 1 && (
        <>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <StatCard label={t.transacciones.saleStats.totalSold} value={`${totalKgSales.toLocaleString('es-CO')} kg`} sub={t.transacciones.saleStats.totalSoldSub} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <StatCard label={t.transacciones.saleStats.valueCharged} value={`$${totalValueSales.toLocaleString('es-CO')}`} sub={t.transacciones.saleStats.valueChargedSub} color="primary.main" />
            </Grid>
            <Grid item xs={12} sm={4}>
              <StatCard label={t.transacciones.saleStats.toInvoice} value={String(pendingSales)} sub={interpolate(t.transacciones.saleStats.toInvoiceSub, { total: salesTotal })} color="warning.main" />
            </Grid>
          </Grid>

          {can('transactions.create') && (
            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button onClick={() => {
                setSaleForm({ ...EMPTY_SALE, material_code: materials[0]?.code ?? '', warehouse_id: warehouses[0]?.id ?? '' })
                setSaleError('')
                setShowSaleModal(true)
              }}>{t.transacciones.newSale}</Button>
            </Box>
          )}

          {salesLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><Loader /></Box>
          ) : (
            <TableContainer sx={{ opacity: salesFetching ? 0.6 : 1, transition: 'opacity 120ms' }}>
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
                    <TableCell>{t.common.actions}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sales.map((v) => (
                    <TableRow key={v.id} hover>
                      <TableCell sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>
                        {new Date(v.occurred_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 500 }}>
                        {v.buyer_name ? (
                          <Tooltip title={interpolate(t.transacciones.buyerNit, { nit: v.buyer_nit ?? '—' })}><span>{v.buyer_name}</span></Tooltip>
                        ) : '—'}
                      </TableCell>
                      <TableCell><Badge label={v.material.label} color="default" /></TableCell>
                      <TableCell align="right" sx={{ fontFamily: 'monospace' }}>{Number(v.kg).toLocaleString('es-CO')}</TableCell>
                      <TableCell align="right" sx={{ color: 'text.secondary' }}>${Number(v.price_per_kg).toLocaleString('es-CO')}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>${Number(v.total_value).toLocaleString('es-CO')}</TableCell>
                      <TableCell><Badge label={STATUS_CONFIG[v.status]?.label ?? v.status} color={STATUS_CONFIG[v.status]?.color ?? 'default'} /></TableCell>
                      <TableCell>{renderSaleActions(v)}</TableCell>
                    </TableRow>
                  ))}
                  {sales.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                        {t.transacciones.noSales}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              <TablePagination
                count={salesTotal}
                page={salePagination.page}
                rowsPerPage={salePagination.rowsPerPage}
                rowsPerPageOptions={PAGE_SIZE_OPTIONS}
                onPageChange={(_, p) => salePagination.setPage(p)}
                onRowsPerPageChange={(e) => salePagination.setRowsPerPage(+e.target.value)}
              />
            </TableContainer>
          )}
        </>
      )}

      {/* ── MODAL: Nueva venta ── */}
      <Dialog open={showSaleModal} onClose={() => setShowSaleModal(false)} maxWidth="sm">
        <DialogTitle showClose onClose={() => setShowSaleModal(false)}>{t.transacciones.registerSale.title}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, pt: 1 }}>
            <Select
              label={t.transacciones.registerPurchase.materialField}
              value={saleForm.material_code}
              onChange={(e) => setSaleForm((p) => ({ ...p, material_code: e.target.value }))}
              options={materialOptions}
            />
            <Select
              label={t.common.warehouse}
              value={saleForm.warehouse_id}
              onChange={(e) => setSaleForm((p) => ({ ...p, warehouse_id: e.target.value }))}
              options={warehouseOptions}
            />
            <Input
              label={t.transacciones.registerPurchase.quantityField}
              type="number"
              value={saleForm.kg || ''}
              onChange={(e) => { setSaleForm((p) => ({ ...p, kg: Number(e.target.value) })); setSaleError('') }}
            />
            <Input
              label={t.transacciones.registerPurchase.priceField}
              type="number"
              value={saleForm.price_per_kg || ''}
              onChange={(e) => setSaleForm((p) => ({ ...p, price_per_kg: Number(e.target.value) }))}
            />
            <Box sx={{ gridColumn: 'span 2' }}>
              <Input
                label={t.transacciones.registerSale.companyField}
                placeholder={t.transacciones.registerSale.companyPlaceholder}
                value={saleForm.buyer_name ?? ''}
                onChange={(e) => setSaleForm((p) => ({ ...p, buyer_name: e.target.value }))}
              />
            </Box>
          </Box>
          {saleError && <Typography variant="caption" color="error" mt={1} display="block">{saleError}</Typography>}
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={() => setShowSaleModal(false)}>{t.common.cancel}</Button>
          <Button disabled={createSaleMutation.isPending} onClick={handleSaleSubmit}>{t.transacciones.registerSale.submitLabel}</Button>
        </DialogActions>
      </Dialog>

      {/* ── CONFIRM: Cancelar venta ── */}
      <Dialog open={!!cancelTargetId} onClose={() => setCancelTargetId(null)} maxWidth="xs">
        <DialogTitle>{t.transacciones.cancelSale.title}</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            {t.transacciones.cancelSale.message}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={() => setCancelTargetId(null)}>{t.common.back}</Button>
          <Button variant="destructive" disabled={updateStatusMutation.isPending} onClick={handleConfirmCancel}>{t.transacciones.cancelSale.confirm}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
