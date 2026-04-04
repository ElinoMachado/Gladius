/**
 * URLs de `import … from '*.glb?url'` no build: o Vite pode embutir caminhos absolutos desde a raiz
 * (`/NomeDoRepo/assets/ficheiro-hash.glb`). Em GitHub Pages isso exige coincidir com o URL publicado;
 * com domínio personalizado na raiz ou diferenças de caminho, esse prefixo falha (404) embora o JS
 * e o GLB estejam na mesma pasta `assets/`. Resolver pelo **nome do ficheiro** relativamente a
 * `import.meta.url` do módulo que faz o pedido iguala dev, produção e qualquer base no `index.html`.
 */
export function bundledGltfUrlFromViteImport(imported: string): string {
  if (import.meta.env.DEV) return imported;
  if (/^https?:\/\//i.test(imported)) return imported;
  const slash = Math.max(imported.lastIndexOf("/"), imported.lastIndexOf("\\"));
  const file =
    slash >= 0 ? imported.slice(slash + 1) : imported.replace(/^\.\//, "");
  if (!file) return imported;
  try {
    return new URL(file, import.meta.url).href;
  } catch {
    return imported;
  }
}
