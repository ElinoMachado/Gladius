import "./style.css";
import {
  BUNKER_COMBAT_FLOAT_ID,
  GameModel,
  heroDanoPlusRoninFromBaseline,
  heroDanoPlusRoninOverflow,
  type CombatFloatEvent,
  type CombatVfxHint,
} from "./game/gameModel";
import { GameRenderer } from "./render/GameRenderer";
import { HeroPreview3D } from "./render/HeroPreview3D";
import { MainMenuSword3D } from "./render/MainMenuSword3D";
import { BiomePicker3D } from "./render/BiomePicker3D";
import { ShopStall3D } from "./render/ShopStall3D";
import { CrystalShop3D } from "./render/CrystalShop3D";
import { BunkerPreview3D } from "./render/BunkerPreview3D";
import { ForgePiecePreview3D } from "./render/ForgePiecePreview3D";
import type {
  GamePhase,
  HeroClassId,
  TeamColor,
  BiomeId,
  Unit,
  WeaponLevel,
} from "./game/types";
import type { SkillDef } from "./game/data/heroes";
import { HEROES } from "./game/data/heroes";
import { BIOME_DESCRIPTIONS, BIOME_LABELS } from "./game/data/biomes";
import { GOLD_SHOP, goldDrainPerTurn, type GoldShopId } from "./game/data/shops";
import { ARTIFACT_POOL, artifactDefById } from "./game/data/artifacts";
import {
  ARTIFACT_RARITY_LABELS,
  ARTIFACT_RARITY_ORDER,
  formatRarityOddsLinesHtml,
} from "./game/data/artifactRarity";
import {
  artifactCardInnerHtml,
  artifactCodexAllTiersHtml,
  artifactPickChoiceTooltip,
  artifactRarityClass,
  artifactStackCounterLabel,
  artifactTooltipHtml,
  getArtifactMaxStacks,
  isArtifactVisibleInHud,
  pickChoiceDisplayName,
  pickChoiceRarity,
} from "./game/artifactUi";
import { ArtifactCodex3D } from "./render/ArtifactCodex3D";
import { EnemyPreview3D } from "./render/EnemyPreview3D";
import {
  mountColorTriangleEditor,
  mountReadOnlyColorTriangle,
} from "./ui/colorTriangle";
import { initMusicVolumeControl } from "./ui/musicVolumeControl";
import { mountCrystalSelect } from "./ui/crystalSelect";
import { axialKey, hexDistance } from "./game/hex";
import {
  permPercent,
  nextMetaCost,
  nextInitialCardCost,
  clearAllLocalProgressForFreshStart,
} from "./game/metaStore";
import {
  damageReductionPercentFromDefense,
  effectiveDefenseForBiome,
  effectiveAlcanceForBiome,
  rulerMovementBonus,
  unitIgnoresTerrain,
} from "./game/combatMath";
import { COMBAT_BIOMES } from "./game/data/biomes";
import {
  allEnemyArchetypesSorted,
  enemyLootSummaryLines,
  enemyTierLabelPt,
  enemyWaveRangeLabel,
  filterEnemiesByWaveInterval,
  FINAL_VICTORY_WAVE,
  getEnemyArchetype,
  partyScaleMultiplier,
  waveMultiplier,
} from "./game/data/enemies";
import {
  biomeToEssenceId,
  FORGE_COST_CREATE,
  FORGE_COST_UPGRADE_TO_2,
  FORGE_COST_UPGRADE_TO_3,
  FORGE_ESSENCE_LABELS,
  clearEquippedBiome,
  forgeBiomeEquippedOnOtherSlot,
  forgeEssenceBarHtml,
  forgePieceEffectHtml,
  getForgeProgressLevel,
  normalizeForgeMeta,
  pantanoHelmoXpBonusPercent,
  forgeSynergyCrestTooltipHtml,
  forgeSynergyPanelHtml,
  forgeSynergyTier,
  heroSlotForgeSynergyStripHtml,
  forgeTryCraftOrUpgrade,
  forgeUpgradeButtonTooltipHtml,
  resolveEquippedBiome,
  resolveEquippedForgeLoadoutForMeta,
  setEquippedBiome,
} from "./game/forge";
import type {
  ForgeEssenceId,
  ForgeHeroLoadout,
  ForgePiece,
  ForgeSlotKind,
} from "./game/types";
import { biomeAt } from "./game/unitFactory";
import { HERO_STAT_TIP } from "./ui/heroStatRichText";
import { statIconWrap, type StatIconId } from "./ui/statIcons";
import { basicAttackIconHtml, skillButtonIconHtml } from "./ui/skillIcons";
import {
  enemySplashDataUrl,
  heroSplashDataUrl,
  turnTileBackgroundStyle,
} from "./ui/splashArt";
import {
  playGunshot,
  playGunVolley,
  playKnifeCut,
  playLandmineExplosion,
  playMagicBarrage,
  playMagicWhoosh,
  playEscravoChainSlash,
  playMortarImpact,
  playMortarLaunch,
  playSwordHit,
  playInputError,
  playUiClick,
  playWeaponsCock,
  resume as resumeWebAudio,
} from "./audio/combatSounds";
import { setArenaCombatMusicFromWave, stopArenaAmbient } from "./audio/arenaAmbient";
import { ensureMenuThemePlaying, pauseMenuTheme } from "./audio/menuAmbient";
import { getSkipEnemyMoveAnim, setSkipEnemyMoveAnim } from "./game/combatPrefs";
import { UNIT_MOVE_SEGMENT_MS } from "./game/combatTiming";
import {
  BUNKER_EVOLVE_COSTS,
  BUNKER_TIRO_MIN_TIER,
  bunkerDisplayLevel,
  bunkerMinasCooldownWaves,
  bunkerMinasDamageMult,
  bunkerMinasMaxRing,
  bunkerStatsForTier,
  bunkerTiroCooldownWaves,
  describeBunkerMinasTier,
  describeBunkerTiroTier,
} from "./game/bunker";
import type { BunkerState } from "./game/bunker";
import {
  atirarCooldownWaves,
  atirarDamageMult,
  ateMorteCooldownWaves,
  ateMorteDamageMult,
  ateMorteManaCost,
  furacaoBleedPct,
  furacaoBleedTurns,
  furacaoDamageMult,
  gladiadorDuelHpPerWin,
  paraisoManaShieldMult,
  paraisoRegenBonus,
  paraisoRegenTurns,
  paraisoShieldFlat,
  pisotearCooldownWaves,
  pisotearDamageMult,
  pisotearManaCost,
  pisotearMaxHexDistance,
  priestPassivePotencialPoints,
  sentencaCooldownWaves,
  sentencaDamageMult,
  sentencaHealMult,
  sentencaManaCost,
  sentencaShieldOverflowRatio,
  weaponUltThreshold,
  weaponUpgradeCrystalCost,
} from "./game/weaponData";
import {
  ATIRAR_FIRST_DAMAGE_MS,
  ATIRAR_STAGGER_MS,
  BASIC_MAGIC_FLIGHT_MS,
  BASIC_PISTOL_FLIGHT_MS,
  BUNKER_TIRO_FLIGHT_MS,
  FURACAO_ULT_FIRST_DAMAGE_MS,
  FURACAO_ULT_JUMP_MS,
  FURACAO_ULT_PROJECTILE_SEC,
  FURACAO_ULT_STAGGER_MS,
  PISOTEAR_FIRST_DAMAGE_MS,
  PISOTEAR_STAGGER_MS,
  SENTENCA_FIRST_DAMAGE_MS,
  SENTENCA_HEAL_AFTER_LAST_HIT_MS,
  SENTENCA_STAGGER_MS,
} from "./game/combatTiming";

/** Paginação do strip de artefatos no combate (20 por página). */
const COMBAT_ARTIFACT_PAGE_SIZE = 20;
/** Paginação da ordem de turnos (10 por página). */
const COMBAT_TURN_ORDER_PAGE_SIZE = 10;
let combatArtifactStripPage = 0;
let combatArtifactStripSig = "";
let combatTurnOrderPage = 0;
let combatTurnOrderUserAdjusted = false;
let combatLastTurnFocusKey = "";

const uiRoot = document.getElementById("ui-root")!;
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const damageFloatLayer = document.getElementById("damage-float-layer")!;

const model = new GameModel();
const view = new GameRenderer(canvas);

view.buildHexGrid(model.grid);

type Setup = {
  /** Três slots; `null` = vazio. */
  slots: [HeroClassId | null, HeroClassId | null, HeroClassId | null];
  biomes: BiomeId[];
  /** Sempre 3 cores (sinergia do grupo), independentemente do nº de heróis. */
  colors: TeamColor[];
};

const setup: Setup = {
  slots: [null, null, null],
  biomes: [],
  colors: ["azul", "verde", "vermelho"],
};

let heroSetupPreviewInstances: HeroPreview3D[] = [];

function disposeHeroSetupPreviews(): void {
  for (const p of heroSetupPreviewInstances) p.dispose();
  heroSetupPreviewInstances = [];
}

let biomePickerInstance: BiomePicker3D | null = null;
let bioHeroPreview: HeroPreview3D | null = null;

function disposeBiomePicker(): void {
  biomePickerInstance?.dispose();
  biomePickerInstance = null;
}

function disposeBioHeroPreview(): void {
  bioHeroPreview?.dispose();
  bioHeroPreview = null;
}

let enemyInspectPreview3d: EnemyPreview3D | null = null;
let lastEnemyInspectRenderedId: string | null = null;

function disposeEnemyInspectPreview(): void {
  enemyInspectPreview3d?.dispose();
  enemyInspectPreview3d = null;
  lastEnemyInspectRenderedId = null;
}

function heroClassLetter(cls: HeroClassId): string {
  if (cls === "pistoleiro") return "P";
  if (cls === "gladiador") return "G";
  return "S";
}

function applyCombatVfxHint(h: CombatVfxHint): void {
  if (!h) return;
  switch (h.kind) {
    case "atirar_todo_lado":
      view.triggerRadialShotVfx(h.heroId);
      playGunVolley(Math.min(14, Math.max(4, Math.ceil(h.shotCount / 3))), 46);
      for (let i = 0; i < h.targetIds.length; i++) {
        const tid = h.targetIds[i]!;
        window.setTimeout(
          () => view.spawnComicPowImpactOnUnit(tid),
          ATIRAR_FIRST_DAMAGE_MS + i * ATIRAR_STAGGER_MS,
        );
      }
      break;
    case "duel_start":
      view.setDuelFlameAura(h.gladiadorId, true);
      break;
    case "duel_end":
      view.setDuelFlameAura(h.gladiadorId, false);
      break;
    case "sentenca":
      view.triggerSentencaOrbBarrage(
        h.priestId,
        h.targetIds,
        SENTENCA_FIRST_DAMAGE_MS,
        SENTENCA_STAGGER_MS,
      );
      window.setTimeout(
        () =>
          playMagicBarrage(
            Math.max(1, h.enemyHitCount),
            SENTENCA_STAGGER_MS,
          ),
        Math.max(0, SENTENCA_FIRST_DAMAGE_MS - 70),
      );
      {
        const last =
          h.enemyHitCount === 0
            ? 0
            : SENTENCA_FIRST_DAMAGE_MS +
              (h.enemyHitCount - 1) * SENTENCA_STAGGER_MS;
        window.setTimeout(
          () => view.triggerHealGust(h.allyIds),
          last + SENTENCA_HEAL_AFTER_LAST_HIT_MS,
        );
      }
      break;
    case "basic_projectile":
      view.queueDamageProjectile(h.fromId, h.toId, {
        style: h.style,
        durationSec:
          h.style === "bullet"
            ? BASIC_PISTOL_FLIGHT_MS / 1000
            : BASIC_MAGIC_FLIGHT_MS / 1000,
      });
      if (h.style === "bullet") playGunshot();
      else playMagicWhoosh();
      break;
    case "basic_volley": {
      view.triggerRadialShotVfx(h.fromId, {
        rays: 14,
        durationMs: 320,
        scale: 0.72,
      });
      playGunVolley(Math.min(10, Math.max(3, h.targetIds.length + 2)), 40);
      const volleyStaggerMs = 95;
      for (let i = 0; i < h.targetIds.length; i++) {
        const tid = h.targetIds[i]!;
        window.setTimeout(
          () => view.spawnComicPowImpactOnUnit(tid),
          i * volleyStaggerMs,
        );
      }
      break;
    }
    case "bunker_minas":
      for (let ring = 1; ring <= h.maxRing; ring++) {
        window.setTimeout(
          () => playLandmineExplosion(),
          (ring - 1) * h.staggerMs,
        );
      }
      view.triggerBunkerMinasRings(
        h.centerQ,
        h.centerR,
        h.maxRing,
        h.staggerMs,
      );
      break;
    case "bunker_mortar":
      playMortarLaunch();
      view.queueBunkerMortarShot(
        h.fromId,
        h.toId,
        BUNKER_TIRO_FLIGHT_MS / 1000,
      );
      window.setTimeout(() => playMortarImpact(), BUNKER_TIRO_FLIGHT_MS);
      break;
    case "enemy_strike":
      if (h.archetypeId === "escravo") playEscravoChainSlash();
      else playSwordHit();
      view.triggerMeleeSlashBetween(h.attackerId, h.targetId);
      break;
    case "weapon_ult_furacao": {
      view.triggerWeaponUltFuracaoJump(h.heroId, FURACAO_ULT_JUMP_MS);
      view.triggerRadialShotVfx(h.heroId, {
        rays: Math.min(36, 16 + h.targetIds.length * 3),
        durationMs: Math.max(480, FURACAO_ULT_JUMP_MS + 120),
        scale: 1.15,
      });
      const n = Math.max(6, Math.min(22, 4 + h.targetIds.length * 2));
      playGunVolley(n, 38);
      for (let i = 0; i < h.targetIds.length; i++) {
        const tid = h.targetIds[i]!;
        const t0 = FURACAO_ULT_FIRST_DAMAGE_MS + i * FURACAO_ULT_STAGGER_MS;
        window.setTimeout(() => {
          view.queueDamageProjectile(h.heroId, tid, {
            style: "bullet",
            durationSec: FURACAO_ULT_PROJECTILE_SEC,
          });
          playGunshot();
        }, t0);
      }
      break;
    }
    case "pisotear_chain":
      for (let i = 0; i < h.targetIds.length; i++) {
        const tid = h.targetIds[i]!;
        window.setTimeout(() => {
          playSwordHit();
          view.triggerMeleeSlashBetween(h.heroId, tid);
        }, PISOTEAR_FIRST_DAMAGE_MS + i * PISOTEAR_STAGGER_MS);
      }
      break;
    default:
      break;
  }
}

function selectedHeroes(): HeroClassId[] {
  return setup.slots.filter((x): x is HeroClassId => x != null);
}

/** Slots 0–2 ocupados, na mesma ordem que `selectedHeroes()` (forja / cores por slot). */
function partySlotByHeroFromSlots(): (0 | 1 | 2)[] {
  const out: (0 | 1 | 2)[] = [];
  for (let si = 0; si < 3; si++) {
    if (setup.slots[si] != null) out.push(si as 0 | 1 | 2);
  }
  return out;
}

function formatEnemyMultPt(mult: number): string {
  return mult.toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

/** &lt; 1 verde; &gt; 1 vermelho; = 1 verde (base). */
function enemyMultToneClass(mult: number): string {
  if (mult < 1) return "hero-setup-diff-mul--low";
  if (mult > 1) return "hero-setup-diff-mul--high";
  return "hero-setup-diff-mul--base";
}

function enemyAttrBlockHtml(mult: number): string {
  const f = formatEnemyMultPt(mult);
  const tone = enemyMultToneClass(mult);
  return `<div class="hero-setup-difficulty__attrs">
    <div class="hero-setup-difficulty__attrs-head">Atributos inimigos</div>
    <ul class="hero-setup-difficulty__stats">
      <li><span class="hero-setup-difficulty__lbl">Vida:</span> <span class="hero-setup-difficulty__mul ${tone}">× ${f}</span></li>
      <li><span class="hero-setup-difficulty__lbl">Dano:</span> <span class="hero-setup-difficulty__mul ${tone}">× ${f}</span></li>
      <li><span class="hero-setup-difficulty__lbl">Defesa:</span> <span class="hero-setup-difficulty__mul ${tone}">× ${f}</span></li>
    </ul>
  </div>`;
}

function heroSetupDifficultyBannerHtml(heroCount: number): string {
  if (heroCount <= 0) {
    return `<div class="hero-setup-difficulty" role="status">
      <div class="hero-setup-difficulty__title"><strong>Dificuldade e tamanho do grupo</strong></div>
      <div class="hero-setup-difficulty__attrs hero-setup-difficulty__attrs--preview">
        <div class="hero-setup-difficulty__attrs-head">Exemplos — atributos inimigos</div>
        <ul class="hero-setup-difficulty__stats hero-setup-difficulty__stats--compact">
          <li><span class="hero-setup-difficulty__lbl">1 herói</span> <span class="hero-setup-difficulty__mul hero-setup-diff-mul--base">× ${formatEnemyMultPt(partyScaleMultiplier(1))}</span></li>
          <li><span class="hero-setup-difficulty__lbl">2 heróis</span> <span class="hero-setup-difficulty__mul hero-setup-diff-mul--high">× ${formatEnemyMultPt(partyScaleMultiplier(2))}</span></li>
          <li><span class="hero-setup-difficulty__lbl">3 heróis</span> <span class="hero-setup-difficulty__mul hero-setup-diff-mul--high">× ${formatEnemyMultPt(partyScaleMultiplier(3))}</span></li>
        </ul>
      </div>
    </div>`;
  }
  const mult = partyScaleMultiplier(heroCount);
  const warn =
    heroCount >= 3
      ? "hero-setup-difficulty--warn"
      : heroCount === 2
        ? "hero-setup-difficulty--warm"
        : "";
  if (heroCount === 1) {
    return `<div class="hero-setup-difficulty ${warn}" role="status">
      <div class="hero-setup-difficulty__title"><strong>1 herói — dificuldade base.</strong></div>
      ${enemyAttrBlockHtml(mult)}
    </div>`;
  }
  const title =
    heroCount === 2
      ? "2 heróis — Dificuldade moderada."
      : "3 heróis — Dificuldade Alta.";
  return `<div class="hero-setup-difficulty ${warn}" role="status">
    <div class="hero-setup-difficulty__title"><strong>${title}</strong></div>
    ${enemyAttrBlockHtml(mult)}
  </div>`;
}

function colorHintToDisplayColor(hint: string): number {
  const s = hint.replace("#", "").trim();
  if (s.length === 3) {
    const r = parseInt(s[0]! + s[0]!, 16);
    const g = parseInt(s[1]! + s[1]!, 16);
    const b = parseInt(s[2]! + s[2]!, 16);
    return (r << 16) | (g << 8) | b;
  }
  const n = parseInt(s, 16);
  return Number.isFinite(n) ? n : 0x888888;
}

function templateStatsStripHtml(cls: HeroClassId): string {
  const t = HEROES[cls];
  const critPct =
    cls === "sacerdotisa" ? "0%" : cls === "gladiador" ? "10%" : "25%";
  const critMultStr =
    cls === "sacerdotisa" ? "150%" : cls === "gladiador" ? "175%" : "200%";
  const items: { icon: StatIconId; label: string; value: string }[] = [
    { icon: "max_hp", label: "Vida máxima", value: String(t.maxHp) },
    { icon: "max_mana", label: "Mana máxima", value: String(t.maxMana) },
    { icon: "regen_hp", label: "Regeneração de vida", value: String(t.regenVida) },
    { icon: "regen_mp", label: "Regeneração de mana", value: String(t.regenMana) },
    { icon: "dmg", label: "Dano", value: String(t.dano) },
    { icon: "crit_hit", label: "Acerto crítico", value: critPct },
    { icon: "crit_dmg", label: "Multiplicador de crítico", value: critMultStr },
    { icon: "def", label: "Defesa", value: String(t.defesa) },
    { icon: "mov", label: "Movimento", value: String(t.movimento) },
  ];
  const cellHtml = (
    it: { icon: StatIconId; label: string; value: string },
    si: number,
  ) =>
    `<div class="setup-stat-cell" data-label="${escapeHtml(it.label)}" data-value="${escapeHtml(it.value)}">${statIconWrap(it.icon, si)}<span class="lol-stat-val">${escapeHtml(it.value)}</span></div>`;
  const row1 = items.slice(0, 5).map((it, j) => cellHtml(it, j)).join("");
  const row2 = items.slice(5).map((it, j) => cellHtml(it, j + 5)).join("");
  return `<div class="setup-stats-strip"><div class="setup-stats-row">${row1}</div><div class="setup-stats-row">${row2}</div></div>`;
}

function bindSetupStatCells(container: HTMLElement): void {
  container.querySelectorAll(".setup-stat-cell .lol-stat-ico[data-ico]").forEach((ico) => {
    const sub = ico as HTMLElement;
    const sid = sub.dataset.ico as StatIconId;
    if (!sub.title) sub.title = HERO_STAT_TIP[sid] ?? sid;
  });
  container.querySelectorAll(".setup-stat-cell").forEach((node) => {
    const el = node as HTMLElement;
    const label = el.dataset.label ?? "";
    const value = el.dataset.value ?? "";
    bindGameTooltip(el, () => tooltipStatCell(label, value));
  });
}
let prevPhase = model.phase;

type PendingCombat =
  | null
  | { kind: "basic" }
  | { kind: "skill"; id: string };

let movePreviewActive = false;
let pendingCombat: PendingCombat = null;
/** Evita acumular `keydown` de combate a cada `render()` / `showCombatHUD()`. */
let combatHotkeysAbort: AbortController | null = null;

/** Menu Esc durante a run (pausa + sair com confirmação). */
let runPauseOpen = false;
let runPauseStep: "menu" | "confirm" = "menu";
let runPauseEl: HTMLElement | null = null;
/** Inimigo selecionado para painel de atributos (combate). */
let combatInspectEnemyId: string | null = null;
/** Herói cujo loadout LOL está em foco (pode ≠ turno atual). */
let combatLolInspectHeroId: string | null = null;

function lolViewedHero(m: GameModel): Unit | null {
  const cur = m.currentHero();
  if (combatLolInspectHeroId) {
    const u = m.units.find((x) => x.id === combatLolInspectHeroId);
    if (u?.isPlayer && u.hp > 0 && m.getParty().some((p) => p.id === u.id)) {
      return u.heroClass ? u : null;
    }
    combatLolInspectHeroId = null;
  }
  return cur && cur.heroClass ? cur : null;
}
/** Índice do herói na loja de ouro; `render()` reabre a loja após `emit()` (ex.: compra), sem resetar. */
let goldShopHeroIndex = 0;
let goldShopStall3d: ShopStall3D | null = null;
let crystalShop3d: CrystalShop3D | null = null;
let goldShopBunker3d: BunkerPreview3D | null = null;
/** Atualização parcial da loja (evita `innerHTML` na shell a cada `emit()`). */
let refreshGoldShop: (() => void) | null = null;
let artifactCodex3d: ArtifactCodex3D | null = null;
let enemyCompendium3d: EnemyPreview3D | null = null;
let mainMenuSword3d: MainMenuSword3D | null = null;
/** Preview 3D do herói na loja de ouro (atributos à venda). */
let goldShopHeroPreview3d: HeroPreview3D | null = null;
/** Pré-visualizações 3D da tela Forja (descartadas ao repintar ou sair do menu). */
let forgePiecePreviews3d: ForgePiecePreview3D[] = [];

function disposeForgePiecePreviews(): void {
  for (const p of forgePiecePreviews3d) p.dispose();
  forgePiecePreviews3d = [];
}

function disposeMenu3dPreviews(): void {
  disposeForgePiecePreviews();
  artifactCodex3d?.dispose();
  artifactCodex3d = null;
  enemyCompendium3d?.dispose();
  enemyCompendium3d = null;
  mainMenuSword3d?.dispose();
  mainMenuSword3d = null;
}

function goldShopStatIcon(id: GoldShopId): StatIconId {
  switch (id) {
    case "dano":
      return "dmg";
    case "vida":
      return "max_hp";
    case "max_mana":
      return "max_mana";
    case "movimento":
      return "mov";
    case "crit_chance":
      return "crit_hit";
    case "crit_dmg":
      return "crit_dmg";
    case "regen_hp":
      return "regen_hp";
    case "regen_mana":
      return "regen_mp";
    case "defesa":
      return "def";
    case "heal_shield":
      return "pot";
    case "xp_pct":
      return "xp_bonus";
    default:
      return "generic";
  }
}

/** SVG da moeda de ouro (mesmo desenho que o HUD de combate). */
function combatGoldCoinSvgHtml(extraSvgClass = ""): string {
  const svgCl = ["combat-bolsa-svg", "combat-bolsa-svg--coin", extraSvgClass]
    .filter(Boolean)
    .join(" ");
  return `<svg class="${svgCl}" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" focusable="false" aria-hidden="true"><circle cx="24" cy="24" r="14.5" fill="#e8b923" stroke="#7a5a10" stroke-width="1.4"/><ellipse cx="19" cy="18" rx="5" ry="3" fill="#fff8c4" opacity="0.42"/><path fill="#c9a010" d="M24 33.2a9.2 9.2 0 01-1.2-18.3 9.2 9.2 0 011.2 18.3z" opacity="0.22"/></svg>`;
}

const COMBAT_LOG_VISIBLE_LS = "gladiadores-combat-log-visible";

function readCombatLogVisible(): boolean {
  const s = localStorage.getItem(COMBAT_LOG_VISIBLE_LS);
  if (s === null) return true;
  return s === "1";
}

function writeCombatLogVisible(v: boolean): void {
  localStorage.setItem(COMBAT_LOG_VISIBLE_LS, v ? "1" : "0");
}

const ENEMY_INSPECT_POS_LS = "gladiadores-enemy-inspect-pos";

type EnemyInspectPos = { left: number; top: number };

function readEnemyInspectPos(): EnemyInspectPos | null {
  try {
    const s = localStorage.getItem(ENEMY_INSPECT_POS_LS);
    if (!s) return null;
    const o = JSON.parse(s) as unknown;
    if (
      o &&
      typeof o === "object" &&
      typeof (o as EnemyInspectPos).left === "number" &&
      typeof (o as EnemyInspectPos).top === "number"
    )
      return { left: (o as EnemyInspectPos).left, top: (o as EnemyInspectPos).top };
  } catch {
    /* ignore */
  }
  return null;
}

function writeEnemyInspectPos(left: number, top: number): void {
  try {
    localStorage.setItem(ENEMY_INSPECT_POS_LS, JSON.stringify({ left, top }));
  } catch {
    /* ignore */
  }
}

function clampEnemyInspectPosition(
  left: number,
  top: number,
  w: number,
  h: number,
): EnemyInspectPos {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const m = 10;
  return {
    left: Math.min(Math.max(m, left), Math.max(m, vw - w - m)),
    top: Math.min(Math.max(m, top), Math.max(m, vh - h - m)),
  };
}

function mountEnemyInspectPanelShell(panel: HTMLElement): void {
  panel.innerHTML = `<div class="enemy-inspect-header" title="Arrastar para mover"><span class="enemy-inspect-grip" aria-hidden="true">≡</span><span class="enemy-inspect-title" id="enemy-inspect-title"></span></div>
<div id="enemy-inspect-preview-host" class="enemy-inspect-preview"></div>
<div id="enemy-inspect-status" class="enemy-inspect-status" aria-label="Efeitos de estado"></div>
<div id="enemy-inspect-primary" class="enemy-inspect-list enemy-inspect-list--primary"></div>
<button type="button" class="enemy-inspect-more-btn" id="enemy-inspect-more" aria-expanded="false">Ver mais informações</button>
<div id="enemy-inspect-extra" class="enemy-inspect-list enemy-inspect-list--extra enemy-inspect-extra--collapsed"></div>`;
  const btn = panel.querySelector("#enemy-inspect-more") as HTMLButtonElement;
  const extra = panel.querySelector("#enemy-inspect-extra") as HTMLElement;
  btn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    extra.classList.toggle("enemy-inspect-extra--collapsed");
    const collapsed = extra.classList.contains("enemy-inspect-extra--collapsed");
    btn.textContent = collapsed ? "Ver mais informações" : "Ocultar informações";
    btn.setAttribute("aria-expanded", collapsed ? "false" : "true");
  });
}

function enemyInspectRowsHtml(rows: [string, string][]): string {
  return rows
    .map(
      ([k, v]) =>
        `<div class="lol-stat-row enemy-inspect-row"><span class="eik">${escapeHtml(k)}</span><span class="eiv">${escapeHtml(v)}</span></div>`,
    )
    .join("");
}

function enemyStatusTooltipHotHtml(u: Unit): string {
  if (!u.hot) return "";
  return `<div class="game-ui-tooltip-inner"><div class="game-ui-tooltip-title">Cura contínua</div><p class="game-ui-tooltip-passive">+${u.hot.perTurn} PV por turno · ${u.hot.turns} turno(s) restante(s).</p></div>`;
}

function enemyStatusTooltipPoisonHtml(u: Unit): string {
  if (!u.poison) return "";
  return `<div class="game-ui-tooltip-inner"><div class="game-ui-tooltip-title">Veneno</div><p class="game-ui-tooltip-passive">${u.poison.perTurn} de dano por turno · ${u.poison.turns} turno(s) restante(s).</p></div>`;
}

function fillEnemyInspectStatusRow(host: HTMLElement, u: Unit): void {
  const bits: string[] = [];
  if (u.hot && u.hot.turns > 0) {
    bits.push(
      `<span class="enemy-inspect-status-badge enemy-inspect-status-badge--hot" role="img" aria-label="Cura contínua">♥&nbsp;${u.hot.turns}</span>`,
    );
  }
  if (u.poison && u.poison.turns > 0) {
    bits.push(
      `<span class="enemy-inspect-status-badge enemy-inspect-status-badge--poison" role="img" aria-label="Veneno">☠&nbsp;${u.poison.turns}</span>`,
    );
  }
  host.innerHTML = bits.length
    ? `<div class="enemy-inspect-status-inner">${bits.join("")}</div>`
    : "";
  const h = host.querySelector(".enemy-inspect-status-badge--hot");
  if (h) bindGameTooltip(h as HTMLElement, () => enemyStatusTooltipHotHtml(u));
  const p = host.querySelector(".enemy-inspect-status-badge--poison");
  if (p) bindGameTooltip(p as HTMLElement, () => enemyStatusTooltipPoisonHtml(u));
}

