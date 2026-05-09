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

export interface Pesaje {
  id: string
  fecha: string
  reciclador_nombre: string
  material: 'papel' | 'plastico' | 'vidrio' | 'metal' | 'carton'
  kg: number
  precio_kg: number
  estado: 'pendiente' | 'validado' | 'pagado'
}

interface PesajesTableProps {
  data: Pesaje[]
  isLoading?: boolean
}

const MATERIAL_CONFIG: Record<Pesaje['material'], { label: string; className: string }> = {
  papel:    { label: 'Papel',    className: 'bg-blue-100 text-blue-800 border-blue-200' },
  plastico: { label: 'Plástico', className: 'bg-purple-100 text-purple-800 border-purple-200' },
  vidrio:   { label: 'Vidrio',   className: 'bg-teal-100 text-teal-800 border-teal-200' },
  metal:    { label: 'Metal',    className: 'bg-gray-100 text-gray-700 border-gray-200' },
  carton:   { label: 'Cartón',   className: 'bg-orange-100 text-orange-800 border-orange-200' },
}

const ESTADO_CONFIG: Record<Pesaje['estado'], { label: string; className: string }> = {
  pendiente: { label: 'Pendiente', className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  validado:  { label: 'Validado',  className: 'bg-green-100 text-green-800 border-green-200' },
  pagado:    { label: 'Pagado',    className: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
}

const PAGE_SIZE = 8

export default function PesajesTable({ data, isLoading }: PesajesTableProps) {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const filtered = data.filter((p) => {
    const q = search.toLowerCase()
    return (
      p.reciclador_nombre.toLowerCase().includes(q) ||
      MATERIAL_CONFIG[p.material].label.toLowerCase().includes(q)
    )
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
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <Input
          placeholder="Buscar por reciclador o material..."
          value={search}
          onChange={handleSearch}
          className="max-w-xs"
        />
        <span className="text-sm text-muted-foreground">
          {filtered.length} pesaje{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          {search ? `Sin resultados para "${search}"` : 'No hay pesajes registrados aún.'}
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
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(p.fecha).toLocaleDateString('es-CO', {
                      day: '2-digit', month: 'short', year: 'numeric',
                    })}
                  </TableCell>
                  <TableCell className="font-medium">{p.reciclador_nombre}</TableCell>
                  <TableCell>
                    <Badge className={MATERIAL_CONFIG[p.material].className}>
                      {MATERIAL_CONFIG[p.material].label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">{p.kg}</TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">
                    ${p.precio_kg.toLocaleString('es-CO')}
                  </TableCell>
                  <TableCell className="text-right font-semibold text-sm">
                    ${(p.kg * p.precio_kg).toLocaleString('es-CO')}
                  </TableCell>
                  <TableCell>
                    <Badge className={ESTADO_CONFIG[p.estado].className}>
                      {ESTADO_CONFIG[p.estado].label}
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
