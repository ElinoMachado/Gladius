import { defineConfig } from "vitest/config";

/**
 * GitHub Pages (project site): o jogo fica em `https://user.github.io/NOME_DO_REPO/`.
 * Com `base: "./"`, se alguém abrir `/NOME_DO_REPO` **sem** barra final, o browser resolve
 * `./assets/...` contra `/` e o GLB do coliseu (e outros assets) dão 404 — a arena some.
 * No CI usamos `/${repo}/` (`VITE_PAGES_REPO_NAME` ou `GITHUB_REPOSITORY`) para o `index.html`.
 * Repositório `*.github.io` (site de utilizador na raiz) usa `base: "/"`.
 * Build local sem env: `./` para `vite preview` na raiz.
 */
function viteBaseForProductionBuild(): string {
  const fromEvent = process.env.VITE_PAGES_REPO_NAME?.trim();
  if (fromEvent && /^[A-Za-z0-9_.-]+$/.test(fromEvent)) {
    if (/\.github\.io$/i.test(fromEvent)) return "/";
    return `/${fromEvent}/`;
  }
  const repo = process.env.GITHUB_REPOSITORY?.split("/")[1];
  if (!repo) return "./";
  if (/\.github\.io$/i.test(repo)) return "/";
  return `/${repo}/`;
}

export default defineConfig(({ command }) => ({
  root: ".",
  publicDir: "public",
  base: command === "build" ? viteBaseForProductionBuild() : "/",
  build: {
    outDir: "dist",
    sourcemap: true,
  },
  test: {
    globals: true,
    environment: "node",
  },
}));
