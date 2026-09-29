import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      reporter: ['text', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/test/', 'src/data/', 'src/**/__tests__/**', 'src/main.tsx'],
      // Floors, not goals: set a little under today's numbers so CI fails when a change drops
      // coverage, not on noise. Raise them as coverage grows, never lower them to pass.
      thresholds: {
        lines: 88,
        'src/features/**': { lines: 85 },
        'src/components/ui/**': { lines: 95 },
        'src/lib/**': { lines: 85 },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
