import { useQuery, useQueryClient } from '@tanstack/react-query'
import RecicladoresTable, { type Reciclador } from '../components/RecicladoresTable'
import { MOCK_RECICLADORES } from '../data/mockData'

const fetchRecicladores = async (): Promise<Reciclador[]> => {
  await new Promise((r) => setTimeout(r, 800))
  return MOCK_RECICLADORES
}

export default function Recicladores() {
  const queryClient = useQueryClient()
  const { data = [], isLoading } = useQuery({
    queryKey: ['recicladores'],
    queryFn: fetchRecicladores,
  })

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Recicladores</h1>
        <p className="text-sm text-gray-500 mt-1">Recicladores asociados a esta ECA</p>
      </div>
      <RecicladoresTable
        data={data}
        isLoading={isLoading}
        onValidationSuccess={() => queryClient.invalidateQueries({ queryKey: ['recicladores'] })}
      />
    </div>
  )
}
