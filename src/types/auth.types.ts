import type { StaffRole } from '../lib/permissions'

export type { StaffRole }

/**
 * The signed-in user, as much of the backend profile as the portal needs.
 *
 * `role` is only set for staff whose role fits their actor type; recyclers, citizens and
 * anyone with an unknown or mismatched role get null and therefore no permissions.
 */
export interface AuthUser {
  id: string
  email: string
  full_name: string
  phone: string | null
  /** Backend `user_type_code`: association, eca, recycler, citizen, building or b2b_client. */
  user_type: string
  role: StaffRole | null
  /** What the server says this user may do (`weighings.create`...); empty without a role. */
  capabilities: string[]
  is_active: boolean
  /** ISO date once the email was confirmed; null while pending. */
  email_verified_at: string | null
  created_at: string
}
