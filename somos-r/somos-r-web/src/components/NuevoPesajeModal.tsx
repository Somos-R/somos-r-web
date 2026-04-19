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
import { MOCK_RECICLADORES } from '../data/mockData'

// ── Precios de referencia por material ──────────
export const PRECIO_POR_MATERIAL: Record<string, number> = {
  papel:    350,
  plastico: 500,
  vidrio:   150,
  metal:    1200,
  carton:   280,
}

const MATERIAL_LABELS: Record<string, string> = {
  papel: 'Papel',
  plastico: 'Plástico',
  vidrio: 'Vidrio',
  metal: 'Metal',
  carton: 'Cartón',
}

interface NuevoPesajeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  defaultMaterial?: string
  defaultKg?: number
}

interface FormState {
  reciclador_id: string
  material: string
  kg: string
  fecha: string
}

interface FormErrors {
  reciclador_id?: string
  material?: string
  kg?: string
  fecha?: string
}

const todayISO = () => new Date().toISOString().slice(0, 10)

const recicladores_verificados = MOCK_RECICLADORES.filter((r) => r.status === 'verified')

export default function NuevoPesajeModal({ open, onOpenChange, onSuccess, defaultMaterial, defaultKg }: NuevoPesajeModalProps) {
  const [form, setForm] = useState<FormState>({
    reciclador_id: '',
    material: '',
    kg: '',
    fecha: todayISO(),
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState(false)

  // Reset al abrir — aplica preselección si viene desde MatrizMateriales
  useEffect(() => {
    if (open) {
      setForm({
        reciclador_id: '',
        material: defaultMaterial ?? '',
        kg: defaultKg ? String(defaultKg) : '',
        fecha: todayISO(),
      })
      setErrors({})
      setLoading(false)
    }
  }, [open, defaultMaterial, defaultKg])

  const precioPorKg = form.material ? PRECIO_POR_MATERIAL[form.material] : null
  const totalCOP    = precioPorKg && form.kg ? parseFloat(form.kg) * precioPorKg : null

  const validate = (): boolean => {
    const e: FormErrors = {}
    if (!form.reciclador_id) e.reciclador_id = 'Selecciona un reciclador'
    if (!form.material)      e.material      = 'Selecciona el material'
    if (!form.kg)            e.kg            = 'Ingresa el peso'
    else if (isNaN(parseFloat(form.kg)) || parseFloat(form.kg) <= 0)
      e.kg = 'Ingresa un peso válido mayor a 0'
    if (!form.fecha)         e.fecha         = 'Selecciona una fecha'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    // Mock — reemplazar con: await pesajesApi.create({ ...form })
    await new Promise((r) => setTimeout(r, 900))
    setLoading(false)
    setToast(true)
    setTimeout(() => {
      setToast(false)
      onOpenChange(false)
      onSuccess?.()
    }, 1500)
  }

  const setField = (key: keyof FormState, value: string) => {
    setForm((f) => ({ ...f, [key]: value }))
    if (errors[key]) setErrors((er) => ({ ...er, [key]: undefined }))
  }

  const inputBase = 'w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0 disabled:opacity-50'
  const errorBorder = 'border-red-500 focus:ring-red-500'

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>⚖️ Registrar nuevo pesaje</DialogTitle>
            <DialogDescription>
              Completa los datos del material recolectado.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4 pt-1">

            {/* Reciclador */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Reciclador</label>
              <select
                value={form.reciclador_id}
                onChange={(e) => setField('reciclador_id', e.target.value)}
                disabled={loading}
                className={`${inputBase} ${errors.reciclador_id ? errorBorder : ''}`}
              >
                <option value="">— Seleccionar reciclador —</option>
                {recicladores_verificados.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.full_name} · {r.id_number}
                  </option>
                ))}
              </select>
              {errors.reciclador_id && <span className="text-xs text-red-600">{errors.reciclador_id}</span>}
            </div>

            {/* Material */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Material</label>
              <select
                value={form.material}
                onChange={(e) => setField('material', e.target.value)}
                disabled={loading}
                className={`${inputBase} ${errors.material ? errorBorder : ''}`}
              >
                <option value="">— Seleccionar material —</option>
                {Object.entries(MATERIAL_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label} — ${PRECIO_POR_MATERIAL[key].toLocaleString('es-CO')}/kg
                  </option>
                ))}
              </select>
              {errors.material && <span className="text-xs text-red-600">{errors.material}</span>}
            </div>

            {/* Fecha + Kg en fila */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700">Fecha</label>
                <input
                  type="date"
                  value={form.fecha}
                  onChange={(e) => setField('fecha', e.target.value)}
                  disabled={loading}
                  max={todayISO()}
                  className={`${inputBase} ${errors.fecha ? errorBorder : ''}`}
                />
                {errors.fecha && <span className="text-xs text-red-600">{errors.fecha}</span>}
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700">Peso (kg)</label>
                <Input
                  type="number"
                  value={form.kg}
                  onChange={(e) => setField('kg', e.target.value)}
                  disabled={loading}
                  placeholder="0.0"
                  min="0.1"
                  step="0.1"
                  className={errors.kg ? 'border-red-500 focus-visible:ring-red-500' : ''}
                />
                {errors.kg && <span className="text-xs text-red-600">{errors.kg}</span>}
              </div>
            </div>

            {/* Resumen calculado */}
            {precioPorKg && (
              <div className="rounded-lg bg-gray-50 border border-gray-200 px-4 py-3 grid grid-cols-2 gap-2 text-sm">
                <div className="text-gray-500">Precio referencia</div>
                <div className="text-right font-medium">${precioPorKg.toLocaleString('es-CO')}/kg</div>
                <div className="text-gray-500">Total estimado</div>
                <div className="text-right font-semibold text-emerald-700">
                  {totalCOP ? `$${totalCOP.toLocaleString('es-CO')} COP` : '—'}
                </div>
              </div>
            )}

            <DialogFooter className="gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                Cancelar
              </Button>
              <Button
                id="btn-submit-pesaje"
                type="submit"
                disabled={loading || !form.reciclador_id || !form.material || !form.kg}
              >
                {loading ? 'Registrando...' : 'Registrar pesaje'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Toast de éxito */}
      {toast && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-5 py-3 rounded-lg text-sm font-medium shadow-lg z-[200]"
          style={{ animation: 'slideUp 0.3s ease' }}
        >
          ✅ Pesaje registrado exitosamente
        </div>
      )}
    </>
  )
}
