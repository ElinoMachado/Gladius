import { describeSynergy } from "../game/colorSynergy";
import type { TeamColor } from "../game/types";

const ORDER: TeamColor[] = ["azul", "verde", "vermelho"];

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function teamColorCss(c: TeamColor): string {
  if (c === "azul") return "#3d8ae8";
  if (c === "verde") return "#3dcc6a";
  return "#e84d4d";
}

/** Rótulos de facção (IDs internos: azul / verde / vermelho). */
export function teamColorLabelPt(c: TeamColor): string {
  if (c === "azul") return "Paz";
  if (c === "verde") return "Perseverança";
  return "Guerra";
}

export function synergyTooltipHtml(colors: readonly TeamColor[]): string {
  const syn = describeSynergy([...colors]);
  return `<div class="game-ui-tooltip-inner"><div class="game-ui-tooltip-title">Sinergia do time</div><p class="game-ui-tooltip-passive">${esc(syn)}</p></div>`;
}

export interface ColorTriangleEditorOptions {
  getColors: () => TeamColor[];
  setColorAt: (index: 0 | 1 | 2, c: TeamColor) => void;
  onVisualUpdate?: () => void;
}

/**
 * Triângulo com 3 vértices (cores), ligações e mistura no centro. Clique no vértice abre as outras cores.
 */
export function mountColorTriangleEditor(
  container: HTMLElement,
  opts: ColorTriangleEditorOptions,
): { refresh: () => void; destroy: () => void } {
  const root = document.createElement("div");
  root.className = "color-triangle color-triangle--setup";

  root.innerHTML = `
    <div class="color-triangle__inner-wrap" aria-hidden="true">
      <div class="color-triangle__fill"></div>
    </div>
    <p class="color-triangle__synergy" id="ct-syn"></p>
    <div class="color-triangle__vertices">
      <button type="button" class="color-triangle__vtx" data-i="0" aria-haspopup="listbox" aria-expanded="false" aria-label="Cor 1"></button>
      <button type="button" class="color-triangle__vtx" data-i="1" aria-haspopup="listbox" aria-expanded="false" aria-label="Cor 2"></button>
      <button type="button" class="color-triangle__vtx" data-i="2" aria-haspopup="listbox" aria-expanded="false" aria-label="Cor 3"></button>
    </div>
    <div class="color-triangle__popover" role="listbox" hidden></div>
  `;

  const fillEl = root.querySelector(".color-triangle__fill") as HTMLElement;
  const synEl = root.querySelector("#ct-syn") as HTMLElement;
  const pop = root.querySelector(".color-triangle__popover") as HTMLElement;
  const vtxBtns = root.querySelectorAll(
    ".color-triangle__vtx",
  ) as NodeListOf<HTMLButtonElement>;

  let openIndex: number | null = null;

  const closePopover = (): void => {
    openIndex = null;
    pop.innerHTML = "";
    pop.setAttribute("hidden", "");
    pop.style.removeProperty("left");
    pop.style.removeProperty("top");
    vtxBtns.forEach((b) => b.setAttribute("aria-expanded", "false"));
  };

  const openPopover = (index: number, clientX: number, clientY: number): void => {
    const colors = opts.getColors();
    const cur = colors[index]!;
    const others = ORDER.filter((c) => c !== cur);
    openIndex = index;
    pop.innerHTML = others
      .map(
        (c) =>
          `<button type="button" class="color-triangle__pick" role="option" data-c="${c}" style="--pick:${teamColorCss(c)}">${esc(teamColorLabelPt(c))}</button>`,
      )
      .join("");
    pop.removeAttribute("hidden");
    vtxBtns[index]!.setAttribute("aria-expanded", "true");

    const rect = root.getBoundingClientRect();
    pop.style.left = `${Math.min(Math.max(8, clientX - rect.left), rect.width - 120)}px`;
    pop.style.top = `${Math.min(Math.max(8, clientY - rect.top + 8), rect.height - 8)}px`;

    pop.querySelectorAll(".color-triangle__pick").forEach((btn) => {
      btn.addEventListener("click", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        const c = (btn as HTMLElement).dataset.c as TeamColor;
        opts.setColorAt(index as 0 | 1 | 2, c);
        opts.onVisualUpdate?.();
        refresh();
        closePopover();
      });
    });
  };

  const onDocDown = (e: MouseEvent): void => {
    if (!root.isConnected) {
      document.removeEventListener("mousedown", onDocDown, true);
      return;
    }
    if (!root.contains(e.target as Node)) closePopover();
  };
  document.addEventListener("mousedown", onDocDown, true);

  vtxBtns.forEach((btn, index) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (openIndex === index) {
        closePopover();
        return;
      }
      closePopover();
      openPopover(index, e.clientX, e.clientY);
    });
  });

  const refresh = (): void => {
    const colors = opts.getColors();
    const [c0, c1, c2] = colors;
    fillEl.style.setProperty("--ct-0", teamColorCss(c0!));
    fillEl.style.setProperty("--ct-1", teamColorCss(c1!));
    fillEl.style.setProperty("--ct-2", teamColorCss(c2!));
    synEl.textContent = describeSynergy([...colors]);
    vtxBtns.forEach((b, i) => {
      const c = colors[i]!;
      b.style.setProperty("--vtx", teamColorCss(c));
      b.title = teamColorLabelPt(c);
      b.setAttribute(
        "aria-label",
        `Facção ${i + 1}: ${teamColorLabelPt(c)}. Clica para escolher outra.`,
      );
    });
  };

  refresh();
  container.appendChild(root);

  return {
    refresh,
    destroy: (): void => {
      document.removeEventListener("mousedown", onDocDown, true);
      closePopover();
      root.remove();
    },
  };
}

