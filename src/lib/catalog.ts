export type BadgeColor = 'default' | 'info' | 'primary' | 'success' | 'warning' | 'error'

/** A catalog entry as the API returns it: a stable English code plus a Spanish label for the UI. */
export interface CatalogRef {
  code: string
  label: string
}

const MATERIAL_COLORS: Record<string, BadgeColor> = {
  paper: 'info',
  plastic: 'primary',
  glass: 'success',
  metal: 'default',
  cardboard: 'warning',
  electronic: 'error',
  organic: 'success',
}

/** Badge color per material code; a material added to the catalog later just gets the default. */
export function getMaterialColor(code: string): BadgeColor {
  return MATERIAL_COLORS[code] ?? 'default'
}

interface StatusStyle<C extends BadgeColor> {
  label: string
  color: C
}

/**
 * Looks up the label and color of a status code, falling back to the raw code instead of
 * throwing when the backend introduces a status this build doesn't know yet.
 */
export function getStatusStyle<C extends BadgeColor>(
  config: Record<string, StatusStyle<C>>,
  status: string,
  fallbackColor: C,
): StatusStyle<C> {
  return config[status] ?? { label: status, color: fallbackColor }
}
