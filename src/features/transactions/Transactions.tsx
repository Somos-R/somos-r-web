import { useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Grid from '@mui/material/Grid'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import {
  Table, TableHead, TableBody, TableRow, TableCell, TableContainer, TablePagination,
  Badge, Button, Input, Select, Dialog, DialogTitle, DialogContent, DialogActions, Card, CardContent,
} from '../../components/ui'
import { t, interpolate } from '../../lib/i18n'

type MaterialType = 'papel' | 'plastico' | 'vidrio' | 'metal' | 'carton' | 'electronico' | 'organico'

const MATERIAL_CONFIG: Record<MaterialType, { label: string }> = {
  papel: { label: t.inventario.materials.papel },
  plastico: { label: t.inventario.materials.plastico },
  vidrio: { label: t.inventario.materials.vidrio },
  metal: { label: t.inventario.materials.metal },
  carton: { label: t.inventario.materials.carton },
  electronico: { label: t.inventario.materials.electronico },
  organico: { label: t.inventario.materials.organico },
}

const PURCHASE_PRICE_REF: Record<MaterialType, number> = {
  papel: 350, plastico: 500, vidrio: 150, metal: 1200, carton: 280, electronico: 2500, organico: 80,
}

const SALE_PRICE_REF: Record<MaterialType, number> = {
  papel: 480, plastico: 700, vidrio: 220, metal: 1600, carton: 380, electronico: 3500, organico: 110,
}

interface Purchase {
  id: string; fecha: string; reciclador: string; material: MaterialType
  kg: number; precio_kg: number; estado: 'pendiente' | 'pagado' | 'cancelado'
}

interface Sale {
  id: string; fecha: string; empresa: string; material: MaterialType
  kg: number; precio_kg: number; precio_compra_ref: number
  estado: 'pendiente' | 'facturado' | 'entregado' | 'cancelado'
}

const MOCK_PURCHASES: Purchase[] = [
  { id: '1', fecha: '2026-05-06', reciclador: 'Carlos Mendez', material: 'papel', kg: 80, precio_kg: 350, estado: 'pagado' },
  { id: '2', fecha: '2026-05-06', reciclador: 'María López', material: 'plastico', kg: 45, precio_kg: 500, estado: 'pagado' },
  { id: '3', fecha: '2026-05-05', reciclador: 'Juan Torres', material: 'metal', kg: 30, precio_kg: 1200, estado: 'pendiente' },
  { id: '4', fecha: '2026-05-05', reciclador: 'Ana Gómez', material: 'carton', kg: 120, precio_kg: 280, estado: 'pagado' },
]

const MOCK_SALES: Sale[] = [
  { id: '1', fecha: '2026-05-07', empresa: 'Gestora Ambiental S.A.', material: 'papel', kg: 200, precio_kg: 480, precio_compra_ref: 350, estado: 'facturado' },
  { id: '2', fecha: '2026-05-06', empresa: 'RecicloTech Colombia', material: 'plastico', kg: 120, precio_kg: 700, precio_compra_ref: 500, estado: 'entregado' },
  { id: '3', fecha: '2026-05-05', empresa: 'EcoMateriales Ltda.', material: 'metal', kg: 50, precio_kg: 1600, precio_compra_ref: 1200, estado: 'facturado' },
]

const MATERIAL_OPTIONS = Object.entries(MATERIAL_CONFIG).map(([v, c]) => ({ value: v, label: c.label }))
const PURCHASE_STATUS_OPTIONS = [
  { value: 'pendiente', label: t.transacciones.status.pendiente },
  { value: 'pagado', label: t.transacciones.status.pagado },
  { value: 'cancelado', label: t.transacciones.status.cancelado },
]
const SALE_STATUS_OPTIONS = [
  { value: 'pendiente', label: t.transacciones.status.pendiente },
  { value: 'facturado', label: t.transacciones.status.facturado },
  { value: 'entregado', label: t.transacciones.status.entregado },
  { value: 'cancelado', label: t.transacciones.status.cancelado },
]

const STATUS_LABEL: Record<string, string> = {
  pendiente: t.transacciones.status.pendiente,
  pagado: t.transacciones.status.pagado,
  cancelado: t.transacciones.status.cancelado,
  facturado: t.transacciones.status.facturado,
  entregado: t.transacciones.status.entregado,
}

const today = new Date().toISOString().split('T')[0]

type PurchaseStatus = Purchase['estado']
type SaleStatus = Sale['estado']

interface PurchaseForm { fecha: string; reciclador: string; material: MaterialType; kg: string; precio_kg: string; estado: PurchaseStatus }
interface SaleForm { fecha: string; empresa: string; material: MaterialType; kg: string; precio_kg: string; estado: SaleStatus }

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

export default function Transactions() {
  const [tab, setTab] = useState(0)
  const [purchases, setPurchases] = useState<Purchase[]>(MOCK_PURCHASES)
  const [sales, setSales] = useState<Sale[]>(MOCK_SALES)
  const [showPurchaseModal, setShowPurchaseModal] = useState(false)
  const [showSaleModal, setShowSaleModal] = useState(false)
  const [purchaseForm, setPurchaseForm] = useState<PurchaseForm>({ fecha: today, reciclador: '', material: 'papel', kg: '', precio_kg: String(PURCHASE_PRICE_REF.papel), estado: 'pendiente' })
  const [saleForm, setSaleForm] = useState<SaleForm>({ fecha: today, empresa: '', material: 'papel', kg: '', precio_kg: String(SALE_PRICE_REF.papel), estado: 'pendiente' })
  const [purchaseError, setPurchaseError] = useState('')
  const [saleError, setSaleError] = useState('')
  const [purchasePage, setPurchasePage] = useState(0)
  const [salePage, setSalePage] = useState(0)

  const activePurchases = purchases.filter((c) => c.estado !== 'cancelado')
  const activeSales = sales.filter((v) => v.estado !== 'cancelado')

  const handlePurchaseSubmit = () => {
    if (!purchaseForm.reciclador.trim() || !purchaseForm.kg || !purchaseForm.precio_kg) {
      setPurchaseError(t.transacciones.registerPurchase.validationError)
      return
    }
    setPurchases((prev) => [{ id: String(Date.now()), fecha: purchaseForm.fecha, reciclador: purchaseForm.reciclador.trim(), material: purchaseForm.material, kg: Number(purchaseForm.kg), precio_kg: Number(purchaseForm.precio_kg), estado: purchaseForm.estado }, ...prev])
    setShowPurchaseModal(false)
    setPurchaseForm({ fecha: today, reciclador: '', material: 'papel', kg: '', precio_kg: String(PURCHASE_PRICE_REF.papel), estado: 'pendiente' })
  }

  const handleSaleSubmit = () => {
    if (!saleForm.empresa.trim() || !saleForm.kg || !saleForm.precio_kg) {
      setSaleError(t.transacciones.registerPurchase.validationError)
      return
    }
    setSales((prev) => [{ id: String(Date.now()), fecha: saleForm.fecha, empresa: saleForm.empresa.trim(), material: saleForm.material, kg: Number(saleForm.kg), precio_kg: Number(saleForm.precio_kg), precio_compra_ref: PURCHASE_PRICE_REF[saleForm.material], estado: saleForm.estado }, ...prev])
    setShowSaleModal(false)
    setSaleForm({ fecha: today, empresa: '', material: 'papel', kg: '', precio_kg: String(SALE_PRICE_REF.papel), estado: 'pendiente' })
  }

  const STATUS_COLOR: Record<string, 'warning' | 'success' | 'info' | 'error' | 'default'> = {
    pendiente: 'warning', pagado: 'success', facturado: 'info', entregado: 'success', cancelado: 'error',
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

      {tab === 0 && (
        <>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <StatCard label={t.transacciones.purchaseStats.totalPurchased} value={`${activePurchases.reduce((s, c) => s + c.kg, 0).toLocaleString('es-CO')} kg`} sub={t.transacciones.purchaseStats.totalPurchasedSub} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <StatCard label={t.transacciones.purchaseStats.valuePaid} value={`$${activePurchases.reduce((s, c) => s + c.kg * c.precio_kg, 0).toLocaleString('es-CO')}`} sub={t.transacciones.purchaseStats.valuePaidSub} color="error.main" />
            </Grid>
            <Grid item xs={12} sm={4}>
              <StatCard label={t.transacciones.purchaseStats.pendingPayment} value={String(purchases.filter((c) => c.estado === 'pendiente').length)} sub={interpolate(t.transacciones.purchaseStats.pendingPaymentSub, { total: purchases.length })} color="warning.main" />
            </Grid>
          </Grid>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button onClick={() => setShowPurchaseModal(true)}>{t.transacciones.newPurchase}</Button>
          </Box>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>{t.transacciones.table.date}</TableCell><TableCell>{t.transacciones.table.recycler}</TableCell>
                  <TableCell>{t.transacciones.table.material}</TableCell><TableCell align="right">{t.transacciones.table.kg}</TableCell>
                  <TableCell align="right">{t.transacciones.table.pricePerKg}</TableCell><TableCell align="right">{t.transacciones.table.total}</TableCell>
                  <TableCell>{t.transacciones.table.status}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {purchases.slice(purchasePage * 8, purchasePage * 8 + 8).map((c) => (
                  <TableRow key={c.id} hover>
                    <TableCell sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>{c.fecha}</TableCell>
                    <TableCell sx={{ fontWeight: 500 }}>{c.reciclador}</TableCell>
                    <TableCell><Badge label={MATERIAL_CONFIG[c.material].label} color="default" /></TableCell>
                    <TableCell align="right" sx={{ fontFamily: 'monospace' }}>{c.kg}</TableCell>
                    <TableCell align="right" sx={{ color: 'text.secondary' }}>${c.precio_kg.toLocaleString('es-CO')}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>${(c.kg * c.precio_kg).toLocaleString('es-CO')}</TableCell>
                    <TableCell><Badge label={STATUS_LABEL[c.estado] ?? c.estado} color={STATUS_COLOR[c.estado]} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <TablePagination count={purchases.length} page={purchasePage} rowsPerPage={8} onPageChange={(_, p) => setPurchasePage(p)} />
          </TableContainer>
        </>
      )}

      {tab === 1 && (
        <>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={3}>
              <StatCard label={t.transacciones.saleStats.totalSold} value={`${activeSales.reduce((s, v) => s + v.kg, 0).toLocaleString('es-CO')} kg`} sub={t.transacciones.saleStats.totalSoldSub} />
            </Grid>
            <Grid item xs={12} sm={3}>
              <StatCard label={t.transacciones.saleStats.valueCharged} value={`$${activeSales.reduce((s, v) => s + v.kg * v.precio_kg, 0).toLocaleString('es-CO')}`} sub={t.transacciones.saleStats.valueChargedSub} color="primary.main" />
            </Grid>
            <Grid item xs={12} sm={3}>
              <StatCard label={t.transacciones.saleStats.grossProfit} value={`$${(activeSales.reduce((s, v) => s + v.kg * v.precio_kg, 0) - activeSales.reduce((s, v) => s + v.kg * v.precio_compra_ref, 0)).toLocaleString('es-CO')}`} sub={t.transacciones.saleStats.grossProfitSub} color="success.dark" />
            </Grid>
            <Grid item xs={12} sm={3}>
              <StatCard label={t.transacciones.saleStats.toInvoice} value={String(sales.filter((v) => v.estado === 'pendiente').length)} sub={interpolate(t.transacciones.saleStats.toInvoiceSub, { total: sales.length })} color="warning.main" />
            </Grid>
          </Grid>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button onClick={() => setShowSaleModal(true)}>{t.transacciones.newSale}</Button>
          </Box>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>{t.transacciones.table.date}</TableCell><TableCell>{t.transacciones.table.company}</TableCell>
                  <TableCell>{t.transacciones.table.material}</TableCell><TableCell align="right">{t.transacciones.table.kg}</TableCell>
                  <TableCell align="right">{t.transacciones.table.pricePerKg}</TableCell><TableCell align="right">{t.transacciones.table.total}</TableCell>
                  <TableCell>{t.transacciones.table.status}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sales.slice(salePage * 8, salePage * 8 + 8).map((v) => (
                  <TableRow key={v.id} hover>
                    <TableCell sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>{v.fecha}</TableCell>
                    <TableCell sx={{ fontWeight: 500 }}>{v.empresa}</TableCell>
                    <TableCell><Badge label={MATERIAL_CONFIG[v.material].label} color="default" /></TableCell>
                    <TableCell align="right" sx={{ fontFamily: 'monospace' }}>{v.kg}</TableCell>
                    <TableCell align="right" sx={{ color: 'text.secondary' }}>${v.precio_kg.toLocaleString('es-CO')}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>${(v.kg * v.precio_kg).toLocaleString('es-CO')}</TableCell>
                    <TableCell><Badge label={STATUS_LABEL[v.estado] ?? v.estado} color={STATUS_COLOR[v.estado]} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <TablePagination count={sales.length} page={salePage} rowsPerPage={8} onPageChange={(_, p) => setSalePage(p)} />
          </TableContainer>
        </>
      )}

      {/* Purchase modal */}
      <Dialog open={showPurchaseModal} onClose={() => { setShowPurchaseModal(false); setPurchaseError('') }} maxWidth="sm">
        <DialogTitle showClose onClose={() => { setShowPurchaseModal(false); setPurchaseError('') }}>{t.transacciones.registerPurchase.title}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, pt: 1 }}>
            <Input label={t.transacciones.registerPurchase.dateField} type="date" value={purchaseForm.fecha} onChange={(e) => setPurchaseForm((p) => ({ ...p, fecha: e.target.value }))} />
            <Select label={t.transacciones.registerPurchase.statusField} value={purchaseForm.estado} onChange={(e) => setPurchaseForm((p) => ({ ...p, estado: e.target.value as PurchaseStatus }))} options={PURCHASE_STATUS_OPTIONS} />
            <Input label={t.transacciones.registerPurchase.recyclerField} placeholder={t.transacciones.registerPurchase.recyclerPlaceholder} value={purchaseForm.reciclador} onChange={(e) => { setPurchaseForm((p) => ({ ...p, reciclador: e.target.value })); setPurchaseError('') }} />
            <Select label={t.transacciones.registerPurchase.materialField} value={purchaseForm.material} onChange={(e) => setPurchaseForm((p) => ({ ...p, material: e.target.value as MaterialType, precio_kg: String(PURCHASE_PRICE_REF[e.target.value as MaterialType]) }))} options={MATERIAL_OPTIONS} />
            <Input label={t.transacciones.registerPurchase.quantityField} type="number" value={purchaseForm.kg} onChange={(e) => setPurchaseForm((p) => ({ ...p, kg: e.target.value }))} />
            <Input label={t.transacciones.registerPurchase.priceField} type="number" value={purchaseForm.precio_kg} onChange={(e) => setPurchaseForm((p) => ({ ...p, precio_kg: e.target.value }))} />
          </Box>
          {purchaseError && <Typography variant="caption" color="error" mt={1}>{purchaseError}</Typography>}
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={() => { setShowPurchaseModal(false); setPurchaseError('') }}>{t.common.cancel}</Button>
          <Button onClick={handlePurchaseSubmit}>{t.transacciones.registerPurchase.submitLabel}</Button>
        </DialogActions>
      </Dialog>

      {/* Sale modal */}
      <Dialog open={showSaleModal} onClose={() => { setShowSaleModal(false); setSaleError('') }} maxWidth="sm">
        <DialogTitle showClose onClose={() => { setShowSaleModal(false); setSaleError('') }}>{t.transacciones.registerSale.title}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, pt: 1 }}>
            <Input label={t.transacciones.registerPurchase.dateField} type="date" value={saleForm.fecha} onChange={(e) => setSaleForm((p) => ({ ...p, fecha: e.target.value }))} />
            <Select label={t.transacciones.registerPurchase.statusField} value={saleForm.estado} onChange={(e) => setSaleForm((p) => ({ ...p, estado: e.target.value as SaleStatus }))} options={SALE_STATUS_OPTIONS} />
            <Box sx={{ gridColumn: 'span 2' }}>
              <Input label={t.transacciones.registerSale.companyField} placeholder={t.transacciones.registerSale.companyPlaceholder} value={saleForm.empresa} onChange={(e) => { setSaleForm((p) => ({ ...p, empresa: e.target.value })); setSaleError('') }} />
            </Box>
            <Select label={t.transacciones.registerPurchase.materialField} value={saleForm.material} onChange={(e) => setSaleForm((p) => ({ ...p, material: e.target.value as MaterialType, precio_kg: String(SALE_PRICE_REF[e.target.value as MaterialType]) }))} options={MATERIAL_OPTIONS} />
            <Input label={t.transacciones.registerPurchase.quantityField} type="number" value={saleForm.kg} onChange={(e) => setSaleForm((p) => ({ ...p, kg: e.target.value }))} />
            <Box sx={{ gridColumn: 'span 2' }}>
              <Input label={t.transacciones.registerPurchase.priceField} type="number" value={saleForm.precio_kg} onChange={(e) => setSaleForm((p) => ({ ...p, precio_kg: e.target.value }))} />
            </Box>
          </Box>
          {saleError && <Typography variant="caption" color="error" mt={1}>{saleError}</Typography>}
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={() => { setShowSaleModal(false); setSaleError('') }}>{t.common.cancel}</Button>
          <Button onClick={handleSaleSubmit}>{t.transacciones.registerSale.submitLabel}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
