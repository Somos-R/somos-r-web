// Roles móviles (app ciudadana / app reciclador)
export type MobileRole = 'citizen' | 'recycler'

// Roles del portal web (ECA / Asociación)
export type PortalRole = 'operador_eca' | 'admin_eca' | 'admin_asociacion' | 'superadmin'

// Unión completa para compatibilidad con BaseUser
export type UserRole = MobileRole | PortalRole

// Estado de la cuenta
export type UserStatus = 'active' | 'inactive' | 'suspended'

// Tipo de vehículo del reciclador
export type VehicleType = 'bike' | 'cart' | 'motorcycle' | 'truck'

// -------------------------------------------
// Campos base compartidos por todos los actores
// -------------------------------------------
export interface BaseUser {
  id: string
  email: string
  full_name: string
  role: UserRole
  status: UserStatus
  created_at: string
}

// -------------------------------------------
// Ciudadano — App Mobile
// Solicita recolección de materiales
// -------------------------------------------
export interface Citizen extends BaseUser {
  role: 'citizen'
  phone: string
  address: string
  lat: number
  lng: number
}

// -------------------------------------------
// Reciclador — App Mobile
// Opera en campo, requiere identidad verificada
// -------------------------------------------
export interface Recycler extends BaseUser {
  role: 'recycler'
  phone: string
  cedula: string
  association_id: string
  vehicle_type: VehicleType
  bank_account?: string
  verified_at?: string
}

// -------------------------------------------
// Usuario del Portal Web (ECA / Asociación)
// Puede tener uno o varios roles simultáneos
// -------------------------------------------
export interface PortalUser extends BaseUser {
  role: PortalRole          // rol principal (para compatibilidad con ROLE_BADGE)
  roles: PortalRole[]       // todos los roles asignados
  eca_id?: string           // presente si tiene rol operador_eca o admin_eca
  asociacion_id?: string    // presente si tiene rol admin_asociacion
  employee_code?: string
}

// Tipo unión: cualquier usuario autenticado
export type AuthUser = Citizen | Recycler | PortalUser

// -------------------------------------------
// Payloads para requests a la API
// -------------------------------------------

export interface LoginPayload {
  email: string
  password: string
}

export interface RegisterCitizenPayload {
  email: string
  password: string
  full_name: string
  phone: string
  address: string
  lat: number
  lng: number
}

export interface RegisterRecyclerPayload {
  email: string
  password: string
  full_name: string
  phone: string
  cedula: string
  association_id: string
  vehicle_type: VehicleType
}

export interface RegisterAdminPayload {
  email: string
  password: string
  full_name: string
  eca_id: string
  employee_code: string
}

// -------------------------------------------
// Respuesta del servidor tras login/registro
// -------------------------------------------
export interface AuthResponse {
  user: AuthUser
  token: string
  expires_in: number // segundos, ej: 86400 = 24h
}