function enemyInspectPrimaryRows(u: Unit, m: GameModel): [string, string][] {
  const bio = biomeAt(m.grid, u.q, u.r) as BiomeId;
  const ign = unitIgnoresTerrain(u);
  const effDef = effectiveDefenseForBiome(u.defesa, bio, ign);
  const movPool = u.movimento + rulerMovementBonus(u);
  const killer = m.phase === "combat" ? m.currentHero() : null;
  const pctKill =
    killer && killer.isPlayer && killer.hp > 0
      ? `${Math.round(m.crystalDropChanceForKill(killer, u) * 1000) / 10}%`
      : "—";
  const rows: [string, string][] = [
    ["HP", `${u.hp} / ${u.maxHp}`],
    ["Dano", String(u.dano)],
    ["Defesa", String(effDef)],
    ["Movimento", String(movPool)],
    ["Voo", u.flying ? "Sim" : "Não"],
    ["Cristal", pctKill],
  ];
  if (
    killer &&
    killer.isPlayer &&
    killer.hp > 0 &&
    biomeToEssenceId(biomeAt(m.grid, killer.q, killer.r) as BiomeId)
  ) {
    const essT = m.essenceDropTotalPercentForKill(killer);
    const extras = Math.floor(Math.max(0, essT - 100) / 10);
    const essStr =
      extras > 0
        ? `${Math.round(essT * 10) / 10}% (+${extras} adicional${extras > 1 ? "is" : ""} garantido${extras > 1 ? "s" : ""} acima de 100%)`
        : `${Math.round(essT * 10) / 10}%`;
    rows.push(["Essência", essStr]);
  } else {
    rows.push(["Essência", "—"]);
  }
  return rows;
}

function enemyInspectExtraRows(u: Unit, m: GameModel): [string, string][] {
  const bio = biomeAt(m.grid, u.q, u.r) as BiomeId;
  const ign = unitIgnoresTerrain(u);
  const effAlc = effectiveAlcanceForBiome(u.alcance, bio, ign);
  const xpRw = u.enemyXpReward ?? "—";
  const rows: [string, string][] = [
    ["XP (recompensa)", String(xpRw)],
  ];
  if (u.enemyAttackKind === "aoe1") {
    rows.push(["Ataque", "Área (adjacentes ao alvo)"]);
  }
  rows.push(
    ["Defesa (base)", String(u.defesa)],
    [
      ign ? "Defesa (ruler ignora bioma)" : `Defesa (${BIOME_LABELS[bio]})`,
      String(effectiveDefenseForBiome(u.defesa, bio, ign)),
    ],
    ["Penetração", String(u.penetracao)],
    ["Penetração de escudo", String(u.penetracaoEscudo)],
    ["Crítico", `${Math.min(100, u.acertoCritico)}%`],
    ["Mult. crítico", `${Math.round(u.danoCritico * 100)}%`],
    ["Movimento (base)", String(u.movimento)],
    [
      ign
        ? "Movimento (pontos; ruler ignora pântano)"
        : bio === "pantano"
          ? "Movimento (pontos; pântano 2/hex)"
          : "Movimento (pontos)",
      String(u.movimento + rulerMovementBonus(u)),
    ],
    ["Alcance (base)", String(u.alcance)],
    [
      ign ? "Alcance (ruler ignora bioma)" : `Alcance (${BIOME_LABELS[bio]})`,
      String(effAlc),
    ],
    ["Regen. vida", String(u.regenVida)],
    ["Regen. mana", String(u.regenMana)],
    ["Roubo de vida", `${u.lifesteal}%`],
    ["Pot. cura/escudo", String(u.potencialCuraEscudo)],
    ["Escudo azul", String(u.shieldGGBlue)],
  );
  return rows;
}

let enemyInspectUiAbort: AbortController | null = null;

function bindEnemyInspectPanel(panel: HTMLElement): void {
  enemyInspectUiAbort?.abort();
  enemyInspectUiAbort = new AbortController();
  const { signal } = enemyInspectUiAbort;

  let drag: { sx: number; sy: number; sl: number; st: number } | null = null;

  const onMove = (ev: MouseEvent): void => {
    if (!drag) return;
    const dx = ev.clientX - drag.sx;
    const dy = ev.clientY - drag.sy;
    const w = panel.offsetWidth;
    const h = panel.offsetHeight;
    const c = clampEnemyInspectPosition(drag.sl + dx, drag.st + dy, w, h);
    panel.style.left = `${c.left}px`;
    panel.style.top = `${c.top}px`;
    panel.style.transform = "none";
  };

  const endDrag = (): void => {
    if (!drag) return;
    drag = null;
    panel.classList.remove("enemy-inspect--dragging");
    document.body.classList.remove("enemy-inspect--dragging-body");
    const w = panel.offsetWidth;
    const h = panel.offsetHeight;
    const r = panel.getBoundingClientRect();
    const c = clampEnemyInspectPosition(r.left, r.top, w, h);
    panel.style.left = `${c.left}px`;
    panel.style.top = `${c.top}px`;
    writeEnemyInspectPos(c.left, c.top);
    panel.classList.remove("enemy-inspect--centered");
  };

  panel.addEventListener(
    "mousedown",
    (ev: MouseEvent) => {
      if (panel.style.display === "none") return;
      const hdr = (ev.target as HTMLElement).closest(".enemy-inspect-header");
      if (!hdr) return;
      ev.preventDefault();
      panel.classList.remove("enemy-inspect--centered");
      const r = panel.getBoundingClientRect();
      panel.style.left = `${r.left}px`;
      panel.style.top = `${r.top}px`;
      panel.style.transform = "none";
      drag = { sx: ev.clientX, sy: ev.clientY, sl: r.left, st: r.top };
      panel.classList.add("enemy-inspect--dragging");
      document.body.classList.add("enemy-inspect--dragging-body");
    },
    { signal },
  );

  window.addEventListener("mousemove", onMove, { signal });
  window.addEventListener("mouseup", endDrag, { signal });
  window.addEventListener(
    "blur",
    () => {
      endDrag();
    },
    { signal },
  );

  window.addEventListener(
    "resize",
    () => {
      if (panel.style.display === "none") return;
      if (panel.classList.contains("enemy-inspect--centered")) return;
      const left = parseFloat(panel.style.left);
      const top = parseFloat(panel.style.top);
      if (!Number.isFinite(left) || !Number.isFinite(top)) return;
      const w = panel.offsetWidth;
      const h = panel.offsetHeight;
      const c = clampEnemyInspectPosition(left, top, w, h);
      panel.style.left = `${c.left}px`;
      panel.style.top = `${c.top}px`;
      writeEnemyInspectPos(c.left, c.top);
    },
    { signal },
  );
}

function resetCombatSelection(): void {
  movePreviewActive = false;
  pendingCombat = null;
  combatInspectEnemyId = null;
  combatLolInspectHeroId = null;
}

function applyCombatOverlays(): void {
  if (model.phase !== "combat") {
    view.clearCombatOverlays();
    return;
  }
  const h = model.currentHero();
  if (!h || h.hp <= 0) {
    view.clearCombatOverlays();
    return;
  }
  let moveKeys = new Set<string>();
  let atkKeys = new Set<string>();
  if (pendingCombat?.kind === "basic") {
    atkKeys = model.getBasicAttackRangeHexKeys();
  } else if (pendingCombat?.kind === "skill") {
    atkKeys = model.getSkillRangeHexKeys(pendingCombat.id);
  } else if (movePreviewActive) {
    const reach = model.reachableForCurrentHero();
    const cur = axialKey(h.q, h.r);
    for (const k of reach.keys()) {
      if (k !== cur) moveKeys.add(k);
    }
  }
  view.setMovementOverlay(moveKeys);
  view.setAttackOverlay(atkKeys);
  const enemyInspectKeys =
    combatInspectEnemyId != null
      ? model.enemyMovementPreviewKeys(combatInspectEnemyId)
      : new Set<string>();
  view.setEnemyInspectMovementOverlay(enemyInspectKeys);
}

function el(html: string): HTMLElement {
  const t = document.createElement("template");
  t.innerHTML = html.trim();
  return t.content.firstElementChild as HTMLElement;
}

function showArtifactCodex(): void {
  hideGameTooltip();
  disposeMenu3dPreviews();
  uiRoot.innerHTML = "";
  const shell = el(`<div class="artifact-codex-screen">
    <div class="artifact-codex-bg" aria-hidden="true"></div>
    <div class="artifact-codex-panel">
      <header class="artifact-codex-header">
        <h1 class="hero-setup-main-title">Artefatos</h1>
        <p class="artifact-codex-sub">Cartas do level-up — passe o rato para ver todos os tiers. ${ARTIFACT_POOL.length} cartas no total.</p>
        <button type="button" class="btn" id="codex-back">Voltar ao menu</button>
      </header>
      <div class="artifact-codex-scroll" id="codex-body"></div>
    </div>
  </div>`);
  uiRoot.appendChild(shell);
  const bgHost = shell.querySelector(".artifact-codex-bg") as HTMLElement;
  artifactCodex3d = new ArtifactCodex3D(bgHost);
  artifactCodex3d.start();
  const body = shell.querySelector("#codex-body")!;
  for (const r of ARTIFACT_RARITY_ORDER) {
    const sub = ARTIFACT_POOL.filter((a) => a.rarity === r);
    if (sub.length === 0) continue;
    const sec = el(`<section class="artifact-codex-sec">
      <h2 class="artifact-codex-sec-title">${escapeHtml(ARTIFACT_RARITY_LABELS[r])} · ${sub.length}</h2>
      <div class="artifact-codex-grid"></div>
    </section>`);
    const grid = sec.querySelector(".artifact-codex-grid")!;
    for (const a of sub) {
      const card = el(
        `<div class="artifact-codex-card ${artifactRarityClass(a.rarity)}" tabindex="0" role="img" aria-label="${escapeHtml(a.name)}">
          <div class="artifact-codex-card__art">${artifactCardInnerHtml(a.id)}</div>
          <div class="artifact-codex-card__name">${escapeHtml(a.name)}</div>
        </div>`,
      ) as HTMLElement;
      bindGameTooltip(card, () => artifactCodexAllTiersHtml(a.id));
      grid.appendChild(card);
    }
    body.appendChild(sec);
  }
  shell.querySelector("#codex-back")!.addEventListener("click", () => {
    disposeMenu3dPreviews();
    showMainMenu();
  });
}

function showEnemyCompendium(): void {
  hideGameTooltip();
  disposeMenu3dPreviews();
  uiRoot.innerHTML = "";
  const catalog = allEnemyArchetypesSorted();
  let wMin = 1;
  let wMax = 100;
  let filtered = filterEnemiesByWaveInterval(catalog, wMin, wMax);
  let selectedId = filtered[0]?.id ?? catalog[0]!.id;
  const shell = el(`<div class="enemy-codex-screen">
    <div class="enemy-codex-bg" aria-hidden="true"></div>
    <div class="enemy-codex-panel">
      <header class="enemy-codex-header">
        <h1 class="hero-setup-main-title">Compendium de inimigos</h1>
        <p class="enemy-codex-sub">${catalog.length} tipos · filtre por intervalo de ondas em que podem aparecer.</p>
        <button type="button" class="btn" id="enemy-codex-back">Voltar ao menu</button>
      </header>
      <div class="enemy-codex-layout">
        <aside class="enemy-codex-aside">
          <div class="enemy-codex-filters">
            <label>Onda mín. <input type="number" id="ec-wmin" min="1" max="100" value="1" class="enemy-codex-num" /></label>
            <label>Onda máx. <input type="number" id="ec-wmax" min="1" max="100" value="100" class="enemy-codex-num" /></label>
            <label>Nº heróis <input type="number" id="ec-party" min="1" max="3" value="1" class="enemy-codex-num" title="Escala de atributos (combate)" /></label>
          </div>
          <ul class="enemy-codex-list" id="ec-list"></ul>
        </aside>
        <main class="enemy-codex-main">
          <div class="enemy-codex-viewport" id="ec-view"></div>
          <div class="enemy-codex-detail" id="ec-detail"></div>
        </main>
      </div>
    </div>
  </div>`);
  uiRoot.appendChild(shell);
  const viewHost = shell.querySelector("#ec-view") as HTMLElement;
  const detailEl = shell.querySelector("#ec-detail") as HTMLElement;
  const listEl = shell.querySelector("#ec-list") as HTMLElement;
  const inpMin = shell.querySelector("#ec-wmin") as HTMLInputElement;
  const inpMax = shell.querySelector("#ec-wmax") as HTMLInputElement;
  const inpParty = shell.querySelector("#ec-party") as HTMLInputElement;
  const ac = new AbortController();
  const { signal } = ac;

  function paintDetail(eid: string): void {
    const def = getEnemyArchetype(eid);
    if (!def) return;
    enemyCompendium3d?.setEnemy(
      def.id,
      def.displayColor ?? (def.tier === "emperor" ? 0xffd700 : 0xff6f3c),
    );
    const loot = enemyLootSummaryLines(def)
      .map((ln) => `<li>${escapeHtml(ln)}</li>`)
      .join("");
    const tag = def.compendiumTag
      ? ` · ${escapeHtml(def.compendiumTag)}`
      : "";
    const partyN = Math.max(1, Math.min(3, Number(inpParty.value) || 1));
    const pm = partyScaleMultiplier(partyN);
    const wm = waveMultiplier(1);
    const mult = pm * wm;
    const hpS = Math.round(def.baseHp * mult);
    const danoS = Math.round(def.baseDano * mult);
    const defS = Math.round(def.baseDefesa * mult);
    const movGame = def.movimento + 2;
    detailEl.innerHTML = `<h2 class="enemy-codex-name">${escapeHtml(def.name)}</h2>
      <p class="enemy-codex-meta">${escapeHtml(enemyTierLabelPt(def.tier))} · ${escapeHtml(enemyWaveRangeLabel(def))}${tag}</p>
      <p class="enemy-codex-scale-hint">Atributos abaixo: onda 1 · <strong>${partyN}</strong> herói(s) · movimento como no combate (+2).</p>
      <dl class="enemy-codex-stats">
        <dt>HP</dt><dd>${hpS} <span class="enemy-codex-base-stat">(base ${def.baseHp})</span></dd>
        <dt>Dano</dt><dd>${danoS} <span class="enemy-codex-base-stat">(base ${def.baseDano})</span></dd>
        <dt>Defesa</dt><dd>${defS} <span class="enemy-codex-base-stat">(base ${def.baseDefesa})</span></dd>
        <dt>Movimento</dt><dd>${movGame}</dd>
        <dt>Alcance</dt><dd>${def.alcance}</dd>
      </dl>
      <h3 class="enemy-codex-loot-h">Saque e comportamento</h3>
      <ul class="enemy-codex-loot">${loot}</ul>`;
  }

  function rebuildList(): void {
    wMin = Math.max(1, Math.min(100, Number(inpMin.value) || 1));
    wMax = Math.max(1, Math.min(100, Number(inpMax.value) || 100));
    if (wMin > wMax) [wMin, wMax] = [wMax, wMin];
    inpMin.value = String(wMin);
    inpMax.value = String(wMax);
    filtered = filterEnemiesByWaveInterval(catalog, wMin, wMax);
    if (filtered.length === 0) {
      listEl.innerHTML = `<li class="enemy-codex-list__empty">Nenhum inimigo neste intervalo.</li>`;
      selectedId = catalog[0]!.id;
      paintDetail(selectedId);
      return;
    }
    if (!filtered.some((x) => x.id === selectedId)) selectedId = filtered[0]!.id;
    listEl.innerHTML = filtered
      .map(
        (e) =>
          `<li><button type="button" class="enemy-codex-item${e.id === selectedId ? " enemy-codex-item--sel" : ""}" data-id="${escapeHtml(e.id)}">${escapeHtml(e.name)}</button></li>`,
      )
      .join("");
    listEl.querySelectorAll(".enemy-codex-item").forEach((node) => {
      node.addEventListener("click", () => {
        selectedId = (node as HTMLButtonElement).dataset.id!;
        listEl.querySelectorAll(".enemy-codex-item").forEach((n) => {
          n.classList.toggle(
            "enemy-codex-item--sel",
            (n as HTMLButtonElement).dataset.id === selectedId,
          );
        });
        paintDetail(selectedId);
      });
    });
    paintDetail(selectedId);
  }

  const rect0 = viewHost.getBoundingClientRect();
  const iw = Math.max(280, Math.floor(rect0.width) || 480);
  const ih = Math.max(260, Math.min(440, Math.floor(window.innerHeight * 0.42)));
  enemyCompendium3d = new EnemyPreview3D(viewHost, iw, ih);
  enemyCompendium3d.start();
  inpMin.addEventListener("change", rebuildList, { signal });
  inpMax.addEventListener("change", rebuildList, { signal });
  inpParty.addEventListener("input", () => paintDetail(selectedId), { signal });
  inpParty.addEventListener("change", () => paintDetail(selectedId), { signal });
  rebuildList();

  const onWinResize = (): void => {
    if (!enemyCompendium3d) return;
    const r = viewHost.getBoundingClientRect();
    enemyCompendium3d.resize(
      Math.max(200, Math.floor(r.width)),
      Math.max(200, Math.min(440, Math.floor(r.height) || 320)),
    );
  };
  window.addEventListener("resize", onWinResize, { signal });

  shell.querySelector("#enemy-codex-back")!.addEventListener(
    "click",
    () => {
      ac.abort();
      disposeMenu3dPreviews();
      showMainMenu();
    },
    { signal },
  );
  requestAnimationFrame(onWinResize);
}

const FORGE_KIND_ORDER: readonly ForgeSlotKind[] = [
  "helmo",
  "capa",
  "manoplas",
];

/** Mantém o herói escolhido ao repintar a forja (ex.: após forjar). */
let forgeUiHeroIndex: 0 | 1 | 2 = 0;

/**
 * Último slot de party para o qual os &lt;select&gt; de bioma foram sincronizados.
 * Ao mudar de slot, o DOM ainda reflete o herói anterior — não ler `.value` até repovoar.
 */
let forgeLastSyncedHeroForBiomeUi: 0 | 1 | 2 | null = null;

/**
 * Escolha memorizada no &lt;select&gt; por slot de party (sobrevive ao `innerHTML` do paint).
 * `null` = opção Vazio; chave em falta = usar essência equipada salva.
 */
type ForgeUiBiomePicks = Partial<Record<ForgeSlotKind, ForgeEssenceId | null>>;
const forgeUiBiomePicksByHero: ForgeUiBiomePicks[] = [{}, {}, {}];

/** `Number("") === 0` — nunca usar Number() no slot de party da forja. */
function parseForgePartySlot(value: string): 0 | 1 | 2 | null {
  const t = value.trim();
  if (t === "0") return 0;
  if (t === "1") return 1;
  if (t === "2") return 2;
  return null;
}

function snapshotForgeBiomePicksFromDom(body: HTMLElement): void {
  const heroSelEl = body.querySelector("#forge-hero-sel") as HTMLSelectElement | null;
  if (!heroSelEl) return;
  const h = parseForgePartySlot(heroSelEl.value);
  if (h === null) return;
  for (const kind of FORGE_KIND_ORDER) {
    const sel = body.querySelector(
      `select.forge-biome-sel[data-forge-kind="${kind}"]`,
    ) as HTMLSelectElement | null;
    const v = sel?.value?.trim() ?? "";
    if (v === "") {
      forgeUiBiomePicksByHero[h][kind] = null;
    } else if (COMBAT_BIOMES.some((id) => id === v)) {
      forgeUiBiomePicksByHero[h][kind] = v as ForgeEssenceId;
    }
  }
}

function forgePieceLabelPt(kind: ForgeSlotKind): string {
  return kind === "helmo" ? "Elmo" : kind === "capa" ? "Capa" : "Manoplas";
}

/** Resumo HTML do loadout forjado salvo por slot de party (menu de escolha de herói). */
function heroSlotForgeEquipSummaryHtml(
  meta: (typeof model)["meta"],
  slotIdx: 0 | 1 | 2,
): string {
  const eq = resolveEquippedForgeLoadoutForMeta(meta, slotIdx);
  const rows = FORGE_KIND_ORDER.map((kind) => {
    const cur = eq[kind];
    const label = forgePieceLabelPt(kind);
    if (!cur) {
      return `<div class="hero-slot-forge__row"><span class="hero-slot-forge__k">${escapeHtml(label)}</span><span class="hero-slot-forge__v hero-slot-forge__v--empty">— vazio</span></div>`;
    }
    const bio = BIOME_LABELS[cur.biome as BiomeId];
    const t = cur.level;
    return `<div class="hero-slot-forge__row hero-slot-forge__row--forge-tier-${t}"><span class="hero-slot-forge__k">${escapeHtml(label)}</span><span class="hero-slot-forge__v">${escapeHtml(bio)} <span class="hero-slot-forge__nv hero-slot-forge__nv--tier-${t}">nv ${t}</span></span></div>`;
  }).join("");
  return `<div class="hero-slot-forge__box" role="status">${rows}</div>`;
}

function syncForgeKindRow(
  body: HTMLElement,
  meta: (typeof model)["meta"],
  hi: 0 | 1 | 2,
  kind: ForgeSlotKind,
  previewIndex: number,
  trustBiomeSelectValue: boolean,
): void {
  const L = meta.forgeByHeroSlot[hi]!;
  const g = meta.forgeGlobalProgress ?? {};
  const bioSel = body.querySelector(
    `select.forge-biome-sel[data-forge-kind="${kind}"]`,
  ) as HTMLSelectElement;
  const statsEl = body.querySelector(
    `.forge-piece-stats[data-forge-kind="${kind}"]`,
  ) as HTMLElement;
  const curEl = body.querySelector(
    `.forge-piece-cur[data-forge-kind="${kind}"]`,
  ) as HTMLElement;
  const pieceBlock = body.querySelector(
    `.forge-piece-block[data-forge-kind="${kind}"]`,
  ) as HTMLElement | null;
  const pieceLabelEl = pieceBlock?.querySelector(
    ".forge-piece-label",
  ) as HTMLElement | null;
  const btn = body.querySelector(
    `button.forge-do-btn[data-forge-kind="${kind}"]`,
  ) as HTMLButtonElement;
  if (!bioSel || !statsEl || !curEl || !btn) return;

  const rawEssence = trustBiomeSelectValue ? bioSel.value.trim() : "";
  const preservedPick = forgeUiBiomePicksByHero[hi][kind];
  /** Select novo após paint vem vazio: usa escolha memorizada, depois linha equipada neste slot. */
  let selectedEssence: ForgeEssenceId | null;
  if (trustBiomeSelectValue && rawEssence === "") {
    selectedEssence = null;
  } else if (
    trustBiomeSelectValue &&
    rawEssence &&
    COMBAT_BIOMES.some((id) => id === rawEssence)
  ) {
    selectedEssence = rawEssence as ForgeEssenceId;
  } else if (preservedPick !== undefined) {
    selectedEssence = preservedPick;
  } else {
    selectedEssence = resolveEquippedBiome(L, kind, g) ?? null;
  }

  const biomeForgeSelectable = (eid: ForgeEssenceId) =>
    !forgeBiomeEquippedOnOtherSlot(meta, hi, kind, eid);
  if (selectedEssence != null && !biomeForgeSelectable(selectedEssence)) {
    const eq = resolveEquippedBiome(L, kind, g);
    selectedEssence =
      (eq != null && biomeForgeSelectable(eq) ? eq : null) ??
      (COMBAT_BIOMES.find((b) => biomeForgeSelectable(b as ForgeEssenceId)) as
        | ForgeEssenceId
        | undefined) ??
      null;
    forgeUiBiomePicksByHero[hi][kind] = selectedEssence;
  }

  bioSel.disabled = false;
  const forgeOptLockedTitle = "Já equipado noutro slot da party";
  const emptySel = selectedEssence === null ? " selected" : "";
  const emptyOpt = `<option value=""${emptySel}>${escapeHtml("Vazio")}</option>`;
  bioSel.innerHTML =
    emptyOpt +
    COMBAT_BIOMES.map((b) => {
      const eid = b as ForgeEssenceId;
      const sel = eid === selectedEssence ? " selected" : "";
      const onOther = forgeBiomeEquippedOnOtherSlot(meta, hi, kind, eid);
      const dis = onOther
        ? ` disabled title="${escapeHtml(forgeOptLockedTitle)}"`
        : "";
      return `<option value="${eid}"${sel}${dis}>${escapeHtml(FORGE_ESSENCE_LABELS[eid])}</option>`;
    }).join("");
  if (![...bioSel.options].some((o) => o.selected)) {
    bioSel.selectedIndex = 0;
  }

  const rawVal = (bioSel.value ?? "").trim();
  const biomeNow: ForgeEssenceId | null =
    rawVal === "" ? null : (rawVal as ForgeEssenceId);
  if (biomeNow === null) {
    clearEquippedBiome(L, kind);
  } else {
    const progressLv = getForgeProgressLevel(g, kind, biomeNow);
    const equippedOnOther = forgeBiomeEquippedOnOtherSlot(
      meta,
      hi,
      kind,
      biomeNow,
    );
    if (progressLv != null && !equippedOnOther) {
      setEquippedBiome(L, kind, biomeNow);
    }
  }

  const selLv =
    biomeNow != null ? getForgeProgressLevel(g, kind, biomeNow) : undefined;
  const curPiece =
    biomeNow != null && selLv != null
      ? { biome: biomeNow, level: selLv }
      : undefined;
  const fullyMaxedThisLine = Boolean(curPiece && curPiece.level >= 3);
  const displayLevel = curPiece?.level ?? 1;

  if (pieceLabelEl) {
    pieceLabelEl.textContent =
      biomeNow == null
        ? forgePieceLabelPt(kind)
        : `${forgePieceLabelPt(kind)} - nv ${displayLevel}`;
  }
  curEl.textContent =
    biomeNow == null ? "Vazio" : FORGE_ESSENCE_LABELS[biomeNow];
  curEl.classList.toggle("forge-piece-cur--oneliner", false);

  const preview = forgePiecePreviews3d[previewIndex];
  if (preview) {
    preview.setKindAndPiece(
      kind,
      biomeNow,
      displayLevel as 1 | 2 | 3,
    );
  }

  const effectLevel = (curPiece?.level ?? 1) as 1 | 2 | 3;
  if (biomeNow == null) {
    statsEl.innerHTML = `<div class="forge-piece-stats__line">${escapeHtml("— Sem peça equipada neste slot —")}</div><div class="forge-piece-stats__line">${escapeHtml("Escolhe uma essência para ver efeitos e forjar; Vazio remove só a equipação deste slot.")}</div>`;
  } else if (!curPiece) {
    statsEl.innerHTML = `<div class="forge-piece-stats__line">${escapeHtml("— Sem forja nesta essência —")}</div><div class="forge-piece-stats__line">${escapeHtml("Escolhe o bioma e forja nv1; outras essências deste slot mantêm-se.")}</div>`;
  } else {
    const inner = forgePieceEffectHtml(
      kind,
      effectLevel,
      previewIndex * 24,
      curPiece.biome,
    );
    statsEl.innerHTML = inner;
    statsEl.querySelectorAll<HTMLElement>(".lol-stat-ico[data-ico]").forEach((ico) => {
      const id = ico.dataset.ico as StatIconId;
      if (!ico.title) ico.title = HERO_STAT_TIP[id] ?? id;
    });
  }
  const cost = !curPiece
    ? FORGE_COST_CREATE
    : curPiece.level === 1
      ? FORGE_COST_UPGRADE_TO_2
      : FORGE_COST_UPGRADE_TO_3;
  btn.textContent =
    biomeNow == null
      ? "—"
      : fullyMaxedThisLine
        ? "Máximo"
        : !curPiece
          ? `Forjar (${cost})`
          : `Aprimorar (${cost})`;
  if (biomeNow == null) {
    btn.setAttribute("aria-disabled", "true");
    btn.classList.remove("forge-do-btn--max");
    btn.classList.add("forge-do-btn--blocked");
  } else if (fullyMaxedThisLine) {
    btn.setAttribute("aria-disabled", "true");
    btn.classList.toggle("forge-do-btn--max", true);
    btn.classList.remove("forge-do-btn--blocked");
  } else {
    btn.removeAttribute("aria-disabled");
    btn.classList.remove("forge-do-btn--max");
    btn.classList.remove("forge-do-btn--blocked");
  }

  if (pieceBlock) {
    pieceBlock.classList.remove(
      "forge-piece-block--tier-0",
      "forge-piece-block--tier-1",
      "forge-piece-block--tier-2",
      "forge-piece-block--tier-3",
    );
    const tl = curPiece?.level;
    pieceBlock.classList.add(
      `forge-piece-block--tier-${tl === 1 || tl === 2 || tl === 3 ? tl : 0}`,
    );
  }
}

function bindForgeStatInlineTooltips(root: HTMLElement): void {
  root.querySelectorAll<HTMLElement>(".stat-inline-ico[data-stat-tip]").forEach((el) => {
    const id = el.dataset.statTip as StatIconId;
    const tip = HERO_STAT_TIP[id] ?? id;
    bindGameTooltip(el, () => `<div class="game-ui-tooltip-inner"><p class="game-ui-tooltip-passive">${escapeHtml(tip)}</p></div>`);
  });
}

function syncForgeHeroPanel(body: HTMLElement, meta: (typeof model)["meta"]): void {
  normalizeForgeMeta(meta);
  const heroSel = body.querySelector("#forge-hero-sel") as HTMLSelectElement;
  const hi =
    parseForgePartySlot(heroSel?.value ?? "") ?? forgeUiHeroIndex;
  const Lsyn = resolveEquippedForgeLoadoutForMeta(meta, hi);
  const trustBiomeSelectValue =
    forgeLastSyncedHeroForBiomeUi !== null &&
    forgeLastSyncedHeroForBiomeUi === hi;
  /** Povoa &lt;select&gt; e linhas (após paint ainda estão vazios). */
  FORGE_KIND_ORDER.forEach((kind, idx) => {
    syncForgeKindRow(body, meta, hi, kind, idx, trustBiomeSelectValue);
  });
  forgeLastSyncedHeroForBiomeUi = hi;
  const synEl = body.querySelector("#forge-synergy-panel");
  if (synEl) {
    synEl.innerHTML = forgeSynergyPanelHtml(Lsyn);
    synEl.querySelectorAll(".forge-syn-card").forEach((node) => {
      const card = node as HTMLElement;
      const biome = card.dataset.biome as ForgeEssenceId | undefined;
      if (!biome) return;
      const crest = card.querySelector(
        ".forge-biome-crest-wrap",
      ) as HTMLElement | null;
      if (!crest) return;
      bindGameTooltip(crest, () => {
        const hiNow =
          parseForgePartySlot(heroSel.value) ?? forgeUiHeroIndex;
        const Lnow = resolveEquippedForgeLoadoutForMeta(meta, hiNow);
        return forgeSynergyCrestTooltipHtml(
          biome,
          forgeSynergyTier(Lnow, biome),
        );
      });
    });
  }
  bindForgeStatInlineTooltips(body);
}

