import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react-swc'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['e2e/**', 'node_modules/**', 'dist/**', '.{git,github,husky,cache}/**'],
    coverage: {
      reporter: ['text', 'lcov'],
      include: ['src/lib/**/*.{ts,tsx}'],
      exclude: ['src/components/**'],
      thresholds: { statements: 5, branches: 5, functions: 5, lines: 5 },
    },
  },
})
