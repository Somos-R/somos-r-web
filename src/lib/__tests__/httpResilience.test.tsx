import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { renderHook } from '@testing-library/react'
import { QueryClientProvider, MutationObserver, useQuery } from '@tanstack/react-query'
import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import type { ReactNode } from 'react'
import { apiClient, REQUEST_TIMEOUT_MS } from '../apiClient'
import { getApiErrorMessage, isCancelError, isTimeoutError } from '../apiError'
import { queryClient, shouldRetry } from '../queryClient'
import { getNotification, notify, resetNotifier } from '../notifier'
import { weighingsService } from '../../services/weighings'
import { t } from '../i18n'
import { mockAdapter } from '../../test/helpers'

const timeoutError = () => new AxiosError('timeout of 15000ms exceeded', 'ECONNABORTED')

/** Adapter that never answers on its own: it only ends when the request is aborted. */
function hangingAdapter(seen: InternalAxiosRequestConfig[]) {
  return (config: InternalAxiosRequestConfig) =>
    new Promise<never>((_, reject) => {
      seen.push(config)
      config.signal?.addEventListener?.('abort', () => reject(new axios.CanceledError('canceled', config)))
    })
}

describe('request timeout', () => {
  it('every request carries a default timeout, so a hung server cannot spin forever', async () => {
    const seen: InternalAxiosRequestConfig[] = []
    apiClient.defaults.adapter = mockAdapter((config) => {
      seen.push(config)
      return { data: {} }
    })
    await apiClient.get('/anything')
    expect(REQUEST_TIMEOUT_MS).toBeGreaterThan(0)
    expect(seen[0].timeout).toBe(REQUEST_TIMEOUT_MS)
  })

  describe('against a server that never answers', () => {
    let server: Server
    let baseURL: string

    beforeAll(async () => {
      server = createServer(() => {
        // Accept the connection and never reply.
      })
      await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
      baseURL = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
    })

    afterAll(async () => {
      server.closeAllConnections()
      await new Promise<void>((resolve) => server.close(() => resolve()))
    })

    it('fails with a timeout error instead of waiting forever', async () => {
      const started = Date.now()
      const error = await apiClient
        .get('/hang', { baseURL, timeout: 150, adapter: 'http' })
        .then(() => null, (e) => e)
      expect(error).not.toBeNull()
      expect(isTimeoutError(error)).toBe(true)
      expect(Date.now() - started).toBeLessThan(2000)
      // The user reads a clear message, not "network error".
      expect(getApiErrorMessage(error, 'fallback')).toBe(t.errors.timeout)
    })
  })
})

describe('timeout and cancel classification', () => {
  it('recognises timeouts and cancellations, and nothing else', () => {
    expect(isTimeoutError(timeoutError())).toBe(true)
    expect(isTimeoutError(new AxiosError('x', 'ETIMEDOUT'))).toBe(true)
    expect(isTimeoutError(new Error('Network Error'))).toBe(false)
    expect(isCancelError(new axios.CanceledError('canceled'))).toBe(true)
    expect(isCancelError(timeoutError())).toBe(false)
  })

  it('tells a timeout apart from a lost connection', () => {
    expect(getApiErrorMessage(timeoutError(), 'f')).toBe(t.errors.timeout)
    expect(getApiErrorMessage(new Error('Network Error'), 'f')).toBe(t.errors.network)
  })
})

describe('retry policy', () => {
  it('retries a timeout once, not twice: each attempt can take the whole timeout', () => {
    expect(shouldRetry(0, timeoutError())).toBe(true)
    expect(shouldRetry(1, timeoutError())).toBe(false)
  })

  it('never retries a request the user cancelled', () => {
    expect(shouldRetry(0, new axios.CanceledError('canceled'))).toBe(false)
  })

  it('does not retry a write: a POST that fails is attempted exactly once', async () => {
    let attempts = 0
    await new MutationObserver(queryClient, {
      mutationFn: () => {
        attempts++
        return Promise.reject({ response: { status: 503, data: {}, headers: {} } })
      },
      meta: { silent: true },
    }).mutate().catch(() => undefined)
    expect(attempts).toBe(1)
  })

  it('retries a read that failed with a server error (up to twice) before giving up', async () => {
    let attempts = 0
    const previous = queryClient.getDefaultOptions()
    queryClient.setDefaultOptions({ ...previous, queries: { ...previous.queries, retryDelay: 0 } })
    await queryClient
      .fetchQuery({
        queryKey: ['flaky'],
        queryFn: () => {
          attempts++
          return Promise.reject({ response: { status: 503, data: {}, headers: {} } })
        },
        meta: { silent: true },
      })
      .catch(() => undefined)
    queryClient.setDefaultOptions(previous)
    expect(attempts).toBe(3)
  })
})

describe('cancellation', () => {
  let seen: InternalAxiosRequestConfig[]

  beforeEach(() => {
    seen = []
    queryClient.clear()
    resetNotifier()
    apiClient.defaults.adapter = hangingAdapter(seen)
  })

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )

  it('services pass the caller\'s signal down to the request', async () => {
    const controller = new AbortController()
    const pending = weighingsService.list({}, { signal: controller.signal }).catch((e) => e)
    await new Promise((resolve) => setTimeout(resolve, 0)) // let the request interceptors run
    expect(seen[0].signal).toBe(controller.signal)
    controller.abort()
    expect(isCancelError(await pending)).toBe(true)
  })

  it('leaving a screen cancels its in-flight requests', async () => {
    const { unmount } = renderHook(
      () => useQuery({ queryKey: ['stats'], queryFn: ({ signal }) => weighingsService.stats({ signal }) }),
      { wrapper },
    )
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(seen).toHaveLength(1)
    expect(seen[0].signal?.aborted).toBe(false)
    unmount()
    expect(seen[0].signal?.aborted).toBe(true)
  })

  it('a cancelled request is not an error: no notification and no retry', async () => {
    notify('previous')
    resetNotifier()
    const promise = queryClient
      .fetchQuery({ queryKey: ['stats'], queryFn: ({ signal }) => weighingsService.stats({ signal }) })
      .catch((e) => e)
    await new Promise((resolve) => setTimeout(resolve, 0))
    await queryClient.cancelQueries({ queryKey: ['stats'] })
    await promise
    expect(seen).toHaveLength(1) // not retried
    expect(getNotification()).toBeNull()
  })

  it('a timeout on an action tells the user to check whether it went through', async () => {
    await new MutationObserver(queryClient, {
      mutationFn: () => Promise.reject(timeoutError()),
    }).mutate().catch(() => undefined)
    expect(getNotification()?.message).toBe(t.errors.timeout)
  })
})
