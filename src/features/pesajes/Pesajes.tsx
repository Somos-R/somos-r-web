import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { useQuery } from '@tanstack/react-query'
import PesajesTable, { type Pesaje } from './PesajesTable'

const MOCK_PESAJES: Pesaje[] = [
  { id: '1', fecha: '2026-04-18', reciclador_nombre: 'Carlos Mendez', material: 'papel', kg: 32, precio_kg: 350, estado: 'validado' },
  { id: '2', fecha: '2026-04-17', reciclador_nombre: 'María López', material: 'plastico', kg: 15, precio_kg: 500, estado: 'pagado' },
  { id: '3', fecha: '2026-04-17', reciclador_nombre: 'Juan Torres', material: 'metal', kg: 8, precio_kg: 1200, estado: 'validado' },
  { id: '4', fecha: '2026-04-16', reciclador_nombre: 'Ana Gómez', material: 'carton', kg: 45, precio_kg: 280, estado: 'pagado' },
  { id: '5', fecha: '2026-04-15', reciclador_nombre: 'Pedro Ruiz', material: 'vidrio', kg: 20, precio_kg: 150, estado: 'pendiente' },
  { id: '6', fecha: '2026-04-15', reciclador_nombre: 'Carlos Mendez', material: 'carton', kg: 60, precio_kg: 280, estado: 'pagado' },
  { id: '7', fecha: '2026-04-14', reciclador_nombre: 'Laura Sánchez', material: 'papel', kg: 25, precio_kg: 350, estado: 'validado' },
  { id: '8', fecha: '2026-04-14', reciclador_nombre: 'David Herrera', material: 'plastico', kg: 18, precio_kg: 500, estado: 'pendiente' },
  { id: '9', fecha: '2026-04-13', reciclador_nombre: 'María López', material: 'metal', kg: 12, precio_kg: 1200, estado: 'pagado' },
  { id: '10', fecha: '2026-04-12', reciclador_nombre: 'Juan Torres', material: 'vidrio', kg: 35, precio_kg: 150, estado: 'validado' },
  { id: '11', fecha: '2026-04-12', reciclador_nombre: 'Ana Gómez', material: 'papel', kg: 40, precio_kg: 350, estado: 'pagado' },
  { id: '12', fecha: '2026-04-11', reciclador_nombre: 'Pedro Ruiz', material: 'plastico', kg: 22, precio_kg: 500, estado: 'validado' },
  { id: '13', fecha: '2026-04-10', reciclador_nombre: 'Laura Sánchez', material: 'carton', kg: 55, precio_kg: 280, estado: 'pagado' },
  { id: '14', fecha: '2026-04-09', reciclador_nombre: 'David Herrera', material: 'metal', kg: 5, precio_kg: 1200, estado: 'pendiente' },
  { id: '15', fecha: '2026-04-08', reciclador_nombre: 'Carlos Mendez', material: 'papel', kg: 28, precio_kg: 350, estado: 'pagado' },
]

const fetchPesajes = async (): Promise<Pesaje[]> => {
  // Mock — reemplazar con: apiClient.get('/api/v1/pesajes')
  await new Promise((r) => setTimeout(r, 800))
  return MOCK_PESAJES
}

export default function Pesajes() {
  const { data = [], isLoading } = useQuery({ queryKey: ['pesajes'], queryFn: fetchPesajes })

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box>
        <Typography variant="h5" fontWeight={600}>Pesajes</Typography>
        <Typography variant="body2" color="text.secondary" mt={0.5}>Registro y validación de pesajes por material</Typography>
      </Box>
      <PesajesTable data={data} isLoading={isLoading} />
    </Box>
  )
}
