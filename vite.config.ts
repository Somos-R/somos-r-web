import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rolldownOptions: {
      output: {
        // React and the router are needed by every visit and change far less often than our code:
        // in their own file, a new release doesn't make returning users download them again.
        // MUI is deliberately NOT grouped: its pieces stay with the pages that use them.
        codeSplitting: {
          groups: [
            { name: 'react-vendor', test: /node_modules[/\\](react|react-dom|scheduler|react-router|react-router-dom)[/\\]/ },
          ],
        },
      },
    },
  },
})