function showForge(): void {
  hideGameTooltip();
  disposeMenu3dPreviews();
  forgeUiBiomePicksByHero[0] = {};
  forgeUiBiomePicksByHero[1] = {};
  forgeUiBiomePicksByHero[2] = {};
  forgeLastSyncedHeroForBiomeUi = null;
  uiRoot.innerHTML = "";
  const shell = el(`
    <div class="screen screen-forge screen--crystal-veil">
      <h1 class="hero-setup-main-title">Forja</h1>
      <p class="screen-forge__hint">Forje itens permanentes para suas partidas. <span class="screen-forge__hint-gold">Apenas equipamentos nv 3 contam para as sinergias.</span> Os <strong>níveis de forja e aprimoramentos são globais</strong>: ao subires uma peça em qualquer slot, o nível fica igual em todos. Cada <strong>slot de party</strong> escolhe que linha (tipo + bioma) <strong>equipa</strong>; a mesma linha não pode estar equipada em dois slots ao mesmo tempo, mas podes aprimorá-la a partir de qualquer slot.</p>
      <div id="forge-body" class="forge-body"></div>
      <button type="button" class="btn" id="forge-back">Voltar ao menu</button>
    </div>
  `);
  uiRoot.appendChild(shell);
  const body = shell.querySelector("#forge-body") as HTMLElement;
  const paint = (): void => {
    const m = model.meta;
    normalizeForgeMeta(m);
    const prevHeroRaw = (
      body.querySelector("#forge-hero-sel") as HTMLSelectElement | null
    )?.value;
    const prevHero = parseForgePartySlot(prevHeroRaw ?? "") ?? forgeUiHeroIndex;

    snapshotForgeBiomePicksFromDom(body);
    forgeLastSyncedHeroForBiomeUi = null;

    disposeForgePiecePreviews();

    const heroOpts = [0, 1, 2].map(
      (hi) =>
        `<option value="${hi}">${escapeHtml(`Slot party ${hi + 1}`)}</option>`,
    );

    const pieceRows = FORGE_KIND_ORDER.map((kind) => {
      const label = forgePieceLabelPt(kind);
      return `<div class="forge-piece-card-cq"><div class="forge-piece-block" data-forge-kind="${kind}">
        <div class="forge-piece-head">
          <span class="forge-piece-label">${label}</span>
          <span class="forge-piece-cur forge-piece-cur--oneliner" data-forge-kind="${kind}">—</span>
        </div>
        <div class="forge-piece-block__visual">
          <div class="forge-piece-preview-host" data-forge-kind="${kind}" aria-hidden="true"></div>
          <div class="forge-piece-stats" data-forge-kind="${kind}"></div>
        </div>
        <div class="forge-piece-block__controls">
          <select class="forge-biome-sel" data-forge-kind="${kind}" aria-label="Bioma (${label})"></select>
          <button type="button" class="btn forge-do-btn" data-forge-kind="${kind}">Forjar</button>
        </div>
      </div></div>`;
    }).join("");

    body.innerHTML = [
      forgeEssenceBarHtml(m),
      `<div id="forge-synergy-panel" class="forge-synergy-panel-wrap"></div>`,
      `<div class="forge-slot-picker">
        <label class="forge-slot-picker__label" id="forge-hero-sel-lbl">Slot de party</label>
        <select id="forge-hero-sel" class="forge-slot-sel" aria-label="Escolher slot de party">${heroOpts.join("")}</select>
      </div>`,
      `<div id="forge-hero-pieces" class="forge-hero-pieces">${pieceRows}</div>`,
    ].join("");

    const heroSel = body.querySelector("#forge-hero-sel") as HTMLSelectElement;
    heroSel.value = String(prevHero);
    forgeUiHeroIndex = parseForgePartySlot(heroSel.value) ?? prevHero;

    FORGE_KIND_ORDER.forEach((kind) => {
      const host = body.querySelector(
        `.forge-piece-preview-host[data-forge-kind="${kind}"]`,
      ) as HTMLElement;
      const preview = new ForgePiecePreview3D(host);
      forgePiecePreviews3d.push(preview);
      preview.start();
    });

    syncForgeHeroPanel(body, m);

    heroSel.addEventListener("change", () => {
      const p = parseForgePartySlot(heroSel.value);
      if (p !== null) forgeUiHeroIndex = p;
      syncForgeHeroPanel(body, model.meta);
    });

    body.querySelectorAll("select.forge-biome-sel").forEach((node) => {
      node.addEventListener("change", () => {
        const hi = parseForgePartySlot(heroSel.value) ?? forgeUiHeroIndex;
        const se = node as HTMLSelectElement;
        const k = se.dataset.forgeKind as ForgeSlotKind;
        const v = se.value.trim();
        if (v === "") {
          forgeUiBiomePicksByHero[hi][k] = null;
        } else if (COMBAT_BIOMES.some((id) => id === v)) {
          forgeUiBiomePicksByHero[hi][k] = v as ForgeEssenceId;
        }
        syncForgeHeroPanel(body, model.meta);
      });
    });

    body.querySelectorAll("button.forge-do-btn").forEach((node) => {
      const btn = node as HTMLButtonElement;
      const kind = btn.dataset.forgeKind as ForgeSlotKind;
      bindGameTooltip(btn, () => {
        const hi = parseForgePartySlot(heroSel.value) ?? forgeUiHeroIndex;
        const bioSel = body.querySelector(
          `select.forge-biome-sel[data-forge-kind="${kind}"]`,
        ) as HTMLSelectElement;
        const biome = bioSel.value.trim() as ForgeEssenceId | "";
        return forgeUpgradeButtonTooltipHtml(model.meta, hi, kind, biome);
      });
      btn.addEventListener("click", () => {
        if (btn.getAttribute("aria-disabled") === "true") return;
        const hi = parseForgePartySlot(heroSel.value) ?? forgeUiHeroIndex;
        const bioSel = body.querySelector(
          `select.forge-biome-sel[data-forge-kind="${kind}"]`,
        ) as HTMLSelectElement;
        const rawB = bioSel.value.trim();
        if (rawB === "" || !COMBAT_BIOMES.some((id) => id === rawB)) {
          playInputError();
          return;
        }
        const biome = rawB as ForgeEssenceId;
        if (forgeTryCraftOrUpgrade(model.meta, hi, kind, biome)) {
          delete forgeUiBiomePicksByHero[hi][kind];
          model.saveMeta();
          paint();
        } else {
          playInputError();
        }
      });
    });

    body
      .querySelectorAll<HTMLSelectElement>(
        "select.forge-biome-sel, select.forge-slot-sel",
      )
      .forEach((node) => mountCrystalSelect(node));
  };
  paint();
  shell.querySelector("#forge-back")!.addEventListener("click", () => {
    model.saveMeta();
    showMainMenu();
  });
}

function showMainMenu(): void {
  model.devSandboxMode = false;
  hideGameTooltip();
  disposeMenu3dPreviews();
  mainMenuSword3d?.dispose();
  mainMenuSword3d = null;
  uiRoot.innerHTML = "";
  const devMenuExtras = import.meta.env.DEV
    ? `<button type="button" class="main-menu-link main-menu-link--sandbox" data-action="dev-sandbox">Modo sandbox (testes)</button>
          <button type="button" class="main-menu-link main-menu-link--dev" data-action="dev-reset-fresh">[Dev] Estado inicial (apagar save)</button>`
    : "";
  const s = el(`
    <div class="main-menu-screen">
      <div class="main-menu-bg" id="main-menu-bg" aria-hidden="true"></div>
      <div class="main-menu-content">
        <header class="main-menu-header">
          <h1 class="main-menu-title">Gladius</h1>
          <p class="main-menu-subtitle">Sobreviventes do Coliseu</p>
        </header>
        <nav class="main-menu-nav" aria-label="Menu principal">
          <button type="button" class="main-menu-link main-menu-link--primary" data-action="new">Novo jogo</button>
          ${devMenuExtras}
          <button type="button" class="main-menu-link" data-action="crystal">Loja de cristais</button>
          <button type="button" class="main-menu-link" data-action="forge">Forja</button>
          <button type="button" class="main-menu-link" data-action="artifacts">Artefatos</button>
          <button type="button" class="main-menu-link" data-action="enemies">Compendium</button>
          <button type="button" class="main-menu-link" data-action="exit">Sair</button>
        </nav>
      </div>
    </div>
  `);
  uiRoot.appendChild(s);
  const bg = s.querySelector("#main-menu-bg") as HTMLElement;
  mainMenuSword3d = new MainMenuSword3D(bg);
  mainMenuSword3d.start();

  s.querySelectorAll(".main-menu-link").forEach((btn) => {
    btn.addEventListener("click", () => {
      const action = (btn as HTMLElement).dataset.action;
      switch (action) {
        case "forge":
          showForge();
          break;
        case "artifacts":
          showArtifactCodex();
          break;
        case "enemies":
          showEnemyCompendium();
          break;
        case "new":
          model.devSandboxMode = false;
          model.phase = "setup_heroes";
          setup.slots = [null, null, null];
          setup.biomes = [];
          setup.colors = ["azul", "verde", "vermelho"];
          render();
          break;
        case "dev-sandbox":
          if (!import.meta.env.DEV) break;
          model.devSandboxMode = true;
          model.phase = "setup_heroes";
          setup.slots = [null, null, null];
          setup.biomes = [];
          setup.colors = ["azul", "verde", "vermelho"];
          render();
          break;
        case "crystal":
          model.phase = "crystal_shop";
          render();
          break;
        case "exit":
          window.close();
          break;
        case "dev-reset-fresh":
          if (!import.meta.env.DEV) break;
          if (
            !confirm(
              "[Dev] Apagar todo o progresso guardado (cristais, forja, essências, preferências locais) e recarregar como na primeira abertura?",
            )
          ) {
            break;
          }
          clearAllLocalProgressForFreshStart();
          window.location.reload();
          break;
        default:
          break;
      }
    });
  });
}

function showWaveSummaryOverlay(): void {
  const summary = model.peekWaveLootSummary();
  hideGameTooltip();
  uiRoot.innerHTML = "";
  if (!summary) {
    model.dismissWaveSummary();
    return;
  }
  const lines: string[] = [];
  lines.push(`<div class="wave-summary-overlay__title">Vitória!</div>`);
  lines.push(
    `<p class="wave-summary-overlay__wave-tag">Wave ${summary.wave}</p>`,
  );
  lines.push(`<p class="wave-summary-overlay__xp">XP total (wave): <strong>${summary.xpTotal}</strong></p>`);
  for (const g of summary.goldLines) {
    if (g.bonus > 0) {
      lines.push(
        `<p class="wave-summary-overlay__line">${escapeHtml(g.heroName)}: ${g.base} ouro base + <span class="wave-summary-overlay__bonus">+${g.bonus}</span> (meta) → <strong>${g.total}</strong> na bolsa</p>`,
      );
    } else {
      lines.push(
        `<p class="wave-summary-overlay__line">${escapeHtml(g.heroName)}: <strong>${g.total}</strong> ouro na bolsa</p>`,
      );
    }
  }
  if (summary.crystalsGained > 0) {
    lines.push(
      `<p class="wave-summary-overlay__line wave-summary-overlay__crystals">Cristais (run): +${summary.crystalsGained}</p>`,
    );
  }
  if (summary.essences.length > 0) {
    const essText = summary.essences
      .map(
        (e) =>
          `${escapeHtml(FORGE_ESSENCE_LABELS[e.id])} ×${e.n}`,
      )
      .join(" · ");
    lines.push(
      `<p class="wave-summary-overlay__line wave-summary-overlay__ess">Essências: ${essText}</p>`,
    );
  }
  const wrap = el(`<div class="wave-summary-overlay" role="dialog" aria-modal="true">
    <div class="wave-summary-overlay__panel">
      ${lines.join("")}
      <p class="wave-summary-overlay__hint">Clica em qualquer sítio para continuar</p>
    </div>
  </div>`);
  uiRoot.appendChild(wrap);
  wrap.addEventListener("click", () => {
    model.dismissWaveSummary();
    render();
  });
}

function showCrystalShop(): void {
  hideGameTooltip();
  disposeMenu3dPreviews();
  crystalShop3d?.dispose();
  crystalShop3d = null;
  const m = model.meta;
  uiRoot.innerHTML = "";
  const shell = el(`<div class="shop-screen crystal-shop-screen"></div>`);
  const bgHost = el(`<div class="shop-screen__bg" aria-hidden="true"></div>`);
  const panel = el(`<div class="shop-screen__panel shop-screen__panel--crystal"></div>`);
  shell.appendChild(bgHost);
  shell.appendChild(panel);
  uiRoot.appendChild(shell);
  crystalShop3d = new CrystalShop3D(bgHost);
  crystalShop3d.start();
  panel.innerHTML = `
    <div class="crystal-shop-panel-inner">
      <h1 class="crystal-shop-heading">Loja de cristais</h1>
      <p class="crystal-shop-crystals">Cristais: <strong>${m.crystals}</strong></p>
      <div class="shop-grid crystal-shop-grid" id="meta-grid"></div>
      <button type="button" class="btn crystal-shop-back-btn" id="btn-back">Voltar</button>
    </div>`;
  const s = panel.querySelector(".crystal-shop-panel-inner") as HTMLElement;
  const grid = s.querySelector("#meta-grid")!;
  const tracks = [
    ["permDamage", "Dano meta"],
    ["permHp", "Vida meta"],
    ["permDef", "Defesa meta"],
    ["permHealShield", "Cura/escudo meta"],
    ["permXp", "XP meta"],
    ["permGold", "Ouro meta (início + ganhos na run)"],
    ["permCrystalDrop", "Drop cristal meta"],
  ] as const;
  for (const [key, label] of tracks) {
    const cur = m[key];
    const cost = nextMetaCost(cur);
    const canBuy = cost != null && m.crystals >= cost;
    const btnLabel = cost != null ? `${cost} 💎` : "—";
    const ariaBuy =
      cost != null
        ? `Comprar por ${cost} cristais`
        : "Melhoria no nível máximo";
    const div = el(`<div class="shop-item crystal-shop-item crystal-shop-item--row"><span class="crystal-shop-item__text">${label}: nível ${cur}/5 (+${permPercent(cur)}%)${cost != null ? "" : " — máx."}</span><button type="button" class="btn crystal-shop-buy-btn" data-meta="${key}" ${!canBuy ? "disabled" : ""} aria-label="${escapeHtml(ariaBuy)}">${btnLabel}</button></div>`);
    grid.appendChild(div);
    div.querySelector("button")!.addEventListener("click", () => {
      if (model.buyMetaTrack(key)) render();
    });
  }
  const ic = m.initialCards;
  const icCost = nextInitialCardCost(ic);
  const icCanBuy = icCost != null && m.crystals >= icCost;
  const icBtnLabel = icCost != null ? `${icCost} 💎` : "—";
  const icAria =
    icCost != null
      ? `Comprar por ${icCost} cristais`
      : "Número máximo de compras";
  const icDiv = el(`<div class="shop-item crystal-shop-item crystal-shop-item--row"><span class="crystal-shop-item__text">+1 carta por nível (escolha de artefatos): ${ic}/3 compras${icCost != null ? "" : " — máx."}</span><button type="button" class="btn crystal-shop-buy-btn" id="btn-ic" ${!icCanBuy ? "disabled" : ""} aria-label="${escapeHtml(icAria)}">${icBtnLabel}</button></div>`);
  grid.appendChild(icDiv);
  icDiv.querySelector("#btn-ic")!.addEventListener("click", () => {
    if (model.buyInitialCards()) render();
  });

  for (let slot = 0; slot < 3; slot++) {
    const wl = m.weaponLevelByHeroSlot[slot as 0 | 1 | 2];
    const cost = weaponUpgradeCrystalCost(wl);
    const wCanBuy = cost != null && m.crystals >= cost;
    const wBtnLabel = cost != null ? `${cost} 💎` : "—";
    const wAria =
      cost != null
        ? `Melhorar arma do slot ${slot + 1} por ${cost} cristais`
        : "Arma no nível máximo neste slot";
    const div = el(`<div class="shop-item crystal-shop-item crystal-shop-item--row"><span class="crystal-shop-item__text">Arma principal (Slot ${slot + 1}): nv <strong>${wl}</strong>/5${cost != null ? "" : " — <em>máximo</em>"}</span><button type="button" class="btn crystal-shop-buy-btn" data-weapon-slot="${slot}" ${!wCanBuy ? "disabled" : ""} aria-label="${escapeHtml(wAria)}">${wBtnLabel}</button></div>`);
    grid.appendChild(div);
    div.querySelector("button")!.addEventListener("click", () => {
      if (model.buyWeaponUpgrade(slot as 0 | 1 | 2)) render();
    });
  }

  s.querySelector("#btn-back")!.addEventListener("click", () => {
    model.phase = "main_menu";
    render();
  });
}

function showHeroSetup(): void {
  disposeHeroSetupPreviews();
  heroSetupPreviewInstances = [];
  hideGameTooltip();
  disposeMenu3dPreviews();
  uiRoot.innerHTML = "";
  const heroes = selectedHeroes();
  const max = 3;
  const s = el(`
    <div class="screen screen--new-run-setup screen--hero-setup">
      <div class="hero-setup-screen">
        ${heroSetupDifficultyBannerHtml(heroes.length)}
        <h1 class="hero-setup-main-title">Escolha até 3 heróis (${heroes.length}/${max})</h1>
        <div class="hero-slots-grid" id="hero-slots"></div>
        <div class="hero-setup-actions new-run-setup-actions">
          <button type="button" class="btn" id="btn-back">Voltar ao menu</button>
          <button type="button" class="btn btn-primary" id="btn-next" ${heroes.length < 1 ? "disabled" : ""}>Selecionar</button>
        </div>
      </div>
    </div>
  `);
  uiRoot.appendChild(s);
  const slotsRoot = s.querySelector("#hero-slots")!;
  const heroSetupSlotLabels = ["1º a começar", "2º a começar", "3º a começar"];
  const opts: { value: string; label: string }[] = [
    { value: "", label: "— Vazio —" },
    ...(["pistoleiro", "gladiador", "sacerdotisa"] as HeroClassId[]).map(
      (id) => ({ value: id, label: HEROES[id].name }),
    ),
  ];
  for (let i = 0; i < 3; i++) {
    const wrap = el(`<div class="hero-slot" data-slot="${i}"></div>`);
    const label = el(
      `<label class="hero-slot-label">${heroSetupSlotLabels[i]}</label>`,
    );
    const sel = document.createElement("select");
    sel.className = "hero-slot-select";
    for (const o of opts) {
      const op = document.createElement("option");
      op.value = o.value;
      op.textContent = o.label;
      sel.appendChild(op);
    }
    const cur = setup.slots[i];
    sel.value = cur ?? "";
    sel.addEventListener("change", () => {
      const v = sel.value as HeroClassId | "";
      setup.slots[i] = v === "" ? null : v;
      render();
    });
    const card = el(`<div class="hero-slot-card"></div>`);
    wrap.appendChild(label);
    wrap.appendChild(sel);
    mountCrystalSelect(sel);
    const slotMeta = i as 0 | 1 | 2;
    const forgeL = resolveEquippedForgeLoadoutForMeta(model.meta, slotMeta);
    const forgePanel = el(
      `<div class="hero-slot-forge" role="region" aria-label="Equipamentos forjados (${heroSetupSlotLabels[i]})"></div>`,
    );
    forgePanel.innerHTML = `<div class="hero-slot-forge__title">Equipamentos forjados neste slot</div>${heroSlotForgeEquipSummaryHtml(model.meta, slotMeta)}${heroSlotForgeSynergyStripHtml(forgeL)}`;
    wrap.appendChild(forgePanel);
    forgePanel
      .querySelectorAll<HTMLElement>("[data-slot-syn-biome]")
      .forEach((tipEl) => {
        const biome = tipEl.dataset.slotSynBiome as ForgeEssenceId;
        bindGameTooltip(tipEl, () =>
          forgeSynergyCrestTooltipHtml(biome, forgeSynergyTier(forgeL, biome)),
        );
      });
    wrap.appendChild(card);
    slotsRoot.appendChild(wrap);
    const hid = setup.slots[i];
    if (hid) {
      const wl = model.meta.weaponLevelByHeroSlot[i as 0 | 1 | 2];
      const baseD = HEROES[hid].dano;
      card.innerHTML = `${templateStatsStripHtml(hid)}
        <div class="hero-slot-weapon-row" tabindex="0" role="img" aria-label="Arma principal nível ${wl} de 5. Paira para ver skill e ultimate da arma.">
          <span class="hero-slot-weapon-row__lbl">Arma principal</span>
          <span class="hero-slot-weapon-row__nv">nv <strong>${wl}</strong>/5</span>
          <span class="hero-slot-weapon-row__hint" aria-hidden="true">paira · skill e ultimate</span>
        </div>
        <div class="hero-slot-model-host" data-slot-model="${i}"></div><div class="hero-slot-passive-wrap"><div class="hero-slot-passive__title">Passiva</div><p class="hero-slot-passive">${escapeHtml(HEROES[hid].passiveDescription)}</p></div>`;
      bindSetupStatCells(card);
      const weaponRow = card.querySelector(".hero-slot-weapon-row") as HTMLElement;
      bindGameTooltip(weaponRow, () =>
        heroSetupWeaponAbilitiesTooltipHtml(hid, wl, baseD),
      );
      const host = card.querySelector(`[data-slot-model="${i}"]`) as HTMLElement;
      const prev = new HeroPreview3D(host, 220, 300, {
        cameraZ: 2.95,
        lookAtY: 0.7,
      });
      prev.setHero(
        hid,
        colorHintToDisplayColor(HEROES[hid].colorHint),
        forgeL,
      );
      prev.start();
      heroSetupPreviewInstances.push(prev);
    } else {
      card.classList.add("hero-slot-card--placeholder");
      card.innerHTML = `
        <div class="hero-slot-placeholder">
          <div class="hero-slot-model-host hero-slot-model-host--placeholder"></div>
          <p class="hero-slot-placeholder__txt">Selecione um herói para este slot</p>
        </div>
      `;
    }
  }
  s.querySelector("#btn-next")!.addEventListener("click", () => {
    if (selectedHeroes().length < 1) return;
    setup.biomes = [];
    model.phase = "setup_biomes";
    render();
  });
  s.querySelector("#btn-back")!.addEventListener("click", () => {
    model.phase = "main_menu";
    render();
  });
}

function showBiomeSetup(): void {
  disposeBiomePicker();
  disposeBioHeroPreview();
  hideGameTooltip();
  uiRoot.innerHTML = "";
  const heroes = selectedHeroes();
  if (heroes.length === 0) {
    model.phase = "setup_heroes";
    render();
    return;
  }
  setup.biomes = setup.biomes.slice(0, heroes.length);
  if (setup.biomes.length === heroes.length) {
    model.phase = "setup_colors";
    while (setup.colors.length < 3) setup.colors.push("azul");
    setup.colors = setup.colors.slice(0, 3);
    render();
    return;
  }
  const step = setup.biomes.length;
  const curHero = heroes[step]!;
  const tmpl = HEROES[curHero];

  const s = el(`
    <div class="screen screen--new-run-setup screen--biome-setup biome-setup-screen">
      <h1 class="hero-setup-main-title">Bioma inicial</h1>
      <p class="hero-setup-hint">Vista de cima do coliseu: paira para ler · clica num bioma livre. Cada bioma só uma vez. Ícone = herói que já o escolheu.</p>
      <div class="biome-desc-panel biome-desc-panel--top" id="bio-desc-panel">
        <div class="biome-desc-title" id="bio-desc-title">Explora o mapa</div>
        <p class="biome-desc-body" id="bio-desc-body">Passa o rato sobre um bioma para ver a descrição. O centro (castelo) não é bioma inicial.</p>
      </div>
      <div class="biome-setup-layout">
        <aside class="biome-setup-left">
          <h2 class="biome-hero-name">${escapeHtml(tmpl.name)}</h2>
          <p class="biome-hero-step">Herói ${step + 1} de ${heroes.length}</p>
          <div class="biome-hero-model-wrap">
            <div class="biome-hero-model-host" id="bio-hero-model-host"></div>
          </div>
        </aside>
        <div class="biome-setup-right">
          <div class="biome-picker-wrap">
            <canvas id="biome-picker-canvas"></canvas>
          </div>
        </div>
      </div>
      <div class="biome-setup-actions biome-setup-actions--hero-row new-run-setup-actions">
        <button type="button" class="btn" id="btn-bio-back">Voltar</button>
      </div>
    </div>
  `);
  uiRoot.appendChild(s);

  const host = s.querySelector("#bio-hero-model-host") as HTMLElement;
  bioHeroPreview = new HeroPreview3D(host, 220, 240);
  const slotOrder = partySlotByHeroFromSlots();
  const forgeBio = resolveEquippedForgeLoadoutForMeta(
    model.meta,
    slotOrder[step]!,
  );
  bioHeroPreview.setHero(
    curHero,
    colorHintToDisplayColor(tmpl.colorHint),
    forgeBio,
  );
  bioHeroPreview.start();

  const canvas = s.querySelector("#biome-picker-canvas") as HTMLCanvasElement;
  const descTitle = s.querySelector("#bio-desc-title") as HTMLElement;
  const descBody = s.querySelector("#bio-desc-body") as HTMLElement;

  biomePickerInstance = new BiomePicker3D(canvas, model.grid);
  const marks = setup.biomes.map((b, i) => ({
    biome: b,
    letter: heroClassLetter(heroes[i]!),
    color: colorHintToDisplayColor(HEROES[heroes[i]!].colorHint),
  }));
  biomePickerInstance.setTaken(marks);
  biomePickerInstance.start();

  const takenSet = new Set(setup.biomes);
  const defaultTitle = "Explora o mapa";
  const defaultBody =
    "Passa o rato sobre um bioma para ver a descrição. O centro (castelo) não é bioma inicial.";

  const applyHoverDesc = (biome: BiomeId | null): void => {
    if (!biome) {
      descTitle.textContent = defaultTitle;
      descBody.textContent = defaultBody;
      return;
    }
    descTitle.textContent = BIOME_LABELS[biome];
    descBody.textContent = BIOME_DESCRIPTIONS[biome];
  };

  canvas.addEventListener("mousemove", (ev) => {
    const hit = biomePickerInstance?.pickHex(ev.clientX, ev.clientY);
    if (!hit) {
      biomePickerInstance?.setHoverKey(null);
      applyHoverDesc(null);
      return;
    }
    biomePickerInstance?.setHoverKey(hit.hexKey);
    applyHoverDesc(hit.biome);
  });
  canvas.addEventListener("mouseleave", () => {
    biomePickerInstance?.setHoverKey(null);
    applyHoverDesc(null);
  });

  canvas.addEventListener("click", (ev) => {
    const hit = biomePickerInstance?.pickHex(ev.clientX, ev.clientY);
    if (!hit) return;
    const { biome } = hit;
    if (biome === "hub") return;
    if (takenSet.has(biome)) return;
    setup.biomes.push(biome);
    takenSet.add(biome);
    if (setup.biomes.length >= heroes.length) {
      disposeBiomePicker();
      disposeBioHeroPreview();
      model.phase = "setup_colors";
      while (setup.colors.length < 3) setup.colors.push("azul");
      setup.colors = setup.colors.slice(0, 3);
      render();
      return;
    }
    render();
  });

  s.querySelector("#btn-bio-back")!.addEventListener("click", () => {
    if (setup.biomes.length > 0) {
      setup.biomes.pop();
      render();
      return;
    }
    disposeBiomePicker();
    disposeBioHeroPreview();
    model.phase = "setup_heroes";
    render();
  });
}

function showColorSetup(): void {
  hideGameTooltip();
  uiRoot.innerHTML = "";
  while (setup.colors.length < 3) setup.colors.push("azul");
  setup.colors = setup.colors.slice(0, 3);
  const s = el(`
    <div class="screen screen--new-run-setup screen--color-setup color-setup-screen">
      <h1 class="hero-setup-main-title">Sinergia do time</h1>
      <p class="hero-setup-hint">As três cores definem a sinergia que afetará os heróis. Cada vértice é uma cor, clique para escolher sua combinação</p>
      <div id="color-triangle-host"></div>
      <div class="hero-setup-actions color-setup-actions new-run-setup-actions">
        <button type="button" class="btn" id="btn-color-back">Voltar</button>
        <button type="button" class="btn btn-primary" id="btn-start">Iniciar partida</button>
      </div>
    </div>
  `);
  uiRoot.appendChild(s);
  const host = s.querySelector("#color-triangle-host") as HTMLElement;
  mountColorTriangleEditor(host, {
    getColors: () => setup.colors,
    setColorAt: (i, c) => {
      setup.colors[i] = c;
    },
  });
  s.querySelector("#btn-start")!.addEventListener("click", () => {
    const heroes = selectedHeroes();
    model.startNewRun({
      heroes,
      biomes: setup.biomes.slice(0, heroes.length),
      colors: [...setup.colors],
      partySlotByHero: partySlotByHeroFromSlots(),
    });
    render();
  });
  s.querySelector("#btn-color-back")!.addEventListener("click", () => {
    if (setup.biomes.length > 0) setup.biomes.pop();
    model.phase = "setup_biomes";
    render();
  });
}

/** Grelha de artefatos na loja de ouro (modo sandbox). */
function goldShopSandboxArtifactsSectionHtml(h: Unit): string {
  const sorted = [...ARTIFACT_POOL].sort((a, b) => {
    const ri =
      ARTIFACT_RARITY_ORDER.indexOf(a.rarity) -
      ARTIFACT_RARITY_ORDER.indexOf(b.rarity);
    if (ri !== 0) return ri;
    return a.name.localeCompare(b.name, "pt");
  });
  const tiles = sorted
    .map((a) => {
      const n = h.artifacts[a.id] ?? 0;
      const cap = getArtifactMaxStacks(a.id);
      const on = n > 0 ? " shop-sandbox-artifact--on" : "";
      return `<button type="button" class="shop-sandbox-artifact ${artifactRarityClass(a.rarity)}${on}" data-sandbox-artifact="${escapeHtml(a.id)}" aria-label="${escapeHtml(`${a.name}, ${n} de ${cap} acúmulos. Esquerdo +1, direito −1. Paira para efeitos.`)}">
      <span class="shop-sandbox-artifact__name">${escapeHtml(a.name)}</span>
      <span class="shop-sandbox-artifact__stack" aria-hidden="true">${n}/${cap}</span>
    </button>`;
    })
    .join("");
  return `<section class="shop-sandbox-artifacts" aria-label="Artefatos sandbox">
    <h3 class="shop-sandbox-artifacts__title">Sandbox — artefatos deste herói</h3>
    <p class="shop-sandbox-artifacts__hint">Botão esquerdo: +1 acúmulo (do 0 liga o artefato). Botão direito: −1 (em 0 fica desligado). Passe o rato para ver todos os níveis e efeitos.</p>
    <div class="shop-sandbox-artifacts__grid" role="group">${tiles}</div>
  </section>`;
}

