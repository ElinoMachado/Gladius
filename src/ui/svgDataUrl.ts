/** Converte SVG em data URL seguro para `background-image` / `<img src>`. */
export function svgDataUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
