import { useState, useRef, useEffect } from 'react'
import { useAuthStore } from '../hooks/useAuth'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Leaf, Eye, EyeOff, AlertTriangle, Info, Settings2 } from 'lucide-react'

interface LoginFormProps {
  onSuccess?: () => void
}

interface FieldErrors {
  email?: string
  password?: string
}

const DEV_PRESETS = [
  { label: 'Admin ECA + Asociación (todo)',  roles: ['operador_eca', 'admin_eca', 'admin_asociacion'] },
  { label: 'Solo Operador ECA',              roles: ['operador_eca'] },
  { label: 'Solo Admin ECA',                 roles: ['admin_eca'] },
  { label: 'Solo Admin Asociación',          roles: ['admin_asociacion'] },
  { label: 'Super Admin',                    roles: ['superadmin'] },
]

export default function LoginForm({ onSuccess }: LoginFormProps) {
  const [email, setEmail]               = useState('')
  const [password, setPassword]         = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [fieldErrors, setFieldErrors]   = useState<FieldErrors>({})
  const [infoMsg, setInfoMsg]           = useState<string | null>(null)
  const [devPreset, setDevPreset]       = useState(0)
  const { login, isLoading, error }     = useAuthStore()
  const emailRef = useRef<HTMLInputElement>(null)

  useEffect(() => { emailRef.current?.focus() }, [])

  const validate = (): boolean => {
    const errors: FieldErrors = {}
    if (!email)                                errors.email    = 'El email es requerido'
    else if (!/\S+@\S+\.\S+/.test(email))      errors.email    = 'Ingresa un email válido'
    if (!password)                             errors.password = 'La contraseña es requerida'
    else if (password.length < 6)             errors.password = 'Mínimo 6 caracteres'
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    try {
      const mockRoles = import.meta.env.DEV ? DEV_PRESETS[devPreset].roles : undefined
      await login(email, password, mockRoles)
      onSuccess?.()
    } catch {
      // Error manejado por el store
    }
  }

  const clearError = (field: keyof FieldErrors) => {
    if (fieldErrors[field]) setFieldErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  const showInfo = (msg: string) => {
    setInfoMsg(msg)
    setTimeout(() => setInfoMsg(null), 4000)
  }

  // Detecta si el error es de credenciales (401) para mensaje más específico
  const getErrorMessage = () => {
    if (!error) return null
    if (error.toLowerCase().includes('401') || error.toLowerCase().includes('credenciales') || error.toLowerCase().includes('login'))
      return 'Email o contraseña incorrectos. Verifica tus datos e intenta nuevamente.'
    if (error.toLowerCase().includes('403'))
      return 'Tu cuenta no tiene permisos para acceder al Portal ECA.'
    return error
  }

  return (
    <form
      className="bg-white rounded-xl shadow-md p-8 w-full flex flex-col gap-5"
      onSubmit={handleSubmit}
      noValidate
    >
      {/* Logo + título */}
      <div className="flex flex-col items-center gap-2 mb-1">
        <span className="p-2 bg-green-100 rounded-full"><Leaf className="w-8 h-8 text-green-600" /></span>
        <h2 className="text-xl font-semibold text-center text-gray-800">Portal — Somos R</h2>
        <p className="text-xs text-gray-400 text-center">Acceso para ECAs y Asociaciones</p>
      </div>

      {/* Campo email */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm font-medium text-gray-700">Email</label>
        <Input
          ref={emailRef}
          id="email"
          type="email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); clearError('email') }}
          placeholder="admin@eca.com"
          disabled={isLoading}
          className={fieldErrors.email ? 'border-red-500 focus-visible:ring-red-500' : ''}
        />
        {fieldErrors.email && (
          <span className="text-xs text-red-600">{fieldErrors.email}</span>
        )}
      </div>

      {/* Campo contraseña */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <label htmlFor="password" className="text-sm font-medium text-gray-700">Contraseña</label>
          <button
            type="button"
            className="text-xs text-primary hover:underline"
            onClick={() => showInfo('Recuperación de contraseña disponible próximamente. Contacta a tu administrador.')}
          >
            ¿Olvidaste tu contraseña?
          </button>
        </div>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => { setPassword(e.target.value); clearError('password') }}
            placeholder="••••••••"
            disabled={isLoading}
            className={`pr-10 ${fieldErrors.password ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
          />
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-base leading-none"
            onClick={() => setShowPassword((v) => !v)}
            tabIndex={-1}
            aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {fieldErrors.password && (
          <span className="text-xs text-red-600">{fieldErrors.password}</span>
        )}
      </div>

      {/* Error de autenticación */}
      {error && (
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md p-3 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 mt-0.5" />
          <span>{getErrorMessage()}</span>
        </div>
      )}

      {/* Mensaje informativo (ej: contraseña olvidada) */}
      {infoMsg && (
        <div className="text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded-md p-3 flex items-start gap-2">
          <Info className="w-4 h-4 mt-0.5" />
          <span>{infoMsg}</span>
        </div>
      )}

      {/* Selector de rol — solo en desarrollo */}
      {import.meta.env.DEV && (
        <div className="flex flex-col gap-1.5 border border-dashed border-amber-400 rounded-md p-3 bg-amber-50">
          <label className="text-xs font-semibold text-amber-700 flex items-center gap-1.5"><Settings2 className="w-3 h-3" /> Modo desarrollo — Rol a simular</label>
          <select
            value={devPreset}
            onChange={(e) => setDevPreset(Number(e.target.value))}
            className="text-sm rounded-md border border-amber-300 bg-white px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-400"
          >
            {DEV_PRESETS.map((p, i) => (
              <option key={i} value={i}>{p.label}</option>
            ))}
          </select>
        </div>
      )}

      {/* Botón submit */}
      <Button
        type="submit"
        disabled={isLoading || !email || !password}
        className="w-full"
      >
        {isLoading ? 'Iniciando sesión...' : 'Iniciar sesión'}
      </Button>

      {/* Link registro */}
      <p className="text-center text-xs text-gray-500">
        ¿No tienes cuenta?{' '}
        <button
          type="button"
          className="text-primary font-medium hover:underline"
          onClick={() => showInfo('El registro de administradores ECA se realiza a través del equipo Somos R. Escríbenos a soporte@somosr.co')}
        >
          Regístrate
        </button>
      </p>
    </form>
  )
}