function showGoldShop(isInitial: boolean): void {
  const stayInShop =
    (model.phase === "shop_wave" && prevPhase === "shop_wave") ||
    (model.phase === "shop_initial" && prevPhase === "shop_initial");
  if (stayInShop && refreshGoldShop) {
    refreshGoldShop();
    return;
  }
  refreshGoldShop = null;
  hideGameTooltip();
  goldShopBunker3d?.dispose();
  goldShopBunker3d = null;
  goldShopStall3d?.dispose();
  goldShopStall3d = null;
  goldShopHeroPreview3d?.dispose();
  goldShopHeroPreview3d = null;
  uiRoot.innerHTML = "";
  const party = model.getParty();
  let idx = Math.min(
    Math.max(0, goldShopHeroIndex),
    Math.max(0, party.length - 1),
  );
  goldShopHeroIndex = idx;
  const shell = el(`<div class="shop-screen"></div>`);
  uiRoot.appendChild(shell);
  if (party.length === 0) {
    shell.innerHTML = `<div class="screen shop-screen__panel shop-screen__panel--gold"><h1 class="hero-setup-main-title">Erro</h1><p>Nenhum herói no grupo. Volte ao menu e inicie de novo.</p><button class="btn" id="fix-menu">Menu</button></div>`;
    shell.querySelector("#fix-menu")!.addEventListener("click", () => {
      model.phase = "main_menu";
      render();
    });
    return;
  }
  const bgHost = el(`<div class="shop-screen__bg" aria-hidden="true"></div>`);
  const panel = el(
    `<div class="shop-screen__panel shop-screen__panel--gold"></div>`,
  );
  shell.appendChild(bgHost);
  shell.appendChild(panel);
  goldShopStall3d = new ShopStall3D(bgHost);
  goldShopStall3d.start();

  const renderShop = (): void => {
    hideGameTooltip();
    goldShopBunker3d?.dispose();
    goldShopBunker3d = null;
    goldShopHeroPreview3d?.dispose();
    goldShopHeroPreview3d = null;
    const h = party[idx]!;
    const list = GOLD_SHOP.map((it, si) => {
      const xpFull =
        it.id === "xp_pct" && (h.artifacts["_xp_shop"] ?? 0) >= 60;
      const cant = h.ouro < it.cost || xpFull;
      const ico = statIconWrap(goldShopStatIcon(it.id), si);
      return `<div class="shop-item">
        <div class="shop-item__row">
          <span class="shop-item__ico">${ico}</span>
          <div class="shop-item__meta">
            <div class="shop-item__label">${escapeHtml(it.label)}</div>
            <div class="shop-item__cost">${it.cost} ouro</div>
          </div>
          <button type="button" class="btn shop-item__buy" data-item="${it.id}" ${cant ? "disabled" : ""}>Comprar</button>
        </div>
      </div>`;
    }).join("");
    const goldAriaLabel =
      party.length > 1
        ? `Ouro deste herói (bolsa individual, não partilhada): ${h.ouro}`
        : `Ouro atual na loja: ${h.ouro}`;
    const goldMultiHint =
      party.length > 1
        ? `<p class="shop-hero-gold-multi-hint" role="note">O ouro acima é só <strong>deste herói</strong> — na loja, <strong>cada herói tem a sua própria bolsa</strong>; troca de herói para gastar o ouro de cada um.</p>`
        : "";
    const bunkerShop = model.bunkerForShop();
    const bunkerMidCell = bunkerShop
      ? `<div class="shop-mid-cell shop-mid-cell--bunker">${goldShopBunkerSectionHtml(bunkerShop, h)}</div>`
      : "";
    const sandboxMidCell = model.devSandboxMode
      ? `<div class="shop-mid-cell shop-mid-cell--sandbox">${goldShopSandboxArtifactsSectionHtml(h)}</div>`
      : "";
    panel.innerHTML = `
      <div class="shop-panel-inner">
        <h1 class="shop-title hero-setup-main-title">Loja do coliseu</h1>
        <h2 class="shop-hero-name">${escapeHtml(h.name)}</h2>
        <div class="shop-hero-gold-row">
          <span class="shop-hero-gold__coin-wrap" id="shop-gold-coin-tip" role="img" tabindex="0" aria-label="${escapeHtml(goldAriaLabel)}">
            <span class="shop-hero-gold__icon" aria-hidden="true">${combatGoldCoinSvgHtml("shop-hero-gold__coin-svg")}</span>
          </span>
          <strong class="shop-hero-gold__value" id="shop-gold-value">${h.ouro}</strong>
          <span class="shop-hero-gold__sep" aria-hidden="true">·</span>
          <span class="shop-hero-gold__hero-idx">Herói ${idx + 1}/${party.length}</span>
        </div>
        ${goldMultiHint}
        <div class="shop-hero-viz" aria-label="Herói e atributos atuais">
          <div id="gold-shop-hero-3d" class="gold-shop-hero-3d-host" aria-hidden="true"></div>
          <div class="shop-hero-stats-col">
            <p class="shop-hero-stats-head">Atributos atuais (como no combate)</p>
            <div id="gold-shop-hero-stats" class="lol-stats-list gold-shop-hero-stats-grid"></div>
          </div>
        </div>
        <div class="shop-mid-row">
          ${bunkerMidCell}
          ${sandboxMidCell}
          <div class="shop-mid-cell shop-mid-cell--gold">
            <div class="shop-grid">${list}</div>
          </div>
        </div>
        <div class="shop-nav">
          <button type="button" class="btn" id="shop-prev" ${idx < 1 ? "disabled" : ""}>Herói anterior</button>
          <button type="button" class="btn btn-primary" id="shop-next">${idx < party.length - 1 ? "Próximo herói" : isInitial ? "Começar wave 1" : "Próxima wave"}</button>
        </div>
      </div>`;
    panel.querySelectorAll("[data-item]").forEach((b) => {
      b.addEventListener("click", () => {
        const id = (b as HTMLElement).dataset.item!;
        model.buyGoldItem(h.id, id);
        /* `emit` → `render` → `refreshGoldShop`; evitar segundo `renderShop` aqui (WebGL). */
      });
    });
    if (model.devSandboxMode) {
      panel.querySelectorAll("[data-sandbox-artifact]").forEach((node) => {
        const btn = node as HTMLElement;
        const artId = btn.dataset.sandboxArtifact;
        if (!artId) return;
        btn.addEventListener("contextmenu", (e) => e.preventDefault());
        btn.addEventListener("mousedown", (e) => {
          if (e.button !== 0 && e.button !== 2) return;
          e.preventDefault();
          const delta = e.button === 0 ? (1 as const) : (-1 as const);
          model.sandboxShopAdjustArtifact(h.id, artId, delta);
          renderShop();
        });
        bindGameTooltip(btn, () => {
          const def = artifactDefById(artId);
          const cur = h.artifacts[artId] ?? 0;
          const cap = getArtifactMaxStacks(artId);
          const state = `<p class="artifact-tt-sandbox-state"><strong>Acúmulos:</strong> ${cur}/${cap}</p>`;
          const flavor = def?.description
            ? `<p class="artifact-tt-sandbox-flavor">${escapeHtml(def.description)}</p>`
            : "";
          return `<div class="game-ui-tooltip-inner game-ui-tooltip-inner--wide-artifact">${state}${flavor}${artifactCodexAllTiersHtml(artId, h)}</div>`;
        });
      });
    }
    panel.querySelector("#bunk-repair")?.addEventListener("click", () => {
      model.buyBunkerRepair(h.id);
    });
    panel.querySelector("#bunk-evolve")?.addEventListener("click", () => {
      model.buyBunkerEvolve(h.id);
    });
    const bMinas = panel.querySelector(
      '[data-bunker-tip="minas"]',
    ) as HTMLElement | null;
    const bShop = model.bunkerForShop();
    if (bMinas && bShop) {
      bindGameTooltip(bMinas, () =>
        bunkerMinasShopTooltipHtml(bShop.tier),
      );
    }
    const bTiro = panel.querySelector(
      '[data-bunker-tip="tiro"]',
    ) as HTMLElement | null;
    if (bTiro) {
      bindGameTooltip(bTiro, () => bunkerTiroUnlockedTooltipHtml());
    }
    const bTiroL = panel.querySelector(
      '[data-bunker-tip="tiro-locked"]',
    ) as HTMLElement | null;
    if (bTiroL) {
      bindGameTooltip(bTiroL, () => bunkerTiroLockedTooltipHtml());
    }
    const bEv = panel.querySelector("#bunk-evolve") as HTMLElement | null;
    if (bEv && bShop && bShop.tier < 2) {
      bindGameTooltip(bEv, () =>
        bunkerEvolveTooltipHtml(bShop.tier),
      );
    }
    const goldTip = panel.querySelector(
      "#shop-gold-coin-tip",
    ) as HTMLElement | null;
    if (goldTip) {
      bindGameTooltip(
        goldTip,
        () =>
          `<div class="game-ui-tooltip-inner"><div class="game-ui-tooltip-title">Ouro Atual</div></div>`,
      );
    }
    const prevHost = panel.querySelector("#bunker-preview-host");
    if (prevHost && bShop) {
      goldShopBunker3d = new BunkerPreview3D(prevHost as HTMLElement);
      goldShopBunker3d.setTier(bShop.tier);
      goldShopBunker3d.start();
    }
    const hero3dHost = panel.querySelector("#gold-shop-hero-3d") as HTMLElement;
    const heroStatsEl = panel.querySelector(
      "#gold-shop-hero-stats",
    ) as HTMLElement;
    if (h.heroClass) {
      goldShopHeroPreview3d = new HeroPreview3D(hero3dHost, 220, 260);
      goldShopHeroPreview3d.setHero(
        h.heroClass,
        h.displayColor,
        h.forgeLoadout,
      );
      goldShopHeroPreview3d.start();
      renderHeroStatsGrid(heroStatsEl, heroStatCells(h, model));
    } else {
      hero3dHost.style.display = "none";
      heroStatsEl.innerHTML =
        '<p class="shop-hero-stats-fallback">Sem classe — sem pré-visualização 3D.</p>';
    }
    panel.querySelector("#shop-prev")!.addEventListener("click", () => {
      idx = Math.max(0, idx - 1);
      goldShopHeroIndex = idx;
      renderShop();
    });
    panel.querySelector("#shop-next")!.addEventListener("click", () => {
      if (idx < party.length - 1) {
        idx++;
        goldShopHeroIndex = idx;
        renderShop();
      } else {
        goldShopStall3d?.dispose();
        goldShopStall3d = null;
        goldShopBunker3d?.dispose();
        goldShopBunker3d = null;
        goldShopHeroPreview3d?.dispose();
        goldShopHeroPreview3d = null;
        if (isInitial) model.finishInitialShop();
        else model.finishWaveShop();
        render();
      }
    });
  };
  refreshGoldShop = renderShop;
  renderShop();
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function ariaSkillLabel(name: string, cd: number): string {
  return cd > 0 ? `${name} (${cd} ondas de recarga)` : name;
}

/** Botão quadrado de skill: ícone + tecla + mana; nome no tooltip/`aria-label`. */
function combatSquareSkillHtml(opts: {
  disabled: boolean;
  iconHtml: string;
  hotkey: string;
  manaBadge: string;
  ariaLabel: string;
  extraClass?: string;
  extraStyle?: string;
  ultFill?: boolean;
  /** Uma letra/número minúsculo: mesmo efeito que o clique (atalho de combate). */
  combatHotkey?: string;
  /** Ondas restantes de recarga (mostrado no canto superior esquerdo, branco). */
  cdTurns?: number;
  /** Se definido, segundo clique/tecla com a mesma skill pendente cancela. */
  selectKind?: "basic" | "skill";
  selectId?: string;
}): string {
  const parts = ["btn", "lol-skill-btn", "lol-skill-btn--square"];
  if (opts.extraClass) parts.push(opts.extraClass);
  const cls = parts.join(" ");
  const dis = opts.disabled ? " disabled" : "";
  const st = opts.extraStyle ? ` style="${opts.extraStyle}"` : "";
  const fill = opts.ultFill
    ? '<span class="lol-weapon-ult-fill" aria-hidden="true"></span>'
    : "";
  const hkAttr =
    opts.combatHotkey && opts.combatHotkey.length > 0
      ? ` data-combat-hotkey="${escapeHtml(opts.combatHotkey.slice(0, 1).toLowerCase())}"`
      : "";
  const cdBadge =
    opts.cdTurns != null && opts.cdTurns > 0
      ? `<span class="lol-skill-cd-badge" aria-hidden="true">${String(opts.cdTurns)}</span>`
      : "";
  let selAttr = "";
  if (opts.selectKind) {
    selAttr += ` data-combat-select-kind="${escapeHtml(opts.selectKind)}"`;
    if (opts.selectKind === "skill" && opts.selectId)
      selAttr += ` data-combat-select-id="${escapeHtml(opts.selectId)}"`;
  }
  return `<button type="button" class="${cls}"${dis}${st}${hkAttr}${selAttr} aria-label="${escapeHtml(opts.ariaLabel)}">${cdBadge}${fill}${opts.iconHtml}<span class="lol-skill-key-wrap"><span class="lol-key">${escapeHtml(opts.hotkey)}</span></span><span class="lol-mana-badge" aria-hidden="true">${escapeHtml(opts.manaBadge)}</span></button>`;
}

function displayColorCss(n: number): string {
  const x = Math.max(0, Math.min(0xffffff, n | 0));
  return `#${x.toString(16).padStart(6, "0")}`;
}

/** Incrementado em cada hide ou novo hover; invalida RAFs pendentes que mostrariam o tooltip. */
let gameTooltipGeneration = 0;

function getOrCreateGameTooltip(): HTMLDivElement {
  let el = document.getElementById("game-ui-tooltip") as HTMLDivElement | null;
  if (!el) {
    el = document.createElement("div");
    el.id = "game-ui-tooltip";
    el.className = "game-ui-tooltip";
    el.setAttribute("role", "tooltip");
    el.hidden = true;
    (document.getElementById("app") ?? document.body).appendChild(el);
  }
  return el;
}

/** Esconde o tooltip global e cancela qualquer show agendado (ex.: após trocar de ecrã). */
function hideGameTooltip(): void {
  gameTooltipGeneration++;
  const tip = document.getElementById("game-ui-tooltip") as HTMLDivElement | null;
  if (!tip) return;
  tip.classList.remove("game-ui-tooltip--visible");
  tip.hidden = true;
  tip.innerHTML = "";
}

let waveIntroAutoCloseTimer: number | null = null;
let waveIntroRemoveTimer: number | null = null;

function killWaveIntroTimers(): void {
  if (waveIntroAutoCloseTimer != null) {
    window.clearTimeout(waveIntroAutoCloseTimer);
    waveIntroAutoCloseTimer = null;
  }
  if (waveIntroRemoveTimer != null) {
    window.clearTimeout(waveIntroRemoveTimer);
    waveIntroRemoveTimer = null;
  }
}

/** Após sair da loja (inicial ou entre waves): destaque da wave; `onFullyClosed` após fade + remoção do DOM. */
function showWaveIntroOverlay(
  waveNum: number,
  onFullyClosed?: () => void,
): void {
  killWaveIntroTimers();
  document.querySelectorAll(".wave-intro-overlay").forEach((n) => n.remove());
  const overlay = document.createElement("div");
  overlay.className = "wave-intro-overlay";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-label", `Wave ${waveNum}`);
  overlay.innerHTML = `<div class="wave-intro-inner game-ui-tooltip-inner"><div class="wave-intro-title">Wave ${waveNum}</div></div>`;
  const host = document.getElementById("app") ?? document.body;
  host.appendChild(overlay);
  const close = (): void => {
    if (!overlay.isConnected) return;
    killWaveIntroTimers();
    overlay.removeEventListener("click", onClick);
    overlay.classList.remove("wave-intro-overlay--visible");
    waveIntroRemoveTimer = window.setTimeout(() => {
      waveIntroRemoveTimer = null;
      overlay.remove();
      onFullyClosed?.();
    }, 420);
  };
  const onClick = (): void => close();
  overlay.addEventListener("click", onClick);
  requestAnimationFrame(() => {
    requestAnimationFrame(() => overlay.classList.add("wave-intro-overlay--visible"));
  });
  waveIntroAutoCloseTimer = window.setTimeout(close, 2000);
}

window.addEventListener("blur", () => {
  hideGameTooltip();
});
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") hideGameTooltip();
});

function positionGameTooltip(
  tip: HTMLElement,
  clientX: number,
  clientY: number,
): void {
  const margin = 14;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const prevVis = tip.style.visibility;
  tip.style.visibility = "hidden";
  tip.hidden = false;
  const w = tip.offsetWidth;
  const h = tip.offsetHeight;
  tip.style.visibility = prevVis || "";
  let x = clientX + margin;
  let y = clientY + margin;
  if (x + w > vw - 6) x = clientX - w - margin;
  if (y + h > vh - 6) y = clientY - h - margin;
  tip.style.left = `${Math.max(6, x)}px`;
  tip.style.top = `${Math.max(6, y)}px`;
}

type TooltipLineKind = "mana" | "cdr" | "range" | "dmg" | "fx";

function tooltipLineClass(k: TooltipLineKind): string {
  if (k === "mana") return "tt-mana";
  if (k === "cdr") return "tt-cdr";
  if (k === "range") return "tt-range";
  if (k === "dmg") return "tt-dmg";
  return "tt-fx";
}

/** Tooltip na seleção de herói: skill principal + ultimate da arma ao nível meta do slot. */
function heroSetupWeaponAbilitiesTooltipHtml(
  cls: HeroClassId,
  w: WeaponLevel,
  baseDano: number,
): string {
  const sk = HEROES[cls].skills[0]!;
  const th = weaponUltThreshold(cls);
  const tipLines = (
    title: string,
    lines: { label: string; value: string; kind: TooltipLineKind }[],
  ): string => {
    const body = lines
      .map(
        (L) =>
          `<p class="game-ui-tooltip-line"><span class="tt-lbl">${escapeHtml(L.label)}</span> <span class="${tooltipLineClass(L.kind)}">${escapeHtml(L.value)}</span></p>`,
      )
      .join("");
    return `<div class="hero-setup-weapon-tip-sec"><div class="game-ui-tooltip-title">${escapeHtml(title)}</div><div class="game-ui-tooltip-body">${body}</div></div>`;
  };

  let skillBlock: string;
  if (cls === "pistoleiro") {
    const cd = atirarCooldownWaves(w);
    const mul = atirarDamageMult(w);
    const approx = Math.floor(baseDano * mul);
    skillBlock = tipLines(sk.name, [
      { label: "Nível arma:", value: String(w), kind: "fx" },
      { label: "CDR:", value: `${cd} onda(s)`, kind: "cdr" },
      { label: "Mana:", value: "0", kind: "mana" },
      {
        label: "Dano:",
        value: `${Math.round(mul * 100)}% do dano base (~${approx} bruto por alvo no nível 1)`,
        kind: "dmg",
      },
    ]);
  } else if (cls === "gladiador") {
    const cd = ateMorteCooldownWaves(w);
    const mul = ateMorteDamageMult(w);
    const mc = ateMorteManaCost(w);
    const approx = Math.floor(baseDano * mul);
    skillBlock = tipLines(sk.name, [
      { label: "Nível arma:", value: String(w), kind: "fx" },
      { label: "CDR:", value: `${cd} onda(s)`, kind: "cdr" },
      { label: "Mana:", value: String(mc), kind: "mana" },
      {
        label: "Dano:",
        value: `${Math.round(mul * 100)}% do dano base no duelo (~${approx} bruto por teu golpe no nv. 1)`,
        kind: "dmg",
      },
    ]);
  } else {
    const cd = sentencaCooldownWaves(w);
    const mc = sentencaManaCost(w);
    const dm = sentencaDamageMult(w);
    const hm = sentencaHealMult(w);
    const sh = sentencaShieldOverflowRatio(w);
    const approx = Math.floor(baseDano * dm);
    skillBlock = tipLines(sk.name, [
      { label: "Nível arma:", value: String(w), kind: "fx" },
      { label: "CDR:", value: `${cd} onda(s)`, kind: "cdr" },
      { label: "Mana:", value: String(mc), kind: "mana" },
      {
        label: "Dano:",
        value: `${Math.round(dm * 100)}% dano base inimigos no teu bioma (~${approx} bruto/alvo no nv. 1)`,
        kind: "dmg",
      },
      {
        label: "Cura aliados:",
        value: `${Math.round(hm * 100)}% do dano causado`,
        kind: "fx",
      },
      {
        label: "Excesso → escudo:",
        value: `${Math.round(sh * 100)}% da cura excedente`,
        kind: "fx",
      },
    ]);
  }

  let ultBlock: string;
  if (cls === "sacerdotisa") {
    ultBlock = tipLines(`Ultimate da arma — ${weaponUltNamePt(cls)}`, [
      { label: "Nível arma:", value: String(w), kind: "fx" },
      {
        label: "Carga:",
        value: `Acumula ao curar e aplicar escudo em aliados vivos (${th} pontos no total; Sentença conta; o Paraíso não adiciona carga)`,
        kind: "cdr",
      },
      {
        label: "Efeito:",
        value: `Escudo ${paraisoShieldFlat(w)} + ${Math.round(paraisoManaShieldMult(w) * 100)}% mana máx.; regen +${paraisoRegenBonus(w)} PV e mana por ${paraisoRegenTurns(w)} turnos (aliados)`,
        kind: "fx",
      },
    ]);
  } else if (cls === "pistoleiro") {
    const mul = furacaoDamageMult(w);
    const approx = Math.floor(baseDano * mul);
    ultBlock = tipLines(`Ultimate da arma — ${weaponUltNamePt(cls)}`, [
      { label: "Nível arma:", value: String(w), kind: "fx" },
      {
        label: "Carga:",
        value: `${th} golpes que causem dano`,
        kind: "cdr",
      },
      {
        label: "Dano:",
        value: `${Math.round(mul * 100)}% dano base em toda a arena (~${approx} bruto/alvo no nv. 1)`,
        kind: "dmg",
      },
      {
        label: "Crítico:",
        value: `Sangramento ${Math.round(furacaoBleedPct(w) * 100)}% do dano em ${furacaoBleedTurns(w)} turno(s)`,
        kind: "fx",
      },
    ]);
  } else {
    ultBlock = tipLines(`Ultimate da arma — ${weaponUltNamePt(cls)}`, [
      { label: "Nível arma:", value: String(w), kind: "fx" },
      {
        label: "Carga:",
        value: `${th} de dano sofrido (acumulado)`,
        kind: "cdr",
      },
      {
        label: "Efeito:",
        value:
          "+50% vida máxima e PV atuais, dano = 10% da vida máxima atual, 3 turnos; desbloqueia Pisotear",
        kind: "fx",
      },
      {
        label: "Pisotear (na Fúria):",
        value: `Mana ${pisotearManaCost(w)}, CDR ${pisotearCooldownWaves(w)} onda(s), alcance 1–${pisotearMaxHexDistance(w)} hex, ${pisotearDamageMult(w)}× dano atual por alvo`,
        kind: "fx",
      },
    ]);
  }

  return `<div class="game-ui-tooltip-inner game-ui-tooltip-inner--hero-weapon">${skillBlock}${ultBlock}</div>`;
}

function tooltipAbilityHtml(
  title: string,
  lines: { label: string; value: string; kind: TooltipLineKind }[],
): string {
  const body = lines
    .map(
      (L) =>
        `<p class="game-ui-tooltip-line"><span class="tt-lbl">${escapeHtml(L.label)}</span> <span class="${tooltipLineClass(L.kind)}">${escapeHtml(L.value)}</span>.</p>`,
    )
    .join("");
  return `<div class="game-ui-tooltip-inner"><div class="game-ui-tooltip-title">${escapeHtml(title)}</div><div class="game-ui-tooltip-body">${body}</div></div>`;
}

function tooltipPassiveHtml(passiveTitle: string, description: string): string {
  return `<div class="game-ui-tooltip-inner"><div class="game-ui-tooltip-title">${escapeHtml(passiveTitle)}</div><p class="game-ui-tooltip-passive">${escapeHtml(description)}</p></div>`;
}

function hudWeaponIconSvg(cls: HeroClassId): string {
  if (cls === "sacerdotisa") {
    return `<svg class="lol-weapon-svg" viewBox="0 0 32 32" aria-hidden="true" focusable="false"><defs><linearGradient id="lolWs" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6a9cff"/><stop offset="1" stop-color="#2848c8"/></linearGradient></defs><path fill="url(#lolWs)" d="M15 3h2v20h-2z"/><circle cx="16" cy="26" r="3" fill="#6a5a40"/><path fill="#8a7a60" d="M13 26h6v3h-6z"/></svg>`;
  }
  if (cls === "pistoleiro") {
    return `<svg class="lol-weapon-svg" viewBox="0 0 32 32" aria-hidden="true"><defs><linearGradient id="lolWb" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5a5048"/><stop offset="1" stop-color="#2a2018"/></linearGradient></defs><rect x="4" y="14" width="18" height="6" rx="1" fill="url(#lolWb)" stroke="#8a7860"/><path fill="#4a4038" d="M20 10l7 7-7 7v-3l4-4-4-4z"/><rect x="6" y="16" width="12" height="2" fill="#c9a227"/></svg>`;
  }
  return `<svg class="lol-weapon-svg" viewBox="0 0 32 32" aria-hidden="true"><path fill="#c9a227" d="M10 4h12v4H10z"/><path fill="#e8e4dc" d="M11 8h10l-1 14h-8z"/><path fill="#6a8aff" d="M9 22h14v2H9z"/><rect x="7" y="24" width="18" height="5" rx="1" fill="#8a7860"/></svg>`;
}

function combatPassiveDescription(h: Unit): string {
  if (h.heroClass === "sacerdotisa") {
    const p = priestPassivePotencialPoints(h.level);
    return `Reduz perda de ouro entre rodadas em 1. +${p}% potencial de cura/escudo (25% base + 25% a cada 10 níveis do herói).`;
  }
  if (h.heroClass === "pistoleiro") {
    return HEROES.pistoleiro.passiveDescription;
  }
  if (h.heroClass === "gladiador") {
    return HEROES.gladiador.passiveDescription;
  }
  return "";
}

function weaponUltIconId(cls: HeroClassId): string {
  if (cls === "sacerdotisa") return "weapon_ult_paraiso";
  if (cls === "pistoleiro") return "weapon_ult_furacao";
  return "weapon_ult_furia";
}

function weaponUltNamePt(cls: HeroClassId): string {
  if (cls === "sacerdotisa") return "Paraíso na terra";
  if (cls === "pistoleiro") return "Furacão de balas";
  return "Fúria do gigante";
}

function tooltipWeaponUltimate(h: Unit): string {
  const cls = h.heroClass!;
  const w = h.weaponLevel;
  const th = weaponUltThreshold(cls);
  const pct = Math.round(h.weaponUltMeter * 100);
  if (cls === "sacerdotisa") {
    return tooltipAbilityHtml(weaponUltNamePt(cls), [
      { label: "Nível da arma:", value: String(w), kind: "fx" },
      {
        label: "Carga:",
        value: `${pct}% (somar ${th} entre PV curados e escudo aplicado por ti em heróis vivos, você incluída; o Paraíso não adiciona carga)`,
        kind: "cdr",
      },
      {
        label: "Efeito:",
        value: `Escudo fixo ${paraisoShieldFlat(w)} + ${Math.round(paraisoManaShieldMult(w) * 100)}% da mana máx. em escudo; regen +${paraisoRegenBonus(w)} PV/mana por ${paraisoRegenTurns(w)} turnos`,
        kind: "fx",
      },
    ]);
  }
  if (cls === "pistoleiro") {
    return tooltipAbilityHtml(weaponUltNamePt(cls), [
      { label: "Nível da arma:", value: String(w), kind: "fx" },
      {
        label: "Carga:",
        value: `${pct}% (${th} golpes que causam dano)`,
        kind: "cdr",
      },
      {
        label: "Dano:",
        value: `${Math.round(furacaoDamageMult(w) * 100)}% do dano base à arena inteira; crítico aplica sangramento`,
        kind: "dmg",
      },
    ]);
  }
  return tooltipAbilityHtml(weaponUltNamePt(cls), [
    { label: "Nível da arma:", value: String(w), kind: "fx" },
    {
      label: "Carga:",
      value: `${pct}% (${th} dano sofrido)`,
      kind: "cdr",
    },
    {
      label: "Efeito:",
      value:
        "+50% vida máx., dano = 10% vida máx. atual, 3 turnos; Até a morte → Pisotear",
      kind: "fx",
    },
  ]);
}

function tooltipStatCell(label: string, value: string): string {
  return `<div class="game-ui-tooltip-inner"><div class="game-ui-tooltip-title">${escapeHtml(label)}</div><p class="game-ui-tooltip-passive"><span class="tt-lbl">Valor atual:</span> <span class="tt-fx">${escapeHtml(value)}</span></p></div>`;
}

function bunkerEvolveTooltipHtml(currentTier: 0 | 1 | 2): string {
  const nt = (currentTier + 1) as 1 | 2;
  const st = bunkerStatsForTier(nt);
  const minas = describeBunkerMinasTier(nt);
  let html = `<div class="game-ui-tooltip-inner"><div class="game-ui-tooltip-title">Após evolução (bunker nv. ${bunkerDisplayLevel(nt)})</div>`;
  html += `<p class="game-ui-tooltip-passive"><span class="tt-lbl">PV máx.:</span> ${st.maxHp} · <span class="tt-lbl">Defesa:</span> ${st.defesa}</p>`;
  html += `<p class="game-ui-tooltip-line"><span class="tt-lbl">Minas terrestres:</span> ${escapeHtml(minas)}</p>`;
  if (nt >= BUNKER_TIRO_MIN_TIER) {
    html += `<p class="game-ui-tooltip-line"><span class="tt-lbl">Tiro preciso:</span> ${escapeHtml(describeBunkerTiroTier())}</p>`;
  }
  html += `</div>`;
  return html;
}

function bunkerMinasShopTooltipHtml(tier: 0 | 1 | 2): string {
  const cur = describeBunkerMinasTier(tier);
  let nextBlock: string;
  if (tier < 2) {
    const nt = (tier + 1) as 1 | 2;
    nextBlock = `<p class="game-ui-tooltip-line"><span class="tt-lbl">Próximo nível (nv. ${bunkerDisplayLevel(nt)}):</span> ${escapeHtml(describeBunkerMinasTier(nt))}</p>`;
  } else {
    nextBlock = `<p class="game-ui-tooltip-line"><span class="tt-lbl">Evolução:</span> máxima.</p>`;
  }
  return `<div class="game-ui-tooltip-inner"><div class="game-ui-tooltip-title">Minas terrestres</div><p class="game-ui-tooltip-passive">Nv. ${bunkerDisplayLevel(tier)} — ${escapeHtml(cur)}</p>${nextBlock}</div>`;
}

function bunkerTiroLockedTooltipHtml(): string {
  const req = bunkerDisplayLevel(BUNKER_TIRO_MIN_TIER);
  return `<div class="game-ui-tooltip-inner game-ui-tooltip-inner--badged"><span class="game-ui-tooltip-badge">Necessário bunker nv ${req}</span><div class="game-ui-tooltip-title">Tiro preciso</div><p class="game-ui-tooltip-passive">${escapeHtml(describeBunkerTiroTier())}</p></div>`;
}

function bunkerTiroUnlockedTooltipHtml(): string {
  return `<div class="game-ui-tooltip-inner"><div class="game-ui-tooltip-title">Tiro preciso</div><p class="game-ui-tooltip-passive">${escapeHtml(describeBunkerTiroTier())}</p></div>`;
}

