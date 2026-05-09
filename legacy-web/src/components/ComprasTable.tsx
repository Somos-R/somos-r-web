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

export type MaterialType =
  | 'papel'
  | 'plastico'
  | 'vidrio'
  | 'metal'
  | 'carton'
  | 'electronico'
  | 'organico'

export interface Compra {
  id: string
  fecha: string
  reciclador: string
  material: MaterialType
  kg: number
  precio_kg: number
  estado: 'pendiente' | 'pagado' | 'cancelado'
}

interface ComprasTableProps {
  data: Compra[]
  isLoading?: boolean
}

export const MATERIAL_CONFIG: Record<MaterialType, { label: string; className: string }> = {
  papel:       { label: 'Papel',       className: 'bg-blue-100 text-blue-800 border-blue-200' },
  plastico:    { label: 'Plástico',    className: 'bg-purple-100 text-purple-800 border-purple-200' },
  vidrio:      { label: 'Vidrio',      className: 'bg-teal-100 text-teal-800 border-teal-200' },
  metal:       { label: 'Metal',       className: 'bg-gray-100 text-gray-700 border-gray-200' },
  carton:      { label: 'Cartón',      className: 'bg-orange-100 text-orange-800 border-orange-200' },
  electronico: { label: 'Electrónico', className: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  organico:    { label: 'Orgánico',    className: 'bg-lime-100 text-lime-800 border-lime-200' },
}

const ESTADO_CONFIG: Record<Compra['estado'], { label: string; className: string }> = {
  pendiente:  { label: 'Pendiente',  className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  pagado:     { label: 'Pagado',     className: 'bg-green-100 text-green-800 border-green-200' },
  cancelado:  { label: 'Cancelado',  className: 'bg-red-100 text-red-700 border-red-200' },
}

const PAGE_SIZE = 8

export default function ComprasTable({ data, isLoading }: ComprasTableProps) {
  const [search, setSearch] = useState('')
  const [filtroEstado, setFiltroEstado] = useState<Compra['estado'] | ''>('')
  const [page, setPage] = useState(1)

  const filtered = data.filter((c) => {
    const q = search.toLowerCase()
    const matchSearch =
      c.reciclador.toLowerCase().includes(q) ||
      MATERIAL_CONFIG[c.material].label.toLowerCase().includes(q)
    const matchEstado = filtroEstado === '' || c.estado === filtroEstado
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
          placeholder="Buscar por reciclador o material..."
          value={search}
          onChange={handleSearch}
          className="max-w-xs"
        />
        <select
          value={filtroEstado}
          onChange={(e) => { setFiltroEstado(e.target.value as Compra['estado'] | ''); setPage(1) }}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="">Todos los estados</option>
          {Object.entries(ESTADO_CONFIG).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        <span className="ml-auto text-sm text-muted-foreground">
          {filtered.length} compra{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          {search || filtroEstado
            ? 'Sin resultados para los filtros aplicados.'
            : 'No hay compras registradas aún.'}
        </div>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Reciclador</TableHead>
                <TableHead>Material</TableHead>
                <TableHead className="text-right">Kg</TableHead>
                <TableHead className="text-right">Precio/kg</TableHead>
                <TableHead className="text-right">Total pagado</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(c.fecha).toLocaleDateString('es-CO', {
                      day: '2-digit', month: 'short', year: 'numeric',
                    })}
                  </TableCell>
                  <TableCell className="font-medium">{c.reciclador}</TableCell>
                  <TableCell>
                    <Badge className={MATERIAL_CONFIG[c.material].className}>
                      {MATERIAL_CONFIG[c.material].label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">{c.kg}</TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">
                    ${c.precio_kg.toLocaleString('es-CO')}
                  </TableCell>
                  <TableCell className="text-right font-semibold text-sm">
                    ${(c.kg * c.precio_kg).toLocaleString('es-CO')}
                  </TableCell>
                  <TableCell>
                    <Badge className={ESTADO_CONFIG[c.estado].className}>
                      {ESTADO_CONFIG[c.estado].label}
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
