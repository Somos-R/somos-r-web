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
import ValidacionRecicladorModal from './ValidacionRecicladorModal'
import { CheckCircle2 } from 'lucide-react'

export interface Reciclador {
  id: string
  full_name: string
  id_number: string
  phone: string | null
  status: 'pending' | 'verified' | 'rejected'
  created_at: string
}

interface RecicladoresTableProps {
  data: Reciclador[]
  isLoading?: boolean
  onValidationSuccess?: () => void
}

const STATUS_CONFIG: Record<Reciclador['status'], { label: string; className: string }> = {
  verified: { label: 'Verificado', className: 'bg-green-100 text-green-800 border-green-200' },
  pending:  { label: 'Pendiente',  className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  rejected: { label: 'Rechazado', className: 'bg-red-100 text-red-800 border-red-200' },
}

const PAGE_SIZE = 8

export default function RecicladoresTable({ data, isLoading, onValidationSuccess }: RecicladoresTableProps) {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [selectedReciclador, setSelectedReciclador] = useState<Reciclador | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const filtered = data.filter((r) => {
    const q = search.toLowerCase()
    return r.full_name.toLowerCase().includes(q) || r.id_number.includes(q)
  })

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value)
    setPage(1)
  }

  const handleValidarClick = (r: Reciclador) => {
    setSelectedReciclador(r)
    setModalOpen(true)
  }

  const handleValidationSuccess = () => {
    onValidationSuccess?.()
    setToast('Estado del reciclador actualizado correctamente')
    setTimeout(() => setToast(null), 3000)
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
    <>
      <div className="rounded-lg border bg-white overflow-hidden relative">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <Input
            placeholder="Buscar por nombre o cédula..."
            value={search}
            onChange={handleSearch}
            className="max-w-xs"
          />
          <span className="text-sm text-muted-foreground">
            {filtered.length} reciclador{filtered.length !== 1 ? 'es' : ''}
          </span>
        </div>

        {filtered.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            {search ? `Sin resultados para "${search}"` : 'No hay recicladores registrados aún.'}
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Cédula</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Registro</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.full_name}</TableCell>
                    <TableCell className="font-mono text-sm">{r.id_number}</TableCell>
                    <TableCell>{r.phone ?? '—'}</TableCell>
                    <TableCell>
                      <Badge className={STATUS_CONFIG[r.status].className}>
                        {STATUS_CONFIG[r.status].label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(r.created_at).toLocaleDateString('es-CO', {
                        day: '2-digit', month: 'short', year: 'numeric',
                      })}
                    </TableCell>
                    <TableCell className="text-right">
                      {r.status === 'pending' ? (
                        <Button variant="outline" size="sm" onClick={() => handleValidarClick(r)}>
                          Validar
                        </Button>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
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

      <ValidacionRecicladorModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        reciclador={selectedReciclador}
        onSuccess={handleValidationSuccess}
      />

      {toast && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-5 py-3 rounded-lg text-sm font-medium shadow-lg z-[200] flex items-center gap-2"
          style={{ animation: 'slideUp 0.3s ease' }}
        >
          <CheckCircle2 className="w-5 h-5 text-green-400" /> {toast}
        </div>
      )}
    </>
  )
}