function goldShopBunkerSectionHtml(bunk: BunkerState, h: Unit): string {
  const missing = bunk.maxHp - bunk.hp;
  const canRepair = missing > 0 && h.ouro >= missing;
  const t = bunk.tier;
  const rawEv = t >= 2 ? 0 : BUNKER_EVOLVE_COSTS[t as 0 | 1] ?? 0;
  let evCost = rawEv;
  if (t < 2 && h.ultimateId === "estrategista_nato") {
    evCost = Math.ceil(evCost * 0.5);
  }
  const canEv = t < 2 && h.ouro >= evCost;
  const disp = bunkerDisplayLevel(t);
  const minasCur = describeBunkerMinasTier(t);
  const minasNext =
    t < 2
      ? describeBunkerMinasTier((t + 1) as 1 | 2)
      : "—";
  const tiroOk = t >= BUNKER_TIRO_MIN_TIER;
  return `<div class="shop-bunker">
    <h3 class="shop-bunker__title">Bunker da arena</h3>
    <div class="shop-bunker__layout">
      <div class="shop-bunker__preview-wrap">
        <div id="bunker-preview-host" class="shop-bunker__preview-host" aria-hidden="true"></div>
      </div>
      <div class="shop-bunker__meta">
        <p class="shop-bunker__stats">Nv. ${disp}/3 · PV ${bunk.hp}/${bunk.maxHp} · Defesa ${bunk.defesa}</p>
        <p class="shop-bunker__hint">Reparar: 1 ouro por PV perdido. Evoluções: 300 ouro (1ª), 500 ouro (2ª).</p>
        <div class="shop-bunker__skills">
          <div class="shop-bunker-skill" data-bunker-tip="minas" tabindex="0" role="img" aria-label="Minas terrestres">
            <span class="shop-bunker-skill__name">Minas terrestres</span>
            <span class="shop-bunker-skill__line">${escapeHtml(minasCur)}</span>
            ${
              t < 2
                ? `<span class="shop-bunker-skill__next"><span class="tt-lbl">Próximo:</span> ${escapeHtml(minasNext)}</span>`
                : `<span class="shop-bunker-skill__next shop-bunker-skill__next--max">Evolução máxima</span>`
            }
          </div>
          <div class="shop-bunker-skill ${tiroOk ? "" : "shop-bunker-skill--locked"}" data-bunker-tip="${tiroOk ? "tiro" : "tiro-locked"}" tabindex="0" role="img" aria-label="Tiro preciso">
            <span class="shop-bunker-skill__name">Tiro preciso</span>
            <span class="shop-bunker-skill__line">${escapeHtml(describeBunkerTiroTier())}</span>
          </div>
        </div>
        <div class="shop-bunker__actions">
          <button type="button" class="btn" id="bunk-repair" ${missing <= 0 || !canRepair ? "disabled" : ""}>Reparar (${missing} ouro)</button>
          <button type="button" class="btn" id="bunk-evolve" ${t >= 2 || !canEv ? "disabled" : ""}>${t >= 2 ? "Bunker no nível máximo" : `Evoluir bunker (${evCost} ouro)`}</button>
        </div>
      </div>
    </div>
  </div>`;
}

interface HeroStatCell {
  icon: StatIconId;
  label: string;
  value: string;
  valueHtml?: string;
  tooltipValue?: string;
}

type StatDeltaKind = "int" | "pct" | "mult" | "float";

function statDeltaHtml(delta: number, kind: StatDeltaKind): string {
  if (kind === "mult") {
    if (Math.abs(delta) < 0.005) return "";
  } else if (kind === "float") {
    if (Math.abs(delta) < 0.05) return "";
  } else if (delta === 0) return "";
  const pos = delta > 0;
  const cls = pos ? "lol-stat-delta--up" : "lol-stat-delta--down";
  const sign = delta > 0 ? "+" : "";
  let inner: string;
  if (kind === "pct") inner = `${sign}${Math.round(delta)}%`;
  else if (kind === "mult" || kind === "float") {
    const t = delta.toFixed(2).replace(/\.?0+$/, "");
    inner = `${sign}${t}`;
  } else inner = `${sign}${Math.round(delta)}`;
  return ` <span class="lol-stat-delta ${cls}">(${inner})</span>`;
}

function statPlainDelta(delta: number, kind: StatDeltaKind): string {
  if (kind === "mult" && Math.abs(delta) < 0.005) return "";
  if (kind === "float" && Math.abs(delta) < 0.05) return "";
  if (delta === 0 && kind !== "mult" && kind !== "float") return "";
  const sign = delta > 0 ? "+" : "";
  if (kind === "pct") return `${sign}${Math.round(delta)}%`;
  if (kind === "mult" || kind === "float") {
    const t = delta.toFixed(2).replace(/\.?0+$/, "");
    return `${sign}${t}`;
  }
  return `${sign}${Math.round(delta)}`;
}

/** Percentual (pt): inteiro se ~redondo, senão uma casa decimal. */
function formatDefenseReductionPct(effDef: number): string {
  const pct = damageReductionPercentFromDefense(effDef, 0);
  const rounded = Math.round(pct * 10) / 10;
  const s =
    Math.abs(rounded - Math.round(rounded)) < 0.001
      ? String(Math.round(rounded))
      : rounded.toFixed(1).replace(".", ",");
  return s;
}

function defenseReductionTooltipText(effDef: number): string {
  return `valor atual: ${formatDefenseReductionPct(effDef)}% de redução de dano.`;
}

function valWithDelta(
  baseStr: string,
  delta: number,
  kind: StatDeltaKind,
): { html: string; plain: string } {
  const dHtml = statDeltaHtml(delta, kind);
  const pDelta = statPlainDelta(delta, kind);
  const plain = pDelta ? `${baseStr} (${pDelta})` : baseStr;
  return { html: escapeHtml(baseStr) + dHtml, plain };
}

function pushStat(
  cells: HeroStatCell[],
  icon: StatIconId,
  label: string,
  display: string,
  delta: number,
  kind: StatDeltaKind,
): void {
  const { html, plain } = valWithDelta(display, delta, kind);
  cells.push({
    icon,
    label,
    value: display,
    valueHtml: html,
    tooltipValue: plain,
  });
}

/** Colunas verticais com até `perColumn` atributos; extras seguem em colunas adicionais (ex.: temporários). */
function splitStatsIntoColumns<T>(items: T[], perColumn: number): T[][] {
  if (items.length === 0) return [];
  const cols: T[][] = [];
  for (let i = 0; i < items.length; i += perColumn) {
    cols.push(items.slice(i, i + perColumn));
  }
  return cols;
}

function renderHeroStatsGrid(grid: HTMLElement, cells: HeroStatCell[]): void {
  const split = splitStatsIntoColumns(cells, 5);
  const cols = split.length > 0 ? split : [[]];
  let idx = 0;
  const nCols = cols.length;
  const parts: string[] = [
    `<div class="lol-stats-cols" style="--stats-cols:${nCols}">`,
  ];
  for (const col of cols) {
    parts.push('<div class="lol-stats-col">');
    for (const c of col) {
      const ariaVal = escapeHtml(c.tooltipValue ?? c.value);
      const valInner = c.valueHtml ?? escapeHtml(c.value);
      parts.push(
        `<div class="lol-stat-cell" data-stat-i="${idx}" tabindex="0" role="img" aria-label="${escapeHtml(c.label)}: ${ariaVal}">` +
          statIconWrap(c.icon, idx) +
          `<span class="lol-stat-val">${valInner}</span>` +
          `</div>`,
      );
      idx++;
    }
    parts.push("</div>");
  }
  parts.push("</div>");
  grid.innerHTML = parts.join("");
  grid.querySelectorAll(".lol-stat-cell").forEach((node) => {
    const el = node as HTMLElement;
    const i = Number(el.dataset.statI);
    const cell = cells[i];
    if (!cell) return;
    bindGameTooltip(el, () =>
      tooltipStatCell(cell.label, cell.tooltipValue ?? cell.value),
    );
  });
}

function bindGameTooltip(el: HTMLElement, getHtml: () => string): void {
  const tip = getOrCreateGameTooltip();
  el.onmouseenter = (e: MouseEvent) => {
    gameTooltipGeneration++;
    const gen = gameTooltipGeneration;
    tip.innerHTML = getHtml();
    tip.querySelectorAll<HTMLElement>(".stat-inline-ico[data-stat-tip]").forEach((sub) => {
      const sid = sub.dataset.statTip as StatIconId;
      if (!sub.title) sub.title = HERO_STAT_TIP[sid] ?? sid;
    });
    tip.querySelectorAll<HTMLElement>(".lol-stat-ico[data-ico]").forEach((sub) => {
      const sid = sub.dataset.ico as StatIconId;
      if (!sub.title) sub.title = HERO_STAT_TIP[sid] ?? sid;
    });
    tip.hidden = false;
    requestAnimationFrame(() => {
      if (gen !== gameTooltipGeneration) return;
      tip.classList.add("game-ui-tooltip--visible");
      positionGameTooltip(tip, e.clientX, e.clientY);
    });
  };
  el.onmousemove = (e: MouseEvent) => {
    if (!tip.classList.contains("game-ui-tooltip--visible")) return;
    positionGameTooltip(tip, e.clientX, e.clientY);
  };
  el.onmouseleave = () => {
    hideGameTooltip();
  };
}

function clearGameTooltipHandlers(el: HTMLElement): void {
  el.onmouseenter = null;
  el.onmousemove = null;
  el.onmouseleave = null;
}

function tooltipBasicAttack(h: Unit, m: GameModel): string {
  const alc = m.effectiveAlcanceForHero(h);
  const raw = m.computeBasicAttackRawDamage(h);
  const arauto =
    h.heroClass === "pistoleiro" && h.ultimateId === "arauto_caos";
  const dmgLine = arauto
    ? `${raw} de dano bruto por inimigo no alcance (cada um: crítico/defesa separados)`
    : `${raw} de dano bruto (crítico e defesa do alvo aplicam depois)`;
  return tooltipAbilityHtml("Ataque básico", [
    { label: "Custo de mana:", value: "0", kind: "mana" },
    { label: "CDR:", value: "—", kind: "cdr" },
    { label: "Alcance:", value: String(alc), kind: "range" },
    { label: "Dano:", value: dmgLine, kind: "dmg" },
    {
      label: "Efeito:",
      value: arauto ? "Acerta todos os inimigos no alcance" : "Um alvo",
      kind: "fx",
    },
  ]);
}

function cdrSkillValue(h: Unit, sk: SkillDef): string {
  const rest = h.skillCd[sk.id] ?? 0;
  if (rest > 0) return `${rest} onda(s) até disponível`;
  if (sk.cooldownWaves <= 0) return "—";
  return String(sk.cooldownWaves);
}

function tooltipSkillAtirar(h: Unit, m: GameModel, sk: SkillDef): string {
  const w = h.weaponLevel;
  const alc = m.effectiveAlcanceForHero(h);
  const per = m.computeAtirarTodoLadoDamagePerHit(h);
  const cdv = h.skillCd[sk.id] ?? 0;
  const cdB = atirarCooldownWaves(w);
  const cdrStr =
    cdv > 0 ? `${cdv} onda(s) até disponível` : `${cdB} onda(s)`;
  return tooltipAbilityHtml(sk.name, [
    { label: "Nível arma:", value: String(w), kind: "fx" },
    {
      label: "Custo de mana:",
      value: String(sk.manaCost ?? 0),
      kind: "mana",
    },
    { label: "CDR:", value: cdrStr, kind: "cdr" },
    { label: "Alcance:", value: String(alc), kind: "range" },
    {
      label: "Dano:",
      value: `${per} bruto por inimigo (${Math.round(atirarDamageMult(w) * 100)}% dano base)`,
      kind: "dmg",
    },
    {
      label: "Efeito:",
      value: "Golpeia todos no alcance; hexes vermelhos ao selecionar",
      kind: "fx",
    },
  ]);
}

function tooltipSkillAteMorte(h: Unit, m: GameModel, sk: SkillDef): string {
  const w = h.weaponLevel;
  const gDmg = m.computeDuelGladiatorHitDamage(h);
  const cdv = h.skillCd[sk.id] ?? 0;
  const cdB = ateMorteCooldownWaves(w);
  const cdrStr =
    cdv > 0 ? `${cdv} onda(s) até disponível` : cdB <= 0 ? "—" : `${cdB} onda(s)`;
  const perWin = gladiadorDuelHpPerWin(h.level);
  return tooltipAbilityHtml(sk.name, [
    { label: "Nível arma:", value: String(w), kind: "fx" },
    {
      label: "Custo de mana:",
      value: String(ateMorteManaCost(w)),
      kind: "mana",
    },
    { label: "CDR:", value: cdrStr, kind: "cdr" },
    { label: "Alcance:", value: "1", kind: "range" },
    {
      label: "Dano:",
      value: `${gDmg} bruto por teu golpe (${Math.round(ateMorteDamageMult(w) * 100)}% dano base)`,
      kind: "dmg",
    },
    {
      label: "Efeito:",
      value: `Duelo até morrer; vitória +${perWin} PV máx e atual (escala com nível)`,
      kind: "fx",
    },
  ]);
}

function tooltipSkillPisotear(h: Unit, _m: GameModel): string {
  const w = h.weaponLevel;
  const dmgApprox = Math.floor(
    heroDanoPlusRoninOverflow(h) * pisotearDamageMult(w),
  );
  const cdv = h.skillCd["pisotear"] ?? 0;
  const cdB = pisotearCooldownWaves(w);
  const cdrStr =
    cdv > 0 ? `${cdv} onda(s) até disponível` : cdB <= 0 ? "—" : `${cdB} onda(s)`;
  const maxD = pisotearMaxHexDistance(w);
  return tooltipAbilityHtml("Pisotear", [
    { label: "Nível arma:", value: String(w), kind: "fx" },
    {
      label: "Custo de mana:",
      value: String(pisotearManaCost(w)),
      kind: "mana",
    },
    { label: "CDR:", value: cdrStr, kind: "cdr" },
    {
      label: "Alcance:",
      value: `Inimigos a 1–${maxD} hex`,
      kind: "range",
    },
    {
      label: "Dano:",
      value: `${dmgApprox} bruto por alvo (${pisotearDamageMult(w)}× dano atual)`,
      kind: "dmg",
    },
    {
      label: "Efeito:",
      value: "Só durante Fúria do gigante",
      kind: "fx",
    },
  ]);
}

function tooltipBunkerMinasCombat(h: Unit, m: GameModel): string {
  const b = m.bunkerAtHex(h.q, h.r);
  if (!b) {
    return tooltipPassiveHtml("Minas terrestres", "—");
  }
  const t = b.tier;
  const mult = bunkerMinasDamageMult(t);
  const rings = bunkerMinasMaxRing(t);
  const cdBase = bunkerMinasCooldownWaves(t);
  const baseDano =
    heroDanoPlusRoninOverflow(h) +
    h.pistoleiroBonusDanoWave +
    h.curandeiroDanoWave;
  const per = Math.floor(baseDano * mult);
  const cdv = h.skillCd["bunker_minas"] ?? 0;
  const cdrStr =
    cdv > 0 ? `${cdv} onda(s) até disponível` : String(cdBase);
  return tooltipAbilityHtml("Minas terrestres (bunker)", [
    { label: "Custo de mana:", value: "0", kind: "mana" },
    { label: "CDR:", value: cdrStr, kind: "cdr" },
    {
      label: "Alcance:",
      value: `Até ${rings} anel(is) em volta do bunker`,
      kind: "range",
    },
    {
      label: "Dano:",
      value: `${per} bruto por inimigo em cada anel (por onda)`,
      kind: "dmg",
    },
    {
      label: "Efeito:",
      value:
        "Primeiro aparecem os hexes afetados (anéis); clique num hex destacado para confirmar",
      kind: "fx",
    },
  ]);
}

function tooltipBunkerTiroCombat(h: Unit, _m: GameModel): string {
  const cdv = h.skillCd["bunker_tiro_preciso"] ?? 0;
  const cd = bunkerTiroCooldownWaves();
  const baseDano =
    heroDanoPlusRoninOverflow(h) +
    h.pistoleiroBonusDanoWave +
    h.curandeiroDanoWave;
  const raw = Math.floor(baseDano * 10);
  const cdrStr =
    cdv > 0 ? `${cdv} onda(s) até disponível` : String(cd);
  return tooltipAbilityHtml("Tiro preciso", [
    { label: "Custo de mana:", value: "0", kind: "mana" },
    { label: "CDR:", value: cdrStr, kind: "cdr" },
    { label: "Alcance:", value: "Qualquer inimigo no coliseu", kind: "range" },
    { label: "Dano:", value: `${raw} bruto (morteiro)`, kind: "dmg" },
    {
      label: "Efeito:",
      value: "Projétil em arco até ao alvo selecionado",
      kind: "fx",
    },
  ]);
}

function tooltipSkillSentenca(h: Unit, m: GameModel, sk: SkillDef): string {
  const w = h.weaponLevel;
  const bio = biomeAt(m.grid, h.q, h.r) as BiomeId;
  const dPv = m.computeSentencaDamagePerEnemy(h);
  const heal = m.computeSentencaHealParty(h);
  const cdv = h.skillCd[sk.id] ?? 0;
  const cdB = sentencaCooldownWaves(w);
  const cdrStr =
    cdv > 0 ? `${cdv} onda(s) até disponível` : cdB <= 0 ? "—" : `${cdB} onda(s)`;
  const mc = sentencaManaCost(w);
  const shPct = Math.round(sentencaShieldOverflowRatio(w) * 100);
  return tooltipAbilityHtml(sk.name, [
    { label: "Nível arma:", value: String(w), kind: "fx" },
    {
      label: "Custo de mana:",
      value: String(mc),
      kind: "mana",
    },
    { label: "CDR:", value: cdrStr, kind: "cdr" },
    {
      label: "Alcance:",
      value: `Inimigos no bioma (${BIOME_LABELS[bio]})`,
      kind: "range",
    },
    {
      label: "Dano:",
      value: `${dPv} bruto por inimigo (${Math.round(sentencaDamageMult(w) * 100)}% dano base)`,
      kind: "dmg",
    },
    {
      label: "Cura (aliados):",
      value: `${heal} base (${Math.round(sentencaHealMult(w) * 100)}% dano) · potencial cura/escudo aplica`,
      kind: "fx",
    },
    {
      label: "Efeito:",
      value: `Excesso de cura vira ${shPct}% em escudo azul.`,
      kind: "fx",
    },
  ]);
}

function tooltipSkillById(h: Unit, m: GameModel, sk: SkillDef): string {
  if (sk.id === "atirar_todo_lado") return tooltipSkillAtirar(h, m, sk);
  if (sk.id === "ate_a_morte") return tooltipSkillAteMorte(h, m, sk);
  if (sk.id === "pisotear") return tooltipSkillPisotear(h, m);
  if (sk.id === "sentenca") return tooltipSkillSentenca(h, m, sk);
  return tooltipAbilityHtml(sk.name, [
    {
      label: "Custo de mana:",
      value: String(sk.manaCost ?? 0),
      kind: "mana",
    },
    { label: "CDR:", value: cdrSkillValue(h, sk), kind: "cdr" },
    { label: "Alcance:", value: "—", kind: "range" },
    { label: "Dano:", value: "—", kind: "dmg" },
    { label: "Efeito:", value: sk.description, kind: "fx" },
  ]);
}

function tooltipEspecialista(h: Unit, m: GameModel): string {
  const alc = m.effectiveAlcanceForHero(h);
  const raw = m.computeEspecialistaDestruicaoRaw(h);
  return tooltipAbilityHtml("Especialista da destruição", [
    { label: "Custo de mana:", value: "0", kind: "mana" },
    { label: "CDR:", value: "—", kind: "cdr" },
    { label: "Alcance:", value: String(alc), kind: "range" },
    {
      label: "Dano:",
      value: `${raw} de dano bruto (crítico e defesa do alvo aplicam depois)`,
      kind: "dmg",
    },
    {
      label: "Efeito:",
      value: "Um inimigo; clique no alvo no alcance vermelho",
      kind: "fx",
    },
  ]);
}

/** Bônus % de acerto crítico do artefato Ronin (combate usa o mesmo). */
function roninCritChanceBonus(artifacts: Unit["artifacts"]): number {
  return 20 * (artifacts["ronin"] ?? 0);
}

function totalCritChancePercent(h: Unit): number {
  return h.acertoCritico + roninCritChanceBonus(h.artifacts);
}

function totalCritChanceFromParts(
  acertoCritico: number,
  artifacts: Unit["artifacts"],
): number {
  return acertoCritico + roninCritChanceBonus(artifacts);
}

/**
 * HUD: sem Ronin, mostra no máximo 100% (excesso não aumenta o dado de crítico).
 * Com Ronin, mostra o total real (excesso converte em dano).
 */
function displayedCritChancePercent(h: Unit): number {
  const t = totalCritChancePercent(h);
  if ((h.artifacts["ronin"] ?? 0) > 0) return t;
  return Math.min(100, t);
}

function displayedCritChanceFromParts(
  acertoCritico: number,
  artifacts: Unit["artifacts"],
): number {
  const t = totalCritChanceFromParts(acertoCritico, artifacts);
  if ((artifacts["ronin"] ?? 0) > 0) return t;
  return Math.min(100, t);
}

function heroStatCells(h: Unit, m: GameModel): HeroStatCell[] {
  const bio = biomeAt(m.grid, h.q, h.r) as BiomeId;
  const ign = unitIgnoresTerrain(h);
  const monT1 =
    h.isPlayer &&
    forgeSynergyTier(h.forgeLoadout, "montanhoso") >= 1 &&
    !ign;
  const coreDefHero = effectiveDefenseForBiome(h.defesa, bio, ign, {
    montanhosoForgeSynergyTier1: monT1,
  });
  const effDef =
    coreDefHero + (h.isPlayer ? m.montanhosoAllyDefBonus(h) : 0);
  const movPool = m.heroMovementPool(h);
  const effAlc = m.effectiveAlcanceForHero(h);
  const roch = bio === "rochoso" && !ign;
  const rochCritTileAdd =
    roch && h.isPlayer && forgeSynergyTier(h.forgeLoadout, "rochoso") >= 1
      ? 2
      : roch
        ? 1
        : 0;
  const critMultCur =
    h.danoCritico +
    rochCritTileAdd +
    (h.isPlayer ? m.rochosoRulerAllyCritMultBonus(h) : 0);
  const fd = forgeSynergyTier(h.forgeLoadout, "deserto");
  const desertoBlock = bio === "deserto" && !ign && fd < 1;
  const regMult =
    h.isPlayer && fd >= 2 && bio === "deserto" ? 2 : 1;
  const rulerDesertRegenFlat =
    h.isPlayer && fd >= 1 && (h.artifacts["ruler"] ?? 0) > 0 ? 2 : 0;
  const effRegV =
    Math.floor((desertoBlock ? 0 : h.regenVida) * regMult) +
    (h.isPlayer ? m.desertoAllyRegenExtraHp(h) : 0) +
    rulerDesertRegenFlat;
  const effRegM =
    Math.floor((desertoBlock ? 0 : h.regenMana) * regMult) +
    (h.isPlayer ? m.desertoAllyRegenExtraMana(h) : 0) +
    rulerDesertRegenFlat;

  const b = h.statBaseline;
  const cells: HeroStatCell[] = [];

  if (b) {
    const baseCoreDef = effectiveDefenseForBiome(b.defesa, bio, ign, {
      montanhosoForgeSynergyTier1: monT1,
    });
    const baseEffDef =
      baseCoreDef +
      m.montanhosoAllyDefBonus(h, (u) => u.statBaseline?.defesa ?? u.defesa);
    const baseEffAlc = effectiveAlcanceForBiome(b.alcance, bio, ign);
    const baseDeserto =
      bio === "deserto" && !ign && forgeSynergyTier(h.forgeLoadout, "deserto") < 1;
    const baseRegMult =
      forgeSynergyTier(h.forgeLoadout, "deserto") >= 2 && bio === "deserto"
        ? 2
        : 1;
    const baseRulerDesertRegen =
      forgeSynergyTier(h.forgeLoadout, "deserto") >= 1 &&
      (b.artifacts["ruler"] ?? 0) > 0
        ? 2
        : 0;
    const baseRegV =
      Math.floor((baseDeserto ? 0 : b.regenVida) * baseRegMult) +
      m.desertoAllyRegenExtraHp(h, (u) => u.statBaseline?.regenVida ?? u.regenVida) +
      baseRulerDesertRegen;
    const baseRegM =
      Math.floor((baseDeserto ? 0 : b.regenMana) * baseRegMult) +
      m.desertoAllyRegenExtraMana(h, (u) => u.statBaseline?.regenMana ?? u.regenMana) +
      baseRulerDesertRegen;
    const critMultBase =
      b.danoCritico +
      (roch && forgeSynergyTier(h.forgeLoadout, "rochoso") >= 1
        ? 2
        : roch
          ? 1
          : 0) +
      m.rochosoRulerAllyCritMultBonus(h);

    const waveExtra = h.pistoleiroBonusDanoWave + h.curandeiroDanoWave;

    {
      const hpPair = valWithDelta(`${h.hp}/${h.maxHp}`, h.maxHp - b.maxHp, "int");
      cells.push({
        icon: "max_hp",
        label: "Vida",
        value: `${h.hp}/${h.maxHp}`,
        valueHtml: hpPair.html,
        tooltipValue: hpPair.plain,
      });
    }
    {
      const mpPair = valWithDelta(
        `${h.mana}/${h.maxMana}`,
        h.maxMana - b.maxMana,
        "int",
      );
      cells.push({
        icon: "max_mana",
        label: "Mana",
        value: `${h.mana}/${h.maxMana}`,
        valueHtml: mpPair.html,
        tooltipValue: mpPair.plain,
      });
    }
    pushStat(
      cells,
      "regen_hp",
      "Regen. vida",
      String(effRegV),
      effRegV - baseRegV,
      "int",
    );
    pushStat(
      cells,
      "regen_mp",
      "Regen. mana",
      String(effRegM),
      effRegM - baseRegM,
      "int",
    );
    {
      const effDmg = heroDanoPlusRoninOverflow(h);
      const dmgDelta =
        effDmg - heroDanoPlusRoninFromBaseline(b) + waveExtra;
      const roninFlat = effDmg - h.dano;
      const dmgPair = valWithDelta(String(effDmg), dmgDelta, "int");
      let dmgPlain = dmgPair.plain;
      if (roninFlat > 0) {
        dmgPlain += ` — +${roninFlat} do Ronin (crítico >100%)`;
      }
      cells.push({
        icon: "dmg",
        label: "Dano",
        value: String(effDmg),
        valueHtml: dmgPair.html,
        tooltipValue: dmgPlain,
      });
    }
    {
      const critDisp = displayedCritChancePercent(h);
      const critDispDelta =
        critDisp - displayedCritChanceFromParts(b.acertoCritico, b.artifacts);
      const critPair = valWithDelta(`${critDisp}%`, critDispDelta, "pct");
      const tot = totalCritChancePercent(h);
      let critPlain = critPair.plain;
      if (tot > critDisp) {
        critPlain += ` — +${tot - critDisp}% acima do teto de crítico (sem Ronin não entra no dado; com Ronin mostra o total e vira dano).`;
      } else if (tot > 100 && (h.artifacts["ronin"] ?? 0) > 0) {
        critPlain += ` — excesso acima de 100% converte em dano (Ronin).`;
      }
      cells.push({
        icon: "crit_hit",
        label: "Acerto crítico",
        value: `${critDisp}%`,
        valueHtml: critPair.html,
        tooltipValue: critPlain,
      });
    }
    pushStat(
      cells,
      "crit_dmg",
      "Dano critico",
      `${Math.round(critMultCur * 100)}%`,
      Math.round((critMultCur - critMultBase) * 100),
      "pct",
    );
    {
      const { html } = valWithDelta(
        String(effDef),
        effDef - baseEffDef,
        "int",
      );
      cells.push({
        icon: "def",
        label: ign ? "Defesa (ruler ignora bioma)" : "Defesa",
        value: String(effDef),
        valueHtml: html,
        tooltipValue: defenseReductionTooltipText(effDef),
      });
    }
    const movDeltaCore = movPool - b.movimento;
    const movPair = valWithDelta(String(movPool), movDeltaCore, "int");
    const pantHexSlow =
      bio === "pantano" &&
      !ign &&
      forgeSynergyTier(h.forgeLoadout, "pantano") < 1;
    const pantExtra = pantHexSlow
      ? ` <span class="lol-stat-delta lol-stat-delta--down">(−50% mobilidade)</span>`
      : "";
    cells.push({
      icon: "mov",
      label: "Movimento",
      value: String(movPool),
      valueHtml: movPair.html + pantExtra,
      tooltipValue:
        movPair.plain +
        (pantHexSlow ? " — hexes no pântano custam 2 pontos" : ""),
    });

    pushStat(
      cells,
      "range",
      ign ? "Alcance (ruler ignora bioma)" : "Alcance",
      String(effAlc),
      effAlc - baseEffAlc,
      "int",
    );
    pushStat(
      cells,
      "pot",
      "Potencial de cura e escudo",
      String(h.potencialCuraEscudo),
      h.potencialCuraEscudo - b.potencialCuraEscudo,
      "float",
    );
    {
      const xpCur = m.xpGainBonusPercentForHero(h);
      const tre0 = b.artifacts["trevo"] ?? 0;
      const shop0 = b.artifacts["_xp_shop"] ?? 0;
      const xpBase = Math.floor(
        25 * tre0 +
          shop0 +
          m.meta.permXp +
          m.partyXpBonusPct +
          pantanoHelmoXpBonusPercent(h.forgeLoadout),
      );
      pushStat(
        cells,
        "xp_bonus",
        "Bônus XP",
        `+${xpCur}%`,
        xpCur - xpBase,
        "pct",
      );
    }
    pushStat(
      cells,
      "pen",
      "Penetração",
      String(h.penetracao),
      h.penetracao - b.penetracao,
      "int",
    );
    pushStat(
      cells,
      "pen_escudo",
      "Penetração de escudo",
      String(h.penetracaoEscudo),
      h.penetracaoEscudo - b.penetracaoEscudo,
      "int",
    );
    pushStat(
      cells,
      "lifesteal",
      "Roubo de vida",
      `${h.lifesteal}%`,
      h.lifesteal - b.lifesteal,
      "pct",
    );
    pushStat(
      cells,
      "luck",
      "Sorte",
      String(m.effectiveSorte(h)),
      m.effectiveSorte(h) - b.sorte,
      "int",
    );

    const flyStr = h.flying ? "Sim" : "Não";
    let flyHtml = escapeHtml(flyStr);
    let flyPlain = flyStr;
    if (!b.flying && h.flying) {
      flyHtml += ` <span class="lol-stat-delta lol-stat-delta--up">(voo)</span>`;
      flyPlain = `${flyStr} (voo)`;
    } else if (b.flying && !h.flying) {
      flyHtml += ` <span class="lol-stat-delta lol-stat-delta--down">(perdeu)</span>`;
      flyPlain = `${flyStr} (perdeu)`;
    }
    cells.push({
      icon: "fly",
      label: "Voo",
      value: flyStr,
      valueHtml: flyHtml,
      tooltipValue: flyPlain,
    });
  } else {
    const we = h.pistoleiroBonusDanoWave + h.curandeiroDanoWave;
    cells.push({
      icon: "max_hp",
      label: "Vida",
      value: `${h.hp}/${h.maxHp}`,
    });
    cells.push({
      icon: "max_mana",
      label: "Mana",
      value: `${h.mana}/${h.maxMana}`,
    });
    cells.push({
      icon: "regen_hp",
      label: "Regen. vida",
      value: String(effRegV),
    });
    cells.push({
      icon: "regen_mp",
      label: "Regen. mana",
      value: String(effRegM),
    });
    cells.push({
      icon: "dmg",
      label: "Dano",
      value: String(heroDanoPlusRoninOverflow(h)),
      tooltipValue: (() => {
        const eff = heroDanoPlusRoninOverflow(h);
        const flat = eff - h.dano;
        const base =
          we > 0
            ? `${eff} (+${we} bônus de wave no combate)`
            : String(eff);
        return flat > 0 ? `${base} — +${flat} do Ronin (crítico >100%)` : base;
      })(),
    });
    cells.push({
      icon: "crit_hit",
      label: "Acerto crítico",
      value: `${displayedCritChancePercent(h)}%`,
      tooltipValue:
        totalCritChancePercent(h) > displayedCritChancePercent(h)
          ? `${displayedCritChancePercent(h)}% (chance no dado; +${totalCritChancePercent(h) - displayedCritChancePercent(h)}% acima de 100% sem efeito em crítico até teres Ronin)`
          : totalCritChancePercent(h) > 100
            ? `${displayedCritChancePercent(h)}% (excesso acima de 100% vira +1 dano por cada 5% com Ronin)`
            : `${displayedCritChancePercent(h)}%`,
    });
    cells.push({
      icon: "crit_dmg",
      label: "Dano critico",
      value: `${Math.round(critMultCur * 100)}%`,
    });
    cells.push({
      icon: "def",
      label: ign ? "Defesa (ruler ignora bioma)" : "Defesa",
      value: String(effDef),
      tooltipValue: defenseReductionTooltipText(effDef),
    });
    const pantHexSlowElse =
      bio === "pantano" &&
      !ign &&
      forgeSynergyTier(h.forgeLoadout, "pantano") < 1;
    const pantF = pantHexSlowElse
      ? ` <span class="lol-stat-delta lol-stat-delta--down">(−50% mobilidade)</span>`
      : "";
    cells.push({
      icon: "mov",
      label: "Movimento",
      value: String(movPool),
      valueHtml: escapeHtml(String(movPool)) + pantF,
      tooltipValue:
        String(movPool) +
        (pantHexSlowElse ? " — hexes no pântano custam 2 pontos" : ""),
    });
    cells.push({
      icon: "range",
      label: ign ? "Alcance (ruler ignora bioma)" : "Alcance",
      value: String(effAlc),
    });
    cells.push({
      icon: "pot",
      label: "Potencial de cura e escudo",
      value: String(h.potencialCuraEscudo),
    });
    cells.push({
      icon: "xp_bonus",
      label: "Bônus XP",
      value: `+${model.xpGainBonusPercentForHero(h)}%`,
      tooltipValue: `+${model.xpGainBonusPercentForHero(h)}%`,
    });
    cells.push({
      icon: "pen",
      label: "Penetração",
      value: String(h.penetracao),
    });
    cells.push({
      icon: "pen_escudo",
      label: "Penetração de escudo",
      value: String(h.penetracaoEscudo),
    });
    cells.push({
      icon: "lifesteal",
      label: "Roubo de vida",
      value: `${h.lifesteal}%`,
    });
    cells.push({ icon: "luck", label: "Sorte", value: String(h.sorte) });
    cells.push({
      icon: "fly",
      label: "Voo",
      value: h.flying ? "Sim" : "Não",
    });
  }

  if (h.gladiadorKills)
    pushStat(
      cells,
      "kills",
      "Eliminações (passiva do gladiador)",
      String(h.gladiadorKills),
      h.gladiadorKills,
      "int",
    );
  if (h.duroPedraDefStacks)
    pushStat(
      cells,
      "stone",
      "Duro como pedra (acúmulos de defesa no turno)",
      String(h.duroPedraDefStacks),
      h.duroPedraDefStacks,
      "int",
    );
  if (h.motorMorteNextBasicPct)
    pushStat(
      cells,
      "motor",
      "Motor da morte (próximo básico, %)",
      String(h.motorMorteNextBasicPct),
      h.motorMorteNextBasicPct,
      "pct",
    );
  if (h.poison)
    cells.push({
      icon: "poison",
      label: "Veneno",
      value: `${h.poison.perTurn}/turno · ${h.poison.turns} turno(s)`,
      tooltipValue: `${h.poison.perTurn}/turno · ${h.poison.turns} turno(s)`,
    });
  if (h.hot)
    cells.push({
      icon: "regen_hp",
      label: "Cura contínua",
      value: `${h.hot.perTurn}/turno · ${h.hot.turns} turno(s)`,
      tooltipValue: `${h.hot.perTurn}/turno · ${h.hot.turns} turno(s)`,
    });
  if (h.ultimateId)
    cells.push({
      icon: "ult",
      label: "Ultimate escolhida",
      value: h.ultimateId,
    });
  if (h.formaFinal)
    cells.push({ icon: "forma", label: "Forma final", value: "Sim" });
  if (m.currentHero()?.id === h.id) {
    cells.push({
      icon: "basic",
      label: "Ataques básicos restantes",
      value: String(m.basicLeft),
    });
  }
  const Bb = m.bunkerAtHex(h.q, h.r);
  const inBunkHud =
    h.isPlayer && !!Bb && Bb.hp > 0 && Bb.occupantId === h.id;
  if (inBunkHud && Bb) {
    const B = Bb;
    cells.unshift({
      icon: "def",
      label: "Bunker (estrutura)",
      value: `${B.hp}/${B.maxHp} · def ${B.defesa}`,
      tooltipValue: `PV e defesa do bunker; inimigos reduzem esta vida antes da sua.`,
    });
  }
  return cells;
}

