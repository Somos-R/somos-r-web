import { useAuthStore } from '../hooks/useAuth'

const METRICS = [
  { label: 'Recicladores activos', value: '12',   trend: '+2 este mes',   up: true,  icon: '♻️' },
  { label: 'Pesajes este mes',      value: '47',   trend: '+8 vs anterior', up: true,  icon: '⚖️' },
  { label: 'Solicitudes pendientes',value: '3',    trend: '−1 vs ayer',    up: false, icon: '📋' },
  { label: 'Kg recolectados',       value: '1.284',trend: '+124 kg',       up: true,  icon: '📦' },
]

const RECENT_PESAJES = [
  { reciclador: 'Carlos Mendez', material: 'Papel',    kg: 32, fecha: '2026-04-18' },
  { reciclador: 'María López',   material: 'Plástico', kg: 15, fecha: '2026-04-17' },
  { reciclador: 'Juan Torres',   material: 'Metal',    kg: 8,  fecha: '2026-04-17' },
  { reciclador: 'Ana Gómez',     material: 'Cartón',   kg: 45, fecha: '2026-04-16' },
  { reciclador: 'Pedro Ruiz',    material: 'Vidrio',   kg: 20, fecha: '2026-04-15' },
]

export default function Dashboard() {
  const { user } = useAuthStore()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">
          Bienvenido, {user?.full_name ?? 'Admin'}
        </h1>
        <p className="text-sm text-gray-500 mt-1">Panel de control — Portal ECA</p>
      </div>

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
