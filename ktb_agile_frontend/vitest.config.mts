import { defineConfig } from 'vitest/config'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'

export default defineConfig({
  plugins: [
    react(),
    babel({
      presets: [reactCompilerPreset({ compilationMode: 'annotation' })],
    }),
  ],
  resolve: { tsconfigPaths: true },
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
    environment: 'jsdom',
    environmentOptions: {
      jsdom: { url: 'http://127.0.0.1:3000/' },
    },
  },
})
