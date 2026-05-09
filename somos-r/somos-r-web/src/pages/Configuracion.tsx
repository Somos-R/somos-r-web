import { useState } from 'react'
import { useAuthStore } from '../hooks/useAuth'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2 } from 'lucide-react'

// ── Tipos de rol → label visible ──
const ROLE_CONFIG: Record<string, { label: string; className: string }> = {
  admin:    { label: 'Administrador ECA', className: 'bg-blue-100 text-blue-800 border-blue-200' },
  recycler: { label: 'Reciclador',        className: 'bg-green-100 text-green-800 border-green-200' },
  citizen:  { label: 'Ciudadano',         className: 'bg-gray-100 text-gray-700 border-gray-200' },
}

interface Toast { type: 'success' | 'error'; message: string }

export default function Configuracion() {
  const { user } = useAuthStore()

  // ── Formulario cambio de contraseña (mock) ──
  const [pw, setPw]           = useState({ current: '', next: '', confirm: '' })
  const [pwErrors, setPwErrors] = useState<Partial<typeof pw>>({})
  const [pwLoading, setPwLoading] = useState(false)
  const [toast, setToast]     = useState<Toast | null>(null)

  const showToast = (t: Toast) => {
    setToast(t)
    setTimeout(() => setToast(null), 3500)
  }

  const validatePw = () => {
    const errs: Partial<typeof pw> = {}
    if (!pw.current)                       errs.current = 'Ingresa tu contraseña actual'
    if (!pw.next)                          errs.next    = 'Ingresa la nueva contraseña'
    else if (pw.next.length < 8)           errs.next    = 'Mínimo 8 caracteres'
    if (pw.next !== pw.confirm)            errs.confirm = 'Las contraseñas no coinciden'
    setPwErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handlePwSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validatePw()) return
    setPwLoading(true)
    // Mock: simular delay de red
    await new Promise((r) => setTimeout(r, 1000))
    setPwLoading(false)
    setPw({ current: '', next: '', confirm: '' })
    setPwErrors({})
    showToast({ type: 'success', message: 'Contraseña actualizada exitosamente' })
  }

  // Helper para limpiar error al escribir
  const clearPwError = (field: keyof typeof pw) => {
    if (pwErrors[field]) setPwErrors((p) => ({ ...p, [field]: undefined }))
  }

  // Datos visibles del usuario (de useAuthStore)
  const roleConfig = ROLE_CONFIG[user?.role ?? 'admin'] ?? ROLE_CONFIG.admin
  const ecaId       = user && 'eca_id'       in user ? (user as { eca_id: string }).eca_id : '—'
  const empCode     = user && 'employee_code' in user ? (user as { employee_code: string }).employee_code : '—'

  return (
    <div className="flex flex-col gap-6 max-w-2xl">

      {/* ── Header ── */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Configuración</h1>
        <p className="text-sm text-gray-500 mt-1">Ajustes del portal y datos de tu cuenta</p>
      </div>

      {/* ── Perfil del usuario ── */}
      <section className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b bg-gray-50">
          <h2 className="font-semibold text-gray-800">Mi perfil</h2>
          <p className="text-xs text-gray-400 mt-0.5">Datos de tu cuenta — solo lectura</p>
        </div>
        <div className="px-5 py-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Nombre */}
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Nombre completo</label>
            <p className="mt-1 text-sm font-medium text-gray-900">{user?.full_name ?? '—'}</p>
          </div>
          {/* Email */}
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Email</label>
            <p className="mt-1 text-sm text-gray-900">{user?.email ?? '—'}</p>
          </div>
          {/* Rol */}
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Rol</label>
            <div className="mt-1">
              <Badge className={roleConfig.className}>{roleConfig.label}</Badge>
            </div>
          </div>
          {/* Estado */}
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Estado de cuenta</label>
            <div className="mt-1">
              <Badge className="bg-green-100 text-green-800 border-green-200">
                {user?.status === 'active' ? 'Activo' : user?.status ?? '—'}
              </Badge>
            </div>
          </div>
        </div>
      </section>

      {/* ── Datos ECA ── */}
      <section className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b bg-gray-50">
          <h2 className="font-semibold text-gray-800">Datos de la ECA</h2>
          <p className="text-xs text-gray-400 mt-0.5">Información de la estación de clasificación</p>
        </div>
        <div className="px-5 py-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">ID de la ECA</label>
            <p className="mt-1 text-sm font-mono font-medium text-gray-900">{ecaId}</p>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Código de empleado</label>
            <p className="mt-1 text-sm font-mono font-medium text-gray-900">{empCode}</p>
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Dirección ECA</label>
            <p className="mt-1 text-sm text-gray-500 italic">Disponible cuando se conecte el backend</p>
          </div>
        </div>
      </section>

      {/* ── Cambiar contraseña ── */}
      <section className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b bg-gray-50">
          <h2 className="font-semibold text-gray-800">Cambiar contraseña</h2>
          <p className="text-xs text-gray-400 mt-0.5">Mínimo 8 caracteres</p>
        </div>
        <form onSubmit={handlePwSubmit} noValidate className="px-5 py-5 flex flex-col gap-4">
          {/* Contraseña actual */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="pw-current" className="text-sm font-medium text-gray-700">
              Contraseña actual
            </label>
            <Input
              id="pw-current"
              type="password"
              value={pw.current}
              onChange={(e) => { setPw((p) => ({ ...p, current: e.target.value })); clearPwError('current') }}
              placeholder="••••••••"
              disabled={pwLoading}
              className={pwErrors.current ? 'border-red-500 focus-visible:ring-red-500' : ''}
            />
            {pwErrors.current && <span className="text-xs text-red-600">{pwErrors.current}</span>}
          </div>

          {/* Nueva contraseña */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="pw-next" className="text-sm font-medium text-gray-700">
              Nueva contraseña
            </label>
            <Input
              id="pw-next"
              type="password"
              value={pw.next}
              onChange={(e) => { setPw((p) => ({ ...p, next: e.target.value })); clearPwError('next') }}
              placeholder="••••••••"
              disabled={pwLoading}
              className={pwErrors.next ? 'border-red-500 focus-visible:ring-red-500' : ''}
            />
            {pwErrors.next && <span className="text-xs text-red-600">{pwErrors.next}</span>}
          </div>

          {/* Confirmar */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="pw-confirm" className="text-sm font-medium text-gray-700">
              Confirmar nueva contraseña
            </label>
            <Input
              id="pw-confirm"
              type="password"
              value={pw.confirm}
              onChange={(e) => { setPw((p) => ({ ...p, confirm: e.target.value })); clearPwError('confirm') }}
              placeholder="••••••••"
              disabled={pwLoading}
              className={pwErrors.confirm ? 'border-red-500 focus-visible:ring-red-500' : ''}
            />
            {pwErrors.confirm && <span className="text-xs text-red-600">{pwErrors.confirm}</span>}
          </div>

          <Button
            id="btn-save-password"
            type="submit"
            disabled={pwLoading || !pw.current || !pw.next || !pw.confirm}
            className="self-start"
          >
            {pwLoading ? 'Guardando...' : 'Actualizar contraseña'}
          </Button>
        </form>
      </section>

      {/* ── Toast ── */}
      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 px-5 py-3 rounded-lg text-sm font-medium shadow-lg z-50 flex items-center gap-2
          ${toast.type === 'success' ? 'bg-gray-900 text-white' : 'bg-red-600 text-white'}`}
          style={{ animation: 'slideUp 0.3s ease' }}>
          {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-green-400" />}
          {toast.message}
        </div>
      )}
    </div>
  )
}
