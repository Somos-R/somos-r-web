import { t } from '../../lib/i18n'
import type { BadgeColor } from '../../components/ui/Badge'
import type { LinkStatus } from '../../services/links'

export const LINK_STATUSES: LinkStatus[] = ['requested', 'active', 'rejected', 'removed']

export const STATUS_COLOR: Record<LinkStatus, BadgeColor> = {
  requested: 'warning',
  active: 'success',
  rejected: 'error',
  removed: 'default',
}

/** Text for a state; one this build doesn't know yet shows as it is instead of crashing. */
export function statusLabel(status: string): string {
  const labels = t.vinculaciones.status as Record<string, string>
  return Object.prototype.hasOwnProperty.call(labels, status) ? labels[status] : status
}

export const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
