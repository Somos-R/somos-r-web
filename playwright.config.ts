import { defineConfig, devices } from '@playwright/test'

// End-to-end tests drive the production build in a real browser. The API is answered by
// `e2e/fakeApi.ts` at the network level (no backend needed), so what runs here is the real bundle,
// router, session handling and forms.
export const API_URL = 'https://api.e2e.test'
const PORT = 4173

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    locale: 'es-CO',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `pnpm build && pnpm exec vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: { VITE_API_URL: API_URL },
  },
})
