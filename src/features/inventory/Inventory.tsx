import Box from '@mui/material/Box'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'
import { useQuery } from '@tanstack/react-query'
import InventoryTable, { type InventoryItem } from './InventoryTable'
import { Card, CardContent } from '../../components/ui'
import { t, interpolate } from '../../lib/i18n'

const MOCK_INVENTORY: InventoryItem[] = [
  { id: '1', material: 'papel', stock_kg: 320, stock_min_kg: 100, precio_kg: 350, bodega: 'Bodega Norte', fecha_actualizacion: '2026-05-06', estado: 'disponible' },
  { id: '2', material: 'plastico', stock_kg: 85, stock_min_kg: 100, precio_kg: 500, bodega: 'Bodega Norte', fecha_actualizacion: '2026-05-06', estado: 'bajo_stock' },
  { id: '3', material: 'vidrio', stock_kg: 210, stock_min_kg: 80, precio_kg: 150, bodega: 'Bodega Sur', fecha_actualizacion: '2026-05-05', estado: 'disponible' },
  { id: '4', material: 'metal', stock_kg: 0, stock_min_kg: 50, precio_kg: 1200, bodega: 'Bodega Sur', fecha_actualizacion: '2026-05-04', estado: 'agotado' },
  { id: '5', material: 'carton', stock_kg: 580, stock_min_kg: 150, precio_kg: 280, bodega: 'Punto Central', fecha_actualizacion: '2026-05-07', estado: 'disponible' },
  { id: '6', material: 'electronico', stock_kg: 42, stock_min_kg: 60, precio_kg: 2500, bodega: 'Punto Central', fecha_actualizacion: '2026-05-03', estado: 'bajo_stock' },
  { id: '7', material: 'organico', stock_kg: 195, stock_min_kg: 200, precio_kg: 80, bodega: 'Bodega Norte', fecha_actualizacion: '2026-05-07', estado: 'bajo_stock' },
  { id: '8', material: 'papel', stock_kg: 140, stock_min_kg: 100, precio_kg: 350, bodega: 'Bodega Sur', fecha_actualizacion: '2026-05-05', estado: 'disponible' },
  { id: '9', material: 'plastico', stock_kg: 230, stock_min_kg: 100, precio_kg: 500, bodega: 'Punto Central', fecha_actualizacion: '2026-05-06', estado: 'disponible' },
  { id: '10', material: 'metal', stock_kg: 75, stock_min_kg: 50, precio_kg: 1200, bodega: 'Bodega Norte', fecha_actualizacion: '2026-05-04', estado: 'disponible' },
  { id: '11', material: 'vidrio', stock_kg: 0, stock_min_kg: 80, precio_kg: 150, bodega: 'Punto Central', fecha_actualizacion: '2026-05-02', estado: 'agotado' },
  { id: '12', material: 'carton', stock_kg: 60, stock_min_kg: 150, precio_kg: 280, bodega: 'Bodega Sur', fecha_actualizacion: '2026-05-05', estado: 'bajo_stock' },
  { id: '13', material: 'electronico', stock_kg: 110, stock_min_kg: 60, precio_kg: 2500, bodega: 'Bodega Norte', fecha_actualizacion: '2026-05-06', estado: 'disponible' },
  { id: '14', material: 'organico', stock_kg: 340, stock_min_kg: 200, precio_kg: 80, bodega: 'Bodega Sur', fecha_actualizacion: '2026-05-07', estado: 'disponible' },
]

const fetchInventory = async (): Promise<InventoryItem[]> => {
  await new Promise((r) => setTimeout(r, 800))
  return MOCK_INVENTORY
}

interface StatCardProps { label: string; value: string; sub: string; color?: string }

function StatCard({ label, value, sub, color = 'text.primary' }: StatCardProps) {
  return (
    <Card>
      <CardContent>
        <Typography variant="caption" color="text.secondary" textTransform="uppercase" letterSpacing={0.5}>{label}</Typography>
        <Typography variant="h5" fontWeight={700} color={color} mt={0.5}>{value}</Typography>
        <Typography variant="caption" color="text.secondary">{sub}</Typography>
      </CardContent>
    </Card>
  )
}

export default function Inventory() {
  const { data = [], isLoading } = useQuery({ queryKey: ['inventory'], queryFn: fetchInventory })

  const totalKg = data.reduce((sum, i) => sum + i.stock_kg, 0)
  const totalValue = data.reduce((sum, i) => sum + i.stock_kg * i.precio_kg, 0)
  const available = data.filter((i) => i.estado === 'disponible').length
  const alerts = data.filter((i) => i.estado === 'bajo_stock' || i.estado === 'agotado').length

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box>
        <Typography variant="h5" fontWeight={600}>{t.inventario.title}</Typography>
        <Typography variant="body2" color="text.secondary" mt={0.5}>{t.inventario.subtitle}</Typography>
      </Box>

      <Grid container spacing={2}>
        <Grid item xs={6} sm={3}>
          <StatCard
            label={t.inventario.stats.totalStock}
            value={`${totalKg.toLocaleString('es-CO')} kg`}
            sub={t.inventario.stats.totalStockSub}
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard
            label={t.inventario.stats.inventoryValue}
            value={`$${totalValue.toLocaleString('es-CO')}`}
            sub={t.inventario.stats.inventoryValueSub}
            color="success.dark"
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard
            label={t.inventario.stats.available}
            value={String(available)}
            sub={interpolate(t.inventario.stats.availableSub, { total: data.length })}
            color="success.main"
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard
            label={t.inventario.stats.alerts}
            value={String(alerts)}
            sub={t.inventario.stats.alertsSub}
            color={alerts > 0 ? 'error.main' : 'text.disabled'}
          />
        </Grid>
      </Grid>

      <InventoryTable data={data} isLoading={isLoading} />
    </Box>
  )
}
