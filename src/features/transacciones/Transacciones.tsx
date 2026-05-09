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

type MaterialType = 'papel' | 'plastico' | 'vidrio' | 'metal' | 'carton' | 'electronico' | 'organico'

const MATERIAL_CONFIG: Record<MaterialType, { label: string }> = {
  papel: { label: 'Papel' }, plastico: { label: 'Plástico' }, vidrio: { label: 'Vidrio' },
  metal: { label: 'Metal' }, carton: { label: 'Cartón' }, electronico: { label: 'Electrónico' }, organico: { label: 'Orgánico' },
}

const PRECIO_COMPRA_REF: Record<MaterialType, number> = {
  papel: 350, plastico: 500, vidrio: 150, metal: 1200, carton: 280, electronico: 2500, organico: 80,
}

const PRECIO_VENTA_REF: Record<MaterialType, number> = {
  papel: 480, plastico: 700, vidrio: 220, metal: 1600, carton: 380, electronico: 3500, organico: 110,
}

interface Compra {
  id: string; fecha: string; reciclador: string; material: MaterialType
  kg: number; precio_kg: number; estado: 'pendiente' | 'pagado' | 'cancelado'
}

interface Venta {
  id: string; fecha: string; empresa: string; material: MaterialType
  kg: number; precio_kg: number; precio_compra_ref: number
  estado: 'pendiente' | 'facturado' | 'entregado' | 'cancelado'
}

const MOCK_COMPRAS: Compra[] = [
  { id: '1', fecha: '2026-05-06', reciclador: 'Carlos Mendez', material: 'papel', kg: 80, precio_kg: 350, estado: 'pagado' },
  { id: '2', fecha: '2026-05-06', reciclador: 'María López', material: 'plastico', kg: 45, precio_kg: 500, estado: 'pagado' },
  { id: '3', fecha: '2026-05-05', reciclador: 'Juan Torres', material: 'metal', kg: 30, precio_kg: 1200, estado: 'pendiente' },
  { id: '4', fecha: '2026-05-05', reciclador: 'Ana Gómez', material: 'carton', kg: 120, precio_kg: 280, estado: 'pagado' },
]

const MOCK_VENTAS: Venta[] = [
  { id: '1', fecha: '2026-05-07', empresa: 'Gestora Ambiental S.A.', material: 'papel', kg: 200, precio_kg: 480, precio_compra_ref: 350, estado: 'facturado' },
  { id: '2', fecha: '2026-05-06', empresa: 'RecicloTech Colombia', material: 'plastico', kg: 120, precio_kg: 700, precio_compra_ref: 500, estado: 'entregado' },
  { id: '3', fecha: '2026-05-05', empresa: 'EcoMateriales Ltda.', material: 'metal', kg: 50, precio_kg: 1600, precio_compra_ref: 1200, estado: 'facturado' },
]

const MATERIAL_OPTIONS = Object.entries(MATERIAL_CONFIG).map(([v, c]) => ({ value: v, label: c.label }))
const COMPRA_ESTADO_OPTIONS = [
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'pagado', label: 'Pagado' },
  { value: 'cancelado', label: 'Cancelado' },
]
const VENTA_ESTADO_OPTIONS = [
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'facturado', label: 'Facturado' },
  { value: 'entregado', label: 'Entregado' },
  { value: 'cancelado', label: 'Cancelado' },
]

const today = new Date().toISOString().split('T')[0]

type CompraEstado = Compra['estado']
type VentaEstado = Venta['estado']

interface CompraForm { fecha: string; reciclador: string; material: MaterialType; kg: string; precio_kg: string; estado: CompraEstado }
interface VentaForm { fecha: string; empresa: string; material: MaterialType; kg: string; precio_kg: string; estado: VentaEstado }

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

