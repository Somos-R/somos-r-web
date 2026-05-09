import type { Reciclador } from '../components/RecicladoresTable'
import type { Pesaje } from '../components/PesajesTable'

// ──────────────────────────────────────────────
// Mock Recicladores
// Fuente única: importado por Recicladores.tsx y Reportes.tsx
// ──────────────────────────────────────────────
export const MOCK_RECICLADORES: Reciclador[] = [
  { id: '1',  full_name: 'Carlos Mendoza',  id_number: '80234567',   phone: '3156789012', status: 'verified', created_at: '2026-01-15T10:00:00Z' },
  { id: '2',  full_name: 'María Torres',    id_number: '52456789',   phone: '3109876543', status: 'verified', created_at: '2026-01-20T10:00:00Z' },
  { id: '3',  full_name: 'Juan Pérez',      id_number: '1023456789', phone: '3001234567', status: 'pending',  created_at: '2026-02-03T10:00:00Z' },
  { id: '4',  full_name: 'Ana Rodríguez',   id_number: '30567890',   phone: null,         status: 'pending',  created_at: '2026-02-10T10:00:00Z' },
  { id: '5',  full_name: 'Luis Gómez',      id_number: '79345678',   phone: '3012345678', status: 'verified', created_at: '2026-02-18T10:00:00Z' },
  { id: '6',  full_name: 'Sandra Vargas',   id_number: '41234567',   phone: '3187654321', status: 'rejected', created_at: '2026-03-01T10:00:00Z' },
  { id: '7',  full_name: 'Pedro Castillo',  id_number: '1098765432', phone: '3223456789', status: 'verified', created_at: '2026-03-05T10:00:00Z' },
  { id: '8',  full_name: 'Rosa Martínez',   id_number: '65432198',   phone: '3134567890', status: 'pending',  created_at: '2026-03-12T10:00:00Z' },
  { id: '9',  full_name: 'Diego Herrera',   id_number: '19876543',   phone: '3045678901', status: 'verified', created_at: '2026-03-20T10:00:00Z' },
  { id: '10', full_name: 'Claudia Mora',    id_number: '55667788',   phone: null,         status: 'verified', created_at: '2026-04-01T10:00:00Z' },
]

// ──────────────────────────────────────────────
// Mock Pesajes
// Fuente única: importado por Pesajes.tsx y Reportes.tsx
// ──────────────────────────────────────────────
export const MOCK_PESAJES: Pesaje[] = [
  { id: '1',  fecha: '2026-04-18', reciclador_nombre: 'Carlos Mendoza',  material: 'papel',    kg: 32, precio_kg: 350,  estado: 'validado'  },
  { id: '2',  fecha: '2026-04-17', reciclador_nombre: 'María Torres',    material: 'plastico', kg: 15, precio_kg: 500,  estado: 'pagado'    },
  { id: '3',  fecha: '2026-04-17', reciclador_nombre: 'Juan Pérez',      material: 'metal',    kg: 8,  precio_kg: 1200, estado: 'validado'  },
  { id: '4',  fecha: '2026-04-16', reciclador_nombre: 'Ana Rodríguez',   material: 'carton',   kg: 45, precio_kg: 280,  estado: 'pagado'    },
  { id: '5',  fecha: '2026-04-15', reciclador_nombre: 'Luis Gómez',      material: 'vidrio',   kg: 20, precio_kg: 150,  estado: 'pendiente' },
  { id: '6',  fecha: '2026-04-15', reciclador_nombre: 'Carlos Mendoza',  material: 'carton',   kg: 60, precio_kg: 280,  estado: 'pagado'    },
  { id: '7',  fecha: '2026-04-14', reciclador_nombre: 'Laura Sánchez',   material: 'papel',    kg: 25, precio_kg: 350,  estado: 'validado'  },
  { id: '8',  fecha: '2026-04-14', reciclador_nombre: 'Diego Herrera',   material: 'plastico', kg: 18, precio_kg: 500,  estado: 'pendiente' },
  { id: '9',  fecha: '2026-04-13', reciclador_nombre: 'María Torres',    material: 'metal',    kg: 12, precio_kg: 1200, estado: 'pagado'    },
  { id: '10', fecha: '2026-04-12', reciclador_nombre: 'Juan Pérez',      material: 'vidrio',   kg: 35, precio_kg: 150,  estado: 'validado'  },
  { id: '11', fecha: '2026-04-12', reciclador_nombre: 'Ana Rodríguez',   material: 'papel',    kg: 40, precio_kg: 350,  estado: 'pagado'    },
  { id: '12', fecha: '2026-04-11', reciclador_nombre: 'Luis Gómez',      material: 'plastico', kg: 22, precio_kg: 500,  estado: 'validado'  },
  { id: '13', fecha: '2026-04-10', reciclador_nombre: 'Laura Sánchez',   material: 'carton',   kg: 55, precio_kg: 280,  estado: 'pagado'    },
  { id: '14', fecha: '2026-04-09', reciclador_nombre: 'Diego Herrera',   material: 'metal',    kg: 5,  precio_kg: 1200, estado: 'pendiente' },
  { id: '15', fecha: '2026-04-08', reciclador_nombre: 'Carlos Mendoza',  material: 'papel',    kg: 28, precio_kg: 350,  estado: 'pagado'    },
]
