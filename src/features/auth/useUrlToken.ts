import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

/**
 * Reads the one-time `?token=` from an emailed link and removes it from the address bar.
 *
 * The token is a credential: left in the URL it ends up in browser history and in the
 * Referer header of anything the page loads. It is kept in state only.
 */
export function useUrlToken(): string | null {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [token] = useState(() => searchParams.get('token'))

  useEffect(() => {
    if (searchParams.has('token')) navigate({ search: '' }, { replace: true })
  }, [searchParams, navigate])

  return token
}
