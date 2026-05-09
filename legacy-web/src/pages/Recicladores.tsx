import { useQuery } from '@tanstack/react-query'
import RecicladoresTable, { type Reciclador } from '../components/RecicladoresTable'

const MOCK_RECICLADORES: Reciclador[] = [
  { id: '1', full_name: 'Carlos Mendoza', id_number: '80234567', phone: '3156789012', status: 'verified', created_at: '2026-01-15T10:00:00Z' },
  { id: '2', full_name: 'María Torres', id_number: '52456789', phone: '3109876543', status: 'verified', created_at: '2026-01-20T10:00:00Z' },
  { id: '3', full_name: 'Juan Pérez', id_number: '1023456789', phone: '3001234567', status: 'pending', created_at: '2026-02-03T10:00:00Z' },
  { id: '4', full_name: 'Ana Rodríguez', id_number: '30567890', phone: null, status: 'pending', created_at: '2026-02-10T10:00:00Z' },
  { id: '5', full_name: 'Luis Gómez', id_number: '79345678', phone: '3012345678', status: 'verified', created_at: '2026-02-18T10:00:00Z' },
  { id: '6', full_name: 'Sandra Vargas', id_number: '41234567', phone: '3187654321', status: 'rejected', created_at: '2026-03-01T10:00:00Z' },
  { id: '7', full_name: 'Pedro Castillo', id_number: '1098765432', phone: '3223456789', status: 'verified', created_at: '2026-03-05T10:00:00Z' },
  { id: '8', full_name: 'Rosa Martínez', id_number: '65432198', phone: '3134567890', status: 'pending', created_at: '2026-03-12T10:00:00Z' },
  { id: '9', full_name: 'Diego Herrera', id_number: '19876543', phone: '3045678901', status: 'verified', created_at: '2026-03-20T10:00:00Z' },
  { id: '10', full_name: 'Claudia Mora', id_number: '55667788', phone: null, status: 'verified', created_at: '2026-04-01T10:00:00Z' },
]

const fetchRecicladores = async (): Promise<Reciclador[]> => {
  // Mock delay — reemplazar con: axios.get('/api/v1/users?user_type=recycler')
  await new Promise((r) => setTimeout(r, 800))
  return MOCK_RECICLADORES
}

export default function Recicladores() {
  const { data = [], isLoading } = useQuery({
    queryKey: ['recicladores'],
    queryFn: fetchRecicladores,
  })

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ margin: 0, color: '#111827' }}>Recicladores</h1>
          <p style={{ margin: '0.25rem 0 0', color: '#6b7280' }}>
            Recicladores asociados a esta ECA
          </p>
        </div>
      </div>

      <RecicladoresTable data={data} isLoading={isLoading} />
    </div>
  )
}
