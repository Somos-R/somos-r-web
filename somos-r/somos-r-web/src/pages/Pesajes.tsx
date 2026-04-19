import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import PesajesTable, { type Pesaje } from '../components/PesajesTable'
import NuevoPesajeModal from '../components/NuevoPesajeModal'
import MatrizMateriales from '../components/MatrizMateriales'
import { Button } from '@/components/ui/button'
import { MOCK_PESAJES } from '../data/mockData'

const fetchPesajes = async (): Promise<Pesaje[]> => {
  await new Promise((r) => setTimeout(r, 800))
  return MOCK_PESAJES
}

export default function Pesajes() {
  const [modalOpen, setModalOpen] = useState(false)
  const [preselect, setPreselect] = useState<{ material?: string; kg?: number }>({})
  const queryClient = useQueryClient()

  const { data = [], isLoading } = useQuery({
    queryKey: ['pesajes'],
    queryFn: fetchPesajes,
  })

  // "Usar" desde MatrizMateriales → pre-llena el modal
  const handleUsarMaterial = (material: string, kg: number) => {
    setPreselect({ material, kg })
    setModalOpen(true)
  }

  const handleSuccess = () => {
    // Cuando el backend esté listo: queryClient.invalidateQueries({ queryKey: ['pesajes'] })
    void queryClient.invalidateQueries({ queryKey: ['pesajes'] })
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Pesajes</h1>
          <p className="text-sm text-gray-500 mt-1">Registro y validación de pesajes por material</p>
        </div>
        <Button id="btn-nuevo-pesaje" onClick={() => { setPreselect({}); setModalOpen(true) }}>
          ⚖️ Nuevo pesaje
        </Button>
      </div>

      {/* Calculadora de materiales */}
      <MatrizMateriales onSelectMaterial={handleUsarMaterial} />

      {/* Tabla de pesajes */}
      <PesajesTable data={data} isLoading={isLoading} />

      {/* Modal */}
      <NuevoPesajeModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSuccess={handleSuccess}
        defaultMaterial={preselect.material}
        defaultKg={preselect.kg}
      />
    </div>
  )
}
