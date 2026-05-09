export type UserRole = 'citizen' | 'recycler' | 'operador_eca' | 'admin_eca' | 'admin_asociacion' | 'superadmin'

export type UserStatus = 'active' | 'inactive' | 'suspended'

export type VehicleType = 'bike' | 'cart' | 'motorcycle' | 'truck'

export interface BaseUser {
  id: string
  email: string
  full_name: string
  role: UserRole
  status: UserStatus
  created_at: string
}

export interface Citizen extends BaseUser {
  role: 'citizen'
  phone: string
  address: string
  lat: number
  lng: number
}

export interface Recycler extends BaseUser {
  role: 'recycler'
  phone: string
  cedula: string
  association_id: string
  vehicle_type: VehicleType
  bank_account?: string
  verified_at?: string
}

export interface EcaUser extends BaseUser {
  role: 'operador_eca' | 'admin_eca'
  eca_id: string
  employee_code: string
}

export interface AsociacionAdmin extends BaseUser {
  role: 'admin_asociacion'
  asociacion_id: string
}

export interface SuperAdmin extends BaseUser {
  role: 'superadmin'
}

export type AuthUser = Citizen | Recycler | EcaUser | AsociacionAdmin | SuperAdmin

export interface LoginPayload {
  email: string
  password: string
}

export interface AuthResponse {
  user: AuthUser
  token: string
  expires_in: number
}