function spawnCombatFloat(
  px: number,
  py: number,
  amount: number,
  ev: Pick<
    CombatFloatEvent,
    | "kind"
    | "crit"
    | "targetIsPlayer"
    | "bunkerDamage"
    | "poisonDot"
  >,
): void {
  const el = document.createElement("div");
  el.className = "combat-float";
  const poisonDot = ev.kind === "damage" && !!ev.poisonDot;
  const text =
    ev.kind === "damage" && ev.crit && !poisonDot ? `${amount}!` : String(amount);
  el.textContent = text;
  if (ev.kind === "damage") {
    if (poisonDot) {
      el.classList.add("combat-float--dmg-poison");
    } else if (ev.bunkerDamage) {
      el.classList.add("combat-float--dmg-bunker");
    } else {
      el.classList.add(
        ev.targetIsPlayer
          ? "combat-float--dmg-hero"
          : "combat-float--dmg-enemy",
      );
    }
    if (ev.crit && !poisonDot) el.classList.add("combat-float--crit");
  } else if (ev.kind === "shield_absorb") {
    el.classList.add("combat-float--shield-absorb");
  } else if (ev.kind === "shield_gain") {
    el.classList.add("combat-float--shield-gain");
  } else if (ev.kind === "heal") {
    el.classList.add("combat-float--heal");
  } else {
    el.classList.add("combat-float--mana");
  }
  const jx = (Math.random() - 0.5) * 22;
  const jy = (Math.random() - 0.5) * 12;
  el.style.left = `${px + jx}px`;
  el.style.top = `${py + jy}px`;
  damageFloatLayer.appendChild(el);
  window.setTimeout(() => el.remove(), 950);
}

