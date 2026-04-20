import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { Reciclador } from './RecicladoresTable'

interface ValidacionRecicladorModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  reciclador: Reciclador | null
  onSuccess?: () => void
}

interface FormState {
  carnet: string
  fechaAfil: string
  zona: string
  motivo: string
}

interface FormErrors {
  carnet?: string
  fechaAfil?: string
  zona?: string
  motivo?: string
}

const ZONAS = ['Norte', 'Sur', 'Centro', 'Occidente', 'Oriente']
const todayISO = () => new Date().toISOString().slice(0, 10)

export default function ValidacionRecicladorModal({ open, onOpenChange, reciclador, onSuccess }: ValidacionRecicladorModalProps) {
  const [form, setForm] = useState<FormState>({ carnet: '', fechaAfil: todayISO(), zona: '', motivo: '' })
  const [errors, setErrors] = useState<FormErrors>({})
  const [loading, setLoading] = useState(false)
  const [actionType, setActionType] = useState<'approve' | 'reject'>('approve')

  useEffect(() => {
    if (open) {
      setForm({ carnet: '', fechaAfil: todayISO(), zona: '', motivo: '' })
      setErrors({})
      setActionType('approve')
    }
  }, [open, reciclador])

  if (!reciclador) return null

  const handleSubmit = async (e: React.FormEvent, type: 'approve' | 'reject') => {
    e.preventDefault()
    setActionType(type)
    // Usamos setTimeout(0) para permitir que el state actualice el actionType antes de validar,
    // o validamos manualmente con el type actual:
    const eValidation: FormErrors = {}
    if (type === 'approve') {
      if (!form.carnet) eValidation.carnet = 'El n° de carnet es obligatorio'
      if (!form.fechaAfil) eValidation.fechaAfil = 'La fecha de afiliación es obligatoria'
      if (!form.zona) eValidation.zona = 'Debes seleccionar una zona'
    } else {
      if (!form.motivo) eValidation.motivo = 'Debes indicar un motivo de rechazo'
    }
    setErrors(eValidation)
    
    if (Object.keys(eValidation).length > 0) return

    setLoading(true)
    // Simular llamada a API: PATCH /api/v1/users/{id}/verify
    await new Promise((r) => setTimeout(r, 800))
    setLoading(false)
    onOpenChange(false)
    onSuccess?.()
  }

  const setField = (key: keyof FormState, value: string) => {
    setForm((f) => ({ ...f, [key]: value }))
    if (errors[key]) setErrors((er) => ({ ...er, [key]: undefined }))
  }

  const inputBase = 'w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Validar Reciclador ASOBEUM</DialogTitle>
          <DialogDescription>
            Validando a <span className="font-semibold text-gray-800">{reciclador.full_name}</span> (ID: {reciclador.id_number})
          </DialogDescription>
        </DialogHeader>

        {/* Tab switcher simulado para APROBAR vs RECHAZAR */}
        <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
          <button
            onClick={() => { setActionType('approve'); setErrors({}); }}
            className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${actionType === 'approve' ? 'bg-white shadow-sm text-green-700' : 'text-gray-500 hover:text-gray-700'}`}
          >
            ✅ Aprobar
          </button>
          <button
            onClick={() => { setActionType('reject'); setErrors({}); }}
            className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${actionType === 'reject' ? 'bg-white shadow-sm text-red-700' : 'text-gray-500 hover:text-gray-700'}`}
          >
            ❌ Rechazar
          </button>
        </div>

        <form className="flex flex-col gap-4 mt-2">
          {actionType === 'approve' ? (
            <>
              {/* N° Carnet */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700">N° de carnet ASOBEUM</label>
                <Input
                  value={form.carnet}
                  onChange={(e) => setField('carnet', e.target.value)}
                  placeholder="Ej: ASB-2026-001"
                  disabled={loading}
                  className={errors.carnet ? 'border-red-500 focus-visible:ring-red-500' : ''}
                />
                {errors.carnet && <span className="text-xs text-red-600">{errors.carnet}</span>}
              </div>

              {/* Fecha y Zona */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-gray-700">Fecha de afiliación</label>
                  <input
                    type="date"
                    value={form.fechaAfil}
                    onChange={(e) => setField('fechaAfil', e.target.value)}
                    max={todayISO()}
                    disabled={loading}
                    className={`${inputBase} ${errors.fechaAfil ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                  />
                  {errors.fechaAfil && <span className="text-xs text-red-600">{errors.fechaAfil}</span>}
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-gray-700">Zona asignada</label>
                  <select
                    value={form.zona}
                    onChange={(e) => setField('zona', e.target.value)}
                    disabled={loading}
                    className={`${inputBase} ${errors.zona ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                  >
                    <option value="">— Seleccionar —</option>
                    {ZONAS.map((z) => (
                      <option key={z} value={z}>{z}</option>
                    ))}
                  </select>
                  {errors.zona && <span className="text-xs text-red-600">{errors.zona}</span>}
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Motivo del rechazo</label>
              <textarea
                value={form.motivo}
                onChange={(e) => setField('motivo', e.target.value)}
                placeholder="Ej: El número de carnet no existe en la base de ASOBEUM..."
                disabled={loading}
                rows={3}
                className={`resize-none ${inputBase} ${errors.motivo ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
              />
              {errors.motivo && <span className="text-xs text-red-600">{errors.motivo}</span>}
            </div>
          )}

          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancelar
            </Button>
            {actionType === 'approve' ? (
              <Button type="button" onClick={(e) => handleSubmit(e, 'approve')} disabled={loading} className="bg-green-600 hover:bg-green-700 text-white">
                {loading ? 'Validando...' : 'Confirmar Aprobación'}
              </Button>
            ) : (
              <Button type="button" variant="destructive" onClick={(e) => handleSubmit(e, 'reject')} disabled={loading}>
                {loading ? 'Rechazando...' : 'Confirmar Rechazo'}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