export default function Transacciones() {
  const [tab, setTab] = useState(0)
  const [compras, setCompras] = useState<Compra[]>(MOCK_COMPRAS)
  const [ventas, setVentas] = useState<Venta[]>(MOCK_VENTAS)
  const [showCompraModal, setShowCompraModal] = useState(false)
  const [showVentaModal, setShowVentaModal] = useState(false)
  const [compraForm, setCompraForm] = useState<CompraForm>({ fecha: today, reciclador: '', material: 'papel', kg: '', precio_kg: String(PRECIO_COMPRA_REF.papel), estado: 'pendiente' })
  const [ventaForm, setVentaForm] = useState<VentaForm>({ fecha: today, empresa: '', material: 'papel', kg: '', precio_kg: String(PRECIO_VENTA_REF.papel), estado: 'pendiente' })
  const [compraError, setCompraError] = useState('')
  const [ventaError, setVentaError] = useState('')
  const [compraPage, setCompraPage] = useState(0)
  const [ventaPage, setVentaPage] = useState(0)

  const comprasActivas = compras.filter((c) => c.estado !== 'cancelado')
  const ventasActivas = ventas.filter((v) => v.estado !== 'cancelado')

  const handleCompraSubmit = () => {
    if (!compraForm.reciclador.trim() || !compraForm.kg || !compraForm.precio_kg) {
      setCompraError('Completa todos los campos requeridos.')
      return
    }
    setCompras((prev) => [{ id: String(Date.now()), fecha: compraForm.fecha, reciclador: compraForm.reciclador.trim(), material: compraForm.material, kg: Number(compraForm.kg), precio_kg: Number(compraForm.precio_kg), estado: compraForm.estado }, ...prev])
    setShowCompraModal(false)
    setCompraForm({ fecha: today, reciclador: '', material: 'papel', kg: '', precio_kg: String(PRECIO_COMPRA_REF.papel), estado: 'pendiente' })
  }

  const handleVentaSubmit = () => {
    if (!ventaForm.empresa.trim() || !ventaForm.kg || !ventaForm.precio_kg) {
      setVentaError('Completa todos los campos requeridos.')
      return
    }
    setVentas((prev) => [{ id: String(Date.now()), fecha: ventaForm.fecha, empresa: ventaForm.empresa.trim(), material: ventaForm.material, kg: Number(ventaForm.kg), precio_kg: Number(ventaForm.precio_kg), precio_compra_ref: PRECIO_COMPRA_REF[ventaForm.material], estado: ventaForm.estado }, ...prev])
    setShowVentaModal(false)
    setVentaForm({ fecha: today, empresa: '', material: 'papel', kg: '', precio_kg: String(PRECIO_VENTA_REF.papel), estado: 'pendiente' })
  }

  const ESTADO_COLOR: Record<string, 'warning' | 'success' | 'info' | 'error' | 'default'> = {
    pendiente: 'warning', pagado: 'success', facturado: 'info', entregado: 'success', cancelado: 'error',
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box>
        <Typography variant="h5" fontWeight={600}>Transacciones</Typography>
        <Typography variant="body2" color="text.secondary" mt={0.5}>Compras a recicladores y ventas a empresas gestoras</Typography>
      </Box>

      <Tabs value={tab} onChange={(_, v) => setTab(v)}>
        <Tab label="Compras" />
        <Tab label="Ventas" />
      </Tabs>

      {tab === 0 && (
        <>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <StatCard label="Total comprado" value={`${comprasActivas.reduce((s, c) => s + c.kg, 0).toLocaleString('es-CO')} kg`} sub="Materiales adquiridos" />
            </Grid>
            <Grid item xs={12} sm={4}>
              <StatCard label="Valor pagado" value={`$${comprasActivas.reduce((s, c) => s + c.kg * c.precio_kg, 0).toLocaleString('es-CO')}`} sub="A recicladores" color="error.main" />
            </Grid>
            <Grid item xs={12} sm={4}>
              <StatCard label="Pendientes de pago" value={String(compras.filter((c) => c.estado === 'pendiente').length)} sub={`de ${compras.length} compras`} color="warning.main" />
            </Grid>
          </Grid>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button onClick={() => setShowCompraModal(true)}>+ Nueva compra</Button>
          </Box>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Fecha</TableCell><TableCell>Reciclador</TableCell>
                  <TableCell>Material</TableCell><TableCell align="right">Kg</TableCell>
                  <TableCell align="right">Precio/kg</TableCell><TableCell align="right">Total</TableCell>
                  <TableCell>Estado</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {compras.slice(compraPage * 8, compraPage * 8 + 8).map((c) => (
                  <TableRow key={c.id} hover>
                    <TableCell sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>{c.fecha}</TableCell>
                    <TableCell sx={{ fontWeight: 500 }}>{c.reciclador}</TableCell>
                    <TableCell><Badge label={MATERIAL_CONFIG[c.material].label} color="default" /></TableCell>
                    <TableCell align="right" sx={{ fontFamily: 'monospace' }}>{c.kg}</TableCell>
                    <TableCell align="right" sx={{ color: 'text.secondary' }}>${c.precio_kg.toLocaleString('es-CO')}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>${(c.kg * c.precio_kg).toLocaleString('es-CO')}</TableCell>
                    <TableCell><Badge label={c.estado} color={ESTADO_COLOR[c.estado]} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <TablePagination count={compras.length} page={compraPage} rowsPerPage={8} onPageChange={(_, p) => setCompraPage(p)} />
          </TableContainer>
        </>
      )}

      {tab === 1 && (
        <>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={3}>
              <StatCard label="Total vendido" value={`${ventasActivas.reduce((s, v) => s + v.kg, 0).toLocaleString('es-CO')} kg`} sub="Materiales despachados" />
            </Grid>
            <Grid item xs={12} sm={3}>
              <StatCard label="Valor cobrado" value={`$${ventasActivas.reduce((s, v) => s + v.kg * v.precio_kg, 0).toLocaleString('es-CO')}`} sub="A empresas" color="primary.main" />
            </Grid>
            <Grid item xs={12} sm={3}>
              <StatCard label="Ganancia bruta" value={`$${(ventasActivas.reduce((s, v) => s + v.kg * v.precio_kg, 0) - ventasActivas.reduce((s, v) => s + v.kg * v.precio_compra_ref, 0)).toLocaleString('es-CO')}`} sub="Venta − costo compra" color="success.dark" />
            </Grid>
            <Grid item xs={12} sm={3}>
              <StatCard label="Por facturar" value={String(ventas.filter((v) => v.estado === 'pendiente').length)} sub={`de ${ventas.length} ventas`} color="warning.main" />
            </Grid>
          </Grid>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button onClick={() => setShowVentaModal(true)}>+ Nueva venta</Button>
          </Box>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Fecha</TableCell><TableCell>Empresa</TableCell>
                  <TableCell>Material</TableCell><TableCell align="right">Kg</TableCell>
                  <TableCell align="right">Precio/kg</TableCell><TableCell align="right">Total</TableCell>
                  <TableCell>Estado</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {ventas.slice(ventaPage * 8, ventaPage * 8 + 8).map((v) => (
                  <TableRow key={v.id} hover>
                    <TableCell sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>{v.fecha}</TableCell>
                    <TableCell sx={{ fontWeight: 500 }}>{v.empresa}</TableCell>
                    <TableCell><Badge label={MATERIAL_CONFIG[v.material].label} color="default" /></TableCell>
                    <TableCell align="right" sx={{ fontFamily: 'monospace' }}>{v.kg}</TableCell>
                    <TableCell align="right" sx={{ color: 'text.secondary' }}>${v.precio_kg.toLocaleString('es-CO')}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>${(v.kg * v.precio_kg).toLocaleString('es-CO')}</TableCell>
                    <TableCell><Badge label={v.estado} color={ESTADO_COLOR[v.estado]} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <TablePagination count={ventas.length} page={ventaPage} rowsPerPage={8} onPageChange={(_, p) => setVentaPage(p)} />
          </TableContainer>
        </>
      )}

      {/* Modal Compra */}
      <Dialog open={showCompraModal} onClose={() => { setShowCompraModal(false); setCompraError('') }} maxWidth="sm">
        <DialogTitle showClose onClose={() => { setShowCompraModal(false); setCompraError('') }}>Registrar compra</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, pt: 1 }}>
            <Input label="Fecha" type="date" value={compraForm.fecha} onChange={(e) => setCompraForm((p) => ({ ...p, fecha: e.target.value }))} />
            <Select label="Estado" value={compraForm.estado} onChange={(e) => setCompraForm((p) => ({ ...p, estado: e.target.value as CompraEstado }))} options={COMPRA_ESTADO_OPTIONS} />
            <Input label="Reciclador *" placeholder="Nombre del reciclador" value={compraForm.reciclador} onChange={(e) => { setCompraForm((p) => ({ ...p, reciclador: e.target.value })); setCompraError('') }} />
            <Select label="Material *" value={compraForm.material} onChange={(e) => setCompraForm((p) => ({ ...p, material: e.target.value as MaterialType, precio_kg: String(PRECIO_COMPRA_REF[e.target.value as MaterialType]) }))} options={MATERIAL_OPTIONS} />
            <Input label="Cantidad (kg) *" type="number" value={compraForm.kg} onChange={(e) => setCompraForm((p) => ({ ...p, kg: e.target.value }))} />
            <Input label="Precio/kg ($) *" type="number" value={compraForm.precio_kg} onChange={(e) => setCompraForm((p) => ({ ...p, precio_kg: e.target.value }))} />
          </Box>
          {compraError && <Typography variant="caption" color="error" mt={1}>{compraError}</Typography>}
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={() => { setShowCompraModal(false); setCompraError('') }}>Cancelar</Button>
          <Button onClick={handleCompraSubmit}>Registrar compra</Button>
        </DialogActions>
      </Dialog>

      {/* Modal Venta */}
      <Dialog open={showVentaModal} onClose={() => { setShowVentaModal(false); setVentaError('') }} maxWidth="sm">
        <DialogTitle showClose onClose={() => { setShowVentaModal(false); setVentaError('') }}>Registrar venta</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, pt: 1 }}>
            <Input label="Fecha" type="date" value={ventaForm.fecha} onChange={(e) => setVentaForm((p) => ({ ...p, fecha: e.target.value }))} />
            <Select label="Estado" value={ventaForm.estado} onChange={(e) => setVentaForm((p) => ({ ...p, estado: e.target.value as VentaEstado }))} options={VENTA_ESTADO_OPTIONS} />
            <Box sx={{ gridColumn: 'span 2' }}>
              <Input label="Empresa compradora *" placeholder="Nombre de la empresa" value={ventaForm.empresa} onChange={(e) => { setVentaForm((p) => ({ ...p, empresa: e.target.value })); setVentaError('') }} />
            </Box>
            <Select label="Material *" value={ventaForm.material} onChange={(e) => setVentaForm((p) => ({ ...p, material: e.target.value as MaterialType, precio_kg: String(PRECIO_VENTA_REF[e.target.value as MaterialType]) }))} options={MATERIAL_OPTIONS} />
            <Input label="Cantidad (kg) *" type="number" value={ventaForm.kg} onChange={(e) => setVentaForm((p) => ({ ...p, kg: e.target.value }))} />
            <Box sx={{ gridColumn: 'span 2' }}>
              <Input label="Precio/kg ($) *" type="number" value={ventaForm.precio_kg} onChange={(e) => setVentaForm((p) => ({ ...p, precio_kg: e.target.value }))} />
            </Box>
          </Box>
          {ventaError && <Typography variant="caption" color="error" mt={1}>{ventaError}</Typography>}
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={() => { setShowVentaModal(false); setVentaError('') }}>Cancelar</Button>
          <Button onClick={handleVentaSubmit}>Registrar venta</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
