import { useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import CircularProgress from '@mui/material/CircularProgress'
import MenuItem from '@mui/material/MenuItem'
import TextField from '@mui/material/TextField'
import {
  Badge, Input,
  Table, TableHead, TableBody, TableRow, TableCell, TableContainer, TablePagination,
} from '../../components/ui'

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

const MATERIAL_CONFIG: Record<ItemInventario['material'], { label: string; color: 'info' | 'primary' | 'success' | 'default' | 'warning' | 'error' }> = {
  papel: { label: 'Papel', color: 'info' },
  plastico: { label: 'Plástico', color: 'primary' },
  vidrio: { label: 'Vidrio', color: 'success' },
  metal: { label: 'Metal', color: 'default' },
  carton: { label: 'Cartón', color: 'warning' },
  electronico: { label: 'Electrónico', color: 'error' },
  organico: { label: 'Orgánico', color: 'success' },
}

const ESTADO_CONFIG: Record<ItemInventario['estado'], { label: string; color: 'success' | 'warning' | 'error' }> = {
  disponible: { label: 'Disponible', color: 'success' },
  bajo_stock: { label: 'Bajo stock', color: 'warning' },
  agotado: { label: 'Agotado', color: 'error' },
}

function StockBar({ actual, minimo }: { actual: number; minimo: number }) {
  const max = Math.max(actual, minimo) * 1.5 || 1
  const pct = Math.min((actual / max) * 100, 100)
  const color = actual === 0 ? '#f87171' : actual < minimo ? '#fbbf24' : '#34d399'
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Box sx={{ width: 64, height: 8, backgroundColor: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
        <Box sx={{ height: '100%', width: `${pct}%`, backgroundColor: color, borderRadius: 4 }} />
      </Box>
      <Typography variant="caption" fontFamily="monospace">{actual.toLocaleString('es-CO')} kg</Typography>
    </Box>
  )
}

const PAGE_SIZE = 8

export default function InventarioTable({ data, isLoading }: InventarioTableProps) {
  const [search, setSearch] = useState('')
  const [filtroMaterial, setFiltroMaterial] = useState<ItemInventario['material'] | ''>('')
  const [filtroEstado, setFiltroEstado] = useState<ItemInventario['estado'] | ''>('')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(PAGE_SIZE)

  const filtered = data.filter((item) => {
    const q = search.toLowerCase()
    return (
      (item.bodega.toLowerCase().includes(q) || MATERIAL_CONFIG[item.material].label.toLowerCase().includes(q)) &&
      (filtroMaterial === '' || item.material === filtroMaterial) &&
      (filtroEstado === '' || item.estado === filtroEstado)
    )
  })

  const paginated = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)

  if (isLoading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
  }

  return (
    <TableContainer>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.5, px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Input
          placeholder="Buscar por material o bodega..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0) }}
          fullWidth={false}
          sx={{ width: 240 }}
        />
        <TextField
          select size="small" value={filtroMaterial}
          onChange={(e) => { setFiltroMaterial(e.target.value as ItemInventario['material'] | ''); setPage(0) }}
          sx={{ width: 180 }}
        >
          <MenuItem value="">Todos los materiales</MenuItem>
          {Object.entries(MATERIAL_CONFIG).map(([k, v]) => (
            <MenuItem key={k} value={k}>{v.label}</MenuItem>
          ))}
        </TextField>
        <TextField
          select size="small" value={filtroEstado}
          onChange={(e) => { setFiltroEstado(e.target.value as ItemInventario['estado'] | ''); setPage(0) }}
          sx={{ width: 160 }}
        >
          <MenuItem value="">Todos los estados</MenuItem>
          {Object.entries(ESTADO_CONFIG).map(([k, v]) => (
            <MenuItem key={k} value={k}>{v.label}</MenuItem>
          ))}
        </TextField>
        <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
          {filtered.length} ítem{filtered.length !== 1 ? 's' : ''}
        </Typography>
      </Box>

      {filtered.length === 0 ? (
        <Box sx={{ py: 6, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            {search || filtroMaterial || filtroEstado ? 'Sin resultados para los filtros aplicados.' : 'No hay ítems en el inventario.'}
          </Typography>
        </Box>
      ) : (
        <>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Material</TableCell>
                <TableCell>Bodega</TableCell>
                <TableCell>Stock actual</TableCell>
                <TableCell align="right">Mínimo (kg)</TableCell>
                <TableCell align="right">Precio/kg</TableCell>
                <TableCell align="right">Valor total</TableCell>
                <TableCell>Actualizado</TableCell>
                <TableCell>Estado</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginated.map((item) => (
                <TableRow key={item.id} hover>
                  <TableCell><Badge label={MATERIAL_CONFIG[item.material].label} color={MATERIAL_CONFIG[item.material].color} /></TableCell>
                  <TableCell sx={{ fontWeight: 500 }}>{item.bodega}</TableCell>
                  <TableCell><StockBar actual={item.stock_kg} minimo={item.stock_min_kg} /></TableCell>
                  <TableCell align="right" sx={{ fontFamily: 'monospace', fontSize: '0.85rem', color: 'text.secondary' }}>{item.stock_min_kg.toLocaleString('es-CO')}</TableCell>
                  <TableCell align="right" sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>${item.precio_kg.toLocaleString('es-CO')}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>${(item.stock_kg * item.precio_kg).toLocaleString('es-CO')}</TableCell>
                  <TableCell sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>
                    {new Date(item.fecha_actualizacion).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </TableCell>
                  <TableCell><Badge label={ESTADO_CONFIG[item.estado].label} color={ESTADO_CONFIG[item.estado].color} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <TablePagination
            count={filtered.length} page={page} rowsPerPage={rowsPerPage}
            onPageChange={(_, p) => setPage(p)}
            onRowsPerPageChange={(e) => { setRowsPerPage(+e.target.value); setPage(0) }}
          />
        </>
      )}
    </TableContainer>
  )
}
