import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: { tsconfigPaths: true },
  test: {
    environment: 'jsdom',
    environmentOptions: {
      jsdom: { url: 'http://127.0.0.1:3000/' },
    },
  },
})