/** Triângulo só leitura (run): canto da tela + tooltip externo via bindTooltip. */
export function mountReadOnlyColorTriangle(
  container: HTMLElement,
  colors: readonly TeamColor[],
  bindTooltip: (el: HTMLElement, getHtml: () => string) => void,
): HTMLElement {
  const wrap = document.createElement("div");
  wrap.className = "color-triangle color-triangle--mini color-triangle--readonly";
  wrap.innerHTML = `
    <div class="color-triangle__edges-wrap" aria-hidden="true">
      <svg class="color-triangle__edges" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        <polygon class="color-triangle__edge-poly" vector-effect="non-scaling-stroke" points="50,11 16,87 84,87" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="1" stroke-linejoin="round"/>
      </svg>
    </div>
    <div class="color-triangle__inner-wrap" aria-hidden="true">
      <div class="color-triangle__fill"></div>
    </div>
    <div class="color-triangle__vertices color-triangle__vertices--readonly">
      <span class="color-triangle__vtx-dot" data-i="0"></span>
      <span class="color-triangle__vtx-dot" data-i="1"></span>
      <span class="color-triangle__vtx-dot" data-i="2"></span>
    </div>
  `;
  const fillEl = wrap.querySelector(".color-triangle__fill") as HTMLElement;
  const dots = wrap.querySelectorAll(".color-triangle__vtx-dot") as NodeListOf<HTMLElement>;
  const [c0, c1, c2] = colors;
  fillEl.style.setProperty("--ct-0", teamColorCss(c0!));
  fillEl.style.setProperty("--ct-1", teamColorCss(c1!));
  fillEl.style.setProperty("--ct-2", teamColorCss(c2!));
  dots.forEach((d, i) => {
    const c = colors[i]!;
    d.style.setProperty("--vtx", teamColorCss(c));
  });
  wrap.setAttribute("role", "img");
  wrap.setAttribute(
    "aria-label",
    `Sinergia do time: ${teamColorLabelPt(c0!)} · ${teamColorLabelPt(c1!)} · ${teamColorLabelPt(c2!)}`,
  );
  bindTooltip(wrap, () => synergyTooltipHtml(colors));
  container.appendChild(wrap);
  return wrap;
}
