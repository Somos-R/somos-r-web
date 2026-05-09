import { useState } from 'react'
import ComprasTable, { MATERIAL_CONFIG, type Compra, type MaterialType } from '../components/ComprasTable'
import VentasTable, { type Venta } from '../components/VentasTable'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

// ─── Precios de referencia ────────────────────────────────────────────────────

const PRECIO_COMPRA_REF: Record<MaterialType, number> = {
  papel: 350, plastico: 500, vidrio: 150,
  metal: 1200, carton: 280, electronico: 2500, organico: 80,
}

const PRECIO_VENTA_REF: Record<MaterialType, number> = {
  papel: 480, plastico: 700, vidrio: 220,
  metal: 1600, carton: 380, electronico: 3500, organico: 110,
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_COMPRAS: Compra[] = [
  { id: '1',  fecha: '2026-05-06', reciclador: 'Carlos Mendez',  material: 'papel',       kg: 80,  precio_kg: 350,  estado: 'pagado'    },
  { id: '2',  fecha: '2026-05-06', reciclador: 'María López',    material: 'plastico',    kg: 45,  precio_kg: 500,  estado: 'pagado'    },
  { id: '3',  fecha: '2026-05-05', reciclador: 'Juan Torres',    material: 'metal',       kg: 30,  precio_kg: 1200, estado: 'pendiente' },
  { id: '4',  fecha: '2026-05-05', reciclador: 'Ana Gómez',      material: 'carton',      kg: 120, precio_kg: 280,  estado: 'pagado'    },
  { id: '5',  fecha: '2026-05-04', reciclador: 'Pedro Ruiz',     material: 'vidrio',      kg: 60,  precio_kg: 150,  estado: 'pagado'    },
  { id: '6',  fecha: '2026-05-04', reciclador: 'Laura Sánchez',  material: 'electronico', kg: 15,  precio_kg: 2500, estado: 'pendiente' },
  { id: '7',  fecha: '2026-05-03', reciclador: 'David Herrera',  material: 'organico',    kg: 200, precio_kg: 80,   estado: 'pagado'    },
  { id: '8',  fecha: '2026-05-02', reciclador: 'Carlos Mendez',  material: 'carton',      kg: 95,  precio_kg: 280,  estado: 'pagado'    },
  { id: '9',  fecha: '2026-05-01', reciclador: 'María López',    material: 'papel',       kg: 55,  precio_kg: 350,  estado: 'pagado'    },
  { id: '10', fecha: '2026-04-30', reciclador: 'Juan Torres',    material: 'plastico',    kg: 40,  precio_kg: 500,  estado: 'cancelado' },
  { id: '11', fecha: '2026-04-29', reciclador: 'Ana Gómez',      material: 'metal',       kg: 22,  precio_kg: 1200, estado: 'pagado'    },
  { id: '12', fecha: '2026-04-28', reciclador: 'Pedro Ruiz',     material: 'electronico', kg: 8,   precio_kg: 2500, estado: 'pagado'    },
]

const MOCK_VENTAS: Venta[] = [
  { id: '1',  fecha: '2026-05-07', empresa: 'Gestora Ambiental S.A.',   material: 'papel',       kg: 200, precio_kg: 480,  precio_compra_ref: 350,  estado: 'facturado' },
  { id: '2',  fecha: '2026-05-06', empresa: 'RecicloTech Colombia',     material: 'plastico',    kg: 120, precio_kg: 700,  precio_compra_ref: 500,  estado: 'entregado' },
  { id: '3',  fecha: '2026-05-05', empresa: 'EcoMateriales Ltda.',      material: 'metal',       kg: 50,  precio_kg: 1600, precio_compra_ref: 1200, estado: 'facturado' },
  { id: '4',  fecha: '2026-05-05', empresa: 'Papel y Cartón del Valle', material: 'carton',      kg: 300, precio_kg: 380,  precio_compra_ref: 280,  estado: 'pendiente' },
  { id: '5',  fecha: '2026-05-04', empresa: 'Industrias Verde S.A.S.',  material: 'vidrio',      kg: 180, precio_kg: 220,  precio_compra_ref: 150,  estado: 'entregado' },
  { id: '6',  fecha: '2026-05-03', empresa: 'TecnoRecicla',             material: 'electronico', kg: 25,  precio_kg: 3500, precio_compra_ref: 2500, estado: 'pendiente' },
  { id: '7',  fecha: '2026-05-02', empresa: 'BioCompost S.A.',          material: 'organico',    kg: 400, precio_kg: 110,  precio_compra_ref: 80,   estado: 'entregado' },
  { id: '8',  fecha: '2026-04-30', empresa: 'Gestora Ambiental S.A.',   material: 'carton',      kg: 250, precio_kg: 380,  precio_compra_ref: 280,  estado: 'entregado' },
  { id: '9',  fecha: '2026-04-28', empresa: 'RecicloTech Colombia',     material: 'papel',       kg: 150, precio_kg: 480,  precio_compra_ref: 350,  estado: 'cancelado' },
]

// ─── Form state types ─────────────────────────────────────────────────────────

type CompraForm = {
  fecha: string
  reciclador: string
  material: MaterialType
  kg: string
  precio_kg: string
  estado: Compra['estado']
}

type VentaForm = {
  fecha: string
  empresa: string
  material: MaterialType
  kg: string
  precio_kg: string
  estado: Venta['estado']
}

const today = new Date().toISOString().split('T')[0]

const INITIAL_COMPRA: CompraForm = {
  fecha: today, reciclador: '', material: 'papel',
  kg: '', precio_kg: String(PRECIO_COMPRA_REF.papel), estado: 'pendiente',
}

const INITIAL_VENTA: VentaForm = {
  fecha: today, empresa: '', material: 'papel',
  kg: '', precio_kg: String(PRECIO_VENTA_REF.papel), estado: 'pendiente',
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ label, value, sub, accent }: { label: string; value: string; sub: string; accent: string }) {
  return (
    <div className="rounded-lg border bg-white p-4 flex flex-col gap-1">
      <span className="text-xs text-muted-foreground uppercase tracking-wide">{label}</span>
      <span className={`text-2xl font-bold ${accent}`}>{value}</span>
      <span className="text-xs text-muted-foreground">{sub}</span>
    </div>
  )
}

