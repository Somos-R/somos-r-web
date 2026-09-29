import { describe, expect, it } from 'vitest'
import { isValidElement } from 'react'
import { APP_ROUTES } from '../routes'

// Guards the bundle split: if someone imports a page eagerly again, it silently goes back into the
// first download. Lazy components are React elements whose type carries React's lazy marker.
describe('page routes stay lazily loaded', () => {
  it.each(APP_ROUTES.map((route) => [route.path, route] as const))('%s is code-split', (_path, route) => {
    expect(isValidElement(route.element)).toBe(true)
    const type = (route.element as { type: { $$typeof?: symbol } }).type
    expect(type.$$typeof).toBe(Symbol.for('react.lazy'))
  })
})