function showCombatHUD(): void {
  combatHotkeysAbort?.abort();
  combatHotkeysAbort = new AbortController();
  const combatInputSignal = combatHotkeysAbort.signal;
  combatArtifactStripPage = 0;
  combatArtifactStripSig = "";
  combatTurnOrderPage = 0;
  combatTurnOrderUserAdjusted = false;
  combatLastTurnFocusKey = "";
  hideGameTooltip();
  disposeEnemyInspectPreview();
  enemyInspectUiAbort?.abort();
  enemyInspectUiAbort = null;
  uiRoot.innerHTML = "";
  const sandboxHudHtml =
    import.meta.env.DEV && model.devSandboxMode
      ? `<div class="hud-block hud-sandbox-pill" role="status">Modo sandbox — ouro/cristais/essências amplos · sem CDR · ultimate da arma sempre pronta · na loja: grelha de artefatos (esq./dir.)</div>`
      : "";
  const hud = el(`
    <div class="hud">
      ${sandboxHudHtml}
      <div class="hud-block hint-inline">Cada <strong>rodada</strong> começa pelos <strong>inimigos</strong>. Clique no <strong>seu herói</strong> para <strong>movimento</strong> (hexes azuis) ou <strong>Espaço</strong> para o herói do turno. Clique num <strong>inimigo</strong> para ver atributos. Ações abaixo mostram <strong>alcance</strong> em vermelho; repetir a mesma tecla da skill cancela a seleção. <strong>WASD</strong> ou <strong>arrastar botão esquerdo</strong> na arena para mover a câmera · <strong>roda</strong> zoom. <strong>I</strong> equipamentos forjados · <strong>Esc</strong> pausar.</div>
      <div class="hud-block">Wave <strong id="wv">1</strong></div>
    </div>
  `);
  const stipendOverlay = el(
    `<div class="combat-wave-stipend-overlay" id="wave-stipend-overlay" aria-live="polite"></div>`,
  );
  const enemyInspectPanel = el(
    `<div id="enemy-inspect" class="enemy-inspect enemy-inspect--floating" style="display:none" role="dialog" aria-label="Atributos do inimigo"></div>`,
  );
  bindEnemyInspectPanel(enemyInspectPanel);
  mountEnemyInspectPanelShell(enemyInspectPanel);
  const turnOrderWrap = el(`<div class="turn-order-wrap" id="turn-order-wrap">
      <button type="button" class="turn-order-pager turn-order-pager--prev" id="turn-order-prev" aria-label="Turnos anteriores">‹</button>
      <div class="turn-order-dock" id="turn-order" aria-label="Ordem de turnos"></div>
      <button type="button" class="turn-order-pager turn-order-pager--next" id="turn-order-next" aria-label="Turnos seguintes">›</button>
    </div>`);
  const turnOrderEl = turnOrderWrap.querySelector("#turn-order") as HTMLElement;
  const combatAboveBar = el(`<div class="combat-above-bar-actions">
      <div class="combat-above-bar-left">
        <div class="combat-artifacts-wrap" id="combat-artifacts-wrap">
          <button type="button" class="combat-artifacts-pager combat-artifacts-pager--up" id="combat-artifacts-up" aria-label="Artefatos anteriores">▲</button>
          <div class="combat-artifacts-strip" id="combat-artifacts-strip" aria-label="Artefatos"></div>
          <button type="button" class="combat-artifacts-pager combat-artifacts-pager--down" id="combat-artifacts-down" aria-label="Artefatos seguintes">▼</button>
        </div>
        <div class="combat-above-rarity combat-rarity-hint" id="combat-rarity-hint" aria-live="polite"></div>
      </div>
      <div class="combat-above-bar-right">
        <label class="combat-skip-enemy-label" for="chk-skip-enemy-move">
          <input type="checkbox" id="chk-skip-enemy-move" />
          <span>Pular movimento inimigo</span>
        </label>
        <div class="combat-above-bar-right-btns">
          <button type="button" class="btn btn-combat-above combat-btn--hidden" id="btn-cancel-sel">Cancelar seleção</button>
          <button type="button" class="btn btn-combat-above" id="btn-end">Encerrar turno</button>
        </div>
      </div>
    </div>`);
  const logVisible = readCombatLogVisible();
  const bottom = el(`
    <div class="combat-bottom-bar" id="combat-bottom">
      <div class="combat-log-dock ${logVisible ? "combat-log-dock--open" : "combat-log-dock--closed"}" id="combat-log-dock">
        <button type="button" class="combat-log-rail" id="btn-combat-log-rail" aria-expanded="${logVisible}" aria-controls="combat-log-body" title="Registo de combate">
          <span class="combat-log-rail-chev" aria-hidden="true"></span>
          <span class="combat-log-rail-text">Registo</span>
        </button>
        <div class="combat-log-body" id="combat-log-body">
          <div class="log-panel" id="log"></div>
        </div>
      </div>
      <div class="combat-bolsa-row">
      <div class="combat-bolsa-gold" title="Ouro na bolsa (soma do time). O estipêndio da wave é separado.">
        <span class="combat-bolsa-gold__label">Ouro</span>
        <span class="combat-bolsa-gold__icon" aria-hidden="true">${combatGoldCoinSvgHtml()}</span>
        <span class="combat-bolsa-gold__value" id="party-ouro-sum">0</span>
      </div>
      <div class="combat-bolsa-gold combat-bolsa-crystals" title="Cristais obtidos nesta run. Ao vencer ou perder, somam-se à conta (meta).">
        <span class="combat-bolsa-gold__label">Cristais</span>
        <span class="combat-bolsa-gold__icon combat-bolsa-crystals__icon" aria-hidden="true">
          <svg class="combat-bolsa-svg" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" focusable="false">
            <path fill="#7ecbff" stroke="#1a5a8a" stroke-width="1.2" d="M24 6l14 12-14 26L10 18z"/>
            <path fill="#b8e8ff" stroke="#2a7099" stroke-width="0.8" d="M24 12l9 8-9 18-9-18z" opacity="0.95"/>
          </svg>
        </span>
        <span class="combat-bolsa-gold__value" id="combat-crystals-run">0</span>
      </div>
      <div class="combat-essences-strip" id="combat-essences-strip" aria-label="Essências" title="Essências permanentes (drop por kill no bioma)"></div>
      </div>
      <div class="combat-bottom-main">
        <div class="combat-bottom-inner combat-hero-panel">
          <div class="lol-loadout">
          <div class="lol-col lol-col-passive">
            <div class="lol-weapon-passive-row">
              <div class="lol-weapon-slot" id="lol-weapon-slot" role="img" tabindex="0"></div>
              <div class="lol-skill-slot lol-skill-slot--passive" id="lol-passive-slot">P</div>
            </div>
          </div>
          <div class="lol-col lol-col-bars">
            <div class="lol-bars-row">
              <div class="lol-portrait-wrap">
                <div class="lol-portrait" id="lol-portrait"></div>
                <div class="lol-level-badge" id="lol-level">1</div>
              </div>
              <div class="lol-bars-stack">
                <div class="lol-name-row">
                  <span class="lol-champ-name" id="lol-name">—</span>
                  <span class="lol-biome-pill" id="lol-biome-pill"></span>
                </div>
                <div class="lol-bar lol-bar--hp" aria-hidden="true">
                  <div class="lol-bar-track">
                    <div class="lol-bar-fill lol-bar-fill--hp" id="lol-hp-fill"></div>
                    <span class="lol-bar-label" id="lol-hp-txt"></span>
                  </div>
                </div>
                <div class="lol-bar lol-bar--mana" aria-hidden="true">
                  <div class="lol-bar-track">
                    <div class="lol-bar-fill lol-bar-fill--mana" id="lol-mana-fill"></div>
                    <span class="lol-bar-label" id="lol-mana-txt"></span>
                  </div>
                </div>
                <div class="lol-bar lol-bar--xp" aria-hidden="true">
                  <div class="lol-bar-track">
                    <div class="lol-bar-fill lol-bar-fill--xp" id="lol-xp-fill"></div>
                    <span class="lol-bar-label" id="lol-xp-txt"></span>
                  </div>
                </div>
                <div class="lol-bar lol-bar--shield" aria-hidden="true">
                  <div class="lol-bar-track">
                    <div class="lol-bar-fill lol-bar-fill--shield" id="lol-shield-fill"></div>
                    <span class="lol-bar-label" id="lol-shield-txt"></span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="lol-col lol-col-abilities">
            <div class="lol-abilities-row">
              <div class="lol-action-row" id="action-row"></div>
            </div>
          </div>
          <div class="lol-col lol-col-stats">
            <div class="lol-stats-head">Atributos</div>
            <div class="lol-stats-list" id="lol-stats-grid"></div>
          </div>
          </div>
        </div>
      </div>
    </div>
  `);
  const combatDockStack = el(`<div class="combat-bottom-stack"></div>`);
  combatDockStack.appendChild(combatAboveBar);
  combatDockStack.appendChild(bottom);
  uiRoot.appendChild(hud);
  uiRoot.appendChild(stipendOverlay);
  uiRoot.appendChild(enemyInspectPanel);
  uiRoot.appendChild(turnOrderWrap);
  uiRoot.appendChild(combatDockStack);
  const lolPortrait = bottom.querySelector("#lol-portrait") as HTMLElement;
  const lolWeaponSlot = bottom.querySelector("#lol-weapon-slot") as HTMLElement;
  const lolPassiveSlot = bottom.querySelector("#lol-passive-slot") as HTMLElement;
  const actionRow = bottom.querySelector("#action-row")!;
  const lolStatsGrid = bottom.querySelector("#lol-stats-grid") as HTMLElement;
  const lolName = bottom.querySelector("#lol-name") as HTMLElement;
  const lolBiomePill = bottom.querySelector("#lol-biome-pill") as HTMLElement;
  const lolShieldFill = bottom.querySelector("#lol-shield-fill") as HTMLElement;
  const lolShieldTxt = bottom.querySelector("#lol-shield-txt") as HTMLElement;
  const lolHpFill = bottom.querySelector("#lol-hp-fill") as HTMLElement;
  const lolHpTxt = bottom.querySelector("#lol-hp-txt") as HTMLElement;
  const lolManaFill = bottom.querySelector("#lol-mana-fill") as HTMLElement;
  const lolManaTxt = bottom.querySelector("#lol-mana-txt") as HTMLElement;
  const lolXpFill = bottom.querySelector("#lol-xp-fill") as HTMLElement;
  const lolXpTxt = bottom.querySelector("#lol-xp-txt") as HTMLElement;
  const lolLevel = bottom.querySelector("#lol-level") as HTMLElement;
  const lolLoadout = bottom.querySelector(".lol-loadout") as HTMLElement;
  const logEl = bottom.querySelector("#log") as HTMLElement;
  const logDock = bottom.querySelector("#combat-log-dock") as HTMLElement;
  const btnLogRail = bottom.querySelector("#btn-combat-log-rail") as HTMLButtonElement;

  let combatLogExpanded = logVisible;
  const setLogDockOpen = (open: boolean): void => {
    combatLogExpanded = open;
    writeCombatLogVisible(open);
    logDock.classList.toggle("combat-log-dock--open", open);
    logDock.classList.toggle("combat-log-dock--closed", !open);
    btnLogRail.setAttribute("aria-expanded", open ? "true" : "false");
  };
  btnLogRail.addEventListener("click", () => {
    setLogDockOpen(!combatLogExpanded);
  });

  const refreshOverlays = (): void => {
    applyCombatOverlays();
  };

  let bunkerHoverHintEl: HTMLDivElement | null = null;
  const clearBunkerHoverHint = (): void => {
    // Remove também quaisquer resíduos antigos (evita "congelar" na tela).
    damageFloatLayer
      .querySelectorAll(".combat-bunker-hint-float--enter")
      .forEach((n) => n.remove());
    if (bunkerHoverHintEl) {
      bunkerHoverHintEl.remove();
      bunkerHoverHintEl = null;
    }
    canvas.style.cursor = "";
  };

  const updateBunkerHoverHint = (ev: MouseEvent): void => {
    if (model.phase !== "combat") {
      clearBunkerHoverHint();
      return;
    }
    const active = model.currentHero();
    if (!active || active.hp <= 0 || view.isUnitMoveAnimating()) {
      clearBunkerHoverHint();
      return;
    }
    const r = canvas.getBoundingClientRect();
    const x = ((ev.clientX - r.left) / r.width) * 2 - 1;
    const y = -((ev.clientY - r.top) / r.height) * 2 + 1;
    const hex = view.pickHex(x, y, model.grid);
    if (!hex) {
      clearBunkerHoverHint();
      return;
    }
    const b = model.bunkerAtHex(hex.q, hex.r);
    if (!b || b.hp <= 0 || b.occupantId) {
      clearBunkerHoverHint();
      return;
    }
    // Mesmas restrições básicas de movimento para não sinalizar falso-positivo.
    let adjEnemy = 0;
    for (const e of model.enemies()) {
      if (hexDistance({ q: active.q, r: active.r }, { q: e.q, r: e.r }) === 1) {
        adjEnemy++;
      }
    }
    if (active.bunkerReentryBlocked || adjEnemy >= 2) {
      clearBunkerHoverHint();
      return;
    }
    const reach = model.reachableForCurrentHero();
    if (!reach.has(axialKey(hex.q, hex.r))) {
      clearBunkerHoverHint();
      return;
    }
    const pos = view.worldBunkerTopToScreen(canvas, b.q, b.r);
    if (!pos) {
      clearBunkerHoverHint();
      return;
    }
    if (!bunkerHoverHintEl) {
      bunkerHoverHintEl = document.createElement("div");
      bunkerHoverHintEl.className =
        "combat-bunker-hint-float combat-bunker-hint-float--enter";
      bunkerHoverHintEl.textContent = "Entrar no bunker";
      damageFloatLayer.appendChild(bunkerHoverHintEl);
    }
    bunkerHoverHintEl.style.left = `${pos.x}px`;
    bunkerHoverHintEl.style.top = `${Math.max(8, pos.y - 32)}px`;
    canvas.style.cursor = "pointer";
  };

  const update = (): void => {
    const activeHero = model.currentHero();
    const h = lolViewedHero(model);
    hud.querySelector("#wv")!.textContent = String(model.wave);
    const partyLive = model.getParty().filter((u) => u.hp > 0);
    const sumWaveGold = partyLive.reduce((s, u) => s + u.ouroWave, 0);
    const drainNext = partyLive.reduce(
      (s, u) => s + goldDrainPerTurn(u, model.partyOrder.length),
      0,
    );
    const stipEl = document.getElementById("wave-stipend-overlay");
    if (stipEl) {
      const coin = combatGoldCoinSvgHtml("wave-stipend-coin-svg");
      stipEl.innerHTML = `<div class="wave-stipend-stack">
        <span class="wave-stipend-line"><span class="wave-stipend-gold">${sumWaveGold}</span> <span class="wave-stipend-drain">(−${drainNext})</span></span>
        <div class="wave-stipend-wave" aria-hidden="true">
          <span class="wave-stipend-bar" style="--wave-tick:0.32"></span>
          <span class="wave-stipend-bar" style="--wave-tick:0.5"></span>
          <span class="wave-stipend-bar" style="--wave-tick:0.72"></span>
          <span class="wave-stipend-wave-center" title="Ouro da wave">${coin}</span>
          <span class="wave-stipend-bar" style="--wave-tick:0.72"></span>
          <span class="wave-stipend-bar" style="--wave-tick:0.5"></span>
          <span class="wave-stipend-bar" style="--wave-tick:0.32"></span>
        </div>
      </div>`;
    }
    const oddsEl = combatAboveBar.querySelector("#combat-rarity-hint");
    if (oddsEl) {
      if (h?.isPlayer && h.hp > 0) {
        const lines = formatRarityOddsLinesHtml(model.effectiveSorte(h));
        oddsEl.innerHTML = lines
          .map((ln) => `<div class="combat-rarity-line">${ln}</div>`)
          .join("");
      } else {
        oddsEl.innerHTML = "";
      }
    }
    const bh = model.takePendingBunkerHint();
    if (bh) {
      // Feedback deve acontecer mesmo se a posição 3D ainda não estiver pronta neste frame.
      playInputError();
      const hintEl = document.createElement("div");
      hintEl.className = "combat-bunker-hint-float";
      hintEl.textContent = bh.text;
      hintEl.style.left = `50%`;
      hintEl.style.top = `12px`;
      hintEl.style.opacity = "0";
      damageFloatLayer.appendChild(hintEl);

      const tryPlace = (triesLeft: number): void => {
        const pos = view.worldBunkerTopToScreen(canvas, bh.q, bh.r);
        if (pos) {
          hintEl.style.left = `${pos.x}px`;
          hintEl.style.top = `${Math.max(8, pos.y - 36)}px`;
          hintEl.style.opacity = "1";
          return;
        }
        if (triesLeft <= 0) {
          // Fallback: mostra no topo central em vez de “sumir”.
          hintEl.style.opacity = "1";
          return;
        }
        requestAnimationFrame(() => tryPlace(triesLeft - 1));
      };
      requestAnimationFrame(() => tryPlace(10));

      window.setTimeout(() => hintEl.remove(), 2000);
    }
    const mh = model.takePendingMoveBlockedHint();
    if (mh) {
      playInputError();
      const pos = view.worldUnitHeadToScreen(canvas, mh.unitId, 2.2);
      const hintEl = document.createElement("div");
      hintEl.className = "combat-bunker-hint-float";
      hintEl.textContent = mh.text;
      if (pos) {
        hintEl.style.left = `${pos.x}px`;
        hintEl.style.top = `${Math.max(8, pos.y - 34)}px`;
      } else {
        hintEl.style.left = "50%";
        hintEl.style.top = "12px";
      }
      damageFloatLayer.appendChild(hintEl);
      window.setTimeout(() => hintEl.remove(), 2000);
    }
    const sumBolsa = model
      .getParty()
      .reduce((s, u) => s + (u.hp > 0 ? u.ouro : 0), 0);
    bottom.querySelector("#party-ouro-sum")!.textContent = String(sumBolsa);
    const crEl = bottom.querySelector("#combat-crystals-run");
    if (crEl) crEl.textContent = String(model.crystalsRun);
    const essStrip = bottom.querySelector("#combat-essences-strip") as HTMLElement;
    const ess = model.meta.essences;
    const essRows = COMBAT_BIOMES.map((id) => {
      const eid = id as ForgeEssenceId;
      const n = ess[eid] ?? 0;
      const label = FORGE_ESSENCE_LABELS[eid];
      return `<div class="ess-row" data-essence="${escapeHtml(id)}" role="img" tabindex="0" aria-label="${escapeHtml(label)}: ${n}">
        <span class="ess-crystal ess-crystal--${escapeHtml(id)}" aria-hidden="true"></span>
        <span class="ess-row__cnt">${n}</span>
      </div>`;
    }).join("");
    essStrip.innerHTML = `<span class="ess-strip-label">Ess.</span><div class="ess-vertical">${essRows}</div>`;
    essStrip.querySelectorAll("[data-essence]").forEach((node) => {
      const el = node as HTMLElement;
      const id = el.dataset.essence as ForgeEssenceId;
      bindGameTooltip(el, () =>
        tooltipPassiveHtml(
          FORGE_ESSENCE_LABELS[id],
          `Quantidade: ${model.meta.essences[id] ?? 0}. Dropa ao derrotar inimigos no bioma correspondente.`,
        ),
      );
    });
    const artStrip = combatAboveBar.querySelector(
      "#combat-artifacts-strip",
    ) as HTMLElement;
    const artWrap = combatAboveBar.querySelector(
      "#combat-artifacts-wrap",
    ) as HTMLElement | null;
    const btnArtUp = combatAboveBar.querySelector(
      "#combat-artifacts-up",
    ) as HTMLButtonElement | null;
    const btnArtDown = combatAboveBar.querySelector(
      "#combat-artifacts-down",
    ) as HTMLButtonElement | null;
    if (h?.isPlayer && h.heroClass && h.hp > 0) {
      const arts = Object.entries(h.artifacts).filter(
        ([id, n]) => n > 0 && isArtifactVisibleInHud(id),
      );
      const artSig = `${h.id}|${arts.length}`;
      if (artSig !== combatArtifactStripSig) {
        combatArtifactStripSig = artSig;
        combatArtifactStripPage = 0;
      }
      const maxArtPage = Math.max(
        0,
        Math.ceil(arts.length / COMBAT_ARTIFACT_PAGE_SIZE) - 1,
      );
      combatArtifactStripPage = Math.min(
        combatArtifactStripPage,
        maxArtPage,
      );
      const showArtPager = arts.length >= COMBAT_ARTIFACT_PAGE_SIZE;
      if (artWrap) artWrap.classList.toggle("combat-artifacts-wrap--paged", showArtPager);
      if (btnArtUp) {
        btnArtUp.hidden = !showArtPager;
        btnArtUp.disabled = combatArtifactStripPage <= 0;
      }
      if (btnArtDown) {
        btnArtDown.hidden = !showArtPager;
        btnArtDown.disabled = combatArtifactStripPage >= maxArtPage;
      }
      if (arts.length === 0) {
        artStrip.innerHTML =
          '<span class="combat-artifacts-label">Artefatos</span><span class="combat-artifacts-empty">—</span>';
      } else {
        const a0 = combatArtifactStripPage * COMBAT_ARTIFACT_PAGE_SIZE;
        const artsPage = arts.slice(a0, a0 + COMBAT_ARTIFACT_PAGE_SIZE);
        const cards = artsPage
          .map(([id, stacks]) => {
            const cnt = artifactStackCounterLabel(id, stacks);
            const fig = artifactCardInnerHtml(id);
            return `<div class="artifact-mini-card" data-artifact-id="${escapeHtml(id)}" tabindex="0" role="img" aria-label="Artefato">${fig}<span class="artifact-mini-card__cnt">${cnt}</span></div>`;
          })
          .join("");
        const rangeHint =
          showArtPager && arts.length > 0
            ? ` <span class="combat-artifacts-page-hint" aria-hidden="true">${a0 + 1}–${Math.min(a0 + artsPage.length, arts.length)}/${arts.length}</span>`
            : "";
        artStrip.innerHTML = `<span class="combat-artifacts-label">Artefatos</span>${rangeHint}<div class="combat-artifacts-cards">${cards}</div>`;
        artStrip.querySelectorAll("[data-artifact-id]").forEach((node) => {
          const el = node as HTMLElement;
          const aid = el.dataset.artifactId!;
          bindGameTooltip(el, () =>
            artifactTooltipHtml(aid, h!.artifacts[aid] ?? 0, h!, {
              showNext: true,
            }),
          );
        });
      }
    } else {
      combatArtifactStripSig = "";
      if (artWrap) artWrap.classList.remove("combat-artifacts-wrap--paged");
      if (btnArtUp) btnArtUp.hidden = true;
      if (btnArtDown) btnArtDown.hidden = true;
      artStrip.innerHTML = "";
    }
    const turnEl = turnOrderEl;
    const btnTurnPrev = document.getElementById(
      "turn-order-prev",
    ) as HTMLButtonElement | null;
    const btnTurnNext = document.getElementById(
      "turn-order-next",
    ) as HTMLButtonElement | null;
    const curIdx = model.currentHeroIndex;
    const order = model.partyOrder;
    const en = model.enemies();
    const turnEntries: {
      unitId: string;
      rowHtml: (seq: number) => string;
    }[] = [];
    for (const e of en) {
      let cls = "turn-tile turn-chip turn-enemy";
      if (model.inEnemyPhase && model.lastEnemyActedId === e.id)
        cls += " turn-enemy-active";
      const bgSt = turnTileBackgroundStyle(
        false,
        enemySplashDataUrl(e.enemyArchetypeId ?? "gladinio"),
      );
      const uid = e.id;
      turnEntries.push({
        unitId: uid,
        rowHtml: (seq: number) =>
          `<div class="turn-order-row"><span class="turn-order-idx">${seq}</span><span class="${cls}" style="${escapeHtml(bgSt)}" data-unit-id="${escapeHtml(uid)}" role="button" tabindex="0" title="${escapeHtml(e.name)}" aria-label="${escapeHtml(e.name)}"></span></div>`,
      });
    }
    for (let oi = 0; oi < order.length; oi++) {
      const id = order[oi]!;
      const u = model.units.find((x) => x.id === id);
      if (!u || u.hp <= 0) continue;
      let cls = "turn-tile turn-chip";
      if (!model.inEnemyPhase && oi === curIdx) cls += " turn-active";
      else if (!model.inEnemyPhase && oi < curIdx) cls += " turn-done";
      const bgSt = turnTileBackgroundStyle(
        true,
        heroSplashDataUrl(u.heroClass!),
      );
      const ub = model.bunkerAtHex(u.q, u.r);
      const heroDisp =
        ub && ub.hp > 0 && ub.occupantId === u.id ? "bunker" : u.name;
      const uid = u.id;
      turnEntries.push({
        unitId: uid,
        rowHtml: (seq: number) =>
          `<div class="turn-order-row"><span class="turn-order-idx">${seq}</span><span class="${cls}" style="${escapeHtml(bgSt)}" data-unit-id="${escapeHtml(uid)}" role="button" tabindex="0" title="${escapeHtml(heroDisp)}" aria-label="${escapeHtml(heroDisp)}"></span></div>`,
      });
    }
    const focusKey = `${model.inEnemyPhase ? "E" : "P"}:${model.inEnemyPhase ? (model.lastEnemyActedId ?? "") : (model.currentHero()?.id ?? "")}`;
    if (focusKey !== combatLastTurnFocusKey) {
      combatLastTurnFocusKey = focusKey;
      combatTurnOrderUserAdjusted = false;
    }
    let currentTurnIdx = 0;
    if (turnEntries.length > 0) {
      if (model.inEnemyPhase) {
        const id = model.lastEnemyActedId;
        if (id) {
          const ix = turnEntries.findIndex((t) => t.unitId === id);
          if (ix >= 0) currentTurnIdx = ix;
        }
      } else {
        const ch = model.currentHero();
        if (ch && ch.hp > 0) {
          const ix = turnEntries.findIndex((t) => t.unitId === ch.id);
          if (ix >= 0) currentTurnIdx = ix;
        }
      }
    }
    const maxTurnPage = Math.max(
      0,
      Math.ceil(turnEntries.length / COMBAT_TURN_ORDER_PAGE_SIZE) - 1,
    );
    const autoTurnPage = Math.floor(
      currentTurnIdx / COMBAT_TURN_ORDER_PAGE_SIZE,
    );
    if (!combatTurnOrderUserAdjusted) {
      combatTurnOrderPage = Math.min(
        maxTurnPage,
        Math.max(0, autoTurnPage),
      );
    } else {
      combatTurnOrderPage = Math.min(
        maxTurnPage,
        Math.max(0, combatTurnOrderPage),
      );
    }
    const showTurnPager = turnEntries.length > COMBAT_TURN_ORDER_PAGE_SIZE;
    if (btnTurnPrev) {
      btnTurnPrev.hidden = !showTurnPager;
      btnTurnPrev.disabled = combatTurnOrderPage <= 0;
    }
    if (btnTurnNext) {
      btnTurnNext.hidden = !showTurnPager;
      btnTurnNext.disabled = combatTurnOrderPage >= maxTurnPage;
    }
    const turnWrapEl = document.getElementById("turn-order-wrap");
    if (turnWrapEl) {
      turnWrapEl.classList.toggle("turn-order-wrap--paged", showTurnPager);
    }
    const t0 = combatTurnOrderPage * COMBAT_TURN_ORDER_PAGE_SIZE;
    const turnSlice = turnEntries.slice(
      t0,
      t0 + COMBAT_TURN_ORDER_PAGE_SIZE,
    );
    const rows = turnSlice.map((te, i) => te.rowHtml(t0 + i + 1));
    turnEl.innerHTML = rows.length ? rows.join("") : "";
    (turnEl as HTMLElement).onclick = (ev: MouseEvent) => {
      const t = (ev.target as HTMLElement).closest("[data-unit-id]");
      if (!t) return;
      const id = t.getAttribute("data-unit-id");
      if (!id) return;
      const u = model.units.find((x) => x.id === id);
      if (!u || u.hp <= 0) return;
      view.focusOnAxial(u.q, u.r, u.isPlayer);
      if (u.isPlayer) {
        combatInspectEnemyId = null;
        const ch = model.currentHero();
        combatLolInspectHeroId =
          ch && u.id !== ch.id ? u.id : null;
      } else {
        combatInspectEnemyId = id;
      }
      update();
    };
    const btnEnd = combatAboveBar.querySelector("#btn-end") as HTMLButtonElement;
    btnEnd.disabled =
      model.inEnemyPhase || model.hasPendingCombatSchedule();
    const btnCancel = combatAboveBar.querySelector(
      "#btn-cancel-sel",
    ) as HTMLButtonElement;
    const showCancel =
      !model.inEnemyPhase &&
      (movePreviewActive || pendingCombat != null) &&
      !!(activeHero && activeHero.heroClass);
    btnCancel.classList.toggle("combat-btn--hidden", !showCancel);
    const insp = enemyInspectPanel;
    const insUnit = model.units.find(
      (u) => u.id === combatInspectEnemyId && !u.isPlayer && u.hp > 0,
    );
    if (insUnit) {
      insp.style.display = "flex";
      const titleEl = insp.querySelector("#enemy-inspect-title");
      if (titleEl) titleEl.textContent = insUnit.name;
      if (lastEnemyInspectRenderedId !== insUnit.id) {
        lastEnemyInspectRenderedId = insUnit.id;
        const ex = insp.querySelector("#enemy-inspect-extra") as HTMLElement | null;
        const btn = insp.querySelector("#enemy-inspect-more") as HTMLButtonElement | null;
        if (ex) ex.classList.add("enemy-inspect-extra--collapsed");
        if (btn) {
          btn.textContent = "Ver mais informações";
          btn.setAttribute("aria-expanded", "false");
        }
      }
      const prevHost = insp.querySelector(
        "#enemy-inspect-preview-host",
      ) as HTMLElement | null;
      if (prevHost) {
        if (!enemyInspectPreview3d) {
          enemyInspectPreview3d = new EnemyPreview3D(
            prevHost,
            Math.max(200, prevHost.clientWidth || 260),
            160,
          );
        }
        enemyInspectPreview3d.setEnemy(
          insUnit.enemyArchetypeId ?? "gladinio",
          insUnit.displayColor,
        );
        enemyInspectPreview3d.start();
        requestAnimationFrame(() => {
          const w = Math.max(1, Math.floor(prevHost.clientWidth || 260));
          enemyInspectPreview3d?.resize(w, 160);
        });
      }
      const st = insp.querySelector("#enemy-inspect-status") as HTMLElement | null;
      if (st) fillEnemyInspectStatusRow(st, insUnit);
      const pr = insp.querySelector("#enemy-inspect-primary") as HTMLElement | null;
      if (pr)
        pr.innerHTML = enemyInspectRowsHtml(
          enemyInspectPrimaryRows(insUnit, model),
        );
      const exl = insp.querySelector("#enemy-inspect-extra") as HTMLElement | null;
      if (exl)
        exl.innerHTML = enemyInspectRowsHtml(
          enemyInspectExtraRows(insUnit, model),
        );
      const saved = readEnemyInspectPos();
      if (saved) {
        insp.classList.remove("enemy-inspect--centered");
        requestAnimationFrame(() => {
          const w = insp.offsetWidth;
          const h = insp.offsetHeight;
          const c = clampEnemyInspectPosition(saved.left, saved.top, w, h);
          insp.style.left = `${c.left}px`;
          insp.style.top = `${c.top}px`;
          insp.style.transform = "none";
          if (c.left !== saved.left || c.top !== saved.top)
            writeEnemyInspectPos(c.left, c.top);
        });
      } else {
        insp.classList.add("enemy-inspect--centered");
        insp.style.left = "";
        insp.style.top = "";
        insp.style.transform = "";
      }
    } else {
      insp.style.display = "none";
      enemyInspectPreview3d?.stop();
      lastEnemyInspectRenderedId = null;
    }
    logEl.innerHTML = model.logLines.slice(-20).join("<br/>");
    actionRow.innerHTML = "";

    const fillLolPlaceholder = (): void => {
      lolLoadout.classList.add("lol-loadout--inactive");
      lolName.textContent = "—";
      lolBiomePill.textContent = "";
      lolPortrait.style.background = "linear-gradient(145deg,#2a2438,#1a1522)";
      lolLevel.textContent = "—";
      lolShieldFill.style.transform = "scaleX(0)";
      lolShieldTxt.textContent = "";
      lolHpFill.style.transform = "scaleX(0)";
      lolHpTxt.textContent = "";
      lolManaFill.style.transform = "scaleX(0)";
      lolManaTxt.textContent = "";
      lolXpFill.style.transform = "scaleX(0)";
      lolXpTxt.textContent = "";
      lolStatsGrid.innerHTML = "";
      clearGameTooltipHandlers(lolPassiveSlot);
      clearGameTooltipHandlers(lolPortrait);
      clearGameTooltipHandlers(lolBiomePill);
    };

    if (!h || !h.heroClass) {
      fillLolPlaceholder();
      refreshOverlays();
      return;
    }
    const isViewingActive = activeHero?.id === h.id;
    lolLoadout.classList.remove("lol-loadout--inactive");
    const tmpl = HEROES[h.heroClass];
    const bio = biomeAt(model.grid, h.q, h.r) as BiomeId;
    const bunkHere = model.bunkerAtHex(h.q, h.r);
    const bunkHud =
      !!bunkHere && bunkHere.hp > 0 && bunkHere.occupantId === h.id;
    lolPortrait.style.background = "";
    lolPortrait.style.backgroundImage = `linear-gradient(180deg,${displayColorCss(h.displayColor)}aa,rgba(0,0,0,0.42)),url(${JSON.stringify(heroSplashDataUrl(h.heroClass))})`;
    lolPortrait.style.backgroundSize = "cover, cover";
    lolPortrait.style.backgroundPosition = "center, center";
    lolPortrait.style.backgroundRepeat = "no-repeat";
    lolLevel.textContent = String(h.level);
    lolName.textContent = bunkHud ? "bunker" : tmpl.name;
    lolBiomePill.textContent = BIOME_LABELS[bio];
    bindGameTooltip(lolBiomePill, () =>
      tooltipPassiveHtml(BIOME_LABELS[bio], BIOME_DESCRIPTIONS[bio]),
    );
    const shR =
      h.maxHp > 0
        ? Math.max(0, Math.min(1, h.shieldGGBlue / Math.max(1, h.maxHp)))
        : 0;
    lolShieldFill.style.transform = `scaleX(${shR})`;
    lolShieldTxt.textContent =
      h.shieldGGBlue > 0 ? String(h.shieldGGBlue) : "0";
    if (bunkHud && bunkHere) {
      const B = bunkHere;
      const hpR = B.maxHp > 0 ? Math.max(0, Math.min(1, B.hp / B.maxHp)) : 0;
      lolHpFill.style.transform = `scaleX(${hpR})`;
      lolHpTxt.textContent = `${B.hp} / ${B.maxHp}`;
    } else {
      const hpR =
        h.maxHp > 0 ? Math.max(0, Math.min(1, h.hp / h.maxHp)) : 0;
      lolHpFill.style.transform = `scaleX(${hpR})`;
      lolHpTxt.textContent = `${h.hp} / ${h.maxHp}`;
    }
    const manaR =
      h.maxMana > 0 ? Math.max(0, Math.min(1, h.mana / h.maxMana)) : 0;
    lolManaFill.style.transform = `scaleX(${manaR})`;
    lolManaTxt.textContent = `${h.mana} / ${h.maxMana}`;
    let xpR = 1;
    if (Number.isFinite(h.xpToNext) && h.xpToNext > 0)
      xpR = Math.max(0, Math.min(1, h.xp / h.xpToNext));
    lolXpFill.style.transform = `scaleX(${xpR})`;
    lolXpTxt.textContent =
      !Number.isFinite(h.xpToNext) || h.xpToNext <= 0
        ? "XP —"
        : `${h.xp} / ${h.xpToNext} XP`;
    renderHeroStatsGrid(lolStatsGrid, heroStatCells(h, model));
    if (h.heroClass) {
      lolWeaponSlot.innerHTML = `<span class="lol-weapon-lvl-badge" aria-label="Nível da arma">${h.weaponLevel}</span>${hudWeaponIconSvg(h.heroClass)}`;
      lolWeaponSlot.style.display = "";
      lolWeaponSlot.setAttribute(
        "aria-label",
        "Esta é a arma principal do seu herói.",
      );
      bindGameTooltip(lolWeaponSlot, () =>
        tooltipPassiveHtml(
          "Arma principal",
          "Esta é a arma principal do seu herói.",
        ),
      );
    } else {
      clearGameTooltipHandlers(lolWeaponSlot);
      lolWeaponSlot.removeAttribute("aria-label");
      lolWeaponSlot.innerHTML = "";
      lolWeaponSlot.style.display = "none";
    }
    bindGameTooltip(lolPassiveSlot, () =>
      tooltipPassiveHtml("Passiva", combatPassiveDescription(h)),
    );
    bindGameTooltip(lolPortrait, () =>
      tooltipPassiveHtml(
        bunkHud ? "bunker" : tmpl.name,
        bunkHud
          ? `${tmpl.name} dentro do bunker — a barra verde mostra a vida da estrutura.`
          : isViewingActive
            ? "Herói ativo na ordem de jogada."
            : "Apenas visualização — não é o turno deste herói.",
      ),
    );

    const bb = el(
      combatSquareSkillHtml({
        disabled: !isViewingActive || model.basicLeft <= 0,
        iconHtml: basicAttackIconHtml(),
        hotkey: "Q",
        combatHotkey: "q",
        manaBadge: "0",
        ariaLabel: "Ataque básico",
        selectKind: "basic",
      }),
    );
    bindGameTooltip(bb, () => tooltipBasicAttack(h, model));
    bb.addEventListener("click", () => {
      if (!isViewingActive) return;
      cancelPendingOrDebouncedActivate(bb, () => {
        pendingCombat = { kind: "basic" };
        movePreviewActive = false;
        refreshOverlays();
        update();
      });
    });
    actionRow.appendChild(bb);

    const hotkeys = ["W", "E", "R", "D", "F", "G"];
    let hotkeyIdx = 0;
    const addSkillBtn = (
      id: string,
      name: string,
      cd: number,
      extraDisabled: boolean,
      skillDef: SkillDef,
    ) => {
      const cdEff = model.devSandboxMode ? 0 : cd;
      const dis = cdEff > 0 || extraDisabled || !isViewingActive;
      const key = hotkeys[hotkeyIdx++] ?? "?";
      const manaBadge = String(skillDef.manaCost ?? 0);
      const b = el(
        combatSquareSkillHtml({
          disabled: dis,
          iconHtml: skillButtonIconHtml(id),
          hotkey: key,
          combatHotkey: key.length === 1 && key !== "?" ? key.toLowerCase() : undefined,
          manaBadge,
          ariaLabel: ariaSkillLabel(name, cdEff),
          cdTurns: cdEff > 0 ? cdEff : undefined,
          selectKind: "skill",
          selectId: id,
        }),
      );
      bindGameTooltip(b, () => tooltipSkillById(h, model, skillDef));
      b.addEventListener("click", () => {
        if (!isViewingActive) return;
        cancelPendingOrDebouncedActivate(b, () => {
          pendingCombat = { kind: "skill", id };
          movePreviewActive = false;
          refreshOverlays();
          update();
        });
      });
      actionRow.appendChild(b);
    };

    const bunk = model.bunkerAtHex(h.q, h.r);
    const inBunker = !!bunk && bunk.occupantId === h.id;
    if (inBunker && bunk) {
      const cdM = model.devSandboxMode ? 0 : (h.skillCd["bunker_minas"] ?? 0);
      const keyW = hotkeys[hotkeyIdx++] ?? "W";
      const bMin = el(
        combatSquareSkillHtml({
          disabled: cdM > 0 || !isViewingActive,
          iconHtml: skillButtonIconHtml("bunker_minas"),
          hotkey: keyW,
          combatHotkey:
            keyW.length === 1 && keyW !== "?" ? keyW.toLowerCase() : undefined,
          manaBadge: "0",
          ariaLabel: ariaSkillLabel("Minas terrestres", cdM),
          cdTurns: cdM > 0 ? cdM : undefined,
          selectKind: "skill",
          selectId: "bunker_minas",
        }),
      );
      bindGameTooltip(bMin, () => tooltipBunkerMinasCombat(h, model));
      bMin.addEventListener("click", () => {
        if (!isViewingActive) return;
        cancelPendingOrDebouncedActivate(bMin, () => {
          pendingCombat = { kind: "skill", id: "bunker_minas" };
          movePreviewActive = false;
          refreshOverlays();
          update();
        });
      });
      actionRow.appendChild(bMin);
      if (bunk.tier >= 2) {
        const cdT = model.devSandboxMode
          ? 0
          : (h.skillCd["bunker_tiro_preciso"] ?? 0);
        const keyE = hotkeys[hotkeyIdx++] ?? "E";
        const bTiro = el(
          combatSquareSkillHtml({
            disabled: cdT > 0 || !isViewingActive,
            iconHtml: skillButtonIconHtml("bunker_tiro_preciso"),
            hotkey: keyE,
            combatHotkey:
              keyE.length === 1 && keyE !== "?" ? keyE.toLowerCase() : undefined,
            manaBadge: "0",
            ariaLabel: ariaSkillLabel("Tiro preciso", cdT),
            cdTurns: cdT > 0 ? cdT : undefined,
            selectKind: "skill",
            selectId: "bunker_tiro_preciso",
          }),
        );
        bindGameTooltip(bTiro, () => tooltipBunkerTiroCombat(h, model));
        bTiro.addEventListener("click", () => {
          if (!isViewingActive) return;
          cancelPendingOrDebouncedActivate(bTiro, () => {
            pendingCombat = { kind: "skill", id: "bunker_tiro_preciso" };
            movePreviewActive = false;
            refreshOverlays();
            update();
          });
        });
        actionRow.appendChild(bTiro);
      }
    } else {
      if (h.heroClass === "gladiador") {
        const inFuria = (h.furiaGiganteTurns ?? 0) > 0;
        if (inFuria) {
          const cd = model.devSandboxMode ? 0 : (h.skillCd["pisotear"] ?? 0);
          const mc = pisotearManaCost(h.weaponLevel);
          const dis =
            cd > 0 ||
            !isViewingActive ||
            (mc > 0 && h.maxMana > 0 && h.mana < mc);
          const key = hotkeys[hotkeyIdx++] ?? "?";
          const b = el(
            combatSquareSkillHtml({
              disabled: dis,
              iconHtml: skillButtonIconHtml("pisotear"),
              hotkey: key,
              combatHotkey:
                key.length === 1 && key !== "?" ? key.toLowerCase() : undefined,
              manaBadge: String(mc),
              ariaLabel: ariaSkillLabel("Pisotear", cd),
              cdTurns: cd > 0 ? cd : undefined,
            }),
          );
          bindGameTooltip(b, () => tooltipSkillPisotear(h, model));
          b.addEventListener("click", () => {
            if (!isViewingActive) return;
            if (!combatAbilityInputDebounce()) return;
            if (model.trySkill("pisotear")) {
              resetCombatSelection();
              refreshOverlays();
              update();
            }
          });
          actionRow.appendChild(b);
        } else {
          const sk0 = tmpl.skills[0]!;
          const skA: SkillDef = {
            id: "ate_a_morte",
            name: sk0.name,
            description: sk0.description,
            cooldownWaves: ateMorteCooldownWaves(h.weaponLevel),
            manaCost: ateMorteManaCost(h.weaponLevel),
          };
          const mc = ateMorteManaCost(h.weaponLevel);
          const noManaBlock =
            mc > 0 && h.maxMana > 0 && h.mana < mc;
          addSkillBtn(
            "ate_a_morte",
            skA.name,
            h.skillCd["ate_a_morte"] ?? 0,
            noManaBlock,
            skA,
          );
        }
      } else {
        for (const sk of tmpl.skills) {
          if (sk.id === "sentenca") {
            const sm = sentencaManaCost(h.weaponLevel);
            const cdS = model.devSandboxMode ? 0 : (h.skillCd[sk.id] ?? 0);
            const dis =
              cdS > 0 || h.mana < sm || !isViewingActive;
            const key = hotkeys[hotkeyIdx++] ?? "?";
            const manaBadge = String(sm);
            const b = el(
              combatSquareSkillHtml({
                disabled: dis,
                iconHtml: skillButtonIconHtml(sk.id),
                hotkey: key,
                combatHotkey:
                  key.length === 1 && key !== "?"
                    ? key.toLowerCase()
                    : undefined,
                manaBadge,
                ariaLabel: ariaSkillLabel(sk.name, cdS),
                cdTurns: cdS > 0 ? cdS : undefined,
              }),
            );
            bindGameTooltip(b, () => tooltipSkillById(h, model, sk));
            b.addEventListener("click", () => {
              if (!isViewingActive) return;
              if (!combatAbilityInputDebounce()) return;
              if (model.trySkill("sentenca")) {
                resetCombatSelection();
                refreshOverlays();
                update();
              }
            });
            actionRow.appendChild(b);
            continue;
          }
          const noMana = false;
          addSkillBtn(sk.id, sk.name, h.skillCd[sk.id] ?? 0, noMana, sk);
        }
      }

      if (
        h.heroClass === "sacerdotisa" ||
        h.heroClass === "pistoleiro" ||
        h.heroClass === "gladiador"
      ) {
        const cls = h.heroClass!;
        const ready = model.devSandboxMode || h.weaponUltMeter >= 1;
        const pct = Math.round(
          model.devSandboxMode ? 100 : h.weaponUltMeter * 100,
        );
        const keyU = hotkeys[hotkeyIdx++] ?? "T";
        const wname = weaponUltNamePt(cls);
        const wid = weaponUltIconId(cls);
        const bWU = el(
          combatSquareSkillHtml({
            disabled: !isViewingActive || !ready,
            iconHtml: skillButtonIconHtml(wid),
            hotkey: keyU,
            combatHotkey:
              keyU.length === 1 && keyU !== "?" ? keyU.toLowerCase() : undefined,
            manaBadge: "0",
            ariaLabel: wname,
            extraClass: `lol-skill-btn--weapon-ult ${ready ? "lol-skill-btn--weapon-ult--ready" : ""}`,
            extraStyle: `--weapon-ult-pct:${pct}`,
            ultFill: true,
          }),
        );
        bindGameTooltip(bWU, () => tooltipWeaponUltimate(h));
        bWU.addEventListener("click", () => {
          if (!isViewingActive || !ready) return;
          if (!combatAbilityInputDebounce()) return;
          if (model.tryWeaponUltimate()) {
            resetCombatSelection();
            refreshOverlays();
            update();
          }
        });
        actionRow.appendChild(bWU);
      }

      if (h.ultimateId === "especialista_destruicao") {
        const ult = HEROES.pistoleiro.ultimates.find(
          (u) => u.id === "especialista_destruicao",
        )!;
        const manaUlt = "0";
        const key = hotkeys[hotkeyIdx++] ?? "?";
        const bu = el(
          combatSquareSkillHtml({
            disabled: !isViewingActive,
            iconHtml: skillButtonIconHtml("especialista_destruicao"),
            hotkey: key,
            combatHotkey:
              key.length === 1 && key !== "?" ? key.toLowerCase() : undefined,
            manaBadge: manaUlt,
            ariaLabel: ult.name,
            selectKind: "skill",
            selectId: "especialista_destruicao",
          }),
        );
        bindGameTooltip(bu, () => tooltipEspecialista(h, model));
        bu.addEventListener("click", () => {
          if (!isViewingActive) return;
          cancelPendingOrDebouncedActivate(bu, () => {
            pendingCombat = { kind: "skill", id: "especialista_destruicao" };
            movePreviewActive = false;
            refreshOverlays();
            update();
          });
        });
        actionRow.appendChild(bu);
      }
    }

    refreshOverlays();
  };

  const COMBAT_ABILITY_INPUT_MS = 220;
  let lastCombatAbilityInputAt = 0;
  function combatAbilityInputDebounce(): boolean {
    const t = performance.now();
    if (t - lastCombatAbilityInputAt < COMBAT_ABILITY_INPUT_MS) return false;
    lastCombatAbilityInputAt = t;
    return true;
  }
  function pendingSelectMatchesBtn(btn: HTMLElement): boolean {
    const kind = btn.dataset.combatSelectKind;
    if (!kind) return false;
    if (kind === "basic") return pendingCombat?.kind === "basic";
    if (kind === "skill" && pendingCombat?.kind === "skill")
      return btn.dataset.combatSelectId === pendingCombat.id;
    return false;
  }
  function cancelPendingOrDebouncedActivate(
    btn: HTMLElement,
    activate: () => void,
  ): void {
    if (pendingSelectMatchesBtn(btn)) {
      resetCombatSelection();
      view.clearCameraFocus();
      refreshOverlays();
      update();
      return;
    }
    if (!combatAbilityInputDebounce()) return;
    activate();
  }
  function focusTurnHeroMovePreview(): void {
    const active = model.currentHero();
    if (!active || !active.heroClass || active.hp <= 0) return;
    combatLolInspectHeroId = null;
    combatInspectEnemyId = null;
    view.focusOnAxial(active.q, active.r, true);
    movePreviewActive = true;
    pendingCombat = null;
    refreshOverlays();
    update();
  }

  const chkSkipEnemy = combatAboveBar.querySelector(
    "#chk-skip-enemy-move",
  ) as HTMLInputElement | null;
  if (chkSkipEnemy) {
    chkSkipEnemy.checked = getSkipEnemyMoveAnim();
    chkSkipEnemy.addEventListener("change", () => {
      setSkipEnemyMoveAnim(chkSkipEnemy.checked);
    });
  }
  combatAboveBar.querySelector("#btn-cancel-sel")!.addEventListener("click", () => {
    resetCombatSelection();
    view.clearCameraFocus();
    refreshOverlays();
    update();
  });
  combatAboveBar.querySelector("#btn-end")!.addEventListener("click", () => {
    resetCombatSelection();
    model.endHeroTurn();
    update();
  });
  combatAboveBar
    .querySelector("#combat-artifacts-up")
    ?.addEventListener("click", () => {
      combatArtifactStripPage = Math.max(0, combatArtifactStripPage - 1);
      update();
    });
  combatAboveBar
    .querySelector("#combat-artifacts-down")
    ?.addEventListener("click", () => {
      combatArtifactStripPage = combatArtifactStripPage + 1;
      update();
    });
  document.getElementById("turn-order-prev")?.addEventListener("click", () => {
    combatTurnOrderUserAdjusted = true;
    combatTurnOrderPage = Math.max(0, combatTurnOrderPage - 1);
    update();
  });
  document.getElementById("turn-order-next")?.addEventListener("click", () => {
    combatTurnOrderUserAdjusted = true;
    combatTurnOrderPage = combatTurnOrderPage + 1;
    update();
  });

  document.addEventListener(
    "keydown",
    (ev: KeyboardEvent) => {
      if (ev.repeat || ev.ctrlKey || ev.metaKey || ev.altKey) return;
      const t = ev.target as HTMLElement | null;
      if (
        t &&
        (t.tagName === "INPUT" ||
          t.tagName === "TEXTAREA" ||
          t.tagName === "SELECT" ||
          t.isContentEditable)
      )
        return;
      if (runPauseOpen) return;
      if (model.phase !== "combat" || model.inEnemyPhase) return;
      if (model.hasPendingCombatSchedule()) return;
      if (view.isUnitMoveAnimating()) return;
      const ch = model.currentHero();
      if (!ch || ch.hp <= 0) return;

      if (ev.code === "Space" || ev.key === " ") {
        ev.preventDefault();
        focusTurnHeroMovePreview();
        return;
      }

      const k = ev.key.length === 1 ? ev.key.toLowerCase() : "";
      if (!k || !/^[a-z0-9]$/.test(k)) return;
      const row = document.getElementById("action-row");
      if (!row) return;
      const btn = row.querySelector(
        `button.btn[data-combat-hotkey="${k}"]:not([disabled])`,
      ) as HTMLButtonElement | null;
      if (!btn) return;
      if (pendingSelectMatchesBtn(btn)) {
        ev.preventDefault();
        resetCombatSelection();
        view.clearCameraFocus();
        refreshOverlays();
        update();
        return;
      }
      if (!combatAbilityInputDebounce()) {
        ev.preventDefault();
        return;
      }
      ev.preventDefault();
      btn.click();
    },
    { signal: combatInputSignal },
  );

  canvas.addEventListener(
    "pointerdown",
    () => {
      resumeWebAudio();
    },
    { signal: combatInputSignal },
  );

  update();

  canvas.onmousemove = (ev) => {
    if (model.phase === "combat") {
      const st = view.pickStatusTooltip(canvas, ev.clientX, ev.clientY);
      if (st) {
        const tip = getOrCreateGameTooltip();
        tip.innerHTML = st.html;
        tip.hidden = false;
        positionGameTooltip(tip, ev.clientX, ev.clientY);
        tip.classList.add("game-ui-tooltip--visible");
        clearBunkerHoverHint();
        return;
      }
      hideGameTooltip();
    }
    updateBunkerHoverHint(ev);
  };
  canvas.onmouseleave = () => {
    clearBunkerHoverHint();
    hideGameTooltip();
  };

  canvas.onclick = (ev) => {
    clearBunkerHoverHint();
    hideGameTooltip();
    if (view.consumeCameraDragClick()) return;
    const r = canvas.getBoundingClientRect();
    const x = ((ev.clientX - r.left) / r.width) * 2 - 1;
    const y = -((ev.clientY - r.top) / r.height) * 2 + 1;
    const active = model.currentHero();
    if (!active || model.phase !== "combat") return;
    if (view.isUnitMoveAnimating()) return;

    const hexAtPointer = view.pickHex(x, y, model.grid);
    if (combatInspectEnemyId != null && hexAtPointer != null) {
      combatInspectEnemyId = null;
      update();
    }

    const uid = view.pickUnit(x, y);

    const openMovePreviewIfPossible = (): void => {
      let show = false;
      if (model.movementLeft > 0) {
        const reach = model.reachableForCurrentHero();
        const cur = axialKey(active.q, active.r);
        for (const k of reach.keys()) {
          if (k !== cur) {
            show = true;
            break;
          }
        }
      }
      movePreviewActive = show;
    };

    const cancelPendingCombatToMove = (): void => {
      pendingCombat = null;
      combatInspectEnemyId = null;
      openMovePreviewIfPossible();
      view.focusOnAxial(active.q, active.r, true);
      refreshOverlays();
      update();
    };

    if (pendingCombat && uid === active.id) {
      cancelPendingCombatToMove();
      return;
    }

    const resolveLiveEnemyAtClick = (): string | null => {
      if (uid) {
        const u = model.units.find((z) => z.id === uid);
        if (u && !u.isPlayer && u.hp > 0) return uid;
      }
      const hex = view.pickHex(x, y, model.grid);
      if (!hex) return null;
      return model.liveEnemyIdAtHex(hex.q, hex.r);
    };

    if (pendingCombat?.kind === "basic") {
      const tid = resolveLiveEnemyAtClick();
      if (tid && model.validateEnemyForBasicAttack(tid)) {
        if (model.tryBasicAttack(tid)) {
          resetCombatSelection();
          update();
        }
        return;
      }
      const hex = view.pickHex(x, y, model.grid);
      if (!hex) {
        cancelPendingCombatToMove();
        return;
      }
      if (!model.getBasicAttackRangeHexKeys().has(axialKey(hex.q, hex.r))) {
        cancelPendingCombatToMove();
        return;
      }
      cancelPendingCombatToMove();
      return;
    }

    if (pendingCombat?.kind === "skill") {
      const sid = pendingCombat.id;
      if (sid === "atirar_todo_lado") {
        const hex = view.pickHex(x, y, model.grid);
        const onHex =
          hex && model.hexInSkillRange(sid, hex.q, hex.r);
        const onEnemy =
          uid &&
          model.units.find((u) => u.id === uid && !u.isPlayer) &&
          model.hexInSkillRange(
            sid,
            model.units.find((u) => u.id === uid)!.q,
            model.units.find((u) => u.id === uid)!.r,
          );
        if (onHex || onEnemy) {
          if (model.trySkill("atirar_todo_lado")) {
            resetCombatSelection();
            update();
          }
        } else {
          cancelPendingCombatToMove();
        }
        return;
      }
      if (sid === "ate_a_morte" || sid === "especialista_destruicao") {
        const tid = resolveLiveEnemyAtClick();
        if (tid && model.canSkillTargetEnemy(sid, tid)) {
          if (model.trySkill(sid, tid)) {
            resetCombatSelection();
            update();
          }
          return;
        }
        const hex = view.pickHex(x, y, model.grid);
        if (!hex || !model.hexInSkillRange(sid, hex.q, hex.r)) {
          cancelPendingCombatToMove();
          return;
        }
        cancelPendingCombatToMove();
        return;
      }
      if (sid === "bunker_tiro_preciso") {
        const tid = resolveLiveEnemyAtClick();
        if (tid && model.canSkillTargetEnemy(sid, tid)) {
          if (model.trySkill(sid, tid)) {
            resetCombatSelection();
            update();
          }
          return;
        }
        const hex = view.pickHex(x, y, model.grid);
        if (!hex || !model.hexInSkillRange(sid, hex.q, hex.r)) {
          cancelPendingCombatToMove();
          return;
        }
        cancelPendingCombatToMove();
        return;
      }
      if (sid === "bunker_minas") {
        const hex = view.pickHex(x, y, model.grid);
        const onHex = hex && model.hexInSkillRange(sid, hex.q, hex.r);
        if (onHex) {
          if (model.trySkill("bunker_minas")) {
            resetCombatSelection();
            update();
          }
        } else {
          cancelPendingCombatToMove();
        }
        return;
      }
      return;
    }

    if (uid) {
      const u = model.units.find((x) => x.id === uid);
      if (
        u?.isPlayer &&
        u.hp > 0 &&
        model.getParty().some((p) => p.id === u.id)
      ) {
        if (u.id !== active.id) {
          combatLolInspectHeroId = u.id;
          combatInspectEnemyId = null;
          view.focusOnAxial(u.q, u.r, true);
          update();
          return;
        }
      } else if (u && !u.isPlayer && u.hp > 0) {
        combatInspectEnemyId = uid;
        view.focusOnAxial(u.q, u.r);
        update();
        return;
      }
    }

    if (uid === active.id) {
      combatLolInspectHeroId = null;
      combatInspectEnemyId = null;
      view.focusOnAxial(active.q, active.r, true);
      movePreviewActive = true;
      pendingCombat = null;
      refreshOverlays();
      update();
      return;
    }

    const hex = view.pickHex(x, y, model.grid);
    if (hex && movePreviewActive) {
      const k = axialKey(hex.q, hex.r);
      const reach = model.reachableForCurrentHero();
      if (reach.has(k) && model.tryMoveHero(hex.q, hex.r)) {
        refreshOverlays();
        update();
      }
    }
  };
}

