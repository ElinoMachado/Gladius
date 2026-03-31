import { defineConfig } from "vitest/config";

/**
 * Em produção usamos base relativo (`./`) para GitHub Pages e subpastas: evita 404 quando o
 * URL do repo não coincide em maiúsculas com `/Gladius/` ou quando falta barra final.
 * Em `vite dev` mantém `/`.
 */
export default defineConfig(({ command }) => ({
  root: ".",
  publicDir: "public",
  base: command === "build" ? "./" : "/",
  build: {
    outDir: "dist",
    sourcemap: true,
  },
  test: {
    globals: true,
    environment: "node",
  },
}));
