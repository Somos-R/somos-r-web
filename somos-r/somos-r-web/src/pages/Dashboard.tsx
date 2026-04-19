import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../hooks/useAuth'
import { Button } from '@/components/ui/button'

const METRICS = [
  { label: 'Recicladores activos', value: '12',   trend: '+2 este mes',   up: true,  icon: '♻️' },
  { label: 'Pesajes este mes',      value: '47',   trend: '+8 vs anterior', up: true,  icon: '⚖️' },
  { label: 'Solicitudes pendientes',value: '3',    trend: '−1 vs ayer',    up: false, icon: '📋' },
  { label: 'Kg recolectados',       value: '1.284',trend: '+124 kg',       up: true,  icon: '📦' },
]

const RECENT_PESAJES = [
  { reciclador: 'Carlos Mendoza', material: 'Papel',    kg: 32, fecha: '2026-04-18' },
  { reciclador: 'María Torres',   material: 'Plástico', kg: 15, fecha: '2026-04-17' },
  { reciclador: 'Juan Pérez',     material: 'Metal',    kg: 8,  fecha: '2026-04-17' },
  { reciclador: 'Ana Rodríguez',  material: 'Cartón',   kg: 45, fecha: '2026-04-16' },
  { reciclador: 'Luis Gómez',     material: 'Vidrio',   kg: 20, fecha: '2026-04-15' },
]

const ACCIONES = [
  { label: 'Nuevo pesaje',       icon: '⚖️', to: '/pesajes',      desc: 'Registrar un pesaje' },
  { label: 'Ver recicladores',   icon: '♻️', to: '/recicladores', desc: 'Padrón de recicladores' },
  { label: 'Ver reportes',       icon: '📈', to: '/reportes',     desc: 'Métricas y exportación' },
]

export default function Dashboard() {
  const { user } = useAuthStore()
  const navigate = useNavigate()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">
          Bienvenido, {user?.full_name ?? 'Admin'}
        </h1>
        <p className="text-sm text-gray-500 mt-1">Panel de control — Portal ECA</p>
      </div>

      {/* ── Tarjetas de métricas ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {METRICS.map((m) => (
          <div key={m.label} className="bg-white rounded-lg border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-2xl">{m.icon}</span>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                m.up ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
              }`}>
                {m.trend}
              </span>
            </div>
            <div className="text-3xl font-bold text-gray-900">{m.value}</div>
            <div className="text-sm text-gray-500 mt-1">{m.label}</div>
          </div>
        ))}
      </div>

      {/* ── Acciones rápidas ── */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-5 py-4 border-b">
          <h2 className="font-semibold text-gray-800">Acciones rápidas</h2>
        </div>
        <div className="flex flex-wrap gap-3 p-4">
          {ACCIONES.map((a) => (
            <Button
              key={a.to}
              id={`btn-accion-${a.to.replace('/', '')}`}
              variant="outline"
              onClick={() => navigate(a.to)}
              className="flex items-center gap-2 h-auto py-3 px-4"
            >
              <span className="text-lg">{a.icon}</span>
              <div className="text-left">
                <div className="text-sm font-medium">{a.label}</div>
                <div className="text-xs text-muted-foreground">{a.desc}</div>
              </div>
            </Button>
          ))}
        </div>
      </div>

      {/* ── Pesajes recientes ── */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">Pesajes recientes</h2>
          <a href="/pesajes" className="text-xs text-primary hover:underline">Ver todos →</a>
        </div>
        <ul className="divide-y divide-gray-100">
          {RECENT_PESAJES.map((p, i) => (
            <li key={i} className="flex items-center justify-between px-5 py-3 text-sm">
              <div>
                <span className="font-medium text-gray-800">{p.reciclador}</span>
                <span className="ml-2 text-gray-400 text-xs">{p.material}</span>
              </div>
              <div className="flex items-center gap-4 text-gray-500">
                <span className="font-medium">{p.kg} kg</span>
                <span className="text-xs text-gray-400">
                  {new Date(p.fecha).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
