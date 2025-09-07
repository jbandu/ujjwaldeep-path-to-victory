// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { fileURLToPath, URL } from 'node:url'
import { componentTagger } from 'lovable-tagger'

export default defineConfig(({ mode }) => ({
  base: mode === 'production' ? '/ujjwaldeep-path-to-victory/' : '/',  // <-- here
  server: { host: '::', port: 8080 },
  plugins: [react(), mode === 'development' && componentTagger()].filter(Boolean),
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    dedupe: ['react', 'react-dom', 'react/jsx-runtime'],
  },
}))
