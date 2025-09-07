// vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react-swc'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['e2e/**', 'node_modules/**', 'dist/**', '.{git,github,husky,cache}/**'],
    coverage: { reporter: ['text', 'lcov'], include: ['src/**/*.{ts,tsx}'] }
  }
})
