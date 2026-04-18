import { useState, useRef, useEffect } from 'react'
import { useAuthStore } from '../hooks/useAuth'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface LoginFormProps {
  onSuccess?: () => void
}

interface FieldErrors {
  email?: string
  password?: string
}

export default function LoginForm({ onSuccess }: LoginFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const { login, isLoading, error } = useAuthStore()
  const emailRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    emailRef.current?.focus()
  }, [])

  const validate = (): boolean => {
    const errors: FieldErrors = {}
    if (!email) errors.email = 'El email es requerido'
    else if (!/\S+@\S+\.\S+/.test(email)) errors.email = 'Ingresa un email válido'
    if (!password) errors.password = 'La contraseña es requerida'
    else if (password.length < 6) errors.password = 'Mínimo 6 caracteres'
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    try {
      await login(email, password)
      onSuccess?.()
    } catch {
      // Error manejado por el store
    }
  }

  const clearError = (field: keyof FieldErrors) => {
    if (fieldErrors[field]) setFieldErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  return (
    <form
      className="bg-white rounded-xl shadow-md p-8 w-full flex flex-col gap-5"
      onSubmit={handleSubmit}
      noValidate
    >
      <h2 className="text-xl font-semibold text-center text-gray-800">Portal ECA — Somos R</h2>

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

      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-sm font-medium text-gray-700">Contraseña</label>
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
            {showPassword ? '🙈' : '👁️'}
          </button>
        </div>
        {fieldErrors.password && (
          <span className="text-xs text-red-600">{fieldErrors.password}</span>
        )}
      </div>

      {error && (
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md p-3 text-center">
          {error}
        </div>
      )}

      <Button
        type="submit"
        disabled={isLoading || !email || !password}
        className="w-full"
      >
        {isLoading ? 'Iniciando...' : 'Iniciar sesión'}
      </Button>
    </form>
  )
}
