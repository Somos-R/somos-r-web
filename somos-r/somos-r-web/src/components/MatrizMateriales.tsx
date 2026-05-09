import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { PRECIO_POR_MATERIAL } from './NuevoPesajeModal'

import { FileText, Droplet, GlassWater, Settings, Package, Calculator } from 'lucide-react'

const MATERIALES = [
  { key: 'papel',    label: 'Papel',    icon: <FileText className="w-4 h-4" />, color: 'text-blue-700    bg-blue-50    border-blue-200' },
  { key: 'plastico', label: 'Plástico', icon: <Droplet className="w-4 h-4" />, color: 'text-purple-700  bg-purple-50  border-purple-200' },
  { key: 'vidrio',   label: 'Vidrio',   icon: <GlassWater className="w-4 h-4" />, color: 'text-teal-700    bg-teal-50    border-teal-200' },
  { key: 'metal',    label: 'Metal',    icon: <Settings className="w-4 h-4" />, color: 'text-gray-700    bg-gray-50    border-gray-200' },
  { key: 'carton',   label: 'Cartón',   icon: <Package className="w-4 h-4" />, color: 'text-orange-700  bg-orange-50  border-orange-200' },
]

interface MatrizMaterialesProps {
  /** Callback opcional para pre-llenar el modal de pesaje con el material seleccionado */
  onSelectMaterial?: (material: string, kg: number) => void
}

export default function MatrizMateriales({ onSelectMaterial }: MatrizMaterialesProps) {
  const [open, setOpen] = useState(false)
  const [kgs, setKgs] = useState<Record<string, string>>({
    papel: '', plastico: '', vidrio: '', metal: '', carton: '',
  })

  const filas = useMemo(() =>
    MATERIALES.map((m) => {
      const kg  = parseFloat(kgs[m.key]) || 0
      const sub = kg * PRECIO_POR_MATERIAL[m.key]
      return { ...m, kg, subtotal: sub }
    }),
    [kgs]
  )

  const totalKg  = filas.reduce((s, f) => s + f.kg, 0)
  const totalCOP = filas.reduce((s, f) => s + f.subtotal, 0)

  const clearAll = () =>
    setKgs({ papel: '', plastico: '', vidrio: '', metal: '', carton: '' })

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      {/* Header colapsable */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="p-1.5 bg-gray-100 rounded-md"><Calculator className="w-5 h-5 text-gray-700" /></span>
          <div className="text-left">
            <p className="text-sm font-semibold text-gray-800">Calculadora de materiales</p>
            <p className="text-xs text-gray-500">Precios de referencia por kg · Sprint 4 US</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {totalCOP > 0 && (
            <span className="text-sm font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
              ${totalCOP.toLocaleString('es-CO')} COP
            </span>
          )}
          <span className={`text-gray-400 text-base transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
            ▾
          </span>
        </div>
      </button>

      {/* Contenido colapsable */}
      {open && (
        <div className="border-t border-gray-100">
          {/* Tabla */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left px-5 py-3 font-medium">Material</th>
                  <th className="text-right px-4 py-3 font-medium">Precio/kg</th>
                  <th className="text-center px-4 py-3 font-medium w-36">Kg ingresados</th>
                  <th className="text-right px-5 py-3 font-medium">Subtotal COP</th>
                  {onSelectMaterial && <th className="px-4 py-3"></th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filas.map((f) => (
                  <tr key={f.key} className="hover:bg-gray-50/50 transition-colors">
                    {/* Material */}
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${f.color}`}>
                        {f.icon} {f.label}
                      </span>
                    </td>
                    {/* Precio */}
                    <td className="px-4 py-3 text-right text-gray-600 tabular-nums">
                      ${PRECIO_POR_MATERIAL[f.key].toLocaleString('es-CO')}
                    </td>
                    {/* Input kg */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <input
                          id={`kg-${f.key}`}
                          type="number"
                          value={kgs[f.key]}
                          onChange={(e) => setKgs((prev) => ({ ...prev, [f.key]: e.target.value }))}
                          placeholder="0"
                          min="0"
                          step="0.1"
                          className="w-full rounded-md border border-gray-200 px-2.5 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary/30 tabular-nums"
                        />
                        <span className="text-gray-400 text-xs shrink-0">kg</span>
                      </div>
                    </td>
                    {/* Subtotal */}
                    <td className={`px-5 py-3 text-right font-medium tabular-nums ${f.subtotal > 0 ? 'text-emerald-700' : 'text-gray-300'}`}>
                      {f.subtotal > 0 ? `$${f.subtotal.toLocaleString('es-CO')}` : '—'}
                    </td>
                    {/* Botón usar en pesaje */}
                    {onSelectMaterial && (
                      <td className="px-4 py-3 text-center">
                        {f.kg > 0 && (
                          <button
                            type="button"
                            onClick={() => onSelectMaterial(f.key, f.kg)}
                            className="text-xs text-primary underline hover:text-primary/80"
                          >
                            Usar
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>

              {/* Fila de totales */}
              {totalKg > 0 && (
                <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                  <tr>
                    <td className="px-5 py-3 font-semibold text-gray-700">Total</td>
                    <td></td>
                    <td className="px-4 py-3 text-center font-semibold text-gray-700 tabular-nums">
                      {totalKg.toLocaleString('es-CO', { maximumFractionDigits: 1 })} kg
                    </td>
                    <td className="px-5 py-3 text-right font-bold text-emerald-700 tabular-nums">
                      ${totalCOP.toLocaleString('es-CO')}
                    </td>
                    {onSelectMaterial && <td></td>}
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* Acciones */}
          <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
            <p className="text-xs text-gray-400">
              * Precios de referencia. El valor final lo determina la ECA.
            </p>
            {totalKg > 0 && (
              <Button variant="outline" size="sm" onClick={clearAll} type="button">
                Limpiar
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
