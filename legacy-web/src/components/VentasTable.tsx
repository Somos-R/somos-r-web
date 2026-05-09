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
import { MATERIAL_CONFIG, type MaterialType } from './ComprasTable'

export interface Venta {
  id: string
  fecha: string
  empresa: string
  material: MaterialType
  kg: number
  precio_kg: number
  precio_compra_ref: number
  estado: 'pendiente' | 'facturado' | 'entregado' | 'cancelado'
}

interface VentasTableProps {
  data: Venta[]
  isLoading?: boolean
}

const ESTADO_CONFIG: Record<Venta['estado'], { label: string; className: string }> = {
  pendiente:  { label: 'Pendiente',  className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  facturado:  { label: 'Facturado',  className: 'bg-blue-100 text-blue-800 border-blue-200' },
  entregado:  { label: 'Entregado',  className: 'bg-green-100 text-green-800 border-green-200' },
  cancelado:  { label: 'Cancelado',  className: 'bg-red-100 text-red-700 border-red-200' },
}

const PAGE_SIZE = 8

function MargenBadge({ precioVenta, precioCompra }: { precioVenta: number; precioCompra: number }) {
  if (precioCompra === 0) return null
  const pct = Math.round(((precioVenta - precioCompra) / precioCompra) * 100)
  const color = pct >= 20 ? 'text-green-700 bg-green-50' : pct >= 0 ? 'text-yellow-700 bg-yellow-50' : 'text-red-700 bg-red-50'
  return (
    <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${color}`}>
      {pct > 0 ? '+' : ''}{pct}%
    </span>
  )
}

export default function VentasTable({ data, isLoading }: VentasTableProps) {
  const [search, setSearch] = useState('')
  const [filtroEstado, setFiltroEstado] = useState<Venta['estado'] | ''>('')
  const [page, setPage] = useState(1)

  const filtered = data.filter((v) => {
    const q = search.toLowerCase()
    const matchSearch =
      v.empresa.toLowerCase().includes(q) ||
      MATERIAL_CONFIG[v.material].label.toLowerCase().includes(q)
    const matchEstado = filtroEstado === '' || v.estado === filtroEstado
    return matchSearch && matchEstado
  })

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value)
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
          placeholder="Buscar por empresa o material..."
          value={search}
          onChange={handleSearch}
          className="max-w-xs"
        />
        <select
          value={filtroEstado}
          onChange={(e) => { setFiltroEstado(e.target.value as Venta['estado'] | ''); setPage(1) }}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="">Todos los estados</option>
          {Object.entries(ESTADO_CONFIG).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        <span className="ml-auto text-sm text-muted-foreground">
          {filtered.length} venta{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          {search || filtroEstado
            ? 'Sin resultados para los filtros aplicados.'
            : 'No hay ventas registradas aún.'}
        </div>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>Material</TableHead>
                <TableHead className="text-right">Kg</TableHead>
                <TableHead className="text-right">Precio/kg</TableHead>
                <TableHead className="text-right">Margen</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.map((v) => (
                <TableRow key={v.id}>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(v.fecha).toLocaleDateString('es-CO', {
                      day: '2-digit', month: 'short', year: 'numeric',
                    })}
                  </TableCell>
                  <TableCell className="font-medium">{v.empresa}</TableCell>
                  <TableCell>
                    <Badge className={MATERIAL_CONFIG[v.material].className}>
                      {MATERIAL_CONFIG[v.material].label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">{v.kg}</TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">
                    ${v.precio_kg.toLocaleString('es-CO')}
                  </TableCell>
                  <TableCell className="text-right">
                    <MargenBadge precioVenta={v.precio_kg} precioCompra={v.precio_compra_ref} />
                  </TableCell>
                  <TableCell className="text-right font-semibold text-sm">
                    ${(v.kg * v.precio_kg).toLocaleString('es-CO')}
                  </TableCell>
                  <TableCell>
                    <Badge className={ESTADO_CONFIG[v.estado].className}>
                      {ESTADO_CONFIG[v.estado].label}
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
