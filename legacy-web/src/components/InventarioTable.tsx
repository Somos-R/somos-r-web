import { useState } from 'react'
import { Input } from '@/components/ui/input'
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

export interface ItemInventario {
  id: string
  material: 'papel' | 'plastico' | 'vidrio' | 'metal' | 'carton' | 'electronico' | 'organico'
  stock_kg: number
  stock_min_kg: number
  precio_kg: number
  bodega: string
  fecha_actualizacion: string
  estado: 'disponible' | 'bajo_stock' | 'agotado'
}

interface InventarioTableProps {
  data: ItemInventario[]
  isLoading?: boolean
}

const MATERIAL_CONFIG: Record<ItemInventario['material'], { label: string; className: string }> = {
  papel:       { label: 'Papel',       className: 'bg-blue-100 text-blue-800 border-blue-200' },
  plastico:    { label: 'Plástico',    className: 'bg-purple-100 text-purple-800 border-purple-200' },
  vidrio:      { label: 'Vidrio',      className: 'bg-teal-100 text-teal-800 border-teal-200' },
  metal:       { label: 'Metal',       className: 'bg-gray-100 text-gray-700 border-gray-200' },
  carton:      { label: 'Cartón',      className: 'bg-orange-100 text-orange-800 border-orange-200' },
  electronico: { label: 'Electrónico', className: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  organico:    { label: 'Orgánico',    className: 'bg-lime-100 text-lime-800 border-lime-200' },
}

const ESTADO_CONFIG: Record<ItemInventario['estado'], { label: string; className: string }> = {
  disponible:  { label: 'Disponible',  className: 'bg-green-100 text-green-800 border-green-200' },
  bajo_stock:  { label: 'Bajo stock',  className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  agotado:     { label: 'Agotado',     className: 'bg-red-100 text-red-800 border-red-200' },
}

const PAGE_SIZE = 8

function StockBar({ actual, minimo }: { actual: number; minimo: number }) {
  const max = Math.max(actual, minimo) * 1.5
  const pct = Math.min((actual / max) * 100, 100)
  const color = actual === 0 ? 'bg-red-400' : actual < minimo ? 'bg-yellow-400' : 'bg-green-400'
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="font-mono text-sm">{actual.toLocaleString('es-CO')} kg</span>
    </div>
  )
}

export default function InventarioTable({ data, isLoading }: InventarioTableProps) {
  const [search, setSearch] = useState('')
  const [filtroMaterial, setFiltroMaterial] = useState<ItemInventario['material'] | ''>('')
  const [filtroEstado, setFiltroEstado] = useState<ItemInventario['estado'] | ''>('')
  const [page, setPage] = useState(1)

  const filtered = data.filter((item) => {
    const q = search.toLowerCase()
    const matchSearch =
      item.bodega.toLowerCase().includes(q) ||
      MATERIAL_CONFIG[item.material].label.toLowerCase().includes(q)
    const matchMaterial = filtroMaterial === '' || item.material === filtroMaterial
    const matchEstado = filtroEstado === '' || item.estado === filtroEstado
    return matchSearch && matchMaterial && matchEstado
  })

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value)
    setPage(1)
  }

  const handleFiltroMaterial = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFiltroMaterial(e.target.value as ItemInventario['material'] | '')
    setPage(1)
  }

  const handleFiltroEstado = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFiltroEstado(e.target.value as ItemInventario['estado'] | '')
    setPage(1)
  }

  if (isLoading) {
    return (
      <div className="rounded-lg border bg-white overflow-hidden">
        <div className="h-14 bg-gray-100 animate-pulse" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-12 mx-4 my-2 rounded bg-gray-100 animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="rounded-lg border bg-white overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b">
        <Input
          placeholder="Buscar por material o bodega..."
          value={search}
          onChange={handleSearch}
          className="max-w-xs"
        />
        <select
          value={filtroMaterial}
          onChange={handleFiltroMaterial}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="">Todos los materiales</option>
          {Object.entries(MATERIAL_CONFIG).map(([key, cfg]) => (
            <option key={key} value={key}>{cfg.label}</option>
          ))}
        </select>
        <select
          value={filtroEstado}
          onChange={handleFiltroEstado}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="">Todos los estados</option>
          {Object.entries(ESTADO_CONFIG).map(([key, cfg]) => (
            <option key={key} value={key}>{cfg.label}</option>
          ))}
        </select>
        <span className="ml-auto text-sm text-muted-foreground">
          {filtered.length} ítem{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          {search || filtroMaterial || filtroEstado
            ? 'Sin resultados para los filtros aplicados.'
            : 'No hay ítems en el inventario.'}
        </div>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Material</TableHead>
                <TableHead>Bodega</TableHead>
                <TableHead>Stock actual</TableHead>
                <TableHead className="text-right">Mínimo (kg)</TableHead>
                <TableHead className="text-right">Precio/kg</TableHead>
                <TableHead className="text-right">Valor total</TableHead>
                <TableHead>Actualizado</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Badge className={MATERIAL_CONFIG[item.material].className}>
                      {MATERIAL_CONFIG[item.material].label}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">{item.bodega}</TableCell>
                  <TableCell>
                    <StockBar actual={item.stock_kg} minimo={item.stock_min_kg} />
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm text-muted-foreground">
                    {item.stock_min_kg.toLocaleString('es-CO')}
                  </TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">
                    ${item.precio_kg.toLocaleString('es-CO')}
                  </TableCell>
                  <TableCell className="text-right font-semibold text-sm">
                    ${(item.stock_kg * item.precio_kg).toLocaleString('es-CO')}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(item.fecha_actualizacion).toLocaleDateString('es-CO', {
                      day: '2-digit', month: 'short', year: 'numeric',
                    })}
                  </TableCell>
                  <TableCell>
                    <Badge className={ESTADO_CONFIG[item.estado].className}>
                      {ESTADO_CONFIG[item.estado].label}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 py-3 border-t text-sm text-muted-foreground">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                ← Anterior
              </Button>
              <span>Página {page} de {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>
                Siguiente →
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
