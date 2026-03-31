/**
 * Substitui a aparência do &lt;select&gt; por um menu custom (tema cristal),
 * mantendo o elemento nativo para value, change e querySelector existentes.
 */

const MOUNTED = "data-crystal-select-mounted";

const openWraps = new Set<HTMLElement>();
let docListeners = false;

function closeWrap(wrap: HTMLElement): void {
  const list = wrap.querySelector(".crystal-select__list") as HTMLElement | null;
  const trigger = wrap.querySelector(
    ".crystal-select__trigger",
  ) as HTMLButtonElement | null;
  if (list) list.hidden = true;
  trigger?.setAttribute("aria-expanded", "false");
  openWraps.delete(wrap);
}

function closeAllExcept(except: HTMLElement | null): void {
  for (const w of [...openWraps]) {
    if (w !== except) closeWrap(w);
  }
}

function onDocumentPointerDown(ev: Event): void {
  const t = ev.target as Node | null;
  if (!t) return;
  for (const wrap of [...openWraps]) {
    if (!wrap.contains(t)) closeWrap(wrap);
  }
}

function onDocumentKeydown(ev: KeyboardEvent): void {
  if (ev.key !== "Escape") return;
  if (openWraps.size === 0) return;
  for (const w of [...openWraps]) closeWrap(w);
  ev.preventDefault();
}

function ensureGlobalListeners(): void {
  if (docListeners) return;
  docListeners = true;
  document.addEventListener("pointerdown", onDocumentPointerDown, true);
  document.addEventListener("keydown", onDocumentKeydown, true);
}

function themeClass(select: HTMLSelectElement): string {
  if (select.classList.contains("hero-slot-select")) return "crystal-select--hero";
  if (
    select.classList.contains("forge-slot-sel") ||
    select.classList.contains("forge-biome-sel")
  ) {
    return "crystal-select--forge";
  }
  return "crystal-select--default";
}

export function mountCrystalSelect(select: HTMLSelectElement): void {
  if (select.getAttribute(MOUNTED) === "1") return;
  select.setAttribute(MOUNTED, "1");

  const parent = select.parentElement;
  if (!parent) return;

  const wrap = document.createElement("div");
  wrap.className = `crystal-select ${themeClass(select)}`;

  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "crystal-select__trigger";
  if (select.id === "forge-hero-sel") {
    trigger.setAttribute("aria-labelledby", "forge-hero-sel-lbl");
  } else {
    const ariaLabel = select.getAttribute("aria-label");
    if (ariaLabel) trigger.setAttribute("aria-label", ariaLabel);
  }
  trigger.setAttribute("aria-haspopup", "listbox");
  trigger.setAttribute("aria-expanded", "false");

  const list = document.createElement("ul");
  list.className = "crystal-select__list";
  list.setAttribute("role", "listbox");
  list.hidden = true;

  select.classList.add("crystal-select__native");
  select.tabIndex = -1;

  parent.insertBefore(wrap, select);
  wrap.appendChild(trigger);
  wrap.appendChild(list);
  wrap.appendChild(select);

  const syncLabelFromSelect = (): void => {
    const opt = select.options[select.selectedIndex];
    trigger.textContent = opt?.text ?? "";
    trigger.disabled = select.disabled;
  };

  const buildOptions = (): void => {
    list.innerHTML = "";
    for (let i = 0; i < select.options.length; i++) {
      const opt = select.options[i]!;
      const li = document.createElement("li");
      li.className = "crystal-select__option";
      li.setAttribute("role", "option");
      li.dataset.value = opt.value;
      li.textContent = opt.text;
      const selected = i === select.selectedIndex;
      li.setAttribute("aria-selected", selected ? "true" : "false");
      li.classList.toggle("crystal-select__option--selected", selected);
      li.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (select.disabled) return;
        select.selectedIndex = i;
        select.dispatchEvent(new Event("change", { bubbles: true }));
        syncLabelFromSelect();
        buildOptions();
        closeWrap(wrap);
      });
      list.appendChild(li);
    }
  };

  const refresh = (): void => {
    syncLabelFromSelect();
    buildOptions();
  };

  trigger.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (select.disabled) return;
    const willOpen = list.hidden;
    closeAllExcept(wrap);
    if (willOpen) {
      refresh();
      list.hidden = false;
      trigger.setAttribute("aria-expanded", "true");
      openWraps.add(wrap);
      ensureGlobalListeners();
    } else {
      closeWrap(wrap);
    }
  });

  select.addEventListener("change", refresh);

  const mo = new MutationObserver(() => {
    refresh();
  });
  mo.observe(select, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["disabled"],
  });

  refresh();
}
