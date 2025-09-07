- import { defineConfig } from "vite";
+ import { defineConfig } from "vitest/config";
  import react from "@vitejs/plugin-react-swc";
  import path from "path";
  import { componentTagger } from "lovable-tagger";

  // https://vitejs.dev/config/
  export default defineConfig(({ mode }) => ({
    server: {
      host: "::",
      port: 8080,
    },
    plugins: [
      react(),
      mode === 'development' &&
      componentTagger(),
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
      dedupe: ["react", "react-dom", "react/jsx-runtime"],
    },
+   test: {
+     environment: "jsdom",
+     globals: true,
+     include: ["src/**/*.{test,spec}.{ts,tsx}"],
+     exclude: [
+       "e2e/**",            // ← keep Playwright tests out of Vitest
+       "node_modules/**",
+       "dist/**",
+       ".{git,github,husky,cache}/**"
+     ],
+     coverage: {
+       reporter: ["text", "lcov"],
+       include: ["src/**/*.{ts,tsx}"]
+     }
+   }
  }));