function showLevelPick(): void {
  hideGameTooltip();
  const p = model.pendingArtifacts!;
  const hero = model.units.find((x) => x.id === p.unitId);
  uiRoot.innerHTML = "";
  const heroLine = hero
    ? escapeHtml(hero.name)
    : "Herói";
  const s = el(`<div class="modal modal--crystal"><div class="modal-inner modal-inner--artifact-pick">
    <h2 class="crystal-modal-title">Escolha um artefato — ${heroLine}</h2>
    <p class="artifact-pick-hint">Passe o rato sobre a carta para ver o próximo nível.</p>
    <div class="artifact-pick-actions">
      <button type="button" class="btn" id="btn-artifact-reroll">Rerol (1)</button>
    </div>
    <div id="opts" class="artifact-pick-grid"></div>
  </div></div>`);
  uiRoot.appendChild(s);
  const btnReroll = s.querySelector("#btn-artifact-reroll") as HTMLButtonElement;
  if (p.rerollsLeft <= 0) {
    btnReroll.disabled = true;
    btnReroll.textContent = "Rerol usado";
  } else {
    btnReroll.addEventListener("click", () => {
      model.rerollArtifactPick();
      render();
    });
  }
  const opts = s.querySelector("#opts")!;
  for (const id of p.choices) {
    const stacks = hero?.artifacts[id] ?? 0;
    const max = id.startsWith("_pick") ? 1 : getArtifactMaxStacks(id);
    const afterPick = id.startsWith("_pick")
      ? 1
      : Math.min(max, stacks + 1);
    const tier = id.startsWith("_pick") ? "—" : `${afterPick}/${max}`;
    const dispName = pickChoiceDisplayName(id);
    const rare = pickChoiceRarity(id);
    const rCls = rare
      ? artifactRarityClass(rare)
      : "artifact-pick-card--special";
    const b = el(
      `<button type="button" class="artifact-pick-card ${rCls}" data-artifact="${escapeHtml(id)}">
        <span class="artifact-pick-card__tier">${tier}</span>
        <div class="artifact-pick-card__art">${artifactCardInnerHtml(id)}</div>
        <span class="artifact-pick-card__name">${escapeHtml(dispName)}</span>
      </button>`,
    );
    if (hero) {
      bindGameTooltip(b, () => artifactPickChoiceTooltip(id, hero));
    }
    b.addEventListener("click", () => {
      model.pickArtifact(id);
      render();
    });
    opts.appendChild(b);
  }
}

function showUltimatePick(): void {
  hideGameTooltip();
  const p = model.pendingUltimate!;
  const u = model.units.find((x) => x.id === p.unitId);
  uiRoot.innerHTML = "";
  const s = el(`<div class="modal modal--crystal"><div class="modal-inner modal-inner--ultimate-pick">
    <h2 class="crystal-modal-title">Forma final (nível 60) — Ultimate</h2>
    <div id="opts" class="ultimate-pick-list"></div>
  </div></div>`);
  uiRoot.appendChild(s);
  const opts = s.querySelector("#opts")!;
  const list =
    u?.heroClass === "pistoleiro"
      ? HEROES.pistoleiro.ultimates
      : u?.heroClass === "gladiador"
        ? HEROES.gladiador.ultimates
        : HEROES.sacerdotisa.ultimates;
  for (const ult of list) {
    const b = el(
      `<button type="button" class="btn ultimate-pick-option">${escapeHtml(ult.name)}<br/><small>${escapeHtml(ult.description)}</small></button>`,
    );
    b.addEventListener("click", () => {
      model.pickUltimate(ult.id);
      render();
    });
    opts.appendChild(b);
  }
}

function showVictory(): void {
  hideGameTooltip();
  uiRoot.innerHTML = "";
  const s = el(`
    <div class="screen screen--crystal-veil screen--victory-end">
      <h1 class="hero-setup-main-title">Vitória!</h1>
      <p class="crystal-endgame-copy">Zeraste a arena — wave ${FINAL_VICTORY_WAVE}.</p>
      <button class="btn btn-primary" id="ok">Menu</button>
    </div>`);
  uiRoot.appendChild(s);
  s.querySelector("#ok")!.addEventListener("click", () => {
    model.phase = "main_menu";
    render();
  });
}

function showDefeat(): void {
  hideGameTooltip();
  uiRoot.innerHTML = "";
  const s = el(`
    <div class="screen screen--crystal-veil screen--defeat-end">
      <h1 class="hero-setup-main-title">Derrota</h1>
      <p class="crystal-endgame-copy">Cristais salvos na conta.</p>
      <button class="btn btn-primary" id="ok">Menu</button>
    </div>`);
  uiRoot.appendChild(s);
  s.querySelector("#ok")!.addEventListener("click", () => {
    model.phase = "main_menu";
    render();
  });
}

let lastGlobalSynergySig = "";

/** Triângulo de sinergia no canto (com música): combate + loja de ouro. */
function syncGlobalSynergyTriangle(): void {
  const slot = document.getElementById("global-synergy-slot");
  if (!slot) return;
  const show =
    model.phase === "combat" ||
    model.phase === "shop_initial" ||
    model.phase === "shop_wave";
  if (!show) {
    slot.innerHTML = "";
    slot.hidden = true;
    lastGlobalSynergySig = "";
    return;
  }
  const sig = `${model.phase}:${model.runColors.join(",")}`;
  if (sig === lastGlobalSynergySig && slot.childElementCount > 0) {
    slot.removeAttribute("hidden");
    return;
  }
  lastGlobalSynergySig = sig;
  slot.innerHTML = "";
  slot.removeAttribute("hidden");
  mountReadOnlyColorTriangle(slot, model.runColors, bindGameTooltip);
}

/** Arena visível: manter meshes do bunker na loja e em overlays (não só em combat). */
function shouldShowBunkerMeshes(phase: GamePhase): boolean {
  return (
    phase === "combat" ||
    phase === "shop_wave" ||
    phase === "shop_initial" ||
    phase === "wave_summary" ||
    phase === "level_up_pick" ||
    phase === "ultimate_pick"
  );
}

function render(): void {
  if (!import.meta.env.DEV) {
    model.devSandboxMode = false;
  }
  if (
    import.meta.env.DEV &&
    model.devSandboxMode &&
    model.phase !== "main_menu"
  ) {
    model.applyDevSandboxBuffs();
  }
  if (model.phase !== "shop_wave" && model.phase !== "shop_initial") {
    refreshGoldShop = null;
  }
  if (model.phase !== "main_menu") {
    mainMenuSword3d?.dispose();
    mainMenuSword3d = null;
  }
  if (model.phase !== "crystal_shop") {
    crystalShop3d?.dispose();
    crystalShop3d = null;
  }
  if (
    (prevPhase === "shop_initial" || prevPhase === "shop_wave") &&
    model.phase !== "shop_initial" &&
    model.phase !== "shop_wave"
  ) {
    goldShopStall3d?.dispose();
    goldShopStall3d = null;
    goldShopBunker3d?.dispose();
    goldShopBunker3d = null;
    goldShopHeroPreview3d?.dispose();
    goldShopHeroPreview3d = null;
  }
  if (
    model.phase !== "combat" &&
    model.phase !== "shop_wave" &&
    model.phase !== "shop_initial"
  ) {
    removeEquipmentModal();
  }
  if (model.phase !== "combat") {
    combatHotkeysAbort?.abort();
    combatHotkeysAbort = null;
    killWaveIntroTimers();
    document.querySelectorAll(".wave-intro-overlay").forEach((n) => n.remove());
    resetCombatSelection();
  } else if (prevPhase !== "combat") {
    resetCombatSelection();
  }
  if (model.phase === "main_menu") {
    canvas.style.opacity = "0.35";
    showMainMenu();
  } else if (model.phase === "crystal_shop") {
    canvas.style.opacity = "0.35";
    showCrystalShop();
  } else if (model.phase === "setup_heroes") {
    canvas.style.opacity = "0.62";
    showHeroSetup();
  } else if (model.phase === "setup_biomes") {
    canvas.style.opacity = "0.62";
    showBiomeSetup();
  } else if (model.phase === "setup_colors") {
    canvas.style.opacity = "0.62";
    showColorSetup();
  } else if (model.phase === "shop_initial") {
    canvas.style.opacity = "0.35";
    if (prevPhase !== "shop_initial") goldShopHeroIndex = 0;
    showGoldShop(true);
  } else if (model.phase === "shop_wave") {
    canvas.style.opacity = "0.35";
    if (prevPhase !== "shop_wave") goldShopHeroIndex = 0;
    showGoldShop(false);
  } else if (model.phase === "wave_summary") {
    canvas.style.opacity = "1";
    showWaveSummaryOverlay();
  } else if (model.phase === "combat") {
    canvas.style.opacity = "1";
    showCombatHUD();
    if (prevPhase === "shop_initial" || prevPhase === "shop_wave") {
      requestAnimationFrame(() =>
        showWaveIntroOverlay(model.wave, () =>
          model.releaseEnemyPhaseAfterWaveIntro(),
        ),
      );
    }
  } else if (model.phase === "level_up_pick") {
    showLevelPick();
  } else if (model.phase === "ultimate_pick") {
    showUltimatePick();
  } else if (model.phase === "victory") {
    canvas.style.opacity = "0.4";
    showVictory();
  } else if (model.phase === "defeat") {
    canvas.style.opacity = "0.4";
    showDefeat();
  }

  const mv = model.takePendingMoveAnimation();
  if (mv) {
    const segMs = mv.segmentMs ?? UNIT_MOVE_SEGMENT_MS;
    view.queueUnitMoveAlongCells(mv.unitId, mv.cells, mv.segmentMs);
    const segs = Math.max(0, mv.cells.length - 1);
    const totalMs = segs * segMs;
    const dest = mv.cells[mv.cells.length - 1];
    if (dest && model.phase === "combat") {
      const b = model.bunkerAtHex(dest.q, dest.r);
      if (b && b.hp > 0) {
        view.scheduleHeroHideInBunkerAfterMove(mv.unitId, totalMs);
        // SFX deve tocar quando a animação realmente chegar ao bunker.
        window.setTimeout(() => {
          if (model.phase !== "combat") return;
          const hero = model.units.find((u) => u.id === mv.unitId);
          const bunk = model.bunkerAtHex(dest.q, dest.r);
          if (!hero || hero.hp <= 0) return;
          if (!bunk || bunk.hp <= 0) return;
          if (hero.q !== dest.q || hero.r !== dest.r) return;
          playWeaponsCock();
        }, totalMs + 10);
      }
    }
    if (totalMs > 0) {
      window.setTimeout(() => {
        render();
      }, totalMs + 20);
    }
  }
  view.syncUnits(
    model.units,
    model.phase === "combat" ? model.wave : null,
  );
  const showBunkers = shouldShowBunkerMeshes(model.phase);
  view.setBunkers(
    showBunkers ? model.bunkersForRender() : null,
    showBunkers,
  );
  applyCombatOverlays();
  view.setCameraInputEnabled(model.phase === "combat" && !runPauseOpen);

  /** Run ativa: manter música da arena (evita cair no tema do menu entre waves / loja). */
  const arenaMusicPhase =
    model.phase === "combat" ||
    model.phase === "level_up_pick" ||
    model.phase === "ultimate_pick" ||
    model.phase === "wave_summary" ||
    model.phase === "shop_initial" ||
    model.phase === "shop_wave";

  if (arenaMusicPhase) {
    pauseMenuTheme();
    setArenaCombatMusicFromWave(model.wave);
  } else {
    stopArenaAmbient();
    ensureMenuThemePlaying();
  }

  syncGlobalSynergyTriangle();

  prevPhase = model.phase;
}

model.subscribe(() => {
  if (
    model.phase === "shop_wave" &&
    (prevPhase === "combat" || prevPhase === "wave_summary")
  ) {
    view.burstRoses();
  }
  render();
  let combatHudNeedsRefresh = false;
  if (model.phase === "combat") {
    if (
      model.consumePlayerTurnJustStarted() &&
      !model.inEnemyPhase
    ) {
      const ch = model.currentHero();
      if (ch && ch.hp > 0) {
        combatLolInspectHeroId = null;
        view.snapCameraToAxial(ch.q, ch.r);
        movePreviewActive = true;
        pendingCombat = null;
        combatInspectEnemyId = null;
        applyCombatOverlays();
        combatHudNeedsRefresh = true;
      }
    } else if (model.inEnemyPhase && model.lastEnemyActedId) {
      const eu = model.units.find((x) => x.id === model.lastEnemyActedId);
      if (eu && eu.hp > 0) view.focusOnAxial(eu.q, eu.r);
    }
  }
  if (combatHudNeedsRefresh) render();
});

function loop(): void {
  if (model.phase === "combat") {
    if (!runPauseOpen) {
      model.tickCombatSchedule();
      for (const vfxHint of model.takeCombatVfxHints()) {
        applyCombatVfxHint(vfxHint);
      }
    }
    const vh = lolViewedHero(model);
    view.setCombatSelectionUnitId(
      vh && vh.isPlayer && vh.hp > 0 ? vh.id : null,
    );
  } else {
    view.setCombatSelectionUnitId(null);
  }
  const pops =
    model.phase === "combat" && !runPauseOpen
      ? model.takeCombatFloats()
      : [];
  for (const p of pops) {
    if (p.kind === "damage" || p.kind === "shield_absorb") {
      if (p.unitId === BUNKER_COMBAT_FLOAT_ID && p.bunkerHex) {
        view.triggerBunkerHitFlashAt(p.bunkerHex.q, p.bunkerHex.r);
      } else if (p.kind === "damage" && p.poisonDot) {
        /* DoT de veneno: só float roxo, sem flash/som de golpe */
      } else if (p.kind === "damage" && p.duelCut) {
        view.triggerUnitHitFlash(p.unitId, p.targetIsPlayer ?? false, "blood");
        playKnifeCut();
      } else if (p.kind === "damage") {
        view.triggerUnitHitFlash(p.unitId, p.targetIsPlayer ?? false);
        if (!model.duel && p.sourceClass && !p.suppressSourceHitSfx) {
          if (p.sourceClass === "gladiador") playSwordHit();
          else if (p.sourceClass === "pistoleiro") playGunshot();
          else if (p.sourceClass === "sacerdotisa") playMagicWhoosh();
        }
      } else {
        view.triggerUnitHitFlash(p.unitId, p.targetIsPlayer ?? false);
      }
    }
  }
  view.tick();
  for (const p of pops) {
    let pos =
      p.unitId === BUNKER_COMBAT_FLOAT_ID && p.bunkerHex
        ? view.worldBunkerTopToScreen(canvas, p.bunkerHex.q, p.bunkerHex.r)
        : p.unitId === BUNKER_COMBAT_FLOAT_ID
          ? view.worldBunkerTopToScreen(canvas)
          : view.worldUnitHeadToScreen(canvas, p.unitId);
    if (!pos && p.floatHex) {
      pos = view.worldAxialHeadToScreen(canvas, p.floatHex.q, p.floatHex.r);
    }
    if (!pos) continue;
    let ox = 0;
    let oy = 0;
    if (p.kind === "shield_absorb") {
      ox = 24;
      oy = 14;
    } else if (p.kind === "mana") {
      ox = 10;
      oy = 20;
    } else if (p.kind === "heal") {
      ox = -8;
      oy = 6;
    } else if (p.kind === "shield_gain") {
      ox = 16;
      oy = -10;
    }
    spawnCombatFloat(pos.x + ox, pos.y + oy, p.amount, p);
  }
  requestAnimationFrame(loop);
}
function isTextInputTarget(t: EventTarget | null): boolean {
  return (
    t instanceof HTMLInputElement ||
    t instanceof HTMLTextAreaElement ||
    t instanceof HTMLSelectElement
  );
}

let equipmentModalOpen = false;
const equipmentModalPiecePreviews: ForgePiecePreview3D[] = [];

function removeEquipmentModal(): void {
  for (const p of equipmentModalPiecePreviews) p.dispose();
  equipmentModalPiecePreviews.length = 0;
  document.getElementById("equipment-modal-root")?.remove();
  equipmentModalOpen = false;
}

function equipmentModalPieceCellHtml(
  forgeHi: 0 | 1 | 2,
  kind: ForgeSlotKind,
  L: ForgeHeroLoadout,
  uniqBase: number,
): string {
  const title = forgePieceLabelPt(kind);
  const piece = L[kind] as ForgePiece | undefined;
  if (!piece) {
    return `<div class="eq-piece-cell eq-piece-cell--empty" data-eq-hero="${forgeHi}" data-eq-kind="${kind}">
      <div class="eq-piece-3d-host eq-piece-3d-host--empty" aria-hidden="true"><span class="eq-piece-3d-placeholder">—</span></div>
      <div class="eq-piece-meta">
        <span class="eq-piece-title">${escapeHtml(title)}</span>
        <span class="eq-piece-biome eq-piece-biome--empty">Sem peça forjada</span>
      </div>
      <div class="eq-piece-stats eq-piece-stats--empty"><p class="eq-piece-stats-empty-msg">Slot vazio na forja.</p></div>
    </div>`;
  }
  const bio = FORGE_ESSENCE_LABELS[piece.biome];
  const fx = forgePieceEffectHtml(kind, piece.level, uniqBase, piece.biome);
  return `<div class="eq-piece-cell eq-piece-cell--forge-tier-${piece.level}" data-eq-hero="${forgeHi}" data-eq-kind="${kind}">
    <div class="eq-piece-3d-host" data-eq-3d="1" aria-hidden="true"></div>
    <div class="eq-piece-meta">
      <span class="eq-piece-title">${escapeHtml(title)} · nv ${piece.level}</span>
      <span class="eq-piece-biome">${escapeHtml(bio)}</span>
    </div>
    <div class="eq-piece-stats">${fx}</div>
  </div>`;
}

function openEquipmentModal(): void {
  removeEquipmentModal();
  equipmentModalOpen = true;
  normalizeForgeMeta(model.meta);
  const party = model.getParty();
  const cols =
    party.length === 0
      ? [
          `<p class="equipment-modal__empty">Nenhum herói na run. Inicie uma partida para ver equipamentos.</p>`,
        ]
      : party.map((u, i) => {
          const forgeHi = (u.partySlotIndex ?? i) as 0 | 1 | 2;
          const L = resolveEquippedForgeLoadoutForMeta(model.meta, forgeHi);
          const piecesRow = FORGE_KIND_ORDER.map((kind, ki) =>
            equipmentModalPieceCellHtml(forgeHi, kind, L, forgeHi * 36 + ki * 12),
          ).join("");
          return `<div class="eq-hero-col">
      <h3>${escapeHtml(u.name)}</h3>
      <div class="eq-hero-synergy" data-eq-hero="${forgeHi}">${forgeSynergyPanelHtml(L)}</div>
      <div class="eq-hero-pieces-row" role="group" aria-label="Peças forjadas">${piecesRow}</div>
    </div>`;
        });
  const backdrop = el(`
    <div id="equipment-modal-root" class="equipment-modal-backdrop" role="dialog" aria-modal="true" aria-label="Equipamentos">
      <div class="equipment-modal equipment-modal--pieces">
        <h2>Equipamentos forjados</h2>
        <p class="equipment-modal__hint">Sinergias em cima: só biomas da combinação equipada (só nv 3 contam para o tier). Abaixo: efeito de cada peça equipada. Passe o rato no brasão para detalhes.</p>
        <div class="equipment-modal__cols">${cols.join("")}</div>
        <button type="button" class="btn" id="equipment-modal-close">Fechar (I)</button>
      </div>
    </div>
  `);
  uiRoot.appendChild(backdrop);
  backdrop.addEventListener("click", (ev) => {
    if (ev.target === backdrop) removeEquipmentModal();
  });
  backdrop.querySelector("#equipment-modal-close")!.addEventListener("click", () => {
    removeEquipmentModal();
  });

  backdrop.querySelectorAll(".eq-piece-3d-host[data-eq-3d='1']").forEach((node) => {
    const host = node as HTMLElement;
    const cell = host.closest(".eq-piece-cell") as HTMLElement | null;
    if (!cell) return;
    const hi = Number(cell.dataset.eqHero) as 0 | 1 | 2;
    const kind = cell.dataset.eqKind as ForgeSlotKind;
    const piece = resolveEquippedForgeLoadoutForMeta(model.meta, hi)[kind];
    if (!piece) return;
    const prev = new ForgePiecePreview3D(host);
    prev.setKindAndPiece(kind, piece.biome, piece.level);
    prev.start();
    equipmentModalPiecePreviews.push(prev);
  });

  bindForgeStatInlineTooltips(backdrop);

  backdrop.querySelectorAll(".eq-hero-synergy").forEach((wrap) => {
    const w = wrap as HTMLElement;
    const hi = Number(w.dataset.eqHero) as 0 | 1 | 2;
    const Lsyn = resolveEquippedForgeLoadoutForMeta(model.meta, hi);
    w.querySelectorAll(".forge-syn-card").forEach((node) => {
      const card = node as HTMLElement;
      const biome = card.dataset.biome as ForgeEssenceId | undefined;
      const crest = card.querySelector(
        ".forge-biome-crest-wrap",
      ) as HTMLElement | null;
      if (!biome || !crest) return;
      bindGameTooltip(crest, () =>
        forgeSynergyCrestTooltipHtml(biome, forgeSynergyTier(Lsyn, biome)),
      );
    });
  });
}

function toggleEquipmentModal(): void {
  if (equipmentModalOpen) removeEquipmentModal();
  else openEquipmentModal();
}

function isRunPhaseForPauseMenu(phase: GamePhase): boolean {
  return (
    phase === "shop_initial" ||
    phase === "shop_wave" ||
    phase === "combat" ||
    phase === "wave_summary" ||
    phase === "level_up_pick" ||
    phase === "ultimate_pick"
  );
}

function isCrystalSelectListOpen(): boolean {
  return document.querySelector(".crystal-select__list:not([hidden])") != null;
}

function syncRunPausePanels(): void {
  if (!runPauseEl) return;
  const menu = runPauseEl.querySelector(".run-pause-step--menu") as
    | HTMLElement
    | null;
  const confirm = runPauseEl.querySelector(".run-pause-step--confirm") as
    | HTMLElement
    | null;
  if (!menu || !confirm) return;
  const onMenu = runPauseStep === "menu";
  menu.hidden = !onMenu;
  confirm.hidden = onMenu;
  runPauseEl.setAttribute("aria-label", onMenu ? "Pausa" : "Confirmar saída");
}

function closeRunPauseMenu(): void {
  if (!runPauseOpen) return;
  runPauseOpen = false;
  runPauseStep = "menu";
  runPauseEl?.remove();
  runPauseEl = null;
  view.setCameraInputEnabled(model.phase === "combat");
}

function openRunPauseMenu(): void {
  if (!isRunPhaseForPauseMenu(model.phase) || runPauseOpen) return;
  runPauseOpen = true;
  runPauseStep = "menu";
  hideGameTooltip();
  view.setCameraInputEnabled(false);

  const backdrop = document.createElement("div");
  backdrop.id = "run-pause-backdrop";
  backdrop.className = "run-pause-backdrop";
  backdrop.setAttribute("role", "dialog");
  backdrop.setAttribute("aria-modal", "true");
  backdrop.setAttribute("aria-label", "Pausa");
  backdrop.innerHTML = `
    <div class="run-pause-panel game-ui-tooltip-inner">
      <div class="run-pause-step run-pause-step--menu">
        <h2 class="run-pause-title">Pausa</h2>
        <div class="run-pause-actions">
          <button type="button" class="btn btn-primary" id="run-pause-continue">Continuar</button>
          <button type="button" class="btn" id="run-pause-exit">Sair</button>
        </div>
      </div>
      <div class="run-pause-step run-pause-step--confirm" hidden>
        <p class="run-pause-warning">Suas essências e diamantes serão perdidos. Você tem certeza?</p>
        <div class="run-pause-actions run-pause-actions--confirm">
          <button type="button" class="btn btn-primary" id="run-pause-confirm-yes">Sim</button>
          <button type="button" class="btn" id="run-pause-confirm-no">não</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(backdrop);
  runPauseEl = backdrop;

  backdrop.querySelector("#run-pause-continue")!.addEventListener("click", () => {
    playUiClick();
    closeRunPauseMenu();
  });
  backdrop.querySelector("#run-pause-exit")!.addEventListener("click", () => {
    playUiClick();
    runPauseStep = "confirm";
    syncRunPausePanels();
  });
  backdrop.querySelector("#run-pause-confirm-no")!.addEventListener("click", () => {
    playUiClick();
    runPauseStep = "menu";
    syncRunPausePanels();
  });
  backdrop.querySelector("#run-pause-confirm-yes")!.addEventListener("click", () => {
    playUiClick();
    model.forfeitRunToMainMenu();
    closeRunPauseMenu();
    if (equipmentModalOpen) removeEquipmentModal();
    render();
  });

  backdrop.addEventListener("click", (ev) => {
    if (ev.target !== backdrop) return;
    playUiClick();
    if (runPauseStep === "confirm") {
      runPauseStep = "menu";
      syncRunPausePanels();
    } else {
      closeRunPauseMenu();
    }
  });

  syncRunPausePanels();
}

document.addEventListener(
  "keydown",
  (ev: KeyboardEvent) => {
    if (ev.key !== "Escape") return;
    if (ev.repeat) return;
    if (isTextInputTarget(ev.target)) return;
    if (isCrystalSelectListOpen()) return;

    if (equipmentModalOpen) {
      removeEquipmentModal();
      ev.preventDefault();
      return;
    }

    if (runPauseOpen) {
      if (runPauseStep === "confirm") {
        runPauseStep = "menu";
        syncRunPausePanels();
      } else {
        closeRunPauseMenu();
      }
      ev.preventDefault();
      return;
    }

    if (!isRunPhaseForPauseMenu(model.phase)) return;

    openRunPauseMenu();
    ev.preventDefault();
  },
  true,
);

document.addEventListener("keydown", (ev) => {
  if (ev.key !== "i" && ev.key !== "I") return;
  if (isTextInputTarget(ev.target)) return;
  if (
    model.phase !== "combat" &&
    model.phase !== "shop_wave" &&
    model.phase !== "shop_initial"
  ) {
    return;
  }
  toggleEquipmentModal();
  ev.preventDefault();
});

document.addEventListener(
  "click",
  (ev) => {
    const t = ev.target as HTMLElement | null;
    if (!t) return;
    const hit = t.closest("button, .btn, [role='button']");
    if (!hit) return;
    if (hit instanceof HTMLInputElement && hit.type === "checkbox") return;
    if (hit instanceof HTMLButtonElement && hit.disabled) return;
    if (hit.closest("#game-canvas")) return;
    playUiClick();
  },
  true,
);

initMusicVolumeControl();

loop();

render();