function FormField({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-gray-700">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

const selectClass =
  'h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring'

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Transacciones() {
  const [tab, setTab] = useState<'compras' | 'ventas'>('compras')
  const [compras, setCompras] = useState<Compra[]>(MOCK_COMPRAS)
  const [ventas, setVentas] = useState<Venta[]>(MOCK_VENTAS)

  const [showCompraModal, setShowCompraModal] = useState(false)
  const [showVentaModal, setShowVentaModal] = useState(false)
  const [compraForm, setCompraForm] = useState<CompraForm>(INITIAL_COMPRA)
  const [ventaForm, setVentaForm] = useState<VentaForm>(INITIAL_VENTA)
  const [compraError, setCompraError] = useState('')
  const [ventaError, setVentaError] = useState('')

  // ── Stats ──

  const comprasActivas = compras.filter((c) => c.estado !== 'cancelado')
  const totalCompraKg = comprasActivas.reduce((s, c) => s + c.kg, 0)
  const totalCompraValor = comprasActivas.reduce((s, c) => s + c.kg * c.precio_kg, 0)
  const comprasPendientes = compras.filter((c) => c.estado === 'pendiente').length

  const ventasActivas = ventas.filter((v) => v.estado !== 'cancelado')
  const totalVentaKg = ventasActivas.reduce((s, v) => s + v.kg, 0)
  const totalVentaValor = ventasActivas.reduce((s, v) => s + v.kg * v.precio_kg, 0)
  const ventasPendientes = ventas.filter((v) => v.estado === 'pendiente').length
  const gananciaTotal =
    ventasActivas.reduce((s, v) => s + v.kg * v.precio_kg, 0) -
    ventasActivas.reduce((s, v) => s + v.kg * v.precio_compra_ref, 0)

  // ── Handlers ──

  const setCompraField = <K extends keyof CompraForm>(key: K, value: CompraForm[K]) => {
    setCompraForm((prev) => {
      const next = { ...prev, [key]: value }
      if (key === 'material') next.precio_kg = String(PRECIO_COMPRA_REF[value as MaterialType])
      return next
    })
    setCompraError('')
  }

  const setVentaField = <K extends keyof VentaForm>(key: K, value: VentaForm[K]) => {
    setVentaForm((prev) => {
      const next = { ...prev, [key]: value }
      if (key === 'material') next.precio_kg = String(PRECIO_VENTA_REF[value as MaterialType])
      return next
    })
    setVentaError('')
  }

  const handleCompraSubmit = () => {
    if (!compraForm.reciclador.trim() || !compraForm.kg || !compraForm.precio_kg) {
      setCompraError('Completa todos los campos requeridos.')
      return
    }
    const nueva: Compra = {
      id: String(Date.now()),
      fecha: compraForm.fecha,
      reciclador: compraForm.reciclador.trim(),
      material: compraForm.material,
      kg: Number(compraForm.kg),
      precio_kg: Number(compraForm.precio_kg),
      estado: compraForm.estado,
    }
    setCompras((prev) => [nueva, ...prev])
    setShowCompraModal(false)
    setCompraForm(INITIAL_COMPRA)
  }

  const handleVentaSubmit = () => {
    if (!ventaForm.empresa.trim() || !ventaForm.kg || !ventaForm.precio_kg) {
      setVentaError('Completa todos los campos requeridos.')
      return
    }
    const nueva: Venta = {
      id: String(Date.now()),
      fecha: ventaForm.fecha,
      empresa: ventaForm.empresa.trim(),
      material: ventaForm.material,
      kg: Number(ventaForm.kg),
      precio_kg: Number(ventaForm.precio_kg),
      precio_compra_ref: PRECIO_COMPRA_REF[ventaForm.material],
      estado: ventaForm.estado,
    }
    setVentas((prev) => [nueva, ...prev])
    setShowVentaModal(false)
    setVentaForm(INITIAL_VENTA)
  }

  const compraTotal = Number(compraForm.kg) * Number(compraForm.precio_kg)
  const ventaTotal = Number(ventaForm.kg) * Number(ventaForm.precio_kg)
  const ventaMargen = ventaTotal - Number(ventaForm.kg) * PRECIO_COMPRA_REF[ventaForm.material]

  // ── Render ──

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Transacciones</h1>
        <p className="text-sm text-gray-500 mt-1">Compras a recicladores y ventas a empresas gestoras</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {(['compras', 'ventas'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-1.5 text-sm font-medium rounded-md transition-colors ${
              tab === t
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t === 'compras' ? '🛒 Compras' : '📤 Ventas'}
          </button>
        ))}
      </div>

      {/* Stats */}
      {tab === 'compras' ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            label="Total comprado"
            value={`${totalCompraKg.toLocaleString('es-CO')} kg`}
            sub="Materiales adquiridos"
            accent="text-gray-900"
          />
          <StatCard
            label="Valor pagado"
            value={`$${totalCompraValor.toLocaleString('es-CO')}`}
            sub="A recicladores (sin cancelados)"
            accent="text-red-600"
          />
          <StatCard
            label="Pendientes de pago"
            value={String(comprasPendientes)}
            sub={`de ${compras.length} compras totales`}
            accent={comprasPendientes > 0 ? 'text-yellow-600' : 'text-gray-400'}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <StatCard
            label="Total vendido"
            value={`${totalVentaKg.toLocaleString('es-CO')} kg`}
            sub="Materiales despachados"
            accent="text-gray-900"
          />
          <StatCard
            label="Valor cobrado"
            value={`$${totalVentaValor.toLocaleString('es-CO')}`}
            sub="A empresas (sin cancelados)"
            accent="text-blue-600"
          />
          <StatCard
            label="Ganancia bruta"
            value={`$${gananciaTotal.toLocaleString('es-CO')}`}
            sub="Venta − costo de compra"
            accent={gananciaTotal >= 0 ? 'text-green-700' : 'text-red-600'}
          />
          <StatCard
            label="Por facturar"
            value={String(ventasPendientes)}
            sub={`de ${ventas.length} ventas totales`}
            accent={ventasPendientes > 0 ? 'text-yellow-600' : 'text-gray-400'}
          />
        </div>
      )}

      {/* Action bar + table */}
      <div className="flex items-center justify-end">
        {tab === 'compras' ? (
          <Button onClick={() => setShowCompraModal(true)}>+ Nueva compra</Button>
        ) : (
          <Button onClick={() => setShowVentaModal(true)}>+ Nueva venta</Button>
        )}
      </div>

      {tab === 'compras' ? (
        <ComprasTable data={compras} />
      ) : (
        <VentasTable data={ventas} />
      )}

      {/* ── Modal: Nueva Compra ── */}
      <Dialog open={showCompraModal} onOpenChange={(o) => { setShowCompraModal(o); if (!o) { setCompraForm(INITIAL_COMPRA); setCompraError('') } }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Registrar compra</DialogTitle>
            <DialogDescription>Compra de material reciclable a un reciclador</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 py-2">
            <FormField label="Fecha" required>
              <Input type="date" value={compraForm.fecha} onChange={(e) => setCompraField('fecha', e.target.value)} />
            </FormField>

            <FormField label="Estado" required>
              <select className={selectClass} value={compraForm.estado} onChange={(e) => setCompraField('estado', e.target.value as Compra['estado'])}>
                <option value="pendiente">Pendiente</option>
                <option value="pagado">Pagado</option>
                <option value="cancelado">Cancelado</option>
              </select>
            </FormField>

            <FormField label="Reciclador" required>
              <Input
                placeholder="Nombre del reciclador"
                value={compraForm.reciclador}
                onChange={(e) => setCompraField('reciclador', e.target.value)}
              />
            </FormField>

            <FormField label="Material" required>
              <select className={selectClass} value={compraForm.material} onChange={(e) => setCompraField('material', e.target.value as MaterialType)}>
                {Object.entries(MATERIAL_CONFIG).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </FormField>

            <FormField label="Cantidad (kg)" required>
              <Input
                type="number"
                min="0"
                placeholder="0"
                value={compraForm.kg}
                onChange={(e) => setCompraField('kg', e.target.value)}
              />
            </FormField>

            <FormField label="Precio/kg ($)" required>
              <Input
                type="number"
                min="0"
                value={compraForm.precio_kg}
                onChange={(e) => setCompraField('precio_kg', e.target.value)}
              />
            </FormField>

            {compraForm.kg && compraForm.precio_kg && (
              <div className="col-span-2 flex items-center justify-between rounded-lg bg-gray-50 border px-4 py-3">
                <span className="text-sm text-gray-600">Total a pagar al reciclador</span>
                <span className="text-lg font-bold text-gray-900">
                  ${compraTotal.toLocaleString('es-CO')}
                </span>
              </div>
            )}
          </div>

          {compraError && (
            <p className="text-sm text-red-600">{compraError}</p>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowCompraModal(false)}>Cancelar</Button>
            <Button onClick={handleCompraSubmit}>Registrar compra</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Modal: Nueva Venta ── */}
      <Dialog open={showVentaModal} onOpenChange={(o) => { setShowVentaModal(o); if (!o) { setVentaForm(INITIAL_VENTA); setVentaError('') } }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Registrar venta</DialogTitle>
            <DialogDescription>Venta de material reciclable a una empresa gestora</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 py-2">
            <FormField label="Fecha" required>
              <Input type="date" value={ventaForm.fecha} onChange={(e) => setVentaField('fecha', e.target.value)} />
            </FormField>

            <FormField label="Estado" required>
              <select className={selectClass} value={ventaForm.estado} onChange={(e) => setVentaField('estado', e.target.value as Venta['estado'])}>
                <option value="pendiente">Pendiente</option>
                <option value="facturado">Facturado</option>
                <option value="entregado">Entregado</option>
                <option value="cancelado">Cancelado</option>
              </select>
            </FormField>

            <FormField label="Empresa compradora" required>
              <Input
                placeholder="Nombre de la empresa"
                value={ventaForm.empresa}
                onChange={(e) => setVentaField('empresa', e.target.value)}
              />
            </FormField>

            <FormField label="Material" required>
              <select className={selectClass} value={ventaForm.material} onChange={(e) => setVentaField('material', e.target.value as MaterialType)}>
                {Object.entries(MATERIAL_CONFIG).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </FormField>

            <FormField label="Cantidad (kg)" required>
              <Input
                type="number"
                min="0"
                placeholder="0"
                value={ventaForm.kg}
                onChange={(e) => setVentaField('kg', e.target.value)}
              />
            </FormField>

            <FormField label="Precio/kg ($)" required>
              <Input
                type="number"
                min="0"
                value={ventaForm.precio_kg}
                onChange={(e) => setVentaField('precio_kg', e.target.value)}
              />
            </FormField>

            {ventaForm.kg && ventaForm.precio_kg && (
              <div className="col-span-2 space-y-2">
                <div className="flex items-center justify-between rounded-lg bg-gray-50 border px-4 py-3">
                  <span className="text-sm text-gray-600">Total de la venta</span>
                  <span className="text-lg font-bold text-gray-900">
                    ${ventaTotal.toLocaleString('es-CO')}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-green-50 border border-green-100 px-4 py-2.5">
                  <span className="text-sm text-green-700">Ganancia bruta estimada</span>
                  <span className={`text-base font-semibold ${ventaMargen >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                    {ventaMargen >= 0 ? '+' : ''}${ventaMargen.toLocaleString('es-CO')}
                    <span className="ml-2 text-xs font-normal">
                      (ref. compra: ${PRECIO_COMPRA_REF[ventaForm.material].toLocaleString('es-CO')}/kg)
                    </span>
                  </span>
                </div>
              </div>
            )}
          </div>

          {ventaError && (
            <p className="text-sm text-red-600">{ventaError}</p>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowVentaModal(false)}>Cancelar</Button>
            <Button onClick={handleVentaSubmit}>Registrar venta</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
