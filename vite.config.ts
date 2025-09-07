import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { fileURLToPath, URL } from 'node:url'
import { componentTagger } from 'lovable-tagger'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({

  // vitest.config.ts
coverage: {
  reporter: ['text', 'lcov'],
  include: ['src/lib/**/*.{ts,tsx}'],      // narrow to the units you care about
  exclude: ['src/components/**'],
  thresholds: { statements: 5, branches: 5, functions: 5, lines: 5 }
}

  // inside defineConfig(...)
base: process.env.GITHUB_PAGES === 'true' ? '/ujjwaldeep-path-to-victory/' : '/',

  server: {
    host: '::',
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
    dedupe: ['react', 'react-dom', 'react/jsx-runtime'],
  },
}))
