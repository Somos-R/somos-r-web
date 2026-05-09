import { useMemo, useState } from 'react'
import { MOCK_PESAJES } from '../data/mockData'
import { MOCK_RECICLADORES } from '../data/mockData'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Package, DollarSign, Scale, Recycle, Clock, CheckCircle2, Download, Info } from 'lucide-react'

// ── Label helpers ─────────────────────────────
const MATERIAL_LABELS: Record<string, string> = {
  papel: 'Papel', plastico: 'Plástico', vidrio: 'Vidrio', metal: 'Metal', carton: 'Cartón',
}
const MATERIAL_CLASS: Record<string, string> = {
  papel:    'bg-blue-100 text-blue-800 border-blue-200',
  plastico: 'bg-purple-100 text-purple-800 border-purple-200',
  vidrio:   'bg-teal-100 text-teal-800 border-teal-200',
  metal:    'bg-gray-100 text-gray-700 border-gray-200',
  carton:   'bg-orange-100 text-orange-800 border-orange-200',
}

// ── CSV export ───────────────────────────────
function exportCSV() {
  const headers = ['Fecha', 'Reciclador', 'Material', 'Kg', 'Precio/kg', 'Total COP', 'Estado']
  const rows = MOCK_PESAJES.map((p) => [
    p.fecha,
    p.reciclador_nombre,
    MATERIAL_LABELS[p.material] ?? p.material,
    p.kg,
    p.precio_kg,
    p.kg * p.precio_kg,
    p.estado,
  ])
  const csv = [headers, ...rows].map((r) => r.join(',')).join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `reporte_pesajes_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function Reportes() {
  const [exportado, setExportado] = useState(false)

  // ── Métricas globales ─────────────────────
  const metricas = useMemo(() => {
    const totalKg    = MOCK_PESAJES.reduce((s, p) => s + p.kg, 0)
    const totalCOP   = MOCK_PESAJES.reduce((s, p) => s + p.kg * p.precio_kg, 0)
    const totalPesajes = MOCK_PESAJES.length
    const recicladoresUnicos = new Set(MOCK_PESAJES.map((p) => p.reciclador_nombre)).size
    const pendientes = MOCK_PESAJES.filter((p) => p.estado === 'pendiente').length
    const pagados    = MOCK_PESAJES.filter((p) => p.estado === 'pagado').length
    return { totalKg, totalCOP, totalPesajes, recicladoresUnicos, pendientes, pagados }
  }, [])

  // ── Agrupado por material ─────────────────
  const porMaterial = useMemo(() => {
    const acc: Record<string, { kg: number; total: number; count: number }> = {}
    for (const p of MOCK_PESAJES) {
      if (!acc[p.material]) acc[p.material] = { kg: 0, total: 0, count: 0 }
      acc[p.material].kg    += p.kg
      acc[p.material].total += p.kg * p.precio_kg
      acc[p.material].count += 1
    }
    return Object.entries(acc).sort((a, b) => b[1].kg - a[1].kg)
  }, [])

  // ── Top recicladores ─────────────────────
  const topRecicladores = useMemo(() => {
    const acc: Record<string, { kg: number; pesajes: number }> = {}
    for (const p of MOCK_PESAJES) {
      if (!acc[p.reciclador_nombre]) acc[p.reciclador_nombre] = { kg: 0, pesajes: 0 }
      acc[p.reciclador_nombre].kg     += p.kg
      acc[p.reciclador_nombre].pesajes += 1
    }
    return Object.entries(acc).sort((a, b) => b[1].kg - a[1].kg).slice(0, 5)
  }, [])

  // ── Estado recicladores ──────────────────
  const statsRecicladores = useMemo(() => ({
    total:     MOCK_RECICLADORES.length,
    verified:  MOCK_RECICLADORES.filter((r) => r.status === 'verified').length,
    pending:   MOCK_RECICLADORES.filter((r) => r.status === 'pending').length,
    rejected:  MOCK_RECICLADORES.filter((r) => r.status === 'rejected').length,
  }), [])

  const handleExport = () => {
    exportCSV()
    setExportado(true)
    setTimeout(() => setExportado(false), 3000)
  }

  return (
    <div className="flex flex-col gap-6">

      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Reportes</h1>
          <p className="text-sm text-gray-500 mt-1">Métricas del período — datos mock (se conectará al backend)</p>
        </div>
        <Button
          id="btn-export-csv"
          onClick={handleExport}
          className="gap-2"
          variant={exportado ? 'outline' : 'default'}
        >
          {exportado ? (
            <><CheckCircle2 className="w-4 h-4 mr-2" /> Descargado</>
          ) : (
            <><Download className="w-4 h-4 mr-2" /> Exportar CSV</>
          )}
        </Button>
      </div>

      {/* ── Tarjetas de métricas ── */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { icon: <Package className="w-8 h-8" />, label: 'Total Kg recolectados', value: `${metricas.totalKg.toLocaleString('es-CO')} kg`, color: 'text-blue-700' },
          { icon: <DollarSign className="w-8 h-8" />, label: 'Valor total pagado', value: `$${metricas.totalCOP.toLocaleString('es-CO')}`, color: 'text-emerald-700' },
          { icon: <Scale className="w-8 h-8" />, label: 'Total pesajes', value: metricas.totalPesajes.toString(), color: 'text-gray-800' },
          { icon: <Recycle className="w-8 h-8" />, label: 'Recicladores activos', value: metricas.recicladoresUnicos.toString(), color: 'text-green-700' },
          { icon: <Clock className="w-8 h-8" />, label: 'Pesajes pendientes', value: metricas.pendientes.toString(), color: 'text-yellow-700' },
          { icon: <CheckCircle2 className="w-8 h-8" />, label: 'Pesajes pagados', value: metricas.pagados.toString(), color: 'text-teal-700' },
        ].map((m) => (
          <div key={m.label} className="bg-white rounded-lg border border-gray-200 p-5 flex items-center gap-4">
            <span className={`text-gray-400 ${m.color.replace('text-', 'text-opacity-50 text-')}`}>{m.icon}</span>
            <div>
              <div className={`text-2xl font-bold ${m.color}`}>{m.value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{m.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Tablas lado a lado ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Totales por material */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b">
            <h2 className="font-semibold text-gray-800">Recolección por material</h2>
            <p className="text-xs text-gray-400 mt-0.5">Kg y valor acumulado por tipo</p>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Material</TableHead>
                <TableHead className="text-right">Pesajes</TableHead>
                <TableHead className="text-right">Kg</TableHead>
                <TableHead className="text-right">Total COP</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {porMaterial.map(([mat, stats]) => (
                <TableRow key={mat}>
                  <TableCell>
                    <Badge className={MATERIAL_CLASS[mat]}>
                      {MATERIAL_LABELS[mat] ?? mat}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">{stats.count}</TableCell>
                  <TableCell className="text-right font-mono text-sm font-medium">{stats.kg} kg</TableCell>
                  <TableCell className="text-right text-sm font-semibold text-emerald-700">
                    ${stats.total.toLocaleString('es-CO')}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Top recicladores */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b">
            <h2 className="font-semibold text-gray-800">Top 5 recicladores</h2>
            <p className="text-xs text-gray-400 mt-0.5">Por kilogramos recolectados</p>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Reciclador</TableHead>
                <TableHead className="text-right">Pesajes</TableHead>
                <TableHead className="text-right">Kg total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topRecicladores.map(([nombre, stats], idx) => (
                <TableRow key={nombre}>
                  <TableCell>
                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                      idx === 0 ? 'bg-yellow-100 text-yellow-700' :
                      idx === 1 ? 'bg-gray-200 text-gray-600' :
                      idx === 2 ? 'bg-orange-100 text-orange-600' :
                      'bg-gray-50 text-gray-400'
                    }`}>
                      {idx + 1}
                    </span>
                  </TableCell>
                  <TableCell className="font-medium text-sm">{nombre}</TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">{stats.pesajes}</TableCell>
                  <TableCell className="text-right font-mono font-semibold text-sm">{stats.kg} kg</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* ── Estado de recicladores ── */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-800 mb-4">Estado del padrón de recicladores</h2>
        <div className="flex flex-wrap gap-4">
          {[
            { label: 'Total registrados', value: statsRecicladores.total, cls: 'bg-gray-100 text-gray-700' },
            { label: 'Verificados',       value: statsRecicladores.verified, cls: 'bg-green-100 text-green-700' },
            { label: 'Pendientes',        value: statsRecicladores.pending, cls: 'bg-yellow-100 text-yellow-700' },
            { label: 'Rechazados',        value: statsRecicladores.rejected, cls: 'bg-red-100 text-red-700' },
          ].map((s) => (
            <div key={s.label} className={`rounded-lg px-5 py-3 ${s.cls} flex items-center gap-3`}>
              <span className="text-2xl font-bold">{s.value}</span>
              <span className="text-sm font-medium">{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Nota backend ── */}
      <p className="text-xs text-gray-400 text-center flex items-center justify-center gap-1">
        <Info className="w-4 h-4" /> Datos calculados sobre registros mock — se actualizarán automáticamente cuando se conecte el backend
      </p>
    </div>
  )
}
