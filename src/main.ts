import "./style.css";
import { APP_VERSION_LABEL } from "./version";
import {
  BUNKER_COMBAT_FLOAT_ID,
  GameModel,
  garraFerroRawBonusFromDefesaAndStacks,
  heroDanoPlusRoninFromBaseline,
  heroDanoPlusRoninOverflow,
  type CombatFloatEvent,
  type CombatVfxHint,
} from "./game/gameModel";
import { GameRenderer } from "./render/GameRenderer";
import { preloadArenaColiseumGlb } from "./render/arenaColiseumGlb";
import { preloadBunkerGlbs } from "./render/bunkerGlbLoader";
import { preloadForgePieceGlbs } from "./render/forgePieceGlb";
import { preloadAllHeroGlbs } from "./render/heroGlbLoader";
import { HeroPreview3D } from "./render/HeroPreview3D";
import {
  heroPreviewCameraBiomeInitial,
  heroPreviewCameraGoldShopSolo,
  heroPreviewCameraGoldShopTurntable,
  heroPreviewCameraSetupSlotCard,
} from "./render/heroPreviewCameraPresets";
import { MainMenuSword3D } from "./render/MainMenuSword3D";
import { BiomePicker3D } from "./render/BiomePicker3D";
import { ShopStall3D } from "./render/ShopStall3D";
import { CrystalShop3D } from "./render/CrystalShop3D";
import { BunkerPreview3D } from "./render/BunkerPreview3D";
import { ForgePiecePreview3D } from "./render/ForgePiecePreview3D";
import {
  EquipmentLayoutEditor,
  type ForgeEditSlot,
} from "./render/EquipmentLayoutEditor";
import {
  clearAllForgeEquipmentLayoutPrefs,
  loadForgeEquipmentLayoutPrefs,
} from "./render/forgeEquipmentLayoutPrefs";
import {
  CRYSTAL_SHOP_ALCANCE_COST,
  CRYSTAL_SHOP_ALCANCE_MAX,
  CRYSTAL_SHOP_EXTRA_BASIC_COST,
  CRYSTAL_SHOP_EXTRA_BASIC_MAX,
  CRYSTAL_SHOP_SORTE_COST,
  CRYSTAL_SHOP_SORTE_MAX,
  CRYSTAL_SHOP_SORTE_PER_BUY,
  META_TRACK_MAX_LEVEL,
  type GamePhase,
  type HeroClassId,
  type TeamColor,
  type BiomeId,
  type Unit,
  type WeaponLevel,
} from "./game/types";
import type { SkillDef } from "./game/data/heroes";
import { HEROES } from "./game/data/heroes";
import { BIOME_DESCRIPTIONS, BIOME_LABELS } from "./game/data/biomes";
import {
  GOLD_SHOP,
  goldDrainPerTurn,
  goldShopBatchAffordable,
  goldShopBatchLabel,
  goldShopUnitCost,
  type GoldShopBatchSize,
  type GoldShopId,
} from "./game/data/shops";
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
  artifactRaritySlotsStripHtml,
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
  teamColorCss,
} from "./ui/colorTriangle";
import { initMusicVolumeControl } from "./ui/musicVolumeControl";
import { initSfxVolumeControl } from "./ui/sfxVolumeControl";
import { mountCrystalSelect } from "./ui/crystalSelect";
import { biomeCrestWrap } from "./ui/biomeCrests";
import { axialKey, hexDistance } from "./game/hex";
import {
  permPercent,
  nextMetaCost,
  nextInitialCardCost,
  clearAllLocalProgressForFreshStart,
} from "./game/metaStore";
import { buildHeroSetupStatPreview } from "./game/unitFactory";
import {
  clearRunSessionCheckpoint,
  readRunSessionCheckpointJson,
  runPhaseAllowsRunSessionPersistence,
  writeRunSessionCheckpointJson,
} from "./game/runSessionRecovery";
import {
  damageReductionPercentFromDefense,
  effectiveDefenseForBiome,
  effectiveAlcanceForBiome,
  formatCombatFloatAmount,
  roundToCombatDecimals,
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
  COLISEUMS,
  coliseumDefinition,
  coliseumRunWaveTaglinePt,
  coliseumTierEnemyMultiplier,
  coliseumTitleAtRunWave,
  FORMA_FINAL_LEVEL,
  type ColiseumTierId,
  waveIndexWithinColiseumPhase,
} from "./game/data/coliseums";
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
import {
  ARTIFACT_PICK_PAID_CHARGES_MAX,
  ARTIFACT_PICK_PAID_CRYSTAL_COST,
} from "./game/types";
import {
  bleedInstanceCount,
  dotTickConsumeCount,
  hotInstanceCount,
  poisonInstanceCount,
  sumNextBleedTickDamage,
  sumNextHotTickHeal,
  sumNextPoisonTickDamage,
} from "./game/dotInstances";
import {
  bravuraInstancesCount,
  deslumbroInstancesCount,
} from "./game/effectInstances";
import { biomeAt, effectiveEnemyBaseDefesa } from "./game/unitFactory";
import { HERO_STAT_TIP } from "./ui/heroStatRichText";
import {
  combatHeroStatTooltip,
  formatOuroDisplay,
  formatTooltipNumber,
  setupHeroStatTooltip,
} from "./ui/heroStatTooltips";
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
  playTiroDestruidorLaser,
  playEscravoChainSlash,
  playMortarImpact,
  playMortarLaunch,
  playSwordHit,
  playInputError,
  playUiClick,
  playWeaponsCock,
  playTeleportWhoosh,
  playLightningStrike,
  resume as resumeWebAudio,
} from "./audio/combatSounds";
import { setArenaCombatMusicFromWave, stopArenaAmbient } from "./audio/arenaAmbient";
import { ensureMenuThemePlaying, pauseMenuTheme } from "./audio/menuAmbient";
import {
  getSkipAlliedCombatAnimations,
  getSkipEnemyCombatAnimations,
  setSkipAlliedCombatAnimations,
  setSkipEnemyCombatAnimations,
} from "./game/combatPrefs";
import {
  getSandboxNoCdUltReady,
  setSandboxNoCdUltReady,
} from "./game/sandboxPrefs";
import {
  initSceneLayoutPrefsFromDeploy,
  loadSceneLayoutPrefs,
} from "./game/sceneLayoutPrefs";
import { initForgeEquipmentLayoutPrefsFromDeploy } from "./render/forgeEquipmentLayoutPrefs";
import { UNIT_MOVE_SEGMENT_MS } from "./game/combatTiming";
import { heroAttackClipName } from "./game/heroCombatAnimMs";
import {
  BUNKER_AUTO_REPAIR_GOLD,
  BUNKER_AUTO_REPAIR_HP_PER_RANK,
  BUNKER_AUTO_REPAIR_MAX_RANK,
  BUNKER_AUTO_REPAIR_MIN_TIER,
  BUNKER_EVOLVE_COSTS,
  BUNKER_FORTIFY_GOLD,
  BUNKER_FORTIFY_MAX_BUYS_PER_WAVE,
  BUNKER_FORTIFY_MIN_TIER,
  BUNKER_FORTIFY_SHIELD,
  BUNKER_TIRO_MIN_TIER,
  bunkerDisplayLevel,
  bunkerMinasCooldownWaves,
  bunkerMinasDamageMult,
  bunkerMinasMaxRing,
  bunkerStatsForTier,
  bunkerTiroCooldownWaves,
  effectiveBunkerTier,
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
/** Paginação dos artefatos na loja de ouro (6 por página). */
const GOLD_SHOP_ARTIFACT_PAGE_SIZE = 6;
/** Paginação da ordem de turnos (10 por página). */
const COMBAT_TURN_ORDER_PAGE_SIZE = 10;
let combatArtifactStripPage = 0;
let combatArtifactStripSig = "";
let goldShopArtifactPage = 0;
let goldShopArtifactSig = "";
let combatTurnOrderPage = 0;
let combatTurnOrderUserAdjusted = false;
let combatLastTurnFocusKey = "";

const uiRoot = document.getElementById("ui-root")!;
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const damageFloatLayer = document.getElementById("damage-float-layer")!;

const model = new GameModel();
const view = new GameRenderer(canvas);

view.setOnArenaLayoutSessionEnd(() => {
  queueMicrotask(() => {
    if (model.phase === "main_menu") render();
  });
});

function ensureArenaLayoutEnemySelectOptions(sel: HTMLSelectElement): void {
  if (sel.options.length > 0) return;
  for (const e of allEnemyArchetypesSorted()) {
    const opt = document.createElement("option");
    opt.value = e.id;
    opt.textContent = e.compendiumTag
      ? `${e.name} — ${e.compendiumTag}`
      : e.name;
    sel.appendChild(opt);
  }
}

function refreshArenaLayoutEditSidebar(): void {
  if (!view.isArenaLayoutEditActive()) return;
  const hint = document.getElementById("arena-layout-dynamic-hint");
  if (hint) hint.textContent = view.getArenaLayoutEditSelectionHint();
  const wrap = document.getElementById("arena-layout-enemy-picker-wrap");
  const sel = document.getElementById(
    "arena-layout-enemy-select",
  ) as HTMLSelectElement | null;
  if (!wrap || !sel) return;
  const show = view.isArenaLayoutEnemySelected();
  wrap.hidden = !show;
  wrap.setAttribute("aria-hidden", show ? "false" : "true");
  if (!show) return;
  ensureArenaLayoutEnemySelectOptions(sel);
  const pid = view.getArenaLayoutEnemyPreviewArchetypeId();
  let found = false;
  for (let i = 0; i < sel.options.length; i++) {
    if (sel.options[i]!.value === pid) {
      sel.selectedIndex = i;
      found = true;
      break;
    }
  }
  if (!found && sel.options.length) sel.selectedIndex = 0;
}

view.setOnArenaLayoutEditUiRefresh(() => {
  queueMicrotask(() => {
    refreshArenaLayoutEditSidebar();
  });
});

view.setOnLayoutEnemyMeshSyncNeeded(() => {
  if (
    import.meta.env.DEV &&
    model.phase === "main_menu" &&
    view.isArenaLayoutEditActive()
  ) {
    view.syncUnits(model.layoutEditorSyntheticUnits(), null);
  }
});

view.buildHexGrid(model.grid);

Promise.all([
  preloadAllHeroGlbs(),
  preloadForgePieceGlbs(),
  preloadArenaColiseumGlb(),
  preloadBunkerGlbs(),
]).then(async () => {
  await Promise.all([
    initSceneLayoutPrefsFromDeploy(),
    initForgeEquipmentLayoutPrefsFromDeploy(),
  ]);
  view.attachArenaColiseumDecoration();
  view.applySceneLayoutPrefs(loadSceneLayoutPrefs());
  render();
});

type Setup = {
  /** Três slots; `null` = vazio. */
  slots: [HeroClassId | null, HeroClassId | null, HeroClassId | null];
  biomes: BiomeId[];
  /** Sempre 3 cores (sinergia do grupo), independentemente do nº de heróis. */
  colors: TeamColor[];
  coliseumTier: ColiseumTierId;
};

const setup: Setup = {
  slots: [null, null, null],
  biomes: [],
  colors: ["azul", "verde", "vermelho"],
  coliseumTier: 1,
};

/** Um preview por slot (0–2); `render()` no select apagava o `ui-root` inteiro → flash / preview escuro. */
const heroSetupPreviewBySlot: (HeroPreview3D | null)[] = [null, null, null];

function disposeHeroSetupPreviews(): void {
  for (let si = 0; si < 3; si++) {
    heroSetupPreviewBySlot[si]?.dispose();
    heroSetupPreviewBySlot[si] = null;
  }
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
/** Evita rajada de whoosh quando várias bolas de vento disparam em sequência. */
let lastAnelDragaoAirWhooshAt = 0;

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
  const skipAllyVfx = getSkipAlliedCombatAnimations();
  switch (h.kind) {
    case "atirar_todo_lado":
      if (!skipAllyVfx) {
        view.triggerRadialShotVfx(h.heroId);
        playGunVolley(Math.min(14, Math.max(4, Math.ceil(h.shotCount / 3))), 46);
        for (let i = 0; i < h.targetIds.length; i++) {
          const tid = h.targetIds[i]!;
          window.setTimeout(
            () => view.spawnComicPowImpactOnUnit(tid),
            ATIRAR_FIRST_DAMAGE_MS + i * ATIRAR_STAGGER_MS,
          );
        }
      }
      break;
    case "duel_start":
      view.setDuelFlameAura(h.gladiadorId, true);
      break;
    case "duel_end":
      view.setDuelFlameAura(h.gladiadorId, false);
      break;
    case "sentenca":
      if (!skipAllyVfx) {
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
      }
      break;
    case "espinhos_gelados_spike":
      if (!skipAllyVfx) {
        view.queueIceSpikeProjectile(h.fromId, h.toId, 0.32);
        playMagicWhoosh();
      }
      break;
    case "basic_projectile": {
      const flightMs =
        h.flightMs ??
        (h.style === "bullet"
          ? BASIC_PISTOL_FLIGHT_MS
          : BASIC_MAGIC_FLIGHT_MS);
      view.queueDamageProjectile(h.fromId, h.toId, {
        style: h.style,
        durationSec: flightMs / 1000,
      });
      if (!skipAllyVfx) {
        if (h.style === "bullet") {
          view.playHeroCombatClip(h.fromId, [
            heroAttackClipName("pistoleiro"),
            "shoot",
            "fire",
            "shot",
          ]);
        } else if (h.style !== "air") {
          view.playHeroCombatClip(h.fromId, [
            heroAttackClipName("sacerdotisa"),
            "cast",
            "spell",
            "magic",
            "attack",
          ]);
        }
      }
      if (!skipAllyVfx) {
        if (h.style === "bullet") playGunshot();
        else if (h.style === "air") {
          const now = performance.now();
          if (now - lastAnelDragaoAirWhooshAt > 72) {
            lastAnelDragaoAirWhooshAt = now;
            playMagicWhoosh();
          }
        } else playMagicWhoosh();
      }
      break;
    }
    case "hero_basic_melee":
      if (!skipAllyVfx) {
        view.playHeroCombatClip(h.heroId, [
          heroAttackClipName("gladiador"),
          "box01",
          "boxing",
          "sword",
          "attack",
        ]);
      }
      break;
    case "basic_volley": {
      if (skipAllyVfx) break;
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
    case "tiro_destruidor_plasma": {
      view.triggerTiroDestruidorPlasma(h.pathQr, h.charges);
      playTiroDestruidorLaser(h.charges);
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
      if (!skipAllyVfx) view.playHeroHitReact(h.targetId);
      break;
    case "flaming_sword_strike":
      if (!skipAllyVfx) {
        playSwordHit();
        view.triggerFlamingSwordSlash(h.heroOwnerId, h.targetId);
      }
      break;
    case "ally_summon_strike":
      if (!skipAllyVfx) {
        playSwordHit();
        view.triggerGridSummonSlash(
          h.summonId,
          h.targetId,
          h.summonKind ?? "mega_golem",
        );
      }
      break;
    case "weapon_ult_furacao": {
      if (skipAllyVfx) break;
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
      if (!skipAllyVfx) {
        for (let i = 0; i < h.targetIds.length; i++) {
          const tid = h.targetIds[i]!;
          window.setTimeout(() => {
            playSwordHit();
            view.triggerMeleeSlashBetween(h.heroId, tid);
          }, PISOTEAR_FIRST_DAMAGE_MS + i * PISOTEAR_STAGGER_MS);
        }
      }
      break;
    case "golpe_relampago_teleport":
      if (!skipAllyVfx) playTeleportWhoosh();
      break;
    case "golpe_relampago_hero_charge":
      if (!skipAllyVfx) view.triggerGolpeRelampagoHeroElectrify(h.heroId);
      break;
    case "golpe_relampago_lightning": {
      if (skipAllyVfx) break;
      const delay = Math.max(0, h.delayMs);
      window.setTimeout(() => {
        playLightningStrike();
        view.spawnGolpeRelampagoLightningOnUnit(h.targetId);
        view.triggerGolpeRelampagoHeroElectrify(h.heroId);
      }, delay);
      break;
    }
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
  const col = coliseumDefinition(setup.coliseumTier);
  const colLine = `<div class="hero-setup-difficulty__coliseum"><strong>${escapeHtml(col.title)}</strong> — força inimiga base ×${formatEnemyMultPt(coliseumTierEnemyMultiplier(setup.coliseumTier))}</div>`;
  if (heroCount <= 0) {
    return `<div class="hero-setup-difficulty" role="status">
      ${colLine}
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
  const mult =
    partyScaleMultiplier(heroCount) *
    coliseumTierEnemyMultiplier(setup.coliseumTier);
  const warn =
    heroCount >= 3
      ? "hero-setup-difficulty--warn"
      : heroCount === 2
        ? "hero-setup-difficulty--warm"
        : "";
  if (heroCount === 1) {
    return `<div class="hero-setup-difficulty ${warn}" role="status">
      ${colLine}
      <div class="hero-setup-difficulty__title"><strong>1 herói — dificuldade base (tamanho do grupo).</strong></div>
      ${enemyAttrBlockHtml(mult)}
    </div>`;
  }
  const title =
    heroCount === 2
      ? "2 heróis — Dificuldade moderada."
      : "3 heróis — Dificuldade Alta.";
  return `<div class="hero-setup-difficulty ${warn}" role="status">
    ${colLine}
    <div class="hero-setup-difficulty__title"><strong>${title}</strong></div>
    ${enemyAttrBlockHtml(mult)}
  </div>`;
}

function fillHeroSlotCard(card: HTMLElement, i: 0 | 1 | 2): void {
  heroSetupPreviewBySlot[i]?.dispose();
  heroSetupPreviewBySlot[i] = null;
  const hid = setup.slots[i];
  if (hid) {
    card.classList.remove("hero-slot-card--placeholder");
    const wl = model.meta.weaponLevelByHeroSlot[i];
    const baseD = HEROES[hid].dano;
    const className = escapeHtml(HEROES[hid].name);
    const headHtml = `<div class="hero-slot-card__head">
        <span class="hero-slot-card__class hero-slot-card__class--${hid}">${className}</span>
      </div>`;
    card.innerHTML = `${headHtml}${templateStatsStripHtml(hid, i)}
        <div class="hero-slot-weapon-row" tabindex="0" role="img" aria-label="Arma principal nível ${wl} de 5. Paira para ver skill e ultimate da arma.">
          <span class="hero-slot-weapon-row__lbl">Arma principal</span>
          <span class="hero-slot-weapon-row__nv">nv <strong>${wl}</strong>/5</span>
          <span class="hero-slot-weapon-row__hint" aria-hidden="true">paira · skill e ultimate</span>
        </div>
        <div class="hero-slot-model-host" data-slot-model="${i}"></div><div class="hero-slot-passive-wrap"><div class="hero-slot-passive__title">Passiva</div><p class="hero-slot-passive">${escapeHtml(HEROES[hid].passiveDescription)}</p></div>`;
    bindSetupStatCells(card, hid);
    const weaponRow = card.querySelector(".hero-slot-weapon-row") as HTMLElement;
    bindGameTooltip(weaponRow, () =>
      heroSetupWeaponAbilitiesTooltipHtml(hid, wl, baseD),
    );
    const host = card.querySelector(`[data-slot-model="${i}"]`) as HTMLElement;
    const forgeL = resolveEquippedForgeLoadoutForMeta(model.meta, i);
    const prev = new HeroPreview3D(host, 220, 300, heroPreviewCameraSetupSlotCard);
    prev.setHero(
      hid,
      colorHintToDisplayColor(HEROES[hid].colorHint),
      forgeL,
    );
    prev.start();
    heroSetupPreviewBySlot[i] = prev;
  } else {
    card.classList.add("hero-slot-card--placeholder");
    const headHtml = `<div class="hero-slot-card__head">
        <span class="hero-slot-card__class hero-slot-card__class--empty-slot">—</span>
      </div>`;
    card.innerHTML = `${headHtml}
        <div class="hero-slot-placeholder">
          <div class="hero-slot-model-host hero-slot-model-host--placeholder"></div>
          <p class="hero-slot-placeholder__txt">Selecione um herói para este slot</p>
        </div>
      `;
  }
}

/** Atualiza só uma coluna + cabeçalhos; evita `innerHTML` em todo o `ui-root` ao mudar o select. */
function syncHeroSetupUiAfterSlotChange(slotIndex: 0 | 1 | 2): void {
  if (model.phase !== "setup_heroes") {
    render();
    return;
  }
  const screen = document.querySelector(".screen--hero-setup");
  if (!screen) {
    render();
    return;
  }
  const wrap = screen.querySelector(
    `.hero-slot[data-slot="${slotIndex}"]`,
  ) as HTMLElement | null;
  if (!wrap) {
    render();
    return;
  }
  const card = wrap.querySelector(".hero-slot-card") as HTMLElement | null;
  if (!card) {
    render();
    return;
  }
  fillHeroSlotCard(card, slotIndex);

  const dw = document.getElementById("hero-setup-difficulty-wrap");
  if (dw) dw.innerHTML = heroSetupDifficultyBannerHtml(selectedHeroes().length);

  const title = document.getElementById("hero-setup-main-title");
  if (title)
    title.textContent = `Escolha até 3 heróis (${selectedHeroes().length}/3)`;

  const btn = document.getElementById(
    "hero-setup-btn-next",
  ) as HTMLButtonElement | null;
  if (btn) btn.disabled = selectedHeroes().length < 1;

  requestAnimationFrame(() => {
    requestAnimationFrame(() => heroSetupPreviewBySlot[slotIndex]?.refit());
  });
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

function templateStatsStripHtml(
  cls: HeroClassId,
  slotIndex: 0 | 1 | 2,
): string {
  const meta = model.meta;
  while (setup.colors.length < 3) setup.colors.push("azul");
  const partyTri = setup.colors.slice(0, 3) as [
    TeamColor,
    TeamColor,
    TeamColor,
  ];
  const forgeL = resolveEquippedForgeLoadoutForMeta(meta, slotIndex);
  const p = buildHeroSetupStatPreview(
    cls,
    slotIndex,
    meta,
    partyTri,
    forgeL,
  );
  const items: { icon: StatIconId; label: string; value: string }[] = [
    {
      icon: "max_hp",
      label: "Vida máxima",
      value: formatTooltipNumber(p.maxHp),
    },
    {
      icon: "max_mana",
      label: "Mana máxima",
      value: formatTooltipNumber(p.maxMana),
    },
    {
      icon: "regen_hp",
      label: "Regeneração de vida",
      value: formatTooltipNumber(p.regenVida),
    },
    {
      icon: "regen_mp",
      label: "Regeneração de mana",
      value: formatTooltipNumber(p.regenMana),
    },
    { icon: "dmg", label: "Dano", value: formatTooltipNumber(p.dano) },
    {
      icon: "crit_hit",
      label: "Acerto crítico",
      value: `${formatTooltipNumber(p.acertoCritico)}%`,
    },
    {
      icon: "crit_dmg",
      label: "Multiplicador de crítico",
      value: `${formatTooltipNumber(Math.round(p.danoCritico * 100))}%`,
    },
    { icon: "def", label: "Defesa", value: formatTooltipNumber(p.defesa) },
    {
      icon: "mov",
      label: "Movimento",
      value: formatTooltipNumber(p.movimento),
    },
  ];
  if (cls === "sacerdotisa") {
    items.push({
      icon: "pot",
      label: "Potencial cura/escudo",
      value: formatTooltipNumber(p.potencialCuraEscudo),
    });
  }
  items.push({
    icon: "range",
    label: "Alcance",
    value: formatTooltipNumber(p.alcance),
  });
  const cellHtml = (
    it: { icon: StatIconId; label: string; value: string },
    si: number,
  ) =>
    `<div class="setup-stat-cell" data-stat="${it.icon}" data-label="${escapeHtml(it.label)}" data-value="${escapeHtml(it.value)}">${statIconWrap(it.icon, si)}<span class="lol-stat-val">${escapeHtml(it.value)}</span></div>`;
  const row1 = items.slice(0, 5).map((it, j) => cellHtml(it, j)).join("");
  const row2 = items.slice(5).map((it, j) => cellHtml(it, j + 5)).join("");
  return `<div class="setup-stats-strip"><div class="setup-stats-row">${row1}</div><div class="setup-stats-row">${row2}</div></div>`;
}

function bindSetupStatCells(
  container: HTMLElement,
  heroClass: HeroClassId,
): void {
  void heroClass;
  container.querySelectorAll(".setup-stat-cell .lol-stat-ico[data-ico]").forEach((ico) => {
    const sub = ico as HTMLElement;
    const sid = sub.dataset.ico as StatIconId;
    if (!sub.title) sub.title = HERO_STAT_TIP[sid] ?? sid;
  });
  container.querySelectorAll(".setup-stat-cell").forEach((node) => {
    const el = node as HTMLElement;
    const stat = el.dataset.stat as StatIconId | undefined;
    const value = el.dataset.value ?? "";
    bindGameTooltip(el, () =>
      stat
        ? setupHeroStatTooltip({ stat, display: value })
        : tooltipStatCell(el.dataset.label ?? "", value),
    );
  });
}
let prevPhase = model.phase;

let runSessionPersistRafId = 0;
function schedulePersistRunSessionCheckpoint(): void {
  if (!runPhaseAllowsRunSessionPersistence(model.phase)) {
    clearRunSessionCheckpoint();
    return;
  }
  if (runSessionPersistRafId !== 0) return;
  runSessionPersistRafId = requestAnimationFrame(() => {
    runSessionPersistRafId = 0;
    const json = model.serializeRunSessionRecovery();
    if (json) writeRunSessionCheckpointJson(json);
    else clearRunSessionCheckpoint();
  });
}

type PendingCombat =
  | null
  | { kind: "basic" }
  | {
      kind: "skill";
      id: string;
      /** Atirar pra todo lado: primeiro só movimento (1 hex), depois dispara a área. */
      atirarMoveFirst?: boolean;
      /** Entre o movimento e o disparo automático — ignora cliques na arena. */
      atirarExecPending?: boolean;
    };

let movePreviewActive = false;
let pendingCombat: PendingCombat = null;
/** Pré-visualização do feixe do Tiro destruidor (hexes + linha 3D). */
let combatTiroBeamPreviewKeys: Set<string> | null = null;
let combatTiroBeamPath: { q: number; r: number }[] | null = null;
let combatTiroAimCacheSig = "";
/** Hex de movimento sob o rato — overlay vermelho segue como se o herói já estivesse nessa célula. */
let combatPhantomHoverHex: { q: number; r: number } | null = null;
let combatAtirarTodoLadoFireTimer: ReturnType<typeof window.setTimeout> | null =
  null;
/** Evita acumular `keydown` de combate a cada `render()` / `showCombatHUD()`. */
let combatHotkeysAbort: AbortController | null = null;
let combatCornerResizeObserver: ResizeObserver | null = null;
/** Atualização incremental do HUD de combate (evita `innerHTML` + WebGL do inspect a cada `render()`). */
let refreshCombatHud: (() => void) | null = null;

const SANDBOX_PANEL_POS_KEY = "gladius-sandbox-panel-pos";
const SANDBOX_PANEL_VISIBLE_KEY = "gladius-sandbox-panel-visible";

function readSandboxPanelPos(): { left: number; top: number } | null {
  try {
    const s = localStorage.getItem(SANDBOX_PANEL_POS_KEY);
    if (!s) return null;
    const j = JSON.parse(s) as { left?: unknown; top?: unknown };
    if (typeof j.left !== "number" || typeof j.top !== "number") return null;
    return { left: j.left, top: j.top };
  } catch {
    return null;
  }
}

function writeSandboxPanelPos(p: { left: number; top: number }): void {
  try {
    localStorage.setItem(SANDBOX_PANEL_POS_KEY, JSON.stringify(p));
  } catch {
    /* ignore */
  }
}

let combatSandboxPanelVisible =
  typeof sessionStorage !== "undefined" &&
  sessionStorage.getItem(SANDBOX_PANEL_VISIBLE_KEY) !== "0";

/** Filtro da grelha de artefatos no painel sandbox (combate); persiste entre re-renders. */
let combatSandboxArtifactSearchQuery = "";

function stripDiacriticsForSearch(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function normalizeArtifactSearchKey(s: string): string {
  return stripDiacriticsForSearch(s.trim().toLowerCase())
    .replace(/[^a-z0-9]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function artifactSandboxSearchBlob(name: string, id: string): string {
  return normalizeArtifactSearchKey(`${name} ${id.replace(/_/g, " ")}`);
}

function applyCombatSandboxArtifactFilter(
  panel: HTMLElement,
  rawQuery: string,
): void {
  const q = normalizeArtifactSearchKey(rawQuery);
  const tokens = q.length === 0 ? [] : q.split(" ").filter(Boolean);
  panel.querySelectorAll("[data-sandbox-artifact]").forEach((node) => {
    const btn = node as HTMLElement;
    const blob =
      btn.getAttribute("data-artifact-search-blob") ??
      btn.dataset.artifactSearchBlob ??
      "";
    const hide =
      tokens.length > 0 &&
      !tokens.every((t) => t.length > 0 && blob.includes(t));
    const b = btn as HTMLButtonElement;
    b.hidden = hide;
    b.setAttribute("aria-hidden", hide ? "true" : "false");
    b.style.display = hide ? "none" : "";
  });
}

function applyCombatSandboxPanelVisibility(): void {
  document
    .getElementById("combat-sandbox-panel")
    ?.classList.toggle(
      "combat-sandbox-panel--hidden",
      !combatSandboxPanelVisible,
    );
}

function toggleCombatSandboxPanelVisibility(): void {
  combatSandboxPanelVisible = !combatSandboxPanelVisible;
  try {
    sessionStorage.setItem(
      SANDBOX_PANEL_VISIBLE_KEY,
      combatSandboxPanelVisible ? "1" : "0",
    );
  } catch {
    /* ignore */
  }
  applyCombatSandboxPanelVisibility();
}

/** Menu Esc durante a run (pausa + sair com confirmação). */
let runPauseOpen = false;
let runPauseStep: "menu" | "confirm" = "menu";
let runPauseEl: HTMLElement | null = null;
/** Inimigo selecionado para painel de atributos (combate). */
let combatInspectEnemyId: string | null = null;
/** Inimigo sob o rato: pré-visualização de movimento (hexes âmbar). */
let combatHoverEnemyId: string | null = null;
/** Herói cujo loadout LOL está em foco (pode ≠ turno atual). */
let combatLolInspectHeroId: string | null = null;

/** No bunker: qual barra de PV fica opaca em primeiro plano (a outra fica atrás, mais transparente). */
let combatBunkerHpHudFocus: "hero" | "bunker" = "bunker";

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
let goldShopBatchSize: GoldShopBatchSize = 1;
/** Qual painel 3D está em primeiro plano na loja (com bunker no bioma). */
let goldShopVizFocus: "hero" | "bunker" = "hero";
/** Ao mudar de bolsa de herói, volta a mostrar o herói em primeiro plano. */
let goldShopVizLastHeroId: string | null = null;
let goldShopStall3d: ShopStall3D | null = null;
let crystalShop3d: CrystalShop3D | null = null;
let goldShopBunker3d: BunkerPreview3D | null = null;
/** Atualização parcial da loja (evita `innerHTML` na shell a cada `emit()`). */
let refreshGoldShop: (() => void) | null = null;
/** RAF para fundir vários `emit`/cliques na mesma frame — evita criar/destruir WebGL em rajada (Opera e outros). */
let goldShopLayoutRafId = 0;

function cancelGoldShopLayoutRaf(): void {
  if (goldShopLayoutRafId !== 0) {
    cancelAnimationFrame(goldShopLayoutRafId);
    goldShopLayoutRafId = 0;
  }
}
let artifactCodex3d: ArtifactCodex3D | null = null;
let enemyCompendium3d: EnemyPreview3D | null = null;
let mainMenuSword3d: MainMenuSword3D | null = null;
let equipmentLayoutEditor: EquipmentLayoutEditor | null = null;
let equipmentLayoutResizeObserver: ResizeObserver | null = null;
let equipmentLayoutEscapeHandler: ((e: KeyboardEvent) => void) | null = null;
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
    case "penetracao":
      return "pen";
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

/** Cristal meta (mesmo desenho que o HUD de combate). */
function metaCrystalIconSvgHtml(extraSvgClass = ""): string {
  const svgCl = ["shop-meta-crystal-svg", extraSvgClass].filter(Boolean).join(" ");
  return `<svg class="${svgCl}" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" focusable="false" aria-hidden="true"><path fill="#7ecbff" stroke="#1a5a8a" stroke-width="1.2" d="M24 6l14 12-14 26L10 18z"/><path fill="#b8e8ff" stroke="#2a7099" stroke-width="0.8" d="M24 12l9 8-9 18-9-18z" opacity="0.95"/></svg>`;
}

const COMBAT_LOG_VISIBLE_LS = "gladiadores-combat-log-visible";

/** Não perguntar de novo se o jogador sai da 1.ª loja sem gastar ouro. */
const LS_INITIAL_SHOP_SKIP_EMPTY_CONFIRM =
  "gladiadores-initial-shop-skip-empty-confirm";

function readSkipInitialShopEmptyConfirm(): boolean {
  try {
    return localStorage.getItem(LS_INITIAL_SHOP_SKIP_EMPTY_CONFIRM) === "1";
  } catch {
    return false;
  }
}

function writeSkipInitialShopEmptyConfirm(on: boolean): void {
  try {
    localStorage.setItem(LS_INITIAL_SHOP_SKIP_EMPTY_CONFIRM, on ? "1" : "0");
  } catch {
    /* ignore */
  }
}

/** Sem ações: não voltar a perguntar — passa o turno automaticamente quando não houver mais jogadas. */
const LS_COMBAT_NO_ACTIONS_AUTO_END_SKIP =
  "gladiadores-combat-no-actions-auto-end-skip";

function readCombatNoActionsAutoEndSkip(): boolean {
  try {
    return localStorage.getItem(LS_COMBAT_NO_ACTIONS_AUTO_END_SKIP) === "1";
  } catch {
    return false;
  }
}

function writeCombatNoActionsAutoEndSkip(on: boolean): void {
  try {
    localStorage.setItem(LS_COMBAT_NO_ACTIONS_AUTO_END_SKIP, on ? "1" : "0");
  } catch {
    /* ignore */
  }
}

/** Modal “sem ações” já visível (evita reabrir a cada `update`). */
let combatNoActionsModalVisible = false;
let combatNoActionsModalEl: HTMLElement | null = null;
/** Após “Não, fico no turno”: não voltar a abrir o modal neste herói até mudar de turno. */
let combatNoActionsDeclinedForHeroId: string | null = null;

function disposeCombatNoActionsModal(): void {
  combatNoActionsModalEl?.remove();
  combatNoActionsModalEl = null;
  combatNoActionsModalVisible = false;
}

/**
 * Espelha a barra de combate: movimento, básico, skills do contexto atual, ultimate da arma, Especialista.
 */
function heroHasAnyEnabledCombatAction(m: GameModel, h: Unit): boolean {
  if (!h.heroClass || h.hp <= 0) return true;
  if (m.phase !== "combat" || m.inEnemyPhase || m.duel) return true;

  const sandboxCd = m.sandboxNoCdUltEnabled();
  const tmpl = HEROES[h.heroClass];
  const bunk = h.isPlayer ? m.bunkerForOccupant(h.id) : null;
  const inBunker = bunk != null && bunk.hp > 0;

  if (m.movementLeft > 0) {
    const reach = m.reachableForCurrentHero();
    const cur = axialKey(h.q, h.r);
    for (const k of reach.keys()) {
      if (k !== cur) return true;
    }
  }

  if (m.basicLeft > 0) {
    const keys = m.getBasicAttackRangeHexKeys();
    for (const e of m.enemies()) {
      if (e.hp <= 0) continue;
      if (
        keys.has(axialKey(e.q, e.r)) &&
        m.validateEnemyForBasicAttack(e.id)
      )
        return true;
    }
  }

  if (inBunker && bunk) {
    const cdM = sandboxCd ? 0 : (h.skillCd["bunker_minas"] ?? 0);
    if (cdM <= 0) return true;
    if (bunk.tier >= 2) {
      const cdT = sandboxCd ? 0 : (h.skillCd["bunker_tiro_preciso"] ?? 0);
      if (cdT <= 0) return true;
    }
    return false;
  }

  if (h.heroClass === "gladiador") {
    const inFuria = (h.furiaGiganteTurns ?? 0) > 0;
    if (inFuria) {
      const cd = sandboxCd ? 0 : (h.skillCd["pisotear"] ?? 0);
      const mc = pisotearManaCost(h.weaponLevel);
      if (cd <= 0 && (mc <= 0 || h.maxMana <= 0 || h.mana >= mc))
        return true;
    } else {
      const mc = ateMorteManaCost(h.weaponLevel);
      const cd = sandboxCd ? 0 : (h.skillCd["ate_a_morte"] ?? 0);
      if (cd <= 0 && (mc <= 0 || h.maxMana <= 0 || h.mana >= mc)) return true;
    }
  } else {
    for (const sk of tmpl.skills) {
      if (sk.id === "sentenca") {
        const sm = sentencaManaCost(h.weaponLevel);
        const cdS = sandboxCd ? 0 : (h.skillCd[sk.id] ?? 0);
        if (cdS <= 0 && h.mana >= sm) return true;
        continue;
      }
      if (
        sk.id === "atirar_todo_lado" &&
        h.heroClass === "pistoleiro" &&
        h.ultimateId === "arauto_caos"
      ) {
        const tiroCharges = h.tiroDestruidorCharges ?? 0;
        const tiroNoCharges = !m.devSandboxMode && tiroCharges < 1;
        const cdT = sandboxCd ? 0 : (h.skillCd["tiro_destruidor"] ?? 0);
        if (!tiroNoCharges && cdT <= 0) return true;
        continue;
      }
      const cd = sandboxCd ? 0 : (h.skillCd[sk.id] ?? 0);
      if (cd <= 0) return true;
    }
  }

  if (
    h.heroClass === "sacerdotisa" ||
    h.heroClass === "pistoleiro" ||
    h.heroClass === "gladiador"
  ) {
    if (sandboxCd || (h.weaponUltMeter ?? 0) >= 1) return true;
  }

  if (h.ultimateId === "especialista_destruicao") return true;

  return false;
}

function resumeMovementPreviewAfterHeroAction(): void {
  if (model.phase !== "combat" || model.inEnemyPhase) return;
  const h = model.currentHero();
  if (!h || !h.heroClass || h.hp <= 0) return;
  if (model.movementLeft <= 0) return;
  const reach = model.reachableForCurrentHero();
  const cur = axialKey(h.q, h.r);
  for (const k of reach.keys()) {
    if (k !== cur) {
      movePreviewActive = true;
      return;
    }
  }
}

/**
 * Skills com alvo em hex vazio: clique nesse hex deve executar a skill, não só reposicionar.
 * (Reposicionar usa hexes alcançáveis que não são alvo válido da skill de chão.)
 */
function pendingGroundSkillHexConsumesMoveClick(
  model: GameModel,
  skillId: string,
  hex: { q: number; r: number },
  hero: { q: number; r: number },
): boolean {
  if (
    skillId === "atirar_todo_lado" &&
    pendingCombat?.kind === "skill" &&
    pendingCombat.id === "atirar_todo_lado" &&
    pendingCombat.atirarMoveFirst
  ) {
    return false;
  }
  if (skillId === "tiro_destruidor") {
    if (hex.q === hero.q && hex.r === hero.r) return false;
    return model.hexInSkillRange(skillId, hex.q, hex.r);
  }
  if (skillId === "bunker_minas" || skillId === "atirar_todo_lado") {
    return model.hexInSkillRange(skillId, hex.q, hex.r);
  }
  return false;
}

function maybeCombatNoActionsAutoEndOrModal(runUpdate: () => void): void {
  if (model.phase !== "combat" || model.inEnemyPhase || model.duel) return;
  if (model.hasPendingCombatSchedule()) return;
  if (view.isUnitMoveAnimating()) return;
  if (pendingCombat != null) return;
  if (combatNoActionsModalVisible) return;

  const cur = model.currentHero();
  const viewed = lolViewedHero(model);
  if (!cur?.isPlayer || !viewed || viewed.id !== cur.id || !cur.heroClass)
    return;
  if (cur.hp <= 0) return;

  if (
    combatNoActionsDeclinedForHeroId &&
    combatNoActionsDeclinedForHeroId !== cur.id
  ) {
    combatNoActionsDeclinedForHeroId = null;
  }
  if (combatNoActionsDeclinedForHeroId === cur.id) return;

  if (heroHasAnyEnabledCombatAction(model, cur)) return;

  if (readCombatNoActionsAutoEndSkip()) {
    combatNoActionsDeclinedForHeroId = null;
    resetCombatSelection();
    model.endHeroTurn();
    runUpdate();
    return;
  }

  combatNoActionsModalVisible = true;
  disposeCombatNoActionsModal();
  const overlay = el(`<div class="shop-modal-overlay combat-no-actions-modal-overlay" aria-hidden="false">
    <div class="shop-modal" role="dialog" aria-modal="true" aria-labelledby="combat-no-actions-title">
      <h2 id="combat-no-actions-title" class="shop-modal__title">Sem mais ações?</h2>
      <p class="shop-modal__body">Não tens movimento útil, ataques básicos, habilidades prontas nem ultimate da arma disponível. Queres que o jogo <strong>passe o teu turno automaticamente</strong> sempre que isto acontecer?</p>
      <label class="shop-modal__check"><input type="checkbox" id="combat-no-actions-skip-future" /> Não mostrar esta pergunta novamente</label>
      <div class="shop-modal__actions">
        <button type="button" class="btn" id="combat-no-actions-decline">Não, fico no turno</button>
        <button type="button" class="btn btn-primary" id="combat-no-actions-confirm">Sim, passar automaticamente</button>
      </div>
    </div>
  </div>`);
  combatNoActionsModalEl = overlay;
  uiRoot.appendChild(overlay);

  const close = (): void => {
    overlay.remove();
    if (combatNoActionsModalEl === overlay) combatNoActionsModalEl = null;
    combatNoActionsModalVisible = false;
  };

  overlay.querySelector("#combat-no-actions-confirm")!.addEventListener(
    "click",
    () => {
      const cb = overlay.querySelector(
        "#combat-no-actions-skip-future",
      ) as HTMLInputElement | null;
      if (cb?.checked) writeCombatNoActionsAutoEndSkip(true);
      combatNoActionsDeclinedForHeroId = null;
      resetCombatSelection();
      model.endHeroTurn();
      close();
      runUpdate();
    },
  );
  overlay.querySelector("#combat-no-actions-decline")!.addEventListener(
    "click",
    () => {
      combatNoActionsDeclinedForHeroId = cur.id;
      close();
    },
  );
}

function readCombatLogVisible(): boolean {
  const s = localStorage.getItem(COMBAT_LOG_VISIBLE_LS);
  if (s === null) return false;
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
  disposeEnemyInspectPreview();
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
  const hi = hotInstanceCount(u);
  const hn = sumNextHotTickHeal(u);
  const hr = dotTickConsumeCount(u);
  return `<div class="game-ui-tooltip-inner"><div class="game-ui-tooltip-title">Cura contínua</div><p class="game-ui-tooltip-passive">${hi} instância(s) na fila. Próximo tick: +${formatTooltipNumber(hn)} PV (consome ${hr}).</p></div>`;
}

function enemyStatusTooltipPoisonHtml(u: Unit): string {
  if (!u.poison) return "";
  const pi = poisonInstanceCount(u);
  const pn = sumNextPoisonTickDamage(u);
  const pr = dotTickConsumeCount(u);
  return `<div class="game-ui-tooltip-inner"><div class="game-ui-tooltip-title">Veneno</div><p class="game-ui-tooltip-passive">${pi} instância(s) na fila. Próximo tick: ${formatTooltipNumber(pn)} dano (consome ${pr}). Ignora defesa.</p></div>`;
}

function enemyStatusTooltipBleedHtml(u: Unit): string {
  if (!u.bleed) return "";
  const bi = bleedInstanceCount(u);
  const bn = sumNextBleedTickDamage(u);
  const br = dotTickConsumeCount(u);
  return `<div class="game-ui-tooltip-inner"><div class="game-ui-tooltip-title">Sangramento</div><p class="game-ui-tooltip-passive">${bi} instância(s) na fila. Próximo tick: ${formatTooltipNumber(bn)} dano (consome ${br}).</p></div>`;
}

function enemyStatusTooltipDeslumbroHtml(u: Unit): string {
  const n = deslumbroInstancesCount(u);
  if (n <= 0) return "";
  return `<div class="game-ui-tooltip-inner"><div class="game-ui-tooltip-title">Deslumbro</div><p class="game-ui-tooltip-passive">${n} instância(s) de efeito (não é veneno/DoT). +50% de dano recebido. −1 após cada fase inimiga. Não é afetado por Amplicador de onda nem Dobra temporal.</p></div>`;
}

function fillEnemyInspectStatusRow(host: HTMLElement, u: Unit): void {
  const bits: string[] = [];
  if (u.hot && u.hot.instances.length > 0) {
    bits.push(
      `<span class="enemy-inspect-status-badge enemy-inspect-status-badge--hot" role="img" aria-label="Cura contínua">♥&nbsp;${hotInstanceCount(u)}</span>`,
    );
  }
  if (u.poison && u.poison.instances.length > 0) {
    bits.push(
      `<span class="enemy-inspect-status-badge enemy-inspect-status-badge--poison" role="img" aria-label="Veneno">☠&nbsp;${poisonInstanceCount(u)}</span>`,
    );
  }
  if (u.bleed && u.bleed.instances.length > 0) {
    bits.push(
      `<span class="enemy-inspect-status-badge enemy-inspect-status-badge--bleed" role="img" aria-label="Sangramento">†&nbsp;${bleedInstanceCount(u)}</span>`,
    );
  }
  if (deslumbroInstancesCount(u) > 0) {
    bits.push(
      `<span class="enemy-inspect-status-badge enemy-inspect-status-badge--deslumbro" role="img" aria-label="Deslumbro">✦&nbsp;${deslumbroInstancesCount(u)}</span>`,
    );
  }
  host.innerHTML = bits.length
    ? `<div class="enemy-inspect-status-inner">${bits.join("")}</div>`
    : "";
  const h = host.querySelector(".enemy-inspect-status-badge--hot");
  if (h) bindGameTooltip(h as HTMLElement, () => enemyStatusTooltipHotHtml(u));
  const p = host.querySelector(".enemy-inspect-status-badge--poison");
  if (p) bindGameTooltip(p as HTMLElement, () => enemyStatusTooltipPoisonHtml(u));
  const b = host.querySelector(".enemy-inspect-status-badge--bleed");
  if (b) bindGameTooltip(b as HTMLElement, () => enemyStatusTooltipBleedHtml(u));
  const d = host.querySelector(".enemy-inspect-status-badge--deslumbro");
  if (d) bindGameTooltip(d as HTMLElement, () => enemyStatusTooltipDeslumbroHtml(u));
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
    ["HP", `${formatTooltipNumber(u.hp)} / ${formatTooltipNumber(u.maxHp)}`],
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

function clearCombatAtirarFireTimer(): void {
  if (combatAtirarTodoLadoFireTimer != null) {
    window.clearTimeout(combatAtirarTodoLadoFireTimer);
    combatAtirarTodoLadoFireTimer = null;
  }
}

function resetCombatSelection(): void {
  clearCombatAtirarFireTimer();
  movePreviewActive = false;
  pendingCombat = null;
  combatTiroBeamPreviewKeys = null;
  combatTiroBeamPath = null;
  combatTiroAimCacheSig = "";
  combatPhantomHoverHex = null;
  combatInspectEnemyId = null;
  combatHoverEnemyId = null;
  combatLolInspectHeroId = null;
}

/** Origem usada para pré-visualizar alcance (hex fantasma ou posição real). */
function getCombatAttackPreviewOriginQr(h: Unit): { q: number; r: number } {
  if (
    combatPhantomHoverHex &&
    model.movementLeft > 0 &&
    model
      .reachableForCurrentHero()
      .has(axialKey(combatPhantomHoverHex.q, combatPhantomHoverHex.r)) &&
    (combatPhantomHoverHex.q !== h.q || combatPhantomHoverHex.r !== h.r)
  ) {
    return { q: combatPhantomHoverHex.q, r: combatPhantomHoverHex.r };
  }
  return { q: h.q, r: h.r };
}

function combatPendingAttackPreviewKeysAt(
  fromQ: number,
  fromR: number,
): Set<string> {
  const h = model.currentHero();
  if (!h || h.hp <= 0) return new Set();
  if (pendingCombat?.kind === "basic") {
    return model.getBasicAttackRangeHexKeysFromPosition(fromQ, fromR);
  }
  if (pendingCombat?.kind === "skill") {
    const id = pendingCombat.id;
    if (id === "atirar_todo_lado" && pendingCombat.atirarMoveFirst) {
      return new Set();
    }
    if (id === "bunker_minas" && fromQ === h.q && fromR === h.r) {
      return model.getSkillRangeHexKeys("bunker_minas");
    }
    return model.getSkillRangeHexKeysFromPosition(id, fromQ, fromR);
  }
  return new Set();
}

function updateCombatPhantomHoverFromCanvas(ndcX: number, ndcY: number): void {
  if (model.phase !== "combat" || model.inEnemyPhase) {
    if (combatPhantomHoverHex !== null) {
      combatPhantomHoverHex = null;
      applyCombatOverlays();
    }
    return;
  }
  const h = model.currentHero();
  if (!h || h.hp <= 0) {
    if (combatPhantomHoverHex !== null) {
      combatPhantomHoverHex = null;
      applyCombatOverlays();
    }
    return;
  }
  if (
    !pendingCombat ||
    model.movementLeft <= 0 ||
    !(pendingCombat.kind === "basic" || pendingCombat.kind === "skill")
  ) {
    if (combatPhantomHoverHex !== null) {
      combatPhantomHoverHex = null;
      applyCombatOverlays();
    }
    return;
  }
  const hex = view.pickCombatHex(ndcX, ndcY, model.grid);
  if (!hex) {
    if (combatPhantomHoverHex !== null) {
      combatPhantomHoverHex = null;
      applyCombatOverlays();
    }
    return;
  }
  const eidOnHex = model.liveEnemyIdAtHex(hex.q, hex.r);
  if (eidOnHex) {
    const tu = model.units.find((u) => u.id === eidOnHex);
    if (tu && !tu.isPlayer && tu.hp > 0) {
      const origin = getCombatAttackPreviewOriginQr(h);
      const atkPrev = combatPendingAttackPreviewKeysAt(origin.q, origin.r);
      if (atkPrev.has(axialKey(tu.q, tu.r))) {
        return;
      }
    }
  }
  const reach = model.reachableForCurrentHero();
  const k = axialKey(hex.q, hex.r);
  if (!reach.has(k)) {
    if (combatPhantomHoverHex !== null) {
      combatPhantomHoverHex = null;
      applyCombatOverlays();
    }
    return;
  }
  const cur = axialKey(h.q, h.r);
  if (k === cur) {
    if (combatPhantomHoverHex !== null) {
      combatPhantomHoverHex = null;
      applyCombatOverlays();
    }
    return;
  }
  if (combatPhantomHoverHex?.q === hex.q && combatPhantomHoverHex?.r === hex.r) {
    return;
  }
  combatPhantomHoverHex = { q: hex.q, r: hex.r };
  applyCombatOverlays();
}

function applyCombatOverlays(): void {
  if (model.phase !== "combat") {
    combatTiroBeamPreviewKeys = null;
    combatTiroBeamPath = null;
    combatTiroAimCacheSig = "";
    view.clearCombatOverlays();
    return;
  }
  const h = model.currentHero();
  if (!h || h.hp <= 0) {
    combatTiroBeamPreviewKeys = null;
    combatTiroBeamPath = null;
    combatTiroAimCacheSig = "";
    view.clearCombatOverlays();
    return;
  }
  let moveKeys = new Set<string>();
  let atkKeys = new Set<string>();
  if (pendingCombat?.kind === "basic") {
    const o = getCombatAttackPreviewOriginQr(h);
    atkKeys = model.getBasicAttackRangeHexKeysFromPosition(o.q, o.r);
  } else if (pendingCombat?.kind === "skill") {
    const o = getCombatAttackPreviewOriginQr(h);
    const sid = pendingCombat.id;
    if (sid === "atirar_todo_lado" && pendingCombat.atirarMoveFirst) {
      atkKeys = new Set();
    } else if (sid === "bunker_minas" && o.q === h.q && o.r === h.r) {
      atkKeys = model.getSkillRangeHexKeys("bunker_minas");
    } else {
      atkKeys = model.getSkillRangeHexKeysFromPosition(sid, o.q, o.r);
    }
  } else if (movePreviewActive) {
    const reach = model.reachableForCurrentHero();
    const cur = axialKey(h.q, h.r);
    for (const k of reach.keys()) {
      if (k !== cur) moveKeys.add(k);
    }
  }
  if (
    (pendingCombat?.kind === "basic" || pendingCombat?.kind === "skill") &&
    model.movementLeft > 0
  ) {
    const reach = model.reachableForCurrentHero();
    const cur = axialKey(h.q, h.r);
    for (const k of reach.keys()) {
      if (k !== cur) moveKeys.add(k);
    }
  }
  /** Inimigo sob o rato + seleção de ataque/VFX: esconde overlays de inspeção do inimigo (evita ruído). */
  const hideEnemyInspectOverlays =
    combatHoverEnemyId != null &&
    (pendingCombat != null || model.hasPendingCombatSchedule());
  view.setMovementOverlay(moveKeys);
  view.setAttackOverlay(atkKeys);
  const enemyOverlayId = hideEnemyInspectOverlays
    ? null
    : (combatHoverEnemyId ?? combatInspectEnemyId);
  let enemyMoveKeys = new Set<string>();
  let enemyAtkKeys = new Set<string>();
  if (enemyOverlayId) {
    enemyMoveKeys = model.enemyMovementPreviewKeys(enemyOverlayId);
    enemyAtkKeys = model.enemyAttackPreviewKeys(enemyOverlayId);
  }
  view.setEnemyInspectCombinedOverlay(enemyMoveKeys, enemyAtkKeys);

  const showTiroAim =
    pendingCombat?.kind === "skill" && pendingCombat.id === "tiro_destruidor";
  view.setTiroDestruidorAimPreview(
    showTiroAim ? combatTiroBeamPreviewKeys : null,
    showTiroAim ? combatTiroBeamPath : null,
  );
}

/** Atualiza linha de mira do Tiro destruidor ao mover o rato na arena. */
function updateTiroDestruidorAimPreview(ndcX: number, ndcY: number): void {
  if (model.phase !== "combat" || model.inEnemyPhase) return;
  const clearTiroAim = (): void => {
    if (combatTiroAimCacheSig === "") return;
    combatTiroBeamPreviewKeys = null;
    combatTiroBeamPath = null;
    combatTiroAimCacheSig = "";
    applyCombatOverlays();
  };
  if (combatHoverEnemyId != null && model.hasPendingCombatSchedule()) {
    clearTiroAim();
    return;
  }
  if (pendingCombat?.kind !== "skill" || pendingCombat.id !== "tiro_destruidor") {
    if (combatTiroAimCacheSig !== "") {
      combatTiroBeamPreviewKeys = null;
      combatTiroBeamPath = null;
      combatTiroAimCacheSig = "";
      applyCombatOverlays();
    }
    return;
  }
  const hex = view.pickCombatHex(ndcX, ndcY, model.grid);
  if (!hex) {
    if (combatTiroAimCacheSig !== "") {
      combatTiroBeamPreviewKeys = null;
      combatTiroBeamPath = null;
      combatTiroAimCacheSig = "";
      applyCombatOverlays();
    }
    return;
  }
  const hero = model.currentHero();
  if (!hero || hero.hp <= 0) return;
  const origin = getCombatAttackPreviewOriginQr(hero);
  const preview = model.tiroDestruidorAimPreviewFromHeroAt(
    origin.q,
    origin.r,
    hex.q,
    hex.r,
  );
  if (!preview) {
    if (combatTiroAimCacheSig !== "") {
      combatTiroBeamPreviewKeys = null;
      combatTiroBeamPath = null;
      combatTiroAimCacheSig = "";
      applyCombatOverlays();
    }
    return;
  }
  const sig = `${origin.q},${origin.r}|${[...preview.keys].sort().join("|")}:${preview.path.map((p) => `${p.q},${p.r}`).join(":")}`;
  if (sig === combatTiroAimCacheSig) return;
  combatTiroAimCacheSig = sig;
  combatTiroBeamPreviewKeys = preview.keys;
  combatTiroBeamPath = preview.path;
  applyCombatOverlays();
}

/** Atualiza inimigo sob o rato e hexes de movimento (âmbar) na arena. */
function updateCombatEnemyHoverFromCanvas(ev: MouseEvent): void {
  if (model.phase !== "combat" || model.inEnemyPhase) {
    if (combatHoverEnemyId !== null) {
      combatHoverEnemyId = null;
      applyCombatOverlays();
    }
    return;
  }
  const active = model.currentHero();
  if (!active || active.hp <= 0) {
    if (combatHoverEnemyId !== null) {
      combatHoverEnemyId = null;
      applyCombatOverlays();
    }
    return;
  }
  const r = canvas.getBoundingClientRect();
  const ndcX = ((ev.clientX - r.left) / r.width) * 2 - 1;
  const ndcY = -((ev.clientY - r.top) / r.height) * 2 + 1;
  const uid = view.pickUnit(ndcX, ndcY, {
    grid: model.grid,
    bunkerOccupantIdAt: (q, r) => {
      const b = model.bunkerAtHex(q, r);
      if (!b || b.hp <= 0 || !b.occupantId) return null;
      const u = model.units.find((z) => z.id === b.occupantId);
      return u && u.isPlayer && u.hp > 0 ? b.occupantId : null;
    },
  });
  let next: string | null = null;
  if (uid) {
    const u = model.units.find((x) => x.id === uid);
    if (u && !u.isPlayer && u.hp > 0) {
      if (
        pendingCombat &&
        (pendingCombat.kind === "basic" || pendingCombat.kind === "skill")
      ) {
        const o = getCombatAttackPreviewOriginQr(active);
        const atkPrev = combatPendingAttackPreviewKeysAt(o.q, o.r);
        if (atkPrev.has(axialKey(u.q, u.r))) next = uid;
      } else {
        next = uid;
      }
    }
  }
  if (
    !next &&
    pendingCombat &&
    (pendingCombat.kind === "basic" || pendingCombat.kind === "skill")
  ) {
    const hex = view.pickCombatHex(ndcX, ndcY, model.grid);
    if (hex) {
      const eid = model.liveEnemyIdAtHex(hex.q, hex.r);
      if (eid) {
        const o = getCombatAttackPreviewOriginQr(active);
        const atkPrev = combatPendingAttackPreviewKeysAt(o.q, o.r);
        const tu = model.units.find((u) => u.id === eid);
        if (tu && atkPrev.has(axialKey(tu.q, tu.r))) {
          next = eid;
        }
      }
    }
  }
  if (next !== combatHoverEnemyId) {
    combatHoverEnemyId = next;
    applyCombatOverlays();
  }
}

function el(html: string): HTMLElement {
  const t = document.createElement("template");
  t.innerHTML = html.trim();
  return t.content.firstElementChild as HTMLElement;
}

/** Máximo de acúmulos por artefato na party (consulta em combate). */
function bindArtifactMiniCardStackHover(root: HTMLElement, h: Unit): void {
  root.querySelectorAll(".artifact-mini-card").forEach((node) => {
    const card = node as HTMLElement;
    const aid = card.dataset.artifactId;
    if (!aid) return;
    const cnt = card.querySelector(".artifact-mini-card__cnt") as HTMLElement;
    if (!cnt) return;
    const stacks = h.artifacts[aid] ?? 0;
    const max = getArtifactMaxStacks(aid);
    if (max >= 900 || stacks >= max) return;
    const base = artifactStackCounterLabel(aid, stacks);
    const preview = artifactStackCounterLabel(aid, stacks + 1);
    const enter = (): void => {
      cnt.textContent = preview;
      cnt.classList.add("artifact-mini-card__cnt--preview");
    };
    const leave = (): void => {
      cnt.textContent = base;
      cnt.classList.remove("artifact-mini-card__cnt--preview");
    };
    card.addEventListener("mouseenter", enter);
    card.addEventListener("mouseleave", leave);
  });
}

function partyArtifactStackTotals(m: GameModel): Record<string, number> {
  const o: Record<string, number> = {};
  for (const h of m.getParty()) {
    if (h.hp <= 0) continue;
    for (const [k, v] of Object.entries(h.artifacts)) {
      if (!v || k.startsWith("_")) continue;
      o[k] = Math.max(o[k] ?? 0, v);
    }
  }
  return o;
}

function mountArtifactCodexCardsInto(
  body: HTMLElement,
  partyStacks: Record<string, number> | null = null,
): void {
  body.replaceChildren();
  for (const r of ARTIFACT_RARITY_ORDER) {
    const sub = ARTIFACT_POOL.filter((a) => a.rarity === r);
    if (sub.length === 0) continue;
    const sec = el(`<section class="artifact-codex-sec">
      <h2 class="artifact-codex-sec-title">${escapeHtml(ARTIFACT_RARITY_LABELS[r])} · ${sub.length}</h2>
      <div class="artifact-codex-grid"></div>
    </section>`);
    const grid = sec.querySelector(".artifact-codex-grid")!;
    for (const a of sub) {
      const max = getArtifactMaxStacks(a.id);
      const cur0 =
        partyStacks != null
          ? Math.min(max, Math.max(0, partyStacks[a.id] ?? 0))
          : null;
      const cntLine =
        cur0 != null
          ? `<div class="artifact-codex-card__cnt" data-art-cnt="${escapeHtml(a.id)}">${cur0}/${max}</div>`
          : "";
      const card = el(
        `<div class="artifact-codex-card ${artifactRarityClass(a.rarity)}" tabindex="0" role="img" aria-label="${escapeHtml(a.name)}">
          <div class="artifact-codex-card__art">${artifactCardInnerHtml(a.id)}</div>
          <div class="artifact-codex-card__name">${escapeHtml(a.name)}</div>${cntLine}
        </div>`,
      ) as HTMLElement;
      bindGameTooltip(card, () => artifactCodexAllTiersHtml(a.id));
      if (partyStacks != null && cur0 != null && max < 900) {
        const cntEl = card.querySelector("[data-art-cnt]") as HTMLElement;
        const onEnter = (): void => {
          if (cur0 >= max) return;
          cntEl.textContent = `${cur0 + 1}/${max}`;
          cntEl.classList.add("artifact-codex-card__cnt--preview");
        };
        const onLeave = (): void => {
          cntEl.textContent = `${cur0}/${max}`;
          cntEl.classList.remove("artifact-codex-card__cnt--preview");
        };
        card.addEventListener("mouseenter", onEnter);
        card.addEventListener("mouseleave", onLeave);
        card.addEventListener("focus", onEnter);
        card.addEventListener("blur", onLeave);
      }
      grid.appendChild(card);
    }
    body.appendChild(sec);
  }
}

/** Sobre o combate: consulta só leitura (tecla A). */
function openCombatArtifactReferenceOverlay(): void {
  if (document.getElementById("combat-artifact-ref-overlay")) return;
  const ov = el(`<div class="combat-artifact-ref-overlay" id="combat-artifact-ref-overlay" role="dialog" aria-modal="true" aria-label="Consulta de artefatos">
    <div class="combat-artifact-ref-panel">
      <header class="artifact-codex-header combat-artifact-ref-head">
        <h2 class="hero-setup-main-title">Artefatos</h2>
        <p class="artifact-codex-sub">Consulta — paira nas cartas para ver efeitos e o próximo acúmulo (verde). Fecha com Esc ou o botão.</p>
        <button type="button" class="btn btn-primary" id="combat-artifact-ref-close">Fechar</button>
      </header>
      <div class="artifact-codex-scroll combat-artifact-ref-scroll" id="combat-artifact-ref-body"></div>
    </div>
  </div>`);
  document.body.appendChild(ov);
  mountArtifactCodexCardsInto(
    ov.querySelector("#combat-artifact-ref-body")!,
    partyArtifactStackTotals(model),
  );
  const close = (): void => {
    document.removeEventListener("keydown", onKey, true);
    ov.remove();
  };
  const onKey = (e: KeyboardEvent): void => {
    if (e.code === "Escape") {
      e.preventDefault();
      close();
    }
  };
  document.addEventListener("keydown", onKey, true);
  ov.querySelector("#combat-artifact-ref-close")!.addEventListener("click", close);
  ov.addEventListener("click", (e) => {
    if (e.target === ov) close();
  });
}

function showArtifactCodex(): void {
  hideGameTooltip();
  removeEquipmentModal();
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
  mountArtifactCodexCardsInto(shell.querySelector("#codex-body")!);
  shell.querySelector("#codex-back")!.addEventListener("click", () => {
    disposeMenu3dPreviews();
    showMainMenu();
  });
}

function showEnemyCompendium(): void {
  hideGameTooltip();
  removeEquipmentModal();
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
    const baseDefEff = effectiveEnemyBaseDefesa(def);
    const defS = Math.round(baseDefEff * mult * 0.75);
    const defBaseStatHtml =
      def.tier === "elite" || def.tier === "boss"
        ? `<span class="enemy-codex-base-stat">(catálogo ${def.baseDefesa}; −50% elite/chefe na base → ${baseDefEff % 1 === 0 ? baseDefEff : baseDefEff.toFixed(1)})</span>`
        : `<span class="enemy-codex-base-stat">(base ${def.baseDefesa})</span>`;
    const movGame = def.movimento + 2;
    detailEl.innerHTML = `<h2 class="enemy-codex-name">${escapeHtml(def.name)}</h2>
      <p class="enemy-codex-meta">${escapeHtml(enemyTierLabelPt(def.tier))} · ${escapeHtml(enemyWaveRangeLabel(def))}${tag}</p>
      <p class="enemy-codex-scale-hint">Atributos abaixo: onda 1 · <strong>${partyN}</strong> herói(s) · movimento como no combate (+2). Defesa: base efectiva × escala, depois −25% global no combate; elite e chefes têm −50% na defesa base (face ao valor de catálogo).</p>
      <dl class="enemy-codex-stats">
        <dt>HP</dt><dd>${hpS} <span class="enemy-codex-base-stat">(base ${def.baseHp})</span></dd>
        <dt>Dano</dt><dd>${danoS} <span class="enemy-codex-base-stat">(base ${def.baseDano})</span></dd>
        <dt>Defesa</dt><dd>${defS} ${defBaseStatHtml}</dd>
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
    const crest = biomeCrestWrap(cur.biome as ForgeEssenceId, 22);
    return `<div class="hero-slot-forge__row hero-slot-forge__row--forge-tier-${t}"><span class="hero-slot-forge__k">${escapeHtml(label)}</span><span class="hero-slot-forge__v"><span class="hero-slot-forge__syn-name"><span class="hero-slot-forge__syn-crest" aria-hidden="true">${crest}</span><span class="hero-slot-forge__syn-txt">${escapeHtml(bio)}</span></span> <span class="hero-slot-forge__nv hero-slot-forge__nv--tier-${t}">nv ${t}</span></span></div>`;
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
  if (biomeNow == null) {
    btn.textContent = "—";
    btn.removeAttribute("aria-label");
  } else if (fullyMaxedThisLine) {
    btn.textContent = "Máximo";
    btn.removeAttribute("aria-label");
  } else {
    const verb = !curPiece ? "Forjar" : "Aprimorar";
    const crest = biomeCrestWrap(biomeNow, 22);
    const essenceName = FORGE_ESSENCE_LABELS[biomeNow];
    btn.innerHTML = `<span class="forge-do-btn__inner"><span class="forge-do-btn__verb">${escapeHtml(verb)}</span><span class="forge-do-btn__cost"><span class="forge-do-btn__cost-num">${cost}</span><span class="forge-do-btn__cost-crest" aria-hidden="true">${crest}</span></span>`;
    btn.setAttribute(
      "aria-label",
      `${verb}: custo ${cost} de ${essenceName}`,
    );
  }
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
  removeEquipmentModal();
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

/** Menu principal: só dica enquanto se ajusta coliseu/câmara (clique passa ao canvas). */
function showArenaLayoutEditHud(): void {
  hideGameTooltip();
  removeEquipmentModal();
  disposeMenu3dPreviews();
  mainMenuSword3d?.dispose();
  mainMenuSword3d = null;
  uiRoot.innerHTML = "";
  const wrap = el(`
    <div class="arena-layout-edit-shell">
      <div class="arena-layout-edit-hud" role="status" aria-live="polite">
      <strong>Ajustar cena</strong> — Coliseu, trono, bunkers (fixos no hex da run: altura X/Z, rotação J/L, escala [ ]), três heróis e um inimigo de referência (ao clicar nele abre a lista do compendium). <strong>Câmara em tempo real</strong> (não grava no JSON). Realce violeta como em «Ajustar equipamento». Fora do voo: botão direito arrasta o plano, roda zoom. <kbd>Espaço</kbd>: voo livre. Bunker: <kbd>1</kbd>–<kbd>3</kbd> modelo.
      <br /><span id="arena-layout-dynamic-hint" class="arena-layout-edit-hud__dynamic">${escapeHtml(view.getArenaLayoutEditSelectionHint())}</span>
      <div id="arena-layout-enemy-picker-wrap" class="arena-layout-enemy-picker-wrap" hidden aria-hidden="true">
        <label class="arena-layout-enemy-picker__label" for="arena-layout-enemy-select">Inimigo do compendium</label>
        <select id="arena-layout-enemy-select" class="arena-layout-enemy-select" aria-label="Escolher inimigo do compendium"></select>
      </div>
      <br /><kbd>Esc</kbd> grava e volta ao menu.
      <div class="arena-layout-edit-hud__copy-row">
        <button type="button" class="btn" id="arena-layout-copy-json">Copiar JSON (repo)</button>
        <span id="arena-layout-copy-json-feedback" class="arena-layout-edit-hud__copy-feedback" aria-live="polite"></span>
      </div>
      </div>
    </div>
  `);
  uiRoot.appendChild(wrap);
  wrap.querySelector("#arena-layout-enemy-select")!.addEventListener("change", (ev) => {
    const v = (ev.target as HTMLSelectElement).value;
    if (v) view.applyArenaLayoutEnemyPreviewFromUi(v);
  });
  wrap.querySelector("#arena-layout-copy-json")!.addEventListener("click", async () => {
    const fb = wrap.querySelector("#arena-layout-copy-json-feedback") as HTMLElement;
    const raw = JSON.stringify(view.collectSceneLayoutPrefs(), null, 2);
    try {
      await navigator.clipboard.writeText(raw);
      fb.textContent = "Copiado — cola no Cursor (Encorporar coordenadas).";
    } catch {
      fb.textContent =
        "Clipboard bloqueado. DevTools → consola: copy(localStorage.getItem('gladius-scene-layout-v1'))";
    }
  });
}

function disposeEquipmentLayoutEditor(): void {
  equipmentLayoutResizeObserver?.disconnect();
  equipmentLayoutResizeObserver = null;
  if (equipmentLayoutEscapeHandler) {
    document.removeEventListener("keydown", equipmentLayoutEscapeHandler, true);
    equipmentLayoutEscapeHandler = null;
  }
  equipmentLayoutEditor?.dispose();
  equipmentLayoutEditor = null;
  document.getElementById("equipment-layout-overlay")?.remove();
}

function refreshEquipmentLayoutHud(): void {
  const ed = equipmentLayoutEditor;
  if (!ed) return;
  const slotLabel = document.getElementById("eq-layout-slot-label");
  if (slotLabel) {
    const names: Record<ForgeEditSlot, string> = {
      helmet: "Elmo",
      cape: "Capa",
      manoplas: "Manoplas",
    };
    slotLabel.textContent = `Peça ativa: ${names[ed.selectedSlot]}`;
  }
  const vals = document.getElementById("eq-layout-values");
  if (vals) {
    const a = ed.getAttach();
    const sk =
      ed.selectedSlot === "helmet"
        ? "helmet"
        : ed.selectedSlot === "cape"
          ? "cape"
          : "manoplas";
    const p = a[sk];
    const x = "x" in p && p.x !== undefined ? p.x : 0;
    const z = "z" in p && p.z !== undefined ? p.z : 0;
    const rotX = "rotX" in p ? (p.rotX ?? 0) : 0;
    const rotY = "rotY" in p ? (p.rotY ?? 0) : 0;
    const rotZ = "rotZ" in p ? (p.rotZ ?? 0) : 0;
    vals.textContent = `pos (${x.toFixed(3)}, ${p.y.toFixed(3)}, ${z.toFixed(3)})  escala ${p.scale.toFixed(3)}  rot (${rotX.toFixed(3)}, ${rotY.toFixed(3)}, ${rotZ.toFixed(3)})`;
  }
  const savedBadge = document.getElementById("eq-layout-saved-badge");
  if (savedBadge) {
    savedBadge.textContent = ed.hasSavedLayoutForCurrentClass()
      ? "Esta classe tem layout guardado no jogo."
      : "A usar posição automática (sem gravação para esta classe).";
  }
}

/** [Dev] Editor de posição do elmo/capa/manoplas; grava em localStorage (`gladius-forge-equipment-layout-v1`). */
function enterEquipmentLayoutEditFromMenu(): void {
  if (!import.meta.env.DEV) return;
  disposeEquipmentLayoutEditor();
  hideGameTooltip();
  removeEquipmentModal();
  disposeMenu3dPreviews();
  mainMenuSword3d?.dispose();
  mainMenuSword3d = null;
  uiRoot.innerHTML = "";
  const overlay = el(`
    <div id="equipment-layout-overlay" class="equipment-layout-overlay">
      <canvas id="equipment-layout-canvas" class="equipment-layout-overlay__canvas" tabindex="0"></canvas>
      <div class="equipment-layout-overlay__hud" role="toolbar">
        <strong class="equipment-layout-overlay__title">Ajustar equipamento</strong>
        <p class="equipment-layout-overlay__desc">
          Pré-visualização com três peças forjadas (nv3). Clica numa peça ou escolhe o botão. Arrasto esquerdo: plano horizontal;
          <kbd>Shift</kbd>+arrasto: altura. Botão direito: orbitar. Roda: zoom.
          Teclas: <kbd>WASD</kbd> plano, <kbd>Q</kbd>/<kbd>E</kbd> profundidade, <kbd>I</kbd>/<kbd>K</kbd> <kbd>J</kbd>/<kbd>L</kbd> <kbd>U</kbd>/<kbd>O</kbd> rotação, <kbd>[</kbd> <kbd>]</kbd> escala.
        </p>
        <div class="equipment-layout-overlay__row">
          <span class="equipment-layout-overlay__label">Classe</span>
          <button type="button" class="equipment-layout-overlay__btn" data-eq-class="gladiador">Gladiador</button>
          <button type="button" class="equipment-layout-overlay__btn" data-eq-class="sacerdotisa">Sacerdotisa</button>
          <button type="button" class="equipment-layout-overlay__btn" data-eq-class="pistoleiro">Pistoleiro</button>
        </div>
        <div class="equipment-layout-overlay__row">
          <span class="equipment-layout-overlay__label">Peça</span>
          <button type="button" class="equipment-layout-overlay__btn" data-eq-slot="helmet">Elmo</button>
          <button type="button" class="equipment-layout-overlay__btn" data-eq-slot="cape">Capa</button>
          <button type="button" class="equipment-layout-overlay__btn" data-eq-slot="manoplas">Manoplas</button>
        </div>
        <p id="eq-layout-slot-label" class="equipment-layout-overlay__status" aria-live="polite"></p>
        <pre id="eq-layout-values" class="equipment-layout-overlay__pre"></pre>
        <p id="eq-layout-saved-badge" class="equipment-layout-overlay__note"></p>
        <div class="equipment-layout-overlay__actions">
          <button type="button" class="equipment-layout-overlay__btn" id="eq-layout-copy-json">Copiar JSON (repo)</button>
          <span id="eq-layout-copy-json-feedback" class="equipment-layout-overlay__note" aria-live="polite"></span>
          <button type="button" class="equipment-layout-overlay__btn equipment-layout-overlay__btn--primary" id="eq-layout-save">Gravar esta classe</button>
          <button type="button" class="equipment-layout-overlay__btn" id="eq-layout-reset-auto">Repor automático (só ecrã)</button>
          <button type="button" class="equipment-layout-overlay__btn" id="eq-layout-clear-saved">Apagar gravação desta classe</button>
          <button type="button" class="equipment-layout-overlay__btn equipment-layout-overlay__btn--danger" id="eq-layout-clear-all">Apagar todos os layouts</button>
          <button type="button" class="equipment-layout-overlay__btn" id="eq-layout-done">Gravar e voltar ao menu (Esc)</button>
        </div>
      </div>
    </div>
  `);
  document.getElementById("app")!.appendChild(overlay);
  const canvas = overlay.querySelector(
    "#equipment-layout-canvas",
  ) as HTMLCanvasElement;
  equipmentLayoutEditor = new EquipmentLayoutEditor(canvas, refreshEquipmentLayoutHud);
  equipmentLayoutEditor.start();
  refreshEquipmentLayoutHud();

  const syncClassButtons = (hc: HeroClassId) => {
    overlay.querySelectorAll("[data-eq-class]").forEach((b) => {
      (b as HTMLButtonElement).classList.toggle(
        "equipment-layout-overlay__btn--active",
        (b as HTMLElement).dataset.eqClass === hc,
      );
    });
  };
  const syncSlotButtons = (sl: ForgeEditSlot) => {
    overlay.querySelectorAll("[data-eq-slot]").forEach((b) => {
      (b as HTMLButtonElement).classList.toggle(
        "equipment-layout-overlay__btn--active",
        (b as HTMLElement).dataset.eqSlot === sl,
      );
    });
  };

  const bindClass = (hc: HeroClassId) => {
    equipmentLayoutEditor?.saveCurrentClassToStorage();
    equipmentLayoutEditor?.setHeroClass(hc);
    syncClassButtons(hc);
    refreshEquipmentLayoutHud();
  };
  const bindSlot = (sl: ForgeEditSlot) => {
    equipmentLayoutEditor?.setSelectedSlot(sl);
    syncSlotButtons(sl);
    refreshEquipmentLayoutHud();
  };

  overlay.querySelectorAll("[data-eq-class]").forEach((b) => {
    b.addEventListener("click", () => {
      bindClass((b as HTMLElement).dataset.eqClass as HeroClassId);
    });
  });
  overlay.querySelectorAll("[data-eq-slot]").forEach((b) => {
    b.addEventListener("click", () => {
      bindSlot((b as HTMLElement).dataset.eqSlot as ForgeEditSlot);
    });
  });
  overlay.querySelector("#eq-layout-copy-json")!.addEventListener("click", async () => {
    const fb = overlay.querySelector("#eq-layout-copy-json-feedback") as HTMLElement;
    equipmentLayoutEditor?.saveCurrentClassToStorage();
    const raw = JSON.stringify(loadForgeEquipmentLayoutPrefs(), null, 2);
    try {
      await navigator.clipboard.writeText(raw);
      fb.textContent = "Copiado — cola no Cursor (Encorporar coordenadas).";
    } catch {
      fb.textContent =
        "Clipboard bloqueado. Consola: copy(localStorage.getItem('gladius-forge-equipment-layout-v1')).";
    }
  });
  overlay.querySelector("#eq-layout-save")!.addEventListener("click", () => {
    equipmentLayoutEditor?.saveCurrentClassToStorage();
    refreshEquipmentLayoutHud();
  });
  overlay.querySelector("#eq-layout-reset-auto")!.addEventListener("click", () => {
    equipmentLayoutEditor?.resetCurrentClassToAuto();
    refreshEquipmentLayoutHud();
  });
  overlay.querySelector("#eq-layout-clear-saved")!.addEventListener("click", () => {
    equipmentLayoutEditor?.clearSavedForCurrentClass();
    refreshEquipmentLayoutHud();
  });
  overlay.querySelector("#eq-layout-clear-all")!.addEventListener("click", () => {
    if (!confirm("Apagar posições guardadas dos três heróis no localStorage?")) return;
    clearAllForgeEquipmentLayoutPrefs();
    equipmentLayoutEditor?.resetCurrentClassToAuto();
    refreshEquipmentLayoutHud();
  });
  const finish = (): void => {
    equipmentLayoutEditor?.saveCurrentClassToStorage();
    disposeEquipmentLayoutEditor();
    showMainMenu();
  };
  overlay.querySelector("#eq-layout-done")!.addEventListener("click", finish);

  syncClassButtons("gladiador");
  syncSlotButtons("helmet");

  equipmentLayoutResizeObserver = new ResizeObserver(() => {
    equipmentLayoutEditor?.resize();
  });
  equipmentLayoutResizeObserver.observe(overlay);

  equipmentLayoutEscapeHandler = (e: KeyboardEvent) => {
    if (e.code !== "Escape" || !equipmentLayoutEditor) return;
    e.preventDefault();
    finish();
  };
  document.addEventListener("keydown", equipmentLayoutEscapeHandler, true);

  canvas.focus();
  requestAnimationFrame(() => {
    equipmentLayoutEditor?.resize();
  });
}

function showMainMenu(): void {
  model.devSandboxMode = false;
  hideGameTooltip();
  removeEquipmentModal();
  disposeMenu3dPreviews();
  mainMenuSword3d?.dispose();
  mainMenuSword3d = null;
  uiRoot.innerHTML = "";
  const devMenuExtras = import.meta.env.DEV
    ? `<button type="button" class="main-menu-link main-menu-link--sandbox" data-action="dev-sandbox">Modo sandbox (testes)</button>
          <button type="button" class="main-menu-link main-menu-link--dev" data-action="dev-reset-fresh">[Dev] Estado inicial (apagar save)</button>
          <button type="button" class="main-menu-link main-menu-link--dev" data-action="arena-layout" title="Cena inicial completa; câmara live (Espaço = voo). Esc grava. Copiar JSON para o repo.">[Dev] Ajustar cena</button>
          <button type="button" class="main-menu-link main-menu-link--dev" data-action="equipment-layout" title="Elmo, capa e manoplas por herói; gravado em localStorage.">[Dev] Ajustar equipamento</button>`
    : "";
  const s = el(`
    <div class="main-menu-screen">
      <div class="main-menu-version" aria-hidden="true">${APP_VERSION_LABEL}</div>
      <div class="main-menu-bg" id="main-menu-bg" aria-hidden="true"></div>
      <div class="main-menu-content">
        <header class="main-menu-header">
          <h1 class="main-menu-title">Gladius</h1>
          <p class="main-menu-subtitle">Sobreviventes do Coliseu</p>
        </header>
        <div class="main-menu-run-recovery" id="main-menu-run-recovery" hidden>
          <p class="main-menu-run-recovery__text">
            Encontrámos uma run guardada nesta sessão (por exemplo após recarregar a página por engano).
          </p>
          <div class="main-menu-run-recovery__actions">
            <button type="button" class="btn btn-primary" id="run-recovery-restore">Continuar run</button>
            <button type="button" class="btn" id="run-recovery-discard">Descartar gravação</button>
          </div>
        </div>
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
  const recovery = s.querySelector("#main-menu-run-recovery") as HTMLElement;
  const rawCheckpoint = readRunSessionCheckpointJson();
  if (rawCheckpoint && recovery) {
    recovery.hidden = false;
    recovery.querySelector("#run-recovery-restore")!.addEventListener("click", () => {
      playUiClick();
      model.applyRunSessionRecovery(rawCheckpoint);
    });
    recovery.querySelector("#run-recovery-discard")!.addEventListener("click", () => {
      playUiClick();
      clearRunSessionCheckpoint();
      recovery.hidden = true;
    });
  }
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
          model.phase = "setup_coliseum";
          setup.slots = [null, null, null];
          setup.biomes = [];
          setup.colors = ["azul", "verde", "vermelho"];
          setup.coliseumTier = 1;
          render();
          break;
        case "dev-sandbox":
          if (!import.meta.env.DEV) break;
          model.devSandboxMode = true;
          model.phase = "setup_coliseum";
          setup.slots = [null, null, null];
          setup.biomes = [];
          setup.colors = ["azul", "verde", "vermelho"];
          setup.coliseumTier = 1;
          render();
          break;
        case "arena-layout":
          if (!import.meta.env.DEV) break;
          view.enterArenaLayoutEditFromMenu(canvas);
          render();
          break;
        case "equipment-layout":
          if (!import.meta.env.DEV) break;
          enterEquipmentLayoutEditFromMenu();
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
          clearRunSessionCheckpoint();
          clearAllLocalProgressForFreshStart();
          window.location.reload();
          break;
        default:
          break;
      }
    });
  });
}

function formatRunElapsedHhMmSs(ms: number): string {
  const totalSec = Math.floor(Math.max(0, ms) / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function showWaveSummaryOverlay(): void {
  const summary = model.peekWaveLootSummary();
  hideGameTooltip();
  removeEquipmentModal();
  uiRoot.innerHTML = "";
  if (!summary) {
    model.dismissWaveSummary();
    return;
  }
  const lines: string[] = [];
  lines.push(`<div class="wave-summary-overlay__title">Vitória!</div>`);
  lines.push(
    `<p class="wave-summary-overlay__wave-tag">${escapeHtml(coliseumRunWaveTaglinePt(summary.wave, model.coliseumTier))}</p>`,
  );
  lines.push(`<p class="wave-summary-overlay__xp">XP total (wave): <strong>${summary.xpTotal}</strong></p>`);
  lines.push(
    `<p class="wave-summary-overlay__time">Tempo de sessão: <strong>${formatRunElapsedHhMmSs(summary.runElapsedMs)}</strong></p>`,
  );
  for (const g of summary.goldLines) {
    if (g.bonus > 0) {
      lines.push(
        `<p class="wave-summary-overlay__line">${escapeHtml(g.heroName)}: ${formatOuroDisplay(g.base)} ouro base + <span class="wave-summary-overlay__bonus">+${formatOuroDisplay(g.bonus)}</span> (meta) → <strong>${formatOuroDisplay(g.total)}</strong> na bolsa</p>`,
      );
    } else {
      lines.push(
        `<p class="wave-summary-overlay__line">${escapeHtml(g.heroName)}: <strong>${formatOuroDisplay(g.total)}</strong> ouro na bolsa</p>`,
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

/** Só a grelha de compras; fundo WebGL (`CrystalShop3D`) fica no `.shop-screen__bg`. */
function mountCrystalShopGrid(grid: HTMLElement): void {
  const m = model.meta;
  grid.replaceChildren();
  const tracks = [
    ["permDamage", "Dano"],
    ["permHp", "Vida"],
    ["permDef", "Defesa"],
    ["permHealShield", "Cura/escudo"],
    ["permXp", "XP"],
    ["permGold", "Ouro"],
    ["permCrystalDrop", "Drop cristal"],
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
    const lineText =
      key === "permHealShield"
        ? `${label}: +10% · ${cur}/${META_TRACK_MAX_LEVEL}${cost != null ? "" : " — máx."}`
        : `${label}: +20% · ${cur}/${META_TRACK_MAX_LEVEL}${cost != null ? "" : " — máx."}`;
    const div = el(`<div class="shop-item crystal-shop-item crystal-shop-item--row"><span class="crystal-shop-item__text">${lineText}</span><button type="button" class="btn crystal-shop-buy-btn" data-meta="${key}" ${!canBuy ? "disabled" : ""} aria-label="${escapeHtml(ariaBuy)}">${btnLabel}</button></div>`);
    grid.appendChild(div);
    div.querySelector("button")!.addEventListener("click", () => {
      if (model.buyMetaTrack(key)) render();
    });
  }

  const exB = m.crystalExtraBasic ?? 0;
  const exBCost =
    exB < CRYSTAL_SHOP_EXTRA_BASIC_MAX ? CRYSTAL_SHOP_EXTRA_BASIC_COST : null;
  const exBCanBuy = exBCost != null && m.crystals >= exBCost;
  const exBBtn = exBCost != null ? `${exBCost} 💎` : "—";
  const exBAria =
    exBCost != null
      ? `Comprar ataques extra por ${exBCost} cristais`
      : "Limite máximo";
  const exBDiv = el(
    `<div class="shop-item crystal-shop-item crystal-shop-item--row"><span class="crystal-shop-item__text">Ataques extra: +1 · ${exB}/${CRYSTAL_SHOP_EXTRA_BASIC_MAX}${exBCost != null ? "" : " — máx."}</span><button type="button" class="btn crystal-shop-buy-btn" id="btn-crystal-extra-basic" ${!exBCanBuy ? "disabled" : ""} aria-label="${escapeHtml(exBAria)}">${exBBtn}</button></div>`,
  );
  grid.appendChild(exBDiv);
  exBDiv.querySelector("#btn-crystal-extra-basic")!.addEventListener("click", () => {
    if (model.buyCrystalShopExtraBasic()) render();
  });

  const alcN = m.crystalAlcance ?? 0;
  const alcCost =
    alcN < CRYSTAL_SHOP_ALCANCE_MAX ? CRYSTAL_SHOP_ALCANCE_COST : null;
  const alcCanBuy = alcCost != null && m.crystals >= alcCost;
  const alcBtn = alcCost != null ? `${alcCost} 💎` : "—";
  const alcAria =
    alcCost != null
      ? `Comprar alcance por ${alcCost} cristais`
      : "Limite máximo";
  const alcDiv = el(
    `<div class="shop-item crystal-shop-item crystal-shop-item--row"><span class="crystal-shop-item__text">Alcance: +1 · ${alcN}/${CRYSTAL_SHOP_ALCANCE_MAX}${alcCost != null ? "" : " — máx."}</span><button type="button" class="btn crystal-shop-buy-btn" id="btn-crystal-alcance" ${!alcCanBuy ? "disabled" : ""} aria-label="${escapeHtml(alcAria)}">${alcBtn}</button></div>`,
  );
  grid.appendChild(alcDiv);
  alcDiv.querySelector("#btn-crystal-alcance")!.addEventListener("click", () => {
    if (model.buyCrystalShopAlcance()) render();
  });

  const sorteN = m.crystalSorte ?? 0;
  const sorteCost =
    sorteN < CRYSTAL_SHOP_SORTE_MAX ? CRYSTAL_SHOP_SORTE_COST : null;
  const sorteCanBuy = sorteCost != null && m.crystals >= sorteCost;
  const sorteBtn = sorteCost != null ? `${sorteCost} 💎` : "—";
  const sorteAria =
    sorteCost != null
      ? `Comprar sorte por ${sorteCost} cristais`
      : "Limite máximo";
  const sorteDiv = el(
    `<div class="shop-item crystal-shop-item crystal-shop-item--row"><span class="crystal-shop-item__text">Sorte: +${CRYSTAL_SHOP_SORTE_PER_BUY} · ${sorteN}/${CRYSTAL_SHOP_SORTE_MAX}${sorteCost != null ? "" : " — máx."}</span><button type="button" class="btn crystal-shop-buy-btn" id="btn-crystal-sorte" ${!sorteCanBuy ? "disabled" : ""} aria-label="${escapeHtml(sorteAria)}">${sorteBtn}</button></div>`,
  );
  grid.appendChild(sorteDiv);
  sorteDiv.querySelector("#btn-crystal-sorte")!.addEventListener("click", () => {
    if (model.buyCrystalShopSorte()) render();
  });

  const ic = m.initialCards;
  const icCost = nextInitialCardCost(ic);
  const icCanBuy = icCost != null && m.crystals >= icCost;
  const icBtnLabel = icCost != null ? `${icCost} 💎` : "—";
  const icAria =
    icCost != null
      ? `Comprar por ${icCost} cristais`
      : "Limite máximo";
  const icDiv = el(`<div class="shop-item crystal-shop-item crystal-shop-item--row"><span class="crystal-shop-item__text">Escolha de artefatos: +1 · ${ic}/3${icCost != null ? "" : " — máx."}</span><button type="button" class="btn crystal-shop-buy-btn" id="btn-ic" ${!icCanBuy ? "disabled" : ""} aria-label="${escapeHtml(icAria)}">${icBtnLabel}</button></div>`);
  grid.appendChild(icDiv);
  icDiv.querySelector("#btn-ic")!.addEventListener("click", () => {
    if (model.buyInitialCards()) render();
  });

  const rrBonus = m.artifactRerollBonus;
  const rrBonusCost = model.nextArtifactRerollBonusCost();
  const rrBonusCanBuy = rrBonusCost != null && m.crystals >= rrBonusCost;
  const rrBonusBtn = rrBonusCost != null ? `${rrBonusCost} 💎` : "—";
  const rrBonusAria =
    rrBonusCost != null
      ? `Comprar reroll extra por ${rrBonusCost} cristais`
      : "Limite máximo";
  const rrDiv = el(
    `<div class="shop-item crystal-shop-item crystal-shop-item--row"><span class="crystal-shop-item__text">Reroll: +1 · ${rrBonus}/3${rrBonusCost != null ? "" : " — máx."}</span><button type="button" class="btn crystal-shop-buy-btn" id="btn-artifact-rr-bonus" ${!rrBonusCanBuy ? "disabled" : ""} aria-label="${escapeHtml(rrBonusAria)}">${rrBonusBtn}</button></div>`,
  );
  grid.appendChild(rrDiv);
  rrDiv.querySelector("#btn-artifact-rr-bonus")!.addEventListener("click", () => {
    if (model.buyArtifactRerollBonus()) render();
  });

  const banBonus = m.artifactBanBonus;
  const banBonusCost = model.nextArtifactBanBonusCost();
  const banBonusCanBuy = banBonusCost != null && m.crystals >= banBonusCost;
  const banBonusBtn = banBonusCost != null ? `${banBonusCost} 💎` : "—";
  const banBonusAria =
    banBonusCost != null
      ? `Comprar banimento extra por ${banBonusCost} cristais`
      : "Limite máximo";
  const banDiv = el(
    `<div class="shop-item crystal-shop-item crystal-shop-item--row"><span class="crystal-shop-item__text">Banimentos: +1 · ${banBonus}/3${banBonusCost != null ? "" : " — máx."}</span><button type="button" class="btn crystal-shop-buy-btn" id="btn-artifact-ban-bonus" ${!banBonusCanBuy ? "disabled" : ""} aria-label="${escapeHtml(banBonusAria)}">${banBonusBtn}</button></div>`,
  );
  grid.appendChild(banDiv);
  banDiv.querySelector("#btn-artifact-ban-bonus")!.addEventListener("click", () => {
    if (model.buyArtifactBanBonus()) render();
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
}

/** Evita `dispose`+novo `CrystalShop3D` a cada compra (mesmo padrão que setup de heróis). */
function refreshCrystalShopInPlace(): boolean {
  if (model.phase !== "crystal_shop") return false;
  const shell = uiRoot.querySelector(".crystal-shop-screen");
  if (!shell || !crystalShop3d) return false;
  const m = model.meta;
  const numEl = shell.querySelector(".crystal-shop-crystals__num");
  if (numEl) numEl.textContent = String(m.crystals);
  const grid = shell.querySelector("#meta-grid");
  if (!grid) return false;
  mountCrystalShopGrid(grid as HTMLElement);
  return true;
}

function showCrystalShop(): void {
  hideGameTooltip();
  removeEquipmentModal();
  disposeMenu3dPreviews();
  const m = model.meta;
  if (refreshCrystalShopInPlace()) return;

  crystalShop3d?.dispose();
  crystalShop3d = null;
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
      <div class="crystal-shop-crystals" aria-label="Cristais disponíveis">
        <span class="crystal-shop-crystals__num">${m.crystals}</span>
        ${metaCrystalIconSvgHtml("crystal-shop-crystals__ico")}
      </div>
      <div class="shop-grid crystal-shop-grid" id="meta-grid"></div>
      <button type="button" class="btn crystal-shop-back-btn" id="btn-back">Voltar</button>
    </div>`;
  const s = panel.querySelector(".crystal-shop-panel-inner") as HTMLElement;
  const grid = s.querySelector("#meta-grid") as HTMLElement;
  mountCrystalShopGrid(grid);

  s.querySelector("#btn-back")!.addEventListener("click", () => {
    model.phase = "main_menu";
    render();
  });
}

function showColiseumSetup(): void {
  hideGameTooltip();
  removeEquipmentModal();
  disposeMenu3dPreviews();
  uiRoot.innerHTML = "";
  const cards = COLISEUMS.map((c) => {
    const m = formatEnemyMultPt(coliseumTierEnemyMultiplier(c.tier));
    return `<button type="button" class="coliseum-pick-card" data-tier="${c.tier}">
      <span class="coliseum-pick-card__title">${escapeHtml(c.title)}</span>
      <span class="coliseum-pick-card__blurb">${escapeHtml(c.blurb)}</span>
      <span class="coliseum-pick-card__meta" aria-hidden="true">Força inimiga base ×${m} · a dificuldade sobe a cada coliseu ao longo da run</span>
    </button>`;
  }).join("");
  const s = el(`
    <div class="screen screen--new-run-setup screen--coliseum-setup">
      <div class="coliseum-setup-screen">
        <h1 class="hero-setup-main-title">Escolhe o coliseu</h1>
        <p class="hero-setup-hint">Começas na arena que escolheres; depois avanças por arenas cada vez maiores até ao <strong>Quinto coliseu</strong>, onde o imperador te espera na última onda.</p>
        <div class="coliseum-pick-grid" role="group" aria-label="Coliseus">${cards}</div>
        <div class="hero-setup-actions new-run-setup-actions">
          <button type="button" class="btn" id="coliseum-btn-back">Voltar ao menu</button>
        </div>
      </div>
    </div>
  `);
  uiRoot.appendChild(s);
  s.querySelector("#coliseum-btn-back")!.addEventListener("click", () => {
    model.phase = "main_menu";
    render();
  });
  s.querySelectorAll<HTMLButtonElement>(".coliseum-pick-card").forEach((btn) => {
    btn.addEventListener("click", () => {
      const t = Number(btn.dataset.tier);
      if (t < 1 || t > 5) return;
      setup.coliseumTier = t as ColiseumTierId;
      model.phase = "setup_heroes";
      render();
    });
  });
}

function showHeroSetup(): void {
  disposeHeroSetupPreviews();
  hideGameTooltip();
  removeEquipmentModal();
  disposeMenu3dPreviews();
  uiRoot.innerHTML = "";
  const heroes = selectedHeroes();
  const max = 3;
  const s = el(`
    <div class="screen screen--new-run-setup screen--hero-setup">
      <div class="hero-setup-screen">
        <div id="hero-setup-difficulty-wrap">${heroSetupDifficultyBannerHtml(heroes.length)}</div>
        <h1 id="hero-setup-main-title" class="hero-setup-main-title">Escolha até 3 heróis (${heroes.length}/${max})</h1>
        <div class="hero-slots-grid" id="hero-slots"></div>
        <div class="hero-setup-actions new-run-setup-actions">
          <button type="button" class="btn" id="btn-back">Voltar</button>
          <button type="button" class="btn btn-primary" id="hero-setup-btn-next" ${heroes.length < 1 ? "disabled" : ""}>Selecionar</button>
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
    const slotI = i as 0 | 1 | 2;
    sel.addEventListener("change", () => {
      const v = sel.value as HeroClassId | "";
      setup.slots[slotI] = v === "" ? null : v;
      syncHeroSetupUiAfterSlotChange(slotI);
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
    fillHeroSlotCard(card, slotI);
  }
  /* Host `.hero-slot-model-host` pode medir 0 no 1.º frame (flex); 2.º rAF alinha buffer + redraw. */
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      for (let si = 0; si < 3; si++) heroSetupPreviewBySlot[si]?.refit();
    });
  });
  s.querySelector("#hero-setup-btn-next")!.addEventListener("click", () => {
    if (selectedHeroes().length < 1) return;
    setup.biomes = [];
    model.phase = "setup_biomes";
    render();
  });
  s.querySelector("#btn-back")!.addEventListener("click", () => {
    model.phase = "setup_coliseum";
    render();
  });
}

function showBiomeSetup(): void {
  disposeBiomePicker();
  disposeBioHeroPreview();
  hideGameTooltip();
  removeEquipmentModal();
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
  bioHeroPreview = new HeroPreview3D(host, 220, 240, heroPreviewCameraBiomeInitial);
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
  requestAnimationFrame(() => {
    requestAnimationFrame(() => bioHeroPreview?.refit());
  });

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
      biomePickerInstance?.setHoverBiome(null);
      applyHoverDesc(null);
      return;
    }
    biomePickerInstance?.setHoverBiome(
      hit.biome === "hub" ? null : hit.biome,
    );
    applyHoverDesc(hit.biome);
  });
  canvas.addEventListener("mouseleave", () => {
    biomePickerInstance?.setHoverBiome(null);
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
  removeEquipmentModal();
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
      coliseumTier: setup.coliseumTier,
    });
    render();
  });
  s.querySelector("#btn-color-back")!.addEventListener("click", () => {
    if (setup.biomes.length > 0) setup.biomes.pop();
    model.phase = "setup_biomes";
    render();
  });
}

/** Botões da grelha de artefatos (sandbox no combate). */
function sandboxArtifactTilesHtml(h: Unit): string {
  const sorted = [...ARTIFACT_POOL].sort((a, b) => {
    const ri =
      ARTIFACT_RARITY_ORDER.indexOf(a.rarity) -
      ARTIFACT_RARITY_ORDER.indexOf(b.rarity);
    if (ri !== 0) return ri;
    return a.name.localeCompare(b.name, "pt");
  });
  return sorted
    .map((a) => {
      const n = h.artifacts[a.id] ?? 0;
      const cap = getArtifactMaxStacks(a.id);
      const on = n > 0 ? " shop-sandbox-artifact--on" : "";
      const blob = artifactSandboxSearchBlob(a.name, a.id);
      return `<button type="button" class="shop-sandbox-artifact ${artifactRarityClass(a.rarity)}${on}" data-sandbox-artifact="${escapeHtml(a.id)}" data-artifact-search-blob="${escapeHtml(blob)}" aria-label="${escapeHtml(`${a.name}, ${n} de ${cap} acúmulos. Esquerdo +1, direito −1. Paira para efeitos.`)}">
      <span class="shop-sandbox-artifact__name">${escapeHtml(a.name)}</span>
      <span class="shop-sandbox-artifact__stack" aria-hidden="true">${n}/${cap}</span>
    </button>`;
    })
    .join("");
}

function sandboxHeroForCombatEditor(m: GameModel): Unit | null {
  const cur = m.currentHero();
  if (cur?.isPlayer && cur.hp > 0) return cur;
  return m.getParty().find((u) => u.hp > 0) ?? null;
}

function mountCombatSandboxDevtools(signal: AbortSignal): void {
  if (!model.devSandboxMode) return;
  const hero = sandboxHeroForCombatEditor(model);
  const waveOpts = Array.from({ length: FINAL_VICTORY_WAVE }, (_, i) => {
    const w = i + 1;
    return `<option value="${w}"${w === model.wave ? " selected" : ""}>${w}</option>`;
  }).join("");
  const gridInner = hero ? sandboxArtifactTilesHtml(hero) : "";
  const heroLabelText = hero ? escapeHtml(hero.name) : "—";
  const partyKillRows = model
    .getParty()
    .filter((p) => p.hp > 0)
    .map(
      (p) =>
        `<div class="combat-sandbox-hero-row">
      <span class="combat-sandbox-hero-row__name">${escapeHtml(p.name)}</span>
      <div class="combat-sandbox-hero-row__actions">
        <button type="button" class="btn combat-sandbox-fly-btn" data-sandbox-toggle-fly="${escapeHtml(p.id)}" aria-pressed="${p.flying ? "true" : "false"}">${p.flying ? "Aterrar" : "Voar"}</button>
        <button type="button" class="btn combat-sandbox-level-btn" data-sandbox-level-up="${escapeHtml(p.id)}">Nv+1</button>
        <button type="button" class="btn combat-sandbox-forma-btn" data-sandbox-forma-final="${escapeHtml(p.id)}" title="Abre o menu de forma final (nv. ${FORMA_FINAL_LEVEL})">Forma final</button>
        <button type="button" class="btn combat-sandbox-kill-btn" data-sandbox-kill-hero="${escapeHtml(p.id)}">Matar</button>
      </div>
    </div>`,
    )
    .join("");
  const panel = el(`<aside class="combat-sandbox-panel" id="combat-sandbox-panel" aria-label="Ferramentas de teste sandbox">
    <div class="combat-sandbox-panel__head combat-sandbox-panel__drag-handle" title="Arrastar · tecla A mostrar/ocultar">Sandbox</div>
    <p class="combat-sandbox-panel__pill">Ouro/cristais/essências amplos</p>
    <label class="combat-sandbox-panel__toggle" title="Persiste entre sessões (localStorage)">
      <input type="checkbox" id="combat-sandbox-no-cd-ult" />
      <span>Sem CDR · ultimate da arma pronta</span>
    </label>
    <div class="combat-sandbox-panel__row">
      <label class="combat-sandbox-panel__wave-label" for="combat-sandbox-wave-sel">Recomeçar na wave</label>
      <select id="combat-sandbox-wave-sel" class="combat-sandbox-panel__wave-sel" aria-label="Recomeçar combate nesta wave">${waveOpts}</select>
    </div>
    <p class="combat-sandbox-panel__hero-hint">Herói: <strong>${heroLabelText}</strong> (turno ou primeiro vivo)</p>
    <section class="combat-sandbox-heroes" aria-label="Heróis sandbox">
      <h3 class="shop-sandbox-artifacts__title">Heróis</h3>
      <p class="shop-sandbox-artifacts__hint">Voar / Aterrar altera o estado de voo (combate + modelo 3D). Nv+1 concede XP até subir um nível e abre o menu de artefato ou, no nível ${FORMA_FINAL_LEVEL}, o de forma final. Forma final abre esse menu já (nv. ${FORMA_FINAL_LEVEL} se preciso, remove forma anterior). Matar remove o herói do combate (como morte).</p>
      ${
        partyKillRows
          ? `<div class="combat-sandbox-heroes__list" role="group">${partyKillRows}</div>`
          : `<p class="combat-sandbox-panel__muted">Nenhum herói vivo.</p>`
      }
    </section>
    <section class="shop-sandbox-artifacts combat-sandbox-artifacts" aria-label="Artefatos sandbox">
      <h3 class="shop-sandbox-artifacts__title">Artefatos</h3>
      <p class="shop-sandbox-artifacts__hint">Esquerdo +1 · direito −1 · pairar para níveis. Pesquisa filtra a lista.</p>
      ${
        hero
          ? `<input type="search" id="combat-sandbox-artifact-search" class="combat-sandbox-artifact-search" placeholder="Pesquisar artefatos…" autocomplete="off" enterkeyhint="search" aria-label="Pesquisar artefatos por nome ou id" />
      <div class="shop-sandbox-artifacts__grid combat-sandbox-artifacts__grid" role="group">${gridInner}</div>`
          : `<p class="combat-sandbox-panel__muted">Sem herói vivo.</p>`
      }
    </section>
  </aside>`);
  uiRoot.appendChild(panel);
  const savedPos = readSandboxPanelPos();
  if (savedPos) {
    panel.style.left = `${savedPos.left}px`;
    panel.style.top = `${savedPos.top}px`;
    panel.style.transform = "none";
  } else {
    panel.style.left = "50%";
    panel.style.top = "50%";
    panel.style.transform = "translate(-50%, -50%)";
  }
  panel.classList.toggle(
    "combat-sandbox-panel--hidden",
    !combatSandboxPanelVisible,
  );

  const dragHandle = panel.querySelector(
    ".combat-sandbox-panel__drag-handle",
  ) as HTMLElement;
  let sandboxDragOx = 0;
  let sandboxDragOy = 0;
  let sandboxDragging = false;
  const onSandboxDragMove = (ev: PointerEvent): void => {
    if (!sandboxDragging) return;
    let left = ev.clientX - sandboxDragOx;
    let top = ev.clientY - sandboxDragOy;
    const rect = panel.getBoundingClientRect();
    const pw = rect.width;
    const ph = rect.height;
    left = Math.max(8, Math.min(window.innerWidth - pw - 8, left));
    top = Math.max(8, Math.min(window.innerHeight - ph - 8, top));
    panel.style.left = `${left}px`;
    panel.style.top = `${top}px`;
    panel.style.transform = "none";
  };
  const onSandboxDragEnd = (ev: PointerEvent): void => {
    if (!sandboxDragging) return;
    sandboxDragging = false;
    window.removeEventListener("pointermove", onSandboxDragMove);
    window.removeEventListener("pointerup", onSandboxDragEnd);
    window.removeEventListener("pointercancel", onSandboxDragEnd);
    try {
      dragHandle.releasePointerCapture(ev.pointerId);
    } catch {
      /* já libertado */
    }
    const r = panel.getBoundingClientRect();
    writeSandboxPanelPos({ left: r.left, top: r.top });
  };
  dragHandle.addEventListener(
    "pointerdown",
    (e) => {
      if (e.button !== 0 || sandboxDragging) return;
      e.preventDefault();
      sandboxDragging = true;
      const r = panel.getBoundingClientRect();
      sandboxDragOx = e.clientX - r.left;
      sandboxDragOy = e.clientY - r.top;
      dragHandle.setPointerCapture(e.pointerId);
      window.addEventListener("pointermove", onSandboxDragMove, { signal });
      window.addEventListener("pointerup", onSandboxDragEnd, { signal });
      window.addEventListener("pointercancel", onSandboxDragEnd, { signal });
    },
    { signal },
  );

  panel.addEventListener(
    "click",
    (e) => {
      const flyBtn = (e.target as HTMLElement).closest(
        "[data-sandbox-toggle-fly]",
      ) as HTMLButtonElement | null;
      if (flyBtn && panel.contains(flyBtn)) {
        const fid = flyBtn.dataset.sandboxToggleFly;
        if (fid) model.sandboxToggleHeroFlying(fid);
        return;
      }
      const lvlBtn = (e.target as HTMLElement).closest(
        "[data-sandbox-level-up]",
      ) as HTMLButtonElement | null;
      if (lvlBtn && panel.contains(lvlBtn)) {
        const lid = lvlBtn.dataset.sandboxLevelUp;
        if (lid) model.sandboxAddHeroLevel(lid);
        return;
      }
      const formaBtn = (e.target as HTMLElement).closest(
        "[data-sandbox-forma-final]",
      ) as HTMLButtonElement | null;
      if (formaBtn && panel.contains(formaBtn)) {
        const fid = formaBtn.dataset.sandboxFormaFinal;
        if (fid) model.sandboxOpenFormaFinalPick(fid);
        return;
      }
      const btn = (e.target as HTMLElement).closest(
        "[data-sandbox-kill-hero]",
      ) as HTMLButtonElement | null;
      if (!btn || !panel.contains(btn)) return;
      const hid = btn.dataset.sandboxKillHero;
      if (!hid) return;
      model.sandboxKillHero(hid);
    },
    { signal },
  );

  document.addEventListener(
    "keydown",
    (ev) => {
      if (ev.repeat || ev.ctrlKey || ev.metaKey || ev.altKey) return;
      if (ev.key !== "a" && ev.key !== "A") return;
      const t = ev.target as HTMLElement | null;
      if (
        t &&
        (t.tagName === "INPUT" ||
          t.tagName === "TEXTAREA" ||
          t.tagName === "SELECT" ||
          t.isContentEditable)
      ) {
        return;
      }
      if (!model.devSandboxMode) return;
      if (model.phase !== "combat") return;
      ev.preventDefault();
      ev.stopPropagation();
      toggleCombatSandboxPanelVisibility();
    },
    { capture: true, signal },
  );

  const sel = panel.querySelector(
    "#combat-sandbox-wave-sel",
  ) as HTMLSelectElement;
  sel.addEventListener(
    "change",
    () => {
      const v = Number(sel.value);
      if (!Number.isFinite(v)) return;
      model.sandboxRestartWave(v);
    },
    { signal },
  );
  const noCdUltCb = panel.querySelector(
    "#combat-sandbox-no-cd-ult",
  ) as HTMLInputElement | null;
  if (noCdUltCb) {
    noCdUltCb.checked = getSandboxNoCdUltReady();
    noCdUltCb.addEventListener(
      "change",
      () => {
        setSandboxNoCdUltReady(noCdUltCb.checked);
        model.requestUiUpdate();
      },
      { signal },
    );
  }
  if (hero) {
    const searchInp = panel.querySelector(
      "#combat-sandbox-artifact-search",
    ) as HTMLInputElement | null;
    if (searchInp) {
      searchInp.value = combatSandboxArtifactSearchQuery;
      const runFilter = (): void => {
        combatSandboxArtifactSearchQuery = searchInp.value;
        applyCombatSandboxArtifactFilter(panel, combatSandboxArtifactSearchQuery);
      };
      searchInp.addEventListener("input", runFilter, { signal });
      /** IME (acentos): o `input` pode falhar até fechar a composição. */
      searchInp.addEventListener("compositionend", runFilter, { signal });
    }
    panel.querySelectorAll("[data-sandbox-artifact]").forEach((node) => {
      const btn = node as HTMLElement;
      const artId = btn.dataset.sandboxArtifact;
      if (!artId) return;
      btn.addEventListener("contextmenu", (e) => e.preventDefault(), {
        signal,
      });
      btn.addEventListener(
        "mousedown",
        (e) => {
          if (e.button !== 0 && e.button !== 2) return;
          e.preventDefault();
          const delta = e.button === 0 ? (1 as const) : (-1 as const);
          const hNow = sandboxHeroForCombatEditor(model);
          if (!hNow) return;
          model.sandboxAdjustArtifact(hNow.id, artId, delta);
        },
        { signal },
      );
      bindGameTooltip(btn, () => {
        const def = artifactDefById(artId);
        const hNow = sandboxHeroForCombatEditor(model);
        const cur = hNow?.artifacts[artId] ?? 0;
        const cap = getArtifactMaxStacks(artId);
        const state = `<p class="artifact-tt-sandbox-state"><strong>Acúmulos:</strong> ${cur}/${cap}</p>`;
        const flavor = def?.description
          ? `<p class="artifact-tt-sandbox-flavor">${escapeHtml(def.description)}</p>`
          : "";
        return `<div class="game-ui-tooltip-inner game-ui-tooltip-inner--wide-artifact">${state}${flavor}${artifactCodexAllTiersHtml(artId, hNow ?? hero)}</div>`;
      });
    });
    applyCombatSandboxArtifactFilter(panel, combatSandboxArtifactSearchQuery);
  }
}

function mountGoldShopArtifactStrip(panel: HTMLElement, h: Unit): void {
  const wrap = panel.querySelector(
    "#shop-hero-artifacts-wrap",
  ) as HTMLElement | null;
  const strip = panel.querySelector(
    "#shop-hero-artifacts-strip",
  ) as HTMLElement | null;
  const btnUp = panel.querySelector(
    "#shop-artifacts-up",
  ) as HTMLButtonElement | null;
  const btnDown = panel.querySelector(
    "#shop-artifacts-down",
  ) as HTMLButtonElement | null;
  if (!wrap || !strip) return;

  const arts = Object.entries(h.artifacts).filter(
    ([id, n]) => n > 0 && isArtifactVisibleInHud(id),
  );
  arts.sort(([a], [b]) => a.localeCompare(b));
  const artSig = `${h.id}|${arts.map(([id, n]) => `${id}:${n}`).join(",")}`;
  if (artSig !== goldShopArtifactSig) {
    goldShopArtifactSig = artSig;
    goldShopArtifactPage = 0;
  }
  const maxPage = Math.max(
    0,
    Math.ceil(arts.length / GOLD_SHOP_ARTIFACT_PAGE_SIZE) - 1,
  );
  goldShopArtifactPage = Math.min(goldShopArtifactPage, maxPage);

  const showPager = arts.length > GOLD_SHOP_ARTIFACT_PAGE_SIZE;
  wrap.classList.toggle("shop-hero-artifacts-wrap--paged", showPager);
  if (btnUp) {
    btnUp.hidden = !showPager;
    btnUp.disabled = goldShopArtifactPage <= 0;
    btnUp.onclick = () => {
      goldShopArtifactPage = Math.max(0, goldShopArtifactPage - 1);
      mountGoldShopArtifactStrip(panel, h);
    };
  }
  if (btnDown) {
    btnDown.hidden = !showPager;
    btnDown.disabled = goldShopArtifactPage >= maxPage;
    btnDown.onclick = () => {
      goldShopArtifactPage = Math.min(maxPage, goldShopArtifactPage + 1);
      mountGoldShopArtifactStrip(panel, h);
    };
  }

  if (arts.length === 0) {
    strip.innerHTML = `${artifactRaritySlotsStripHtml(h, model.getParty())}<span class="shop-hero-artifacts-empty">Nenhum artefato</span>`;
    return;
  }
  const a0 = goldShopArtifactPage * GOLD_SHOP_ARTIFACT_PAGE_SIZE;
  const pageArts = arts.slice(a0, a0 + GOLD_SHOP_ARTIFACT_PAGE_SIZE);
  const cards = pageArts
    .map(([id, stacks]) => {
      const cnt = artifactStackCounterLabel(id, stacks);
      const fig = artifactCardInnerHtml(id);
      return `<div class="artifact-mini-card" data-artifact-id="${escapeHtml(id)}" tabindex="0" role="img" aria-label="Artefato">${fig}<span class="artifact-mini-card__cnt">${cnt}</span></div>`;
    })
    .join("");
  const rangeHint =
    showPager && arts.length > 0
      ? `<div class="shop-hero-artifacts-page-hint" aria-hidden="true">${a0 + 1}–${Math.min(a0 + pageArts.length, arts.length)}/${arts.length}</div>`
      : "";
  strip.innerHTML = `${artifactRaritySlotsStripHtml(h, model.getParty())}${rangeHint}<div class="shop-hero-artifacts-cards">${cards}</div>`;
  strip.querySelectorAll("[data-artifact-id]").forEach((node) => {
    const el = node as HTMLElement;
    const aid = el.dataset.artifactId!;
    bindGameTooltip(el, () =>
      artifactTooltipHtml(aid, h.artifacts[aid] ?? 0, h, { showNext: true }),
    );
  });
  bindArtifactMiniCardStackHover(strip, h);
}

function showGoldShop(isInitial: boolean): void {
  const stayInShop =
    (model.phase === "shop_wave" && prevPhase === "shop_wave") ||
    (model.phase === "shop_initial" && prevPhase === "shop_initial");
  if (stayInShop && refreshGoldShop) {
    refreshGoldShop();
    return;
  }
  cancelGoldShopLayoutRaf();
  goldShopArtifactPage = 0;
  goldShopArtifactSig = "";
  goldShopBatchSize = 1;
  refreshGoldShop = null;
  hideGameTooltip();
  goldShopBunker3d?.dispose();
  goldShopBunker3d = null;
  goldShopStall3d?.dispose();
  goldShopStall3d = null;
  goldShopHeroPreview3d?.dispose();
  goldShopHeroPreview3d = null;
  removeEquipmentModal();
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
      clearRunSessionCheckpoint();
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
  const modalRoot = el(`<div id="shop-initial-empty-modal" class="shop-modal-overlay" hidden aria-hidden="true">
    <div class="shop-modal" role="dialog" aria-modal="true" aria-labelledby="shop-empty-modal-title">
      <h2 id="shop-empty-modal-title" class="shop-modal__title">Prosseguir sem compras?</h2>
      <p class="shop-modal__body">Não gastaste ouro na loja (melhorias nem bunker). Queres mesmo <strong>começar a wave 1</strong> assim?</p>
      <label class="shop-modal__check"><input type="checkbox" id="shop-empty-skip-future" /> Não mostrar esta pergunta novamente</label>
      <div class="shop-modal__actions">
        <button type="button" class="btn" id="shop-empty-cancel">Não, voltar</button>
        <button type="button" class="btn btn-primary" id="shop-empty-confirm">Sim, continuar</button>
      </div>
    </div>
  </div>`);
  shell.appendChild(modalRoot);

  const finishShop = (): void => {
    cancelGoldShopLayoutRaf();
    refreshGoldShop = null;
    goldShopStall3d?.dispose();
    goldShopStall3d = null;
    goldShopBunker3d?.dispose();
    goldShopBunker3d = null;
    goldShopHeroPreview3d?.dispose();
    goldShopHeroPreview3d = null;
    if (isInitial) model.finishInitialShop();
    else model.finishWaveShop();
    render();
  };

  const openEmptySpendConfirm = (): boolean => {
    if (!isInitial) return false;
    // Só avisar se o estado ainda for o da abertura da loja (nada gasto / alterado).
    if (model.shopHasChangesFromSnapshot()) return false;
    if (readSkipInitialShopEmptyConfirm()) return false;
    modalRoot.hidden = false;
    modalRoot.setAttribute("aria-hidden", "false");
    const cb = modalRoot.querySelector(
      "#shop-empty-skip-future",
    ) as HTMLInputElement | null;
    if (cb) cb.checked = false;
    return true;
  };

  const tryStartShop = (): void => {
    if (openEmptySpendConfirm()) return;
    finishShop();
  };

  modalRoot.querySelector("#shop-empty-confirm")!.addEventListener("click", () => {
    const cb = modalRoot.querySelector(
      "#shop-empty-skip-future",
    ) as HTMLInputElement | null;
    writeSkipInitialShopEmptyConfirm(!!cb?.checked);
    modalRoot.hidden = true;
    modalRoot.setAttribute("aria-hidden", "true");
    finishShop();
  });
  modalRoot.querySelector("#shop-empty-cancel")!.addEventListener("click", () => {
    modalRoot.hidden = true;
    modalRoot.setAttribute("aria-hidden", "true");
  });

  goldShopStall3d = new ShopStall3D(bgHost);
  goldShopStall3d.start();

  const queueRenderShop = (): void => {
    /* Reagendar sempre: se ignorássemos chamadas com RAF pendente, um emit
     * subsequente (ex.: evoluir bunker) podia ficar sem `renderShop` com o modelo novo. */
    if (goldShopLayoutRafId !== 0) {
      cancelAnimationFrame(goldShopLayoutRafId);
      goldShopLayoutRafId = 0;
    }
    goldShopLayoutRafId = requestAnimationFrame(() => {
      goldShopLayoutRafId = 0;
      renderShop();
    });
  };

  const renderShop = (): void => {
    hideGameTooltip();
    const party = model.getParty();
    idx = Math.min(Math.max(0, goldShopHeroIndex), Math.max(0, party.length - 1));
    goldShopHeroIndex = idx;
    if (party.length === 0) {
      goldShopBunker3d?.dispose();
      goldShopBunker3d = null;
      goldShopHeroPreview3d?.dispose();
      goldShopHeroPreview3d = null;
      panel.innerHTML = `<p class="shop-footer-msg" role="alert">Nenhum herói no grupo. Usa o menu de pausa ou recarrega; se guardaste a sessão, no menu principal podes tentar «Continuar run».</p>`;
      return;
    }
    goldShopBunker3d?.detachCanvasPreserveContext();
    goldShopHeroPreview3d?.detachCanvasPreserveContext();
    const h = party[idx]!;
    if (goldShopVizLastHeroId !== h.id) {
      goldShopVizFocus = "hero";
      goldShopVizLastHeroId = h.id;
    }
    const bunkerShop = model.bunkerForHeroHomeBiome(h);
    const heroGridHidden =
      bunkerShop && goldShopVizFocus === "bunker" ? " hidden" : "";
    const heroGridAria =
      bunkerShop && goldShopVizFocus === "bunker"
        ? ' aria-hidden="true"'
        : "";
    const batch = goldShopBatchSize;
    const goldBatchSegHtml = ([1, 5, 10] as const)
      .map((n) => {
        const active = batch === n ? " shop-gold-batch-btn--active" : "";
        return `<button type="button" class="shop-gold-batch-btn${active}" data-gold-batch="${n}" aria-pressed="${batch === n ? "true" : "false"}">×${n}</button>`;
      })
      .join("");
    const goldBatchWrapHtml = `<div id="shop-gold-batch-wrap" class="shop-gold-batch-wrap${heroGridHidden}"${heroGridAria}>
      <span class="shop-gold-batch-wrap__label">Comprar</span>
      <div class="shop-gold-batch-wrap__seg" role="group" aria-label="Quantidade por clique">${goldBatchSegHtml}</div>
    </div>`;
    const list = GOLD_SHOP.map((it, si) => {
      const xpFull =
        it.id === "xp_pct" && (h.artifacts["_xp_shop"] ?? 0) >= 60;
      const okBuy = goldShopBatchAffordable(it, h, batch);
      const cant = !okBuy || xpFull;
      const totalCost = goldShopUnitCost(it, h) * batch;
      const batchLabel = goldShopBatchLabel(it.id, batch);
      const ico = statIconWrap(goldShopStatIcon(it.id), si);
      const ariaBuy = cant
        ? xpFull
          ? `${batchLabel}: limite de melhoria atingido`
          : `${batchLabel}: ouro insuficiente ou lote maior que o permitido (${totalCost} ouro)`
        : `Comprar ${batchLabel} por ${totalCost} ouro`;
      return `<button type="button" class="shop-item shop-item--gold-buy" data-gold-shop-item="${escapeHtml(it.id)}" ${cant ? "disabled" : ""} aria-label="${escapeHtml(ariaBuy)}">
        <span class="shop-item__row">
          <span class="shop-item__ico">${ico}</span>
          <span class="shop-item__meta">
            <span class="shop-item__label">${escapeHtml(batchLabel)}</span>
            <span class="shop-item__cost">${totalCost} ouro</span>
          </span>
        </span>
      </button>`;
    }).join("");
    const refundCost = model.nextShopRefundCrystalCost();
    const hasShopChanges = model.shopHasChangesFromSnapshot();
    const canRefund =
      hasShopChanges &&
      (refundCost === 0 || model.meta.crystals >= refundCost);
    const refundAria = !hasShopChanges
      ? "Nada para reembolsar — o estado já é o da abertura da loja"
      : refundCost === 0
        ? "Reembolsar alterações da loja (custo: 0 Cristais)"
        : `Reembolsar alterações da loja por ${refundCost} Cristais`;
    const refundBtnInner = `<span class="shop-refund-btn__inner"><span class="shop-refund-btn__label">Reembolsar</span><span class="shop-refund-btn__crystal-line" aria-hidden="true">${metaCrystalIconSvgHtml()}<span class="shop-refund-btn__crystal-num">${refundCost}</span><span class="shop-refund-btn__crystal-suffix"> cristais</span></span></span>`;
    const startBtnLabel = isInitial ? "Começar wave 1" : "Próxima wave";
    const goldBagsHtml = party
      .map((ph, i) => {
        const active = i === idx;
        const tc = ph.teamColor
          ? teamColorCss(ph.teamColor)
          : "rgba(160, 150, 130, 0.85)";
        const bagLabel = `${ph.name}: ${formatOuroDisplay(ph.ouro)} ouro. ${
          active ? "A ver na loja." : "Clica para ver a loja deste herói."
        }`;
        return `<button type="button" class="shop-hero-gold-bag${
          active ? " shop-hero-gold-bag--active" : ""
        }" data-shop-hero-bag="${i}" style="--shop-bag-team: ${tc}" aria-pressed="${active}" aria-label="${escapeHtml(bagLabel)}">
          <span class="shop-hero-gold-bag__stripe" aria-hidden="true"></span>
          <span class="shop-hero-gold-bag__coin" aria-hidden="true">${combatGoldCoinSvgHtml("shop-hero-gold-bag__coin-svg")}</span>
          <span class="shop-hero-gold-bag__meta">
            <span class="shop-hero-gold-bag__value">${formatOuroDisplay(ph.ouro)}</span>
            <span class="shop-hero-gold-bag__name">${escapeHtml(ph.name)}</span>
          </span>
        </button>`;
      })
      .join("");
    const heroStatsColHtml = `
              <p class="shop-hero-stats-head">Atributos atuais</p>
              <div id="gold-shop-hero-stats" class="lol-stats-list gold-shop-hero-stats-grid"></div>
              <div id="gold-shop-hero-skills-wrap" class="gold-shop-hero-skills-wrap" hidden>
                <p class="shop-hero-stats-head">Habilidades</p>
                <div id="gold-shop-hero-skills" class="gold-shop-hero-skills-row" role="group" aria-label="Habilidades do herói"></div>
              </div>
              <div class="shop-hero-artifacts-section">
                <p class="shop-hero-stats-head">Artefatos</p>
                <div class="shop-hero-artifacts-wrap" id="shop-hero-artifacts-wrap">
                  <div class="shop-hero-artifacts-main">
                    <div id="shop-hero-artifacts-strip" class="shop-hero-artifacts-strip" aria-label="Artefatos do herói"></div>
                    <div class="shop-hero-artifacts-pager-stack">
                      <button type="button" class="shop-hero-artifacts-pager shop-hero-artifacts-pager--up" id="shop-artifacts-up" aria-label="Artefatos anteriores" hidden>▲</button>
                      <button type="button" class="shop-hero-artifacts-pager shop-hero-artifacts-pager--down" id="shop-artifacts-down" aria-label="Artefatos seguintes" hidden>▼</button>
                    </div>
                  </div>
                </div>
              </div>`;
    const vizAndGridBlock = bunkerShop
      ? (() => {
          const carouselBunker =
            goldShopVizFocus === "bunker"
              ? " shop-viz-turntable-inner--bunker"
              : "";
          const bunkMidHidden = goldShopVizFocus === "hero" ? " hidden" : "";
          const bunkMidAria = goldShopVizFocus === "hero" ? ' aria-hidden="true"' : "";
          return `<div class="shop-viz-flip-wrap">
        <div class="shop-viz-flip-row">
          <div class="shop-viz-stage">
            <div class="shop-viz-turntable">
              <div id="shop-viz-carousel" class="shop-viz-turntable-inner${carouselBunker}">
                <div class="shop-viz-turntable-panel shop-viz-turntable-panel--hero">
                  <div class="shop-hero-viz" aria-label="Herói e atributos atuais">
                    <p class="shop-viz-flip-entity-title">${escapeHtml(h.name)}</p>
                    <div id="gold-shop-hero-3d" class="gold-shop-hero-3d-host gold-shop-hero-3d-host--carousel" aria-hidden="true"></div>
                    <div class="shop-hero-stats-col">${heroStatsColHtml}
                    </div>
                  </div>
                </div>
                <div class="shop-viz-turntable-panel shop-viz-turntable-panel--bunker">
                  <div class="shop-bunker-viz shop-hero-viz" aria-label="Bunker da arena">
                    <p class="shop-viz-flip-entity-title">Bunker da arena</p>
                    ${goldShopBunkerSectionHtml(bunkerShop)}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <button type="button" class="shop-viz-flip-arrow" id="shop-viz-flip-toggle" aria-label="Mostrar bunker — compras do bunker na grelha abaixo">
            <span class="shop-viz-flip-arrow__chevron" aria-hidden="true">→</span>
            <span class="shop-viz-flip-arrow__text">Bunker</span>
          </button>
        </div>
      </div>
        <div class="shop-mid-row">
          <div class="shop-mid-cell shop-mid-cell--gold">
            ${goldBatchWrapHtml}
            <div id="shop-grid-hero-gold" class="shop-grid"${heroGridHidden}${heroGridAria}>${list}</div>
            <div id="shop-bunker-mid-block" class="shop-bunker-mid-block shop-bunker-mid-block--buys-only"${bunkMidHidden}${bunkMidAria}>
              <div id="shop-grid-bunker-gold" class="shop-grid shop-grid--bunker-buy">${goldShopBunkerBuyGridHtml(bunkerShop, h)}</div>
            </div>
          </div>
        </div>`;
        })()
      : `<div class="shop-hero-bunker-pair shop-hero-bunker-pair--solo">
          <div class="shop-hero-viz" aria-label="Herói e atributos atuais">
            <div id="gold-shop-hero-3d" class="gold-shop-hero-3d-host" aria-hidden="true"></div>
            <div class="shop-hero-stats-col">${heroStatsColHtml}
            </div>
          </div>
        </div>
        <div class="shop-mid-row">
          <div class="shop-mid-cell shop-mid-cell--gold">
            ${goldBatchWrapHtml}
            <div id="shop-grid-hero-gold" class="shop-grid">${list}</div>
          </div>
        </div>`;
    panel.innerHTML = `
      <div class="shop-panel-inner">
        <h1 class="shop-title hero-setup-main-title">Loja do coliseu</h1>
        <div class="shop-hero-gold-bags" role="group" aria-label="Ouro por herói — cada um tem a sua bolsa">
          ${goldBagsHtml}
        </div>
        ${vizAndGridBlock}
        <div class="shop-footer">
          <p id="shop-footer-msg" class="shop-footer-msg" role="status" hidden></p>
          <div class="shop-footer-crystals" aria-label="Cristais disponíveis">
            <span class="shop-footer-crystals__num">${model.meta.crystals}</span>
            ${metaCrystalIconSvgHtml("shop-footer-crystals__ico")}
          </div>
          <div class="shop-footer__actions">
            <button type="button" class="btn shop-refund-btn" id="shop-refund" ${!canRefund ? "disabled" : ""} aria-label="${escapeHtml(refundAria)}">${refundBtnInner}</button>
            <button type="button" class="btn btn-primary" id="shop-start">${escapeHtml(startBtnLabel)}</button>
          </div>
        </div>
      </div>`;
    if (bunkerShop) {
      const bunkerStatsEl = panel.querySelector(
        "#gold-shop-bunker-stats",
      ) as HTMLElement | null;
      if (bunkerStatsEl)
        renderHeroStatsGrid(bunkerStatsEl, bunkerShopStatCells(bunkerShop));
      const bunkerSkillsRow = panel.querySelector(
        "#gold-shop-bunker-skills",
      ) as HTMLElement | null;
      if (bunkerSkillsRow)
        mountGoldShopBunkerSkillsRow(bunkerSkillsRow, bunkerShop, h, model);
      applyGoldShopVizFocus(panel, true);
      panel.querySelector("#shop-viz-flip-toggle")?.addEventListener("click", () => {
        goldShopVizFocus = goldShopVizFocus === "hero" ? "bunker" : "hero";
        applyGoldShopVizFocus(panel, true);
      });
    }
    panel.querySelectorAll("[data-gold-batch]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const v = Number((btn as HTMLElement).dataset.goldBatch);
        if (v === 1 || v === 5 || v === 10) {
          goldShopBatchSize = v as GoldShopBatchSize;
          queueRenderShop();
        }
      });
    });
    panel.querySelectorAll("[data-gold-shop-item]").forEach((b) => {
      b.addEventListener("click", () => {
        const id = (b as HTMLElement).dataset.goldShopItem as GoldShopId;
        const prevTab = goldShopHeroStatsTabRef.current;
        if (id && id in GOLD_SHOP_TAB_FOR_ITEM) {
          goldShopHeroStatsTabRef.current = GOLD_SHOP_TAB_FOR_ITEM[id];
        }
        const ok = model.buyGoldItem(h.id, id, goldShopBatchSize);
        if (!ok && id && id in GOLD_SHOP_TAB_FOR_ITEM) {
          goldShopHeroStatsTabRef.current = prevTab;
        }
        /* `emit` → `render` → `refreshGoldShop`; evitar segundo `renderShop` aqui (WebGL). */
      });
    });
    panel.querySelectorAll("[data-gold-bunker-buy]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const kind = (btn as HTMLElement).dataset.goldBunkerBuy;
        let ok = false;
        if (kind === "repair") ok = model.buyBunkerRepair(h.id);
        else if (kind === "evolve") ok = model.buyBunkerEvolve(h.id);
        else if (kind === "auto_reparo") ok = model.buyBunkerAutoRepair(h.id);
        else if (kind === "fortificar") ok = model.buyBunkerFortify(h.id);
        if (ok) {
          goldShopVizFocus = "bunker";
          queueRenderShop();
        }
      });
    });
    const bEv = panel.querySelector("#gold-shop-bunk-evolve") as HTMLElement | null;
    const bunkTierUi =
      bunkerShop != null ? effectiveBunkerTier(bunkerShop) : 0;
    if (bEv && bunkerShop && bunkTierUi < 2) {
      bindGameTooltip(bEv, () => bunkerEvolveTooltipHtml(bunkTierUi));
    }
    const bAr = panel.querySelector(
      "#gold-shop-bunk-auto-reparo",
    ) as HTMLElement | null;
    if (bAr && bunkerShop && bunkTierUi >= BUNKER_AUTO_REPAIR_MIN_TIER) {
      bindGameTooltip(bAr, () => bunkerAutoReparoShopTooltipHtml(bunkerShop));
    }
    const bFo = panel.querySelector(
      "#gold-shop-bunk-fortificar",
    ) as HTMLElement | null;
    if (bFo && bunkerShop && bunkTierUi >= BUNKER_FORTIFY_MIN_TIER) {
      bindGameTooltip(bFo, () => bunkerFortificarShopTooltipHtml(bunkerShop));
    }
    panel.querySelectorAll(".shop-hero-gold-bag").forEach((node) => {
      bindGameTooltip(node as HTMLElement, () => {
        const i = Number((node as HTMLElement).dataset.shopHeroBag);
        const ph = party[i];
        if (!ph)
          return `<div class="game-ui-tooltip-inner"><div class="game-ui-tooltip-title">Bolsa de ouro</div></div>`;
        const title = escapeHtml(ph.name);
        const body = `<p class="game-ui-tooltip-passive">Bolsa <strong>individual</strong>: só este herói pode gastar estes <strong>${formatOuroDisplay(ph.ouro)}</strong> ouro na loja.</p>`;
        return `<div class="game-ui-tooltip-inner"><div class="game-ui-tooltip-title">${title}</div>${body}</div>`;
      });
    });
    panel.querySelectorAll("[data-shop-hero-bag]").forEach((node) => {
      node.addEventListener("click", () => {
        const i = Number((node as HTMLElement).dataset.shopHeroBag);
        if (!Number.isFinite(i) || i < 0 || i >= party.length) return;
        idx = i;
        goldShopHeroIndex = idx;
        queueRenderShop();
      });
    });
    const prevHost = panel.querySelector("#bunker-preview-host");
    if (prevHost && bunkerShop) {
      if (goldShopBunker3d) {
        goldShopBunker3d.reattachToHost(prevHost as HTMLElement);
        goldShopBunker3d.setTier(effectiveBunkerTier(bunkerShop));
        goldShopBunker3d.start();
      } else {
        goldShopBunker3d = new BunkerPreview3D(prevHost as HTMLElement);
        goldShopBunker3d.setTier(effectiveBunkerTier(bunkerShop));
        goldShopBunker3d.start();
      }
    } else {
      goldShopBunker3d?.dispose();
      goldShopBunker3d = null;
    }
    const hero3dHost = panel.querySelector("#gold-shop-hero-3d") as HTMLElement;
    const heroStatsEl = panel.querySelector(
      "#gold-shop-hero-stats",
    ) as HTMLElement;
    const skillsWrap = panel.querySelector(
      "#gold-shop-hero-skills-wrap",
    ) as HTMLElement | null;
    const skillsRow = panel.querySelector(
      "#gold-shop-hero-skills",
    ) as HTMLElement | null;
    if (h.heroClass) {
      if (skillsWrap) skillsWrap.hidden = false;
      const layoutKind = bunkerShop ? "turntable" : "solo";
      const canRecycleHero =
        goldShopHeroPreview3d?.matchesGoldShopLayout(layoutKind) ?? false;
      if (canRecycleHero) {
        goldShopHeroPreview3d!.reattachToHost(hero3dHost);
      } else {
        goldShopHeroPreview3d?.dispose();
        goldShopHeroPreview3d = bunkerShop
          ? new HeroPreview3D(
              hero3dHost,
              400,
              300,
              heroPreviewCameraGoldShopTurntable,
              "turntable",
            )
          : new HeroPreview3D(
              hero3dHost,
              220,
              260,
              heroPreviewCameraGoldShopSolo,
              "solo",
            );
      }
      const shopForma =
        h.formaFinal && h.ultimateId
          ? { formaFinal: true as const, ultimateId: h.ultimateId }
          : undefined;
      goldShopHeroPreview3d!.setHero(
        h.heroClass,
        h.displayColor,
        h.forgeLoadout,
        shopForma,
      );
      goldShopHeroPreview3d!.start();
      renderHeroStatsGridWithTabs(
        heroStatsEl,
        heroStatCells(h, model),
        goldShopHeroStatsTabRef,
      );
      if (skillsRow) mountGoldShopHeroSkillsRow(skillsRow, h, model);
    } else {
      goldShopHeroPreview3d?.dispose();
      goldShopHeroPreview3d = null;
      if (skillsWrap) {
        skillsWrap.hidden = true;
        if (skillsRow) skillsRow.innerHTML = "";
      }
      hero3dHost.style.display = "none";
      heroStatsEl.innerHTML =
        '<p class="shop-hero-stats-fallback">Sem classe — sem pré-visualização 3D.</p>';
    }
    mountGoldShopArtifactStrip(panel, h);
    const footMsg = panel.querySelector("#shop-footer-msg") as HTMLElement | null;
    panel.querySelector("#shop-start")!.addEventListener("click", () => {
      if (footMsg) {
        footMsg.hidden = true;
        footMsg.textContent = "";
      }
      tryStartShop();
    });
    panel.querySelector("#shop-refund")!.addEventListener("click", () => {
      const r = model.tryShopRefund();
      if (r === "ok") {
        if (footMsg) {
          footMsg.hidden = true;
          footMsg.textContent = "";
        }
        return;
      }
      if (!footMsg) return;
      footMsg.hidden = false;
      if (r === "no_changes")
        footMsg.textContent = "Nada para reembolsar — o estado já é o da abertura da loja.";
      else if (r === "no_crystals")
        footMsg.textContent =
          "Cristais insuficientes: o próximo reembolso custa 5 Cristais.";
      else footMsg.textContent = "Não foi possível reembolsar.";
    });
  };
  refreshGoldShop = queueRenderShop;
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

/** Custo de mana no badge do ícone (inteiro; tooltips usam `formatTooltipNumber`). */
function manaCostBadgeText(cost: number): string {
  return String(Math.round(cost));
}

/** Inteiros em linhas de tooltip (nível arma, mana, ondas de CD). */
function tipInt(n: number): string {
  return String(Math.round(n));
}

/** Cantos do mapa no combate: sempre inteiros (sem vírgula / `formatTooltipNumber`). */
function combatCornerIntText(n: number): string {
  if (!Number.isFinite(n)) return "0";
  return String(Math.max(0, Math.round(n)));
}

/** Preenchimento 0–100 (CD a terminar), estilo ultimate mas prateado. */
function combatSkillCdFillPercent(
  cdEff: number,
  maxWaves: number,
): number | undefined {
  if (cdEff <= 0 || maxWaves <= 0) return undefined;
  const max = Math.max(maxWaves, cdEff, 1);
  return Math.round(
    Math.min(100, Math.max(0, (100 * (max - cdEff)) / max)),
  );
}

function combatSkillMaxCdWaves(
  m: GameModel,
  h: Unit,
  skillId: string,
  cdEff: number,
  skillDef?: SkillDef,
): number {
  if (skillId === "bunker_minas") {
    const b = m.bunkerForOccupant(h.id);
    return b ? bunkerMinasCooldownWaves(b.tier) : 1;
  }
  if (skillId === "bunker_tiro_preciso") return bunkerTiroCooldownWaves();
  if (skillId === "ate_a_morte") return ateMorteCooldownWaves(h.weaponLevel);
  if (skillId === "pisotear") return pisotearCooldownWaves(h.weaponLevel);
  if (skillId === "tiro_destruidor") {
    const tiroSk = pistoleiroTiroDestruidorSkillDef();
    return Math.max(1, tiroSk.cooldownWaves ?? 1);
  }
  if (skillId === "sentenca") return sentencaCooldownWaves(h.weaponLevel);
  if (skillId === "atirar_todo_lado" || skillId === "atirar") {
    return atirarCooldownWaves(h.weaponLevel);
  }
  if (skillDef && skillDef.cooldownWaves > 0) return skillDef.cooldownWaves;
  return Math.max(1, cdEff);
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
  /** Preenchimento prateado durante CD (0–100). */
  skillCdFillPct?: number;
  /** Uma letra/número minúsculo: mesmo efeito que o clique (atalho de combate). */
  combatHotkey?: string;
  /** Ondas restantes de recarga (mostrado no canto superior esquerdo, branco). */
  cdTurns?: number;
  /** Contagem no botão (ex.: loja); no combate usar cantos do mapa. */
  usesBadge?: { cur: number; max: number };
  /** Sem badge de mana no canto (ex.: ataque básico). */
  omitManaBadge?: boolean;
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
  const cdFill =
    opts.skillCdFillPct != null &&
    opts.cdTurns != null &&
    opts.cdTurns > 0
      ? `<span class="lol-skill-cd-fill" style="--skill-cd-pct:${opts.skillCdFillPct}" aria-hidden="true"></span>`
      : "";
  const hkAttr =
    opts.combatHotkey && opts.combatHotkey.length > 0
      ? ` data-combat-hotkey="${escapeHtml(opts.combatHotkey.slice(0, 1).toLowerCase())}"`
      : "";
  const cdBadge =
    opts.cdTurns != null && opts.cdTurns > 0
      ? `<span class="lol-skill-cd-badge" aria-hidden="true">${String(opts.cdTurns)}</span>`
      : "";
  const usesBadge =
    opts.usesBadge != null
      ? `<span class="lol-skill-uses-badge" aria-hidden="true">${escapeHtml(`Ataques: ${opts.usesBadge.cur}/${opts.usesBadge.max}`)}</span>`
      : "";
  const manaSpan = opts.omitManaBadge
    ? ""
    : `<span class="lol-mana-badge" aria-hidden="true">${escapeHtml(opts.manaBadge)}</span>`;
  let selAttr = "";
  if (opts.selectKind) {
    selAttr += ` data-combat-select-kind="${escapeHtml(opts.selectKind)}"`;
    if (opts.selectKind === "skill" && opts.selectId)
      selAttr += ` data-combat-select-id="${escapeHtml(opts.selectId)}"`;
  }
  return `<button type="button" class="${cls}"${dis}${st}${hkAttr}${selAttr} aria-label="${escapeHtml(opts.ariaLabel)}">${cdBadge}${usesBadge}${fill}${cdFill}${opts.iconHtml}<span class="lol-skill-key-wrap"><span class="lol-key">${escapeHtml(opts.hotkey)}</span></span>${manaSpan}</button>`;
}

/** Ícone de skill na loja (sem tecla de combate); tooltips iguais ao HUD. */
function goldShopSkillChipHtml(opts: {
  iconHtml: string;
  manaBadge: string;
  ariaLabel: string;
  cdTurns?: number;
  extraClass?: string;
  extraStyle?: string;
  ultFill?: boolean;
  /** Sem badge de mana (ex.: skills do bunker na loja, só ícone como no pedido). */
  omitManaBadge?: boolean;
}): string {
  const parts = [
    "btn",
    "lol-skill-btn",
    "lol-skill-btn--square",
    "gold-shop-skill-chip",
  ];
  if (opts.extraClass) parts.push(opts.extraClass);
  if (opts.omitManaBadge) parts.push("gold-shop-skill-chip--no-mana");
  const cls = parts.join(" ");
  const st = opts.extraStyle ? ` style="${opts.extraStyle}"` : "";
  const fill = opts.ultFill
    ? '<span class="lol-weapon-ult-fill" aria-hidden="true"></span>'
    : "";
  const cdBadge =
    opts.cdTurns != null && opts.cdTurns > 0
      ? `<span class="lol-skill-cd-badge" aria-hidden="true">${String(opts.cdTurns)}</span>`
      : "";
  const manaSpan = opts.omitManaBadge
    ? ""
    : `<span class="lol-mana-badge" aria-hidden="true">${escapeHtml(opts.manaBadge)}</span>`;
  return `<button type="button" class="${cls}" tabindex="0"${st} aria-label="${escapeHtml(opts.ariaLabel)}">${cdBadge}${fill}${opts.iconHtml}${manaSpan}</button>`;
}

/** Preenche a fila de skills na loja com os mesmos tooltips que no combate. */
function mountGoldShopHeroSkillsRow(
  row: HTMLElement,
  h: Unit,
  m: GameModel,
): void {
  row.innerHTML = "";
  if (!h.heroClass) return;
  const tmpl = HEROES[h.heroClass];
  const cdEff = (cd: number) => (m.sandboxNoCdUltEnabled() ? 0 : cd);
  const inGoldShop =
    m.phase === "shop_initial" || m.phase === "shop_wave";
  const append = (html: string, tip: () => string): void => {
    const b = el(html);
    b.addEventListener("click", (e) => e.preventDefault());
    bindGameTooltip(b, tip);
    row.appendChild(b);
  };

  append(
    goldShopSkillChipHtml({
      iconHtml: basicAttackIconHtml(),
      manaBadge: "",
      ariaLabel: "Ataque básico",
      omitManaBadge: true,
    }),
    () => tooltipBasicAttack(h, m),
  );

  const bunk = h.isPlayer ? m.bunkerForOccupant(h.id) : null;
  const inBunker = bunk != null && bunk.hp > 0;
  if (inBunker && bunk) {
    const cdM = cdEff(h.skillCd["bunker_minas"] ?? 0);
    if (inGoldShop) {
      append(
        goldShopBunkerSkillSquareHtml({
          skillId: "bunker_minas",
          hotkey: "W",
          disabled: false,
        }),
        () => bunkerMinasGoldShopCompositeTooltip(h, m, bunk.tier),
      );
      const tiroOk = bunk.tier >= BUNKER_TIRO_MIN_TIER;
      append(
        goldShopBunkerSkillSquareHtml({
          skillId: "bunker_tiro_preciso",
          hotkey: "E",
          disabled: !tiroOk,
          extraClass: tiroOk ? undefined : "gold-shop-bunker-skill--locked",
        }),
        () => bunkerTiroGoldShopCompositeTooltip(h, m, bunk.tier),
      );
    } else {
      append(
        goldShopSkillChipHtml({
          iconHtml: skillButtonIconHtml("bunker_minas"),
          manaBadge: manaCostBadgeText(0),
          ariaLabel: ariaSkillLabel("Minas terrestres", cdM),
          cdTurns: cdM > 0 ? cdM : undefined,
        }),
        () => tooltipBunkerMinasCombat(h, m),
      );
      if (bunk.tier >= 2) {
        const cdT = cdEff(h.skillCd["bunker_tiro_preciso"] ?? 0);
        append(
          goldShopSkillChipHtml({
            iconHtml: skillButtonIconHtml("bunker_tiro_preciso"),
            manaBadge: manaCostBadgeText(0),
            ariaLabel: ariaSkillLabel("Tiro preciso", cdT),
            cdTurns: cdT > 0 ? cdT : undefined,
          }),
          () => tooltipBunkerTiroCombat(h, m),
        );
      }
    }
  } else {
    if (h.heroClass === "gladiador") {
      const inFuria = (h.furiaGiganteTurns ?? 0) > 0;
      if (inFuria) {
        const cd = cdEff(h.skillCd["pisotear"] ?? 0);
        const mc = pisotearManaCost(h.weaponLevel);
        append(
          goldShopSkillChipHtml({
            iconHtml: skillButtonIconHtml("pisotear"),
            manaBadge: manaCostBadgeText(mc),
            ariaLabel: ariaSkillLabel("Pisotear", cd),
            cdTurns: cd > 0 ? cd : undefined,
          }),
          () => tooltipSkillPisotear(h, m),
        );
      } else {
        const sk0 = tmpl.skills[0]!;
        const skA: SkillDef = {
          id: "ate_a_morte",
          name: sk0.name,
          description: sk0.description,
          cooldownWaves: ateMorteCooldownWaves(h.weaponLevel),
          manaCost: ateMorteManaCost(h.weaponLevel),
        };
        const cd = cdEff(h.skillCd["ate_a_morte"] ?? 0);
        append(
          goldShopSkillChipHtml({
            iconHtml: skillButtonIconHtml("ate_a_morte"),
            manaBadge: manaCostBadgeText(ateMorteManaCost(h.weaponLevel)),
            ariaLabel: ariaSkillLabel(skA.name, cd),
            cdTurns: cd > 0 ? cd : undefined,
          }),
          () => tooltipSkillAteMorte(h, m, skA),
        );
      }
    } else {
      for (const sk of tmpl.skills) {
        if (sk.id === "sentenca") {
          const sm = sentencaManaCost(h.weaponLevel);
          const cdS = cdEff(h.skillCd[sk.id] ?? 0);
          append(
            goldShopSkillChipHtml({
              iconHtml: skillButtonIconHtml(sk.id),
              manaBadge: manaCostBadgeText(sm),
              ariaLabel: ariaSkillLabel(sk.name, cdS),
              cdTurns: cdS > 0 ? cdS : undefined,
            }),
            () => tooltipSkillById(h, m, sk),
          );
          continue;
        }
        if (
          sk.id === "atirar_todo_lado" &&
          h.heroClass === "pistoleiro" &&
          h.ultimateId === "arauto_caos"
        ) {
          const tiroSk = pistoleiroTiroDestruidorSkillDef();
          const cdT = cdEff(h.skillCd["tiro_destruidor"] ?? 0);
          append(
            goldShopSkillChipHtml({
              iconHtml: skillButtonIconHtml("tiro_destruidor"),
              manaBadge: manaCostBadgeText(tiroSk.manaCost ?? 0),
              ariaLabel: ariaSkillLabel(tiroSk.name, cdT),
              cdTurns: cdT > 0 ? cdT : undefined,
            }),
            () => tooltipSkillById(h, m, tiroSk),
          );
          continue;
        }
        const cd = cdEff(h.skillCd[sk.id] ?? 0);
        append(
          goldShopSkillChipHtml({
            iconHtml: skillButtonIconHtml(sk.id),
            manaBadge: manaCostBadgeText(sk.manaCost ?? 0),
            ariaLabel: ariaSkillLabel(sk.name, cd),
            cdTurns: cd > 0 ? cd : undefined,
          }),
          () => tooltipSkillById(h, m, sk),
        );
      }
    }
  }

  if (
    !(inBunker && bunk) &&
    (h.heroClass === "sacerdotisa" ||
      h.heroClass === "pistoleiro" ||
      h.heroClass === "gladiador")
  ) {
    const cls = h.heroClass!;
    const ready = m.sandboxNoCdUltEnabled() || h.weaponUltMeter >= 1;
    const pct = Math.round(
      m.sandboxNoCdUltEnabled() ? 100 : h.weaponUltMeter * 100,
    );
    const wname = weaponUltNamePt(cls);
    const wid = weaponUltIconId(cls);
    append(
      goldShopSkillChipHtml({
        iconHtml: skillButtonIconHtml(wid),
        manaBadge: manaCostBadgeText(0),
        ariaLabel: wname,
        extraClass: `lol-skill-btn--weapon-ult ${ready ? "lol-skill-btn--weapon-ult--ready" : ""}`,
        extraStyle: `--weapon-ult-pct:${pct}`,
        ultFill: true,
      }),
      () => tooltipWeaponUltimate(h),
    );
  }

  if (
    !(inBunker && bunk) &&
    h.ultimateId === "especialista_destruicao"
  ) {
    const ult = HEROES.pistoleiro.ultimates.find(
      (u) => u.id === "especialista_destruicao",
    )!;
    append(
      goldShopSkillChipHtml({
        iconHtml: skillButtonIconHtml("especialista_destruicao"),
        manaBadge: manaCostBadgeText(0),
        ariaLabel: ult.name,
      }),
      () => tooltipEspecialista(h, m),
    );
  }
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

/** Fecha painéis flutuantes antes de armar ataque/skill no combate. */
function dismissCombatTransientUi(): void {
  hideGameTooltip();
  removeEquipmentModal();
  document.getElementById("combat-artifact-ref-overlay")?.remove();
  combatInspectEnemyId = null;
  combatLolInspectHeroId = null;
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
  chosenColiseumTier: ColiseumTierId,
  onFullyClosed?: () => void,
): void {
  killWaveIntroTimers();
  document.querySelectorAll(".wave-intro-overlay").forEach((n) => n.remove());
  const overlay = document.createElement("div");
  overlay.className = "wave-intro-overlay";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute(
    "aria-label",
    coliseumRunWaveTaglinePt(waveNum, chosenColiseumTier),
  );
  overlay.innerHTML = `<div class="wave-intro-inner game-ui-tooltip-inner"><div class="wave-intro-title">${escapeHtml(coliseumRunWaveTaglinePt(waveNum, chosenColiseumTier))}</div></div>`;
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

/** Cometa arcano: cinemático no canvas e depois liberta a fase inimiga. */
function startCometaArcanoCinematicThenRelease(): void {
  const h = model.currentHero();
  const hq = h?.q ?? 0;
  const hr = h?.r ?? 0;
  view.startCometaArcanoCinematic({
    canvas,
    heroQ: hq,
    heroR: hr,
    onImpact: () => {
      model.applyCometaArcanoStrike();
    },
    onComplete: () => {
      model.releaseEnemyPhaseAfterWaveIntro();
    },
  });
}

function releaseEnemyPhaseAfterWaveIntroOrCometa(): void {
  if (model.partyGuerraTotalStackSum() <= 0) {
    model.releaseEnemyPhaseAfterWaveIntro();
    return;
  }
  requestAnimationFrame(() => startCometaArcanoCinematicThenRelease());
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
    const approx = baseDano * mul;
    skillBlock = tipLines(sk.name, [
      { label: "Nível arma:", value: tipInt(w), kind: "fx" },
      { label: "CDR:", value: `${tipInt(cd)} onda(s)`, kind: "cdr" },
      { label: "Mana:", value: tipInt(0), kind: "mana" },
      {
        label: "Dano:",
        value: `${formatTooltipNumber(approx)} bruto por inimigo no alcance (referência nv. 1)`,
        kind: "dmg",
      },
    ]);
  } else if (cls === "gladiador") {
    const cd = ateMorteCooldownWaves(w);
    const mul = ateMorteDamageMult(w);
    const mc = ateMorteManaCost(w);
    const approx = baseDano * mul;
    skillBlock = tipLines(sk.name, [
      { label: "Nível arma:", value: tipInt(w), kind: "fx" },
      { label: "CDR:", value: `${tipInt(cd)} onda(s)`, kind: "cdr" },
      { label: "Mana:", value: tipInt(mc), kind: "mana" },
      {
        label: "Dano:",
        value: `${formatTooltipNumber(approx)} bruto por teu golpe no duelo (referência nv. 1)`,
        kind: "dmg",
      },
    ]);
  } else {
    const cd = sentencaCooldownWaves(w);
    const mc = sentencaManaCost(w);
    const dm = sentencaDamageMult(w);
    const hm = sentencaHealMult(w);
    const sh = sentencaShieldOverflowRatio(w);
    const approx = baseDano * dm;
    const healBase = baseDano * hm;
    const potPts = priestPassivePotencialPoints(1);
    const healEff = healBase * (1 + potPts / 100);
    const escudoExcesso = healEff * sh;
    skillBlock = tipLines(sk.name, [
      { label: "Nível arma:", value: tipInt(w), kind: "fx" },
      { label: "CDR:", value: `${tipInt(cd)} onda(s)`, kind: "cdr" },
      { label: "Mana:", value: tipInt(mc), kind: "mana" },
      {
        label: "Dano:",
        value: `${formatTooltipNumber(approx)} bruto por inimigo (referência nv. 1)`,
        kind: "dmg",
      },
      {
        label: "Cura:",
        value: `${formatTooltipNumber(healEff)} PV por aliado (com passiva nv. 1)`,
        kind: "fx",
      },
      {
        label: "Efeito:",
        value: `Excesso de cura vira ${formatTooltipNumber(escudoExcesso)} PV em escudo por aliado`,
        kind: "fx",
      },
    ]);
  }

  let ultBlock: string;
  if (cls === "sacerdotisa") {
    const flat = paraisoShieldFlat(w);
    const mm = paraisoManaShieldMult(w);
    const reg = paraisoRegenBonus(w);
    const regT = paraisoRegenTurns(w);
    const potMult = 1 + priestPassivePotencialPoints(1) / 100;
    const refMana = HEROES.sacerdotisa.maxMana;
    const shieldTotal = (flat + refMana * mm) * potMult;
    const effReg = reg * potMult;
    ultBlock = tipLines(`Ultimate da arma — ${weaponUltNamePt(cls)}`, [
      { label: "Nível arma:", value: tipInt(w), kind: "fx" },
      {
        label: "Carga:",
        value: `Acumula ao curar e aplicar escudo em aliados vivos (${tipInt(th)} pontos no total; Sentença conta; o Paraíso não adiciona carga)`,
        kind: "cdr",
      },
      {
        label: "Escudo por aliado:",
        value: `${formatTooltipNumber(shieldTotal)} PV`,
        kind: "dmg",
      },
      {
        label: "Cura (instâncias):",
        value: `${tipInt(regT)} instância(s) de ${formatTooltipNumber(effReg)} PV (HoT, no tick de turno)`,
        kind: "fx",
      },
      {
        label: "Mana:",
        value: `+${formatTooltipNumber(effReg)} mana por turno, ${tipInt(regT)} turnos`,
        kind: "fx",
      },
    ]);
  } else if (cls === "pistoleiro") {
    const mul = furacaoDamageMult(w);
    const approx = baseDano * mul;
    const bleTurns = furacaoBleedTurns(w);
    const bleedPerTurn = approx * furacaoBleedPct(w);
    ultBlock = tipLines(`Ultimate da arma — ${weaponUltNamePt(cls)}`, [
      { label: "Nível arma:", value: tipInt(w), kind: "fx" },
      {
        label: "Carga:",
        value: `${tipInt(th)} golpes que causem dano`,
        kind: "cdr",
      },
      {
        label: "Dano:",
        value: `${formatTooltipNumber(approx)} bruto por inimigo na arena (referência nv. 1)`,
        kind: "dmg",
      },
      {
        label: "Sangramento (crítico):",
        value: `${formatTooltipNumber(bleedPerTurn)} bruto por turno, ${tipInt(bleTurns)} turno(s)`,
        kind: "fx",
      },
    ]);
  } else {
    const maxHpRef = HEROES.gladiador.maxHp;
    const pvBuff = maxHpRef * 0.5;
    const danoTurn = maxHpRef * 0.1;
    const pisoDmg = baseDano * pisotearDamageMult(w);
    ultBlock = tipLines(`Ultimate da arma — ${weaponUltNamePt(cls)}`, [
      { label: "Nível arma:", value: tipInt(w), kind: "fx" },
      {
        label: "Carga:",
        value: `${tipInt(th)} de dano sofrido (acumulado)`,
        kind: "cdr",
      },
      {
        label: "Efeito:",
        value: `+${formatTooltipNumber(pvBuff)} PV máx. e PV atuais; ${formatTooltipNumber(danoTurn)} bruto por turno; ${tipInt(3)} turnos; desbloqueia Pisotear (referência nv. 1)`,
        kind: "fx",
      },
      {
        label: "Pisotear (na Fúria):",
        value: `Mana ${tipInt(pisotearManaCost(w))}, CDR ${tipInt(pisotearCooldownWaves(w))} onda(s), alcance ${tipInt(1)}–${tipInt(pisotearMaxHexDistance(w))} hex, ${formatTooltipNumber(pisoDmg)} bruto por alvo`,
        kind: "fx",
      },
    ]);
  }

  return `<div class="game-ui-tooltip-inner game-ui-tooltip-inner--hero-weapon">${skillBlock}${ultBlock}</div>`;
}

function formatTooltipAbilityLines(
  lines: { label: string; value: string; kind: TooltipLineKind }[],
): string {
  return lines
    .map(
      (L) =>
        `<p class="game-ui-tooltip-line"><span class="tt-lbl">${escapeHtml(L.label)}</span> <span class="${tooltipLineClass(L.kind)}">${escapeHtml(L.value)}</span></p>`,
    )
    .join("");
}

function tooltipAbilityHtml(
  title: string,
  lines: { label: string; value: string; kind: TooltipLineKind }[],
): string {
  return `<div class="game-ui-tooltip-inner"><div class="game-ui-tooltip-title">${escapeHtml(title)}</div><div class="game-ui-tooltip-body">${formatTooltipAbilityLines(lines)}</div></div>`;
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

/** Ícone da “arma” após forma final (troca visual no HUD e nos menus). */
function formaFinalWeaponIconSvg(
  cls: HeroClassId,
  ultimateId: string,
): string {
  if (cls === "pistoleiro" && ultimateId === "arauto_caos") {
    return `<svg class="lol-weapon-svg lol-weapon-svg--forma" viewBox="0 0 32 32" aria-hidden="true"><rect x="2" y="13" width="22" height="8" rx="1.5" fill="#1a1e28" stroke="#5599ff"/><rect x="20" y="14" width="10" height="6" rx="1" fill="#3a5080"/><circle cx="27" cy="17" r="2.2" fill="#88ddff"/><path fill="#66aaff" d="M4 16h14v2H4z" opacity="0.9"/></svg>`;
  }
  if (cls === "pistoleiro" && ultimateId === "especialista_destruicao") {
    return `<svg class="lol-weapon-svg lol-weapon-svg--forma" viewBox="0 0 32 32" aria-hidden="true"><rect x="3" y="15" width="20" height="5" rx="0.8" fill="#2a2220" stroke="#8a7060"/><rect x="5" y="16" width="14" height="2" fill="#c9a227"/><circle cx="22" cy="17" r="2.5" fill="#1a1810" stroke="#666"/><rect x="8" y="9" width="3" height="5" rx="0.5" fill="#3a3835"/></svg>`;
  }
  if (cls === "gladiador" && ultimateId === "campeao") {
    return `<svg class="lol-weapon-svg lol-weapon-svg--forma" viewBox="0 0 32 32" aria-hidden="true"><path fill="#e8e8f0" d="M14 2l2 4h4l2-4v4h6l-2 6 2 6h-6v14h-4V18h-4v14h-4V18H6l2-6-2-6h6V2z"/><path fill="#c9a227" d="M15 6h2v10h-2z"/></svg>`;
  }
  if (cls === "gladiador" && ultimateId === "estrategista_nato") {
    return `<svg class="lol-weapon-svg lol-weapon-svg--forma" viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="11" fill="#2a2418" stroke="#ffd54f" stroke-width="1.5"/><path fill="#ffd54f" d="M16 8v4l3 6h-6l3-6z"/><rect x="12" y="20" width="8" height="5" rx="1" fill="#5a5048"/></svg>`;
  }
  if (cls === "sacerdotisa" && ultimateId === "fada_cura") {
    return `<svg class="lol-weapon-svg lol-weapon-svg--forma" viewBox="0 0 32 32" aria-hidden="true"><path fill="#6a9cff" d="M16 3l2 6h6l-5 4 2 7-5-3-5 3 2-7-5-4h6z"/><circle cx="16" cy="22" r="5" fill="#aaffcc" stroke="#44cc88"/><rect x="14" y="26" width="4" height="4" fill="#8a6a40"/></svg>`;
  }
  if (cls === "sacerdotisa" && ultimateId === "rainha_desespero") {
    return `<svg class="lol-weapon-svg lol-weapon-svg--forma" viewBox="0 0 32 32" aria-hidden="true"><path fill="#4a2060" d="M16 4l3 8h7l-6 5 2 9-6-4-6 4 2-9-6-5h7z"/><circle cx="16" cy="24" r="4" fill="#220030" stroke="#aa66cc"/></svg>`;
  }
  return hudWeaponIconSvg(cls);
}

/** Silhueta humanoide + raios (aura explosiva) — progresso até forma final. */
function formaFinalHumanoidAuraSvg(): string {
  return `<svg class="lol-forma-final-silhouette-svg" viewBox="0 0 56 72" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
  <defs>
    <radialGradient id="ffAuraGrad" cx="50%" cy="38%" r="58%">
      <stop offset="0%" stop-color="#fff8e1" stop-opacity="0.95"/>
      <stop offset="28%" stop-color="#ff7043" stop-opacity="0.72"/>
      <stop offset="55%" stop-color="#b388ff" stop-opacity="0.45"/>
      <stop offset="100%" stop-color="#1a0f28" stop-opacity="0"/>
    </radialGradient>
    <filter id="ffGlow" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="1.2" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <g class="lol-forma-final-burst" fill="none" stroke-linecap="round" filter="url(#ffGlow)">
    <path stroke="#ffca28" stroke-width="2.2" d="M28 4v8M28 60v8M6 28h8M42 28h8"/>
    <path stroke="#ff7043" stroke-width="1.6" opacity="0.9" d="M10 10l7 7M46 10l-7 7M10 62l7-7M46 62l-7-7"/>
    <path stroke="#ea80fc" stroke-width="1.4" opacity="0.85" d="M28 2l4 10h-8zM54 28l-10 4v-8zM28 70l-4-10h8zM2 28l10-4v8z"/>
  </g>
  <ellipse cx="28" cy="36" rx="23" ry="28" fill="url(#ffAuraGrad)"/>
  <circle cx="28" cy="24" r="8" fill="#ede7f6" stroke="#5e35b1" stroke-width="1.2"/>
  <path d="M28 32 L18 54 L23 54 L28 42 L33 54 L38 54 Z" fill="#7e57c2" stroke="#311b92" stroke-width="1.1" stroke-linejoin="round"/>
  <path d="M16 34 L10 44" stroke="#ede7f6" stroke-width="3.2" stroke-linecap="round"/>
  <path d="M40 34 L46 44" stroke="#ede7f6" stroke-width="3.2" stroke-linecap="round"/>
</svg>`;
}

function combatPassiveDescription(h: Unit): string {
  if (h.heroClass === "sacerdotisa") {
    const p = priestPassivePotencialPoints(h.level);
    return `Reduz perda de ouro entre rodadas em ${formatTooltipNumber(1)}. +${formatTooltipNumber(p)}% potencial de cura/escudo (${formatTooltipNumber(25)}% base + ${formatTooltipNumber(25)}% a cada ${formatTooltipNumber(10)} níveis do herói).`;
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
    const flat = paraisoShieldFlat(w);
    const mm = paraisoManaShieldMult(w);
    const reg = paraisoRegenBonus(w);
    const regT = paraisoRegenTurns(w);
    const potMult = 1 + h.potencialCuraEscudo / 100;
    const effReg = reg * potMult;
    const shieldTotalSelf = (flat + h.maxMana * mm) * potMult;
    return tooltipAbilityHtml(weaponUltNamePt(cls), [
      { label: "Nível da arma:", value: tipInt(w), kind: "fx" },
      {
        label: "Carga:",
        value: `${tipInt(pct)}% (somar ${tipInt(th)} entre PV curados e escudo aplicado por ti em heróis vivos, incluída; o Paraíso não adiciona carga)`,
        kind: "cdr",
      },
      {
        label: "Escudo por aliado:",
        value: `${formatTooltipNumber(shieldTotalSelf)} PV`,
        kind: "dmg",
      },
      {
        label: "Cura (instâncias):",
        value: `${tipInt(regT)} instância(s) de ${formatTooltipNumber(effReg)} PV (HoT por turno)`,
        kind: "fx",
      },
      {
        label: "Mana:",
        value: `+${formatTooltipNumber(effReg)} mana por turno, ${tipInt(regT)} turnos`,
        kind: "fx",
      },
    ]);
  }
  if (cls === "pistoleiro") {
    const base =
      heroDanoPlusRoninOverflow(h) +
      h.pistoleiroBonusDanoWave +
      h.curandeiroDanoWave;
    const rawF = base * furacaoDamageMult(w);
    const bleTurns = furacaoBleedTurns(w);
    const bleedPerTurn = rawF * furacaoBleedPct(w);
    return tooltipAbilityHtml(weaponUltNamePt(cls), [
      { label: "Nível da arma:", value: tipInt(w), kind: "fx" },
      {
        label: "Carga:",
        value: `${tipInt(pct)}% (${tipInt(th)} golpes que causam dano)`,
        kind: "cdr",
      },
      {
        label: "Dano:",
        value: `${formatTooltipNumber(rawF)} bruto por inimigo na arena`,
        kind: "dmg",
      },
      {
        label: "Sangramento (crítico):",
        value: `${formatTooltipNumber(bleedPerTurn)} bruto por turno, ${tipInt(bleTurns)} turno(s)`,
        kind: "fx",
      },
    ]);
  }
  const danoFuria = h.maxHp * 0.1;
  const pvBuff = h.maxHp * 0.5;
  return tooltipAbilityHtml(weaponUltNamePt(cls), [
    { label: "Nível da arma:", value: tipInt(w), kind: "fx" },
    {
      label: "Carga:",
      value: `${tipInt(pct)}% (${tipInt(th)} dano sofrido)`,
      kind: "cdr",
    },
    {
      label: "Efeito:",
      value: `+${formatTooltipNumber(pvBuff)} PV máx. e PV atuais; ${formatTooltipNumber(danoFuria)} bruto por turno; ${tipInt(3)} turnos; Até a morte → Pisotear`,
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
  return `<div class="game-ui-tooltip-inner"><div class="game-ui-tooltip-title">Após evolução (bunker nv. ${bunkerDisplayLevel(nt)})</div><p class="game-ui-tooltip-passive"><span class="tt-lbl">PV máx.:</span> ${formatTooltipNumber(st.maxHp)} · <span class="tt-lbl">Defesa:</span> ${formatTooltipNumber(st.defesa)}</p></div>`;
}

function bunkerAutoReparoShopTooltipHtml(bunk: BunkerState): string {
  const per = BUNKER_AUTO_REPAIR_HP_PER_RANK;
  const cur = bunk.autoRepairRank * per;
  return `<div class="game-ui-tooltip-inner game-ui-tooltip-inner--bunker-shop"><div class="game-ui-tooltip-title">Auto reparo</div><p class="game-ui-tooltip-passive">Desbloqueado no <strong>bunker nv. ${bunkerDisplayLevel(BUNKER_AUTO_REPAIR_MIN_TIER)}</strong>.</p><p class="game-ui-tooltip-body">Cada compra sobe o nível (máx. ${BUNKER_AUTO_REPAIR_MAX_RANK}). Ao fim de cada ciclo de turnos dos heróis, o bunker recupera <strong>${per} PV × nível</strong>. Custo: ${BUNKER_AUTO_REPAIR_GOLD} ouro (Estrategista nato: metade).</p><p class="game-ui-tooltip-passive game-ui-tooltip-passive--tight-top">Nível ${bunk.autoRepairRank}/${BUNKER_AUTO_REPAIR_MAX_RANK} → +${cur} PV por ciclo.</p></div>`;
}

function bunkerFortificarShopTooltipHtml(bunk: BunkerState): string {
  const cap = Math.max(0, bunk.fortifyShieldCap);
  const cur = Math.min(Math.max(0, bunk.fortifyShield), cap);
  return `<div class="game-ui-tooltip-inner game-ui-tooltip-inner--bunker-shop"><div class="game-ui-tooltip-title">Fortificar</div><p class="game-ui-tooltip-passive">Desbloqueado no <strong>bunker nv. ${bunkerDisplayLevel(BUNKER_FORTIFY_MIN_TIER)}</strong>.</p><p class="game-ui-tooltip-body">Compra <strong>+${BUNKER_FORTIFY_SHIELD} escudo</strong> no bunker por <strong>${BUNKER_FORTIFY_GOLD} ouro</strong>, até ${BUNKER_FORTIFY_MAX_BUYS_PER_WAVE} vezes por visita à loja da wave. O escudo absorve dano antes dos PV do bunker e <strong>reabastece no início de cada wave</strong> até ao máximo comprado (Estrategista nato: metade do ouro).</p><p class="game-ui-tooltip-passive game-ui-tooltip-passive--tight-top">Escudo: ${tipInt(cur)} / ${tipInt(cap)} · Compras nesta visita: ${bunk.fortifyBuysThisWave}/${BUNKER_FORTIFY_MAX_BUYS_PER_WAVE}</p></div>`;
}

/** Loja: mesmo formato do HUD de combate, com stats ao nível atual e ao próximo do bunker. */
function bunkerMinasGoldShopCompositeTooltip(
  h: Unit,
  _m: GameModel,
  tier: 0 | 1 | 2,
): string {
  const cdCur = `${tipInt(bunkerMinasCooldownWaves(tier))} onda(s)`;
  const curBody = formatTooltipAbilityLines(
    bunkerMinasAbilityLines(h, tier, cdCur),
  );
  let nextBlock: string;
  if (tier < 2) {
    const nt = (tier + 1) as 1 | 2;
    const cdN = `${tipInt(bunkerMinasCooldownWaves(nt))} onda(s)`;
    const nextBody = formatTooltipAbilityLines(
      bunkerMinasAbilityLines(h, nt, cdN),
    );
    nextBlock = `<p class="game-ui-tooltip-subhead game-ui-tooltip-subhead--next">Próximo nível — bunker nv. ${bunkerDisplayLevel(nt)}</p><div class="game-ui-tooltip-body">${nextBody}</div>`;
  } else {
    nextBlock = `<p class="game-ui-tooltip-passive game-ui-tooltip-passive--tight-top">Próximo nível: evolução máxima.</p>`;
  }
  return `<div class="game-ui-tooltip-inner game-ui-tooltip-inner--bunker-shop"><div class="game-ui-tooltip-title">Minas terrestres</div><p class="game-ui-tooltip-subhead">Bunker nv. ${bunkerDisplayLevel(tier)} — atual</p><div class="game-ui-tooltip-body">${curBody}</div>${nextBlock}</div>`;
}

function bunkerTiroGoldShopCompositeTooltip(
  h: Unit,
  _m: GameModel,
  tier: 0 | 1 | 2,
): string {
  const cdShop = `${tipInt(bunkerTiroCooldownWaves())} onda(s)`;
  if (tier >= BUNKER_TIRO_MIN_TIER) {
    const body = formatTooltipAbilityLines(
      bunkerTiroAbilityLines(h, cdShop),
    );
    return `<div class="game-ui-tooltip-inner game-ui-tooltip-inner--bunker-shop"><div class="game-ui-tooltip-title">Tiro preciso</div><p class="game-ui-tooltip-subhead">Bunker nv. ${bunkerDisplayLevel(tier)} — atual</p><div class="game-ui-tooltip-body">${body}</div><p class="game-ui-tooltip-passive game-ui-tooltip-passive--tight-top">Próximo nível: evolução máxima.</p></div>`;
  }
  const req = bunkerDisplayLevel(BUNKER_TIRO_MIN_TIER);
  const nextBody = formatTooltipAbilityLines(
    bunkerTiroAbilityLines(h, cdShop),
  );
  return `<div class="game-ui-tooltip-inner game-ui-tooltip-inner--badged game-ui-tooltip-inner--bunker-shop"><span class="game-ui-tooltip-badge">Bunker nv. ${req}</span><div class="game-ui-tooltip-title">Tiro preciso</div><p class="game-ui-tooltip-passive">Nível atual: bloqueado.</p><p class="game-ui-tooltip-subhead game-ui-tooltip-subhead--next">Ao desbloquear (bunker nv. ${req})</p><div class="game-ui-tooltip-body">${nextBody}</div></div>`;
}

function goldShopBunkerSkillSquareHtml(opts: {
  skillId: "bunker_minas" | "bunker_tiro_preciso";
  hotkey: string;
  disabled: boolean;
  extraClass?: string;
}): string {
  const name =
    opts.skillId === "bunker_minas" ? "Minas terrestres" : "Tiro preciso";
  const xcls = ["gold-shop-bunker-skill--hud-style", opts.extraClass]
    .filter(Boolean)
    .join(" ");
  return combatSquareSkillHtml({
    disabled: opts.disabled,
    iconHtml: skillButtonIconHtml(opts.skillId),
    hotkey: opts.hotkey,
    manaBadge: manaCostBadgeText(0),
    ariaLabel: name,
    extraClass: xcls,
  });
}

/** Botões de compra do bunker no mesmo estilo da grelha de ouro do herói. */
function goldShopBunkerBuyGridHtml(bunk: BunkerState, h: Unit): string {
  const missing = bunk.maxHp - bunk.hp;
  const repairCost = Math.ceil(missing);
  const canRepair = missing > 0 && h.ouro >= repairCost;
  const t = effectiveBunkerTier(bunk);
  const rawEv = t >= 2 ? 0 : BUNKER_EVOLVE_COSTS[t as 0 | 1] ?? 0;
  let evCost = rawEv;
  if (t < 2 && h.ultimateId === "estrategista_nato") {
    evCost = Math.ceil(evCost * 0.5);
  }
  const canEv = t < 2 && h.ouro >= evCost;
  const repairLabel =
    missing <= 0
      ? "Nada a reparar"
      : canRepair
        ? `Reparar por ${formatOuroDisplay(repairCost)} ouro`
        : `Reparar: ouro insuficiente (${formatOuroDisplay(repairCost)} necessário)`;
  const evolveDisabled = t >= 2 || !canEv;
  const evolveLabel =
    t >= 2
      ? "Bunker no nível máximo"
      : canEv
        ? `Evoluir por ${formatOuroDisplay(evCost)} ouro`
        : `Evoluir: ouro insuficiente (${formatOuroDisplay(evCost)} necessário)`;
  const repairInner = `<span class="shop-item__row">
        <span class="shop-item__ico">${statIconWrap("max_hp", 0)}</span>
        <span class="shop-item__meta">
          <span class="shop-item__label">Reparar bunker</span>
          <span class="shop-item__cost">${missing <= 0 ? "—" : `${repairCost} ouro`}</span>
        </span>
      </span>`;
  const evolveInner =
    t >= 2
      ? `<span class="shop-item__row">
        <span class="shop-item__ico">${statIconWrap("def", 1)}</span>
        <span class="shop-item__meta">
          <span class="shop-item__label">Evoluir bunker</span>
          <span class="shop-item__cost">Nível máximo</span>
        </span>
      </span>`
      : `<span class="shop-item__row">
        <span class="shop-item__ico">${statIconWrap("def", 1)}</span>
        <span class="shop-item__meta">
          <span class="shop-item__label">Evoluir bunker</span>
          <span class="shop-item__cost">${evCost} ouro</span>
        </span>
      </span>`;
  const rows: string[] = [
    `<button type="button" class="shop-item shop-item--gold-buy shop-item--bunker-buy" id="gold-shop-bunk-repair" data-gold-bunker-buy="repair" ${missing <= 0 || !canRepair ? "disabled" : ""} aria-label="${escapeHtml(repairLabel)}">${repairInner}</button>`,
    `<button type="button" class="shop-item shop-item--gold-buy shop-item--bunker-buy" id="gold-shop-bunk-evolve" data-gold-bunker-buy="evolve" ${evolveDisabled ? "disabled" : ""} aria-label="${escapeHtml(evolveLabel)}">${evolveInner}</button>`,
  ];
  if (t >= BUNKER_AUTO_REPAIR_MIN_TIER) {
    let arCost = BUNKER_AUTO_REPAIR_GOLD;
    if (h.ultimateId === "estrategista_nato") arCost = Math.ceil(arCost * 0.5);
    const arFull = bunk.autoRepairRank >= BUNKER_AUTO_REPAIR_MAX_RANK;
    const canAr = !arFull && h.ouro >= arCost;
    const arDisabled = arFull || !canAr;
    const arLabel = arFull
      ? "Auto reparo no nível máximo"
      : canAr
        ? `Auto reparo por ${formatOuroDisplay(arCost)} ouro`
        : `Auto reparo: ouro insuficiente (${formatOuroDisplay(arCost)} necessário)`;
    const arInner = `<span class="shop-item__row">
        <span class="shop-item__ico">${skillButtonIconHtml("bunker_auto_reparo")}</span>
        <span class="shop-item__meta">
          <span class="shop-item__label">Auto reparo</span>
          <span class="shop-item__cost">${arFull ? `Máx. ${BUNKER_AUTO_REPAIR_MAX_RANK}/${BUNKER_AUTO_REPAIR_MAX_RANK}` : `${arCost} ouro`}</span>
        </span>
      </span>`;
    rows.push(
      `<button type="button" class="shop-item shop-item--gold-buy shop-item--bunker-buy" id="gold-shop-bunk-auto-reparo" data-gold-bunker-buy="auto_reparo" ${arDisabled ? "disabled" : ""} aria-label="${escapeHtml(arLabel)}">${arInner}</button>`,
    );
  }
  if (t >= BUNKER_FORTIFY_MIN_TIER) {
    let foCost = BUNKER_FORTIFY_GOLD;
    if (h.ultimateId === "estrategista_nato") foCost = Math.ceil(foCost * 0.5);
    const foFull = bunk.fortifyBuysThisWave >= BUNKER_FORTIFY_MAX_BUYS_PER_WAVE;
    const canFo = !foFull && h.ouro >= foCost;
    const foDisabled = foFull || !canFo;
    const foLabel = foFull
      ? "Fortificar: limite de compras nesta visita à loja"
      : canFo
        ? `Fortificar por ${formatOuroDisplay(foCost)} ouro (+${BUNKER_FORTIFY_SHIELD} escudo)`
        : `Fortificar: ouro insuficiente (${formatOuroDisplay(foCost)} necessário)`;
    const foInner = `<span class="shop-item__row">
        <span class="shop-item__ico">${skillButtonIconHtml("bunker_fortificar")}</span>
        <span class="shop-item__meta">
          <span class="shop-item__label">Fortificar</span>
          <span class="shop-item__cost">${foFull ? "Limite loja" : `${foCost} ouro`}</span>
        </span>
      </span>`;
    rows.push(
      `<button type="button" class="shop-item shop-item--gold-buy shop-item--bunker-buy" id="gold-shop-bunk-fortificar" data-gold-bunker-buy="fortificar" ${foDisabled ? "disabled" : ""} aria-label="${escapeHtml(foLabel)}">${foInner}</button>`,
    );
  }
  return rows.join("\n      ");
}

function applyGoldShopVizFocus(panel: HTMLElement, hasBunker: boolean): void {
  if (!hasBunker) return;
  const carousel = panel.querySelector("#shop-viz-carousel");
  const heroGrid = panel.querySelector("#shop-grid-hero-gold") as HTMLElement | null;
  const bunkMid = panel.querySelector("#shop-bunker-mid-block") as HTMLElement | null;
  const toggle = panel.querySelector("#shop-viz-flip-toggle") as HTMLElement | null;
  const chev = toggle?.querySelector(".shop-viz-flip-arrow__chevron");
  const txt = toggle?.querySelector(".shop-viz-flip-arrow__text");
  const bunker = goldShopVizFocus === "bunker";
  carousel?.classList.toggle("shop-viz-turntable-inner--bunker", bunker);
  if (heroGrid) {
    heroGrid.hidden = bunker;
    if (bunker) heroGrid.setAttribute("aria-hidden", "true");
    else heroGrid.removeAttribute("aria-hidden");
  }
  if (bunkMid) {
    bunkMid.hidden = !bunker;
    if (!bunker) bunkMid.setAttribute("aria-hidden", "true");
    else bunkMid.removeAttribute("aria-hidden");
  }
  if (chev) chev.textContent = bunker ? "←" : "→";
  if (txt) txt.textContent = bunker ? "Herói" : "Bunker";
  if (toggle) {
    toggle.setAttribute(
      "aria-label",
      bunker
        ? "Mostrar herói e melhorias do herói"
        : "Mostrar bunker — compras do bunker na grelha abaixo",
    );
  }
}

function mountGoldShopBunkerSkillsRow(
  row: HTMLElement,
  bunk: BunkerState,
  h: Unit,
  m: GameModel,
): void {
  row.innerHTML = "";
  const t = effectiveBunkerTier(bunk);
  const tiroOk = t >= BUNKER_TIRO_MIN_TIER;
  const append = (html: string, tip: () => string): void => {
    const b = el(html);
    b.addEventListener("click", (e) => e.preventDefault());
    bindGameTooltip(b, tip);
    row.appendChild(b);
  };
  append(
    goldShopBunkerSkillSquareHtml({
      skillId: "bunker_minas",
      hotkey: "W",
      disabled: false,
    }),
    () => bunkerMinasGoldShopCompositeTooltip(h, m, t),
  );
  append(
    goldShopBunkerSkillSquareHtml({
      skillId: "bunker_tiro_preciso",
      hotkey: "E",
      disabled: !tiroOk,
      extraClass: tiroOk ? undefined : "gold-shop-bunker-skill--locked",
    }),
    () => bunkerTiroGoldShopCompositeTooltip(h, m, t),
  );
}

/**
 * Cartão do bunker no carrossel: 3D, nível, atributos, habilidades e texto de ajuda.
 * Só as compras em ouro ficam fora, na grelha inferior (paridade com o herói).
 */
function goldShopBunkerSectionHtml(bunk: BunkerState): string {
  const t = effectiveBunkerTier(bunk);
  const disp = bunkerDisplayLevel(t);
  const nvStr = `${disp}/3`;
  return `<div class="shop-bunker-viz-layout">
    <div class="shop-bunker-viz-layout__preview">
      <div id="bunker-preview-host" class="gold-shop-hero-3d-host shop-bunker-viz-layout__3d-host" data-bunker-preview-tier="${t}" aria-hidden="true"></div>
    </div>
    <div class="shop-hero-stats-col shop-bunker-viz-layout__col">
      <p class="shop-hero-stats-head">Atributos do bunker</p>
      <div class="shop-bunker-level-row" role="group" aria-label="Nível do bunker">
        <span class="shop-bunker-level-row__lbl">Nível</span>
        <span class="shop-bunker-level-row__val">${nvStr}</span>
      </div>
      <div id="gold-shop-bunker-stats" class="lol-stats-list gold-shop-hero-stats-grid" aria-label="PV, defesa e extras do bunker"></div>
      <div class="shop-bunker-skills-block">
        <p class="shop-hero-stats-head shop-bunker-skills-block__head">Habilidades</p>
        <div id="gold-shop-bunker-skills" class="gold-shop-hero-skills-row" role="group" aria-label="Habilidades do bunker"></div>
      </div>
      <p class="shop-bunker-viz-layout__hint">Reparação = PV em falta. Evoluções: 300 / 500 ouro. Auto reparo (bunker nv. 2+): 50 ouro/nível. Fortificar (bunker nv. 3): 100 ouro por +100 escudo (até 5× por visita à loja; o escudo repõe-se no início de cada wave até ao máximo comprado). As compras ficam na grelha por baixo.</p>
    </div>
  </div>`;
}

type HeroStatCategory = "offense" | "defense" | "utility";

interface HeroStatCell {
  icon: StatIconId;
  label: string;
  value: string;
  valueHtml?: string;
  tooltipValue?: string;
  /** Tooltip rico (pairar); se omitido, usa `tooltipStatCell` com label/valor. */
  tooltipHtml?: string;
  /** Só herói (loja + HUD combate): agrupa em abas Ofensivos / Defensivos / Utilidade. */
  statCategory?: HeroStatCategory;
}

function bunkerShopStatCells(bunk: BunkerState): HeroStatCell[] {
  const tierShop = effectiveBunkerTier(bunk);
  const hpDisp = `${tipInt(bunk.hp)}/${tipInt(bunk.maxHp)}`;
  const defDisp = tipInt(bunk.defesa);
  const cells: HeroStatCell[] = [
    {
      icon: "max_hp",
      label: "Vida",
      value: hpDisp,
      tooltipValue: hpDisp,
      tooltipHtml: combatHeroStatTooltip({
        stat: "max_hp",
        display: hpDisp,
      }),
    },
    {
      icon: "def",
      label: "Defesa",
      value: defDisp,
      tooltipValue: defDisp,
      tooltipHtml: combatHeroStatTooltip({
        stat: "def",
        display: defDisp,
      }),
    },
  ];
  if (tierShop >= BUNKER_AUTO_REPAIR_MIN_TIER) {
    const r = bunk.autoRepairRank;
    const perCiclo = r * BUNKER_AUTO_REPAIR_HP_PER_RANK;
    const arDisp = `${r}/${BUNKER_AUTO_REPAIR_MAX_RANK} · +${perCiclo}/ciclo`;
    cells.push({
      icon: "regen_hp",
      label: "Auto reparo",
      value: arDisp,
      tooltipValue: arDisp,
      tooltipHtml: bunkerAutoReparoShopTooltipHtml(bunk),
    });
  }
  if (tierShop >= BUNKER_FORTIFY_MIN_TIER) {
    const capF = Math.max(0, bunk.fortifyShieldCap);
    const curF = Math.min(Math.max(0, bunk.fortifyShield), capF);
    const foDisp = `${tipInt(curF)}/${tipInt(capF)} · ${bunk.fortifyBuysThisWave}/${BUNKER_FORTIFY_MAX_BUYS_PER_WAVE}`;
    cells.push({
      icon: "pen_escudo",
      label: "Fortificar",
      value: foDisp,
      tooltipValue: foDisp,
      tooltipHtml: bunkerFortificarShopTooltipHtml(bunk),
    });
  }
  return cells;
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
  if (kind === "pct")
    inner = `${sign}${formatTooltipNumber(Math.round(delta))}%`;
  else if (kind === "mult" || kind === "float")
    inner = `${sign}${formatTooltipNumber(delta)}`;
  else inner = `${sign}${formatTooltipNumber(Math.round(delta))}`;
  return ` <span class="lol-stat-delta ${cls}">(${inner})</span>`;
}

function statPlainDelta(delta: number, kind: StatDeltaKind): string {
  if (kind === "mult" && Math.abs(delta) < 0.005) return "";
  if (kind === "float" && Math.abs(delta) < 0.05) return "";
  if (delta === 0 && kind !== "mult" && kind !== "float") return "";
  const sign = delta > 0 ? "+" : "";
  if (kind === "pct") return `${sign}${formatTooltipNumber(Math.round(delta))}%`;
  if (kind === "mult" || kind === "float")
    return `${sign}${formatTooltipNumber(delta)}`;
  return `${sign}${formatTooltipNumber(Math.round(delta))}`;
}

/** Percentual de redução por defesa (sempre 2 casas decimais, vírgula PT). */
function formatDefenseReductionPct(effDef: number): string {
  const pct = damageReductionPercentFromDefense(effDef, 0);
  return formatTooltipNumber(pct);
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
  tooltipHtml?: string | ((plain: string) => string),
  statCategory: HeroStatCategory = "utility",
): void {
  const { html, plain } = valWithDelta(display, delta, kind);
  const th =
    typeof tooltipHtml === "function" ? tooltipHtml(plain) : tooltipHtml;
  cells.push({
    icon,
    label,
    value: display,
    valueHtml: html,
    tooltipValue: plain,
    tooltipHtml: th,
    statCategory,
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

const HERO_STAT_TAB_LABELS: Record<HeroStatCategory, string> = {
  offense: "Ofensivos",
  defense: "Defensivos",
  utility: "Utilidade",
};

const HERO_STAT_TAB_ORDER: HeroStatCategory[] = [
  "offense",
  "defense",
  "utility",
];

function groupHeroStatCellsByCategory(
  cells: HeroStatCell[],
): Record<HeroStatCategory, HeroStatCell[]> {
  const buckets: Record<HeroStatCategory, HeroStatCell[]> = {
    offense: [],
    defense: [],
    utility: [],
  };
  for (const c of cells) {
    buckets[c.statCategory ?? "utility"].push(c);
  }
  return buckets;
}

function buildHeroStatsColumnsHtml(
  cells: HeroStatCell[],
  idxRef: { n: number },
): string {
  if (cells.length === 0) {
    return `<p class="hero-stats-panel-empty" role="status">Sem atributos nesta categoria.</p>`;
  }
  const split = splitStatsIntoColumns(cells, 5);
  const cols = split.length > 0 ? split : [[]];
  const nCols = cols.length;
  const parts: string[] = [
    `<div class="lol-stats-cols" style="--stats-cols:${nCols}">`,
  ];
  for (const col of cols) {
    parts.push('<div class="lol-stats-col">');
    for (const c of col) {
      const ix = idxRef.n++;
      const ariaVal = escapeHtml(c.tooltipValue ?? c.value);
      const valInner = c.valueHtml ?? escapeHtml(c.value);
      parts.push(
        `<div class="lol-stat-cell" data-stat-i="${ix}" tabindex="0" role="img" aria-label="${escapeHtml(c.label)}: ${ariaVal}">` +
          statIconWrap(c.icon, ix) +
          `<span class="lol-stat-val">${valInner}</span>` +
          `</div>`,
      );
    }
    parts.push("</div>");
  }
  parts.push("</div>");
  return parts.join("");
}

function bindHeroStatCellTooltips(
  container: HTMLElement,
  cells: HeroStatCell[],
): void {
  const nodes = container.querySelectorAll(".lol-stat-cell");
  nodes.forEach((node, i) => {
    const cell = cells[i];
    if (!cell) return;
    bindGameTooltip(node as HTMLElement, () =>
      cell.tooltipHtml ??
      tooltipStatCell(cell.label, cell.tooltipValue ?? cell.value),
    );
  });
}

/** Bunker na loja (poucos atributos): grelha simples. */
function renderHeroStatsGrid(grid: HTMLElement, cells: HeroStatCell[]): void {
  const idxRef = { n: 0 };
  grid.innerHTML = buildHeroStatsColumnsHtml(cells, idxRef);
  bindHeroStatCellTooltips(grid, cells);
}

function renderHeroStatsGridWithTabs(
  grid: HTMLElement,
  cells: HeroStatCell[],
  tabFocus: { current: HeroStatCategory },
): void {
  const buckets = groupHeroStatCellsByCategory(cells);
  const uid =
    grid.id && grid.id.length > 0
      ? grid.id.replace(/[^a-zA-Z0-9_-]/g, "-")
      : "hero-stats";

  let active = tabFocus.current;
  if (buckets[active].length === 0) {
    active =
      HERO_STAT_TAB_ORDER.find((c) => buckets[c].length > 0) ?? "utility";
    tabFocus.current = active;
  }

  const parts: string[] = [
    `<div class="hero-stats-tabbed" data-hero-stats-root="1">`,
    `<div class="hero-stats-tabbed__tabs" role="tablist" aria-label="Categorias de atributos">`,
  ];

  for (const cat of HERO_STAT_TAB_ORDER) {
    const has = buckets[cat].length > 0;
    const sel = has && cat === active;
    parts.push(
      `<button type="button" role="tab" class="hero-stats-tab hero-stats-tab--${cat}${sel ? " hero-stats-tab--active" : ""}" id="${uid}-tab-${cat}" aria-selected="${sel ? "true" : "false"}" aria-controls="${uid}-panel-${cat}" data-stat-tab="${cat}"${has ? "" : " hidden"}>${escapeHtml(HERO_STAT_TAB_LABELS[cat])}</button>`,
    );
  }
  parts.push(`</div><div class="hero-stats-tabbed__panels">`);

  const idxRef = { n: 0 };
  for (const cat of HERO_STAT_TAB_ORDER) {
    const panelCells = buckets[cat];
    const has = panelCells.length > 0;
    const show = has && cat === active;
    const inner = buildHeroStatsColumnsHtml(panelCells, idxRef);
    parts.push(
      `<div class="hero-stats-tabbed__panel${show ? " hero-stats-tabbed__panel--active" : ""}" role="tabpanel" id="${uid}-panel-${cat}" aria-labelledby="${uid}-tab-${cat}" data-stat-panel="${cat}"${show ? "" : " hidden"}>${inner}</div>`,
    );
  }
  parts.push(`</div></div>`);
  grid.innerHTML = parts.join("");

  const root = grid.querySelector("[data-hero-stats-root]") as HTMLElement | null;
  if (!root) return;

  for (const cat of HERO_STAT_TAB_ORDER) {
    const panel = root.querySelector(
      `[data-stat-panel="${cat}"]`,
    ) as HTMLElement | null;
    if (panel) bindHeroStatCellTooltips(panel, buckets[cat]);
  }

  root.addEventListener("click", (ev) => {
    const btn = (ev.target as HTMLElement).closest(
      "[data-stat-tab]",
    ) as HTMLButtonElement | null;
    if (!btn || !root.contains(btn) || btn.hidden) return;
    const cat = btn.getAttribute("data-stat-tab") as HeroStatCategory | null;
    if (!cat || buckets[cat].length === 0) return;
    tabFocus.current = cat;
    root.querySelectorAll<HTMLButtonElement>("[data-stat-tab]").forEach((b) => {
      const c = b.getAttribute("data-stat-tab") as HeroStatCategory;
      const on = c === cat && !b.hidden;
      b.classList.toggle("hero-stats-tab--active", on);
      b.setAttribute("aria-selected", on ? "true" : "false");
    });
    root.querySelectorAll<HTMLElement>("[data-stat-panel]").forEach((p) => {
      const c = p.getAttribute("data-stat-panel") as HeroStatCategory;
      const show = c === cat && buckets[c].length > 0;
      p.hidden = !show;
      p.classList.toggle("hero-stats-tabbed__panel--active", show);
    });
  });
}

const goldShopHeroStatsTabRef: { current: HeroStatCategory } = {
  current: "offense",
};
const combatHeroStatsTabRef: { current: HeroStatCategory } = {
  current: "offense",
};

/** Aba da grelha “Atributos atuais” onde cada compra da loja de ouro aparece. */
const GOLD_SHOP_TAB_FOR_ITEM: Record<GoldShopId, HeroStatCategory> = {
  vida: "defense",
  max_mana: "defense",
  regen_hp: "defense",
  regen_mana: "defense",
  dano: "offense",
  crit_chance: "offense",
  crit_dmg: "offense",
  defesa: "defense",
  penetracao: "offense",
  movimento: "utility",
  heal_shield: "utility",
  xp_pct: "utility",
};

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
  const raw = m.tooltipPreviewBasicAttackRawDamage(h);
  const dmgLine = `${formatTooltipNumber(raw)} de dano bruto (crítico e defesa do alvo aplicam depois)`;
  const cap = m.maxBasicAttacksForHero(h);
  const theirTurn =
    m.phase === "combat" &&
    !m.inEnemyPhase &&
    !m.duel &&
    m.currentHero()?.id === h.id;
  const cur = theirTurn ? m.basicLeft : cap;
  return tooltipAbilityHtml("Ataque básico", [
    {
      label: "Ataques:",
      value: `${tipInt(cur)}/${tipInt(cap)}`,
      kind: "fx",
    },
    { label: "Alcance:", value: formatTooltipNumber(alc), kind: "range" },
    { label: "Dano:", value: dmgLine, kind: "dmg" },
    {
      label: "Efeito:",
      value: "Um alvo",
      kind: "fx",
    },
  ]);
}

function pistoleiroTiroDestruidorSkillDef(): SkillDef {
  const base = HEROES.pistoleiro.skills[0]!;
  return {
    ...base,
    id: "tiro_destruidor",
    name: "Tiro destruidor",
    description:
      "Feixe em linha reta de hexes; acumula dano se não usares (ver cargas).",
  };
}

function tooltipTiroDestruidor(h: Unit, m: GameModel, sk: SkillDef): string {
  const w = h.weaponLevel;
  const alc = m.effectiveAlcanceForHero(h);
  const per = m.tooltipPreviewAtirarDamagePerHit(h);
  const charges = Math.min(5, Math.max(0, h.tiroDestruidorCharges ?? 0));
  const mult = 1 + 2.2 * charges;
  const cdv = h.skillCd["tiro_destruidor"] ?? 0;
  const cdB = atirarCooldownWaves(w);
  const cdrStr =
    cdv > 0
      ? `${tipInt(cdv)} onda(s) até disponível`
      : `${tipInt(cdB)} onda(s)`;
  const usable = m.devSandboxMode || charges >= 1;
  const dmgLine = usable
    ? `${formatTooltipNumber(roundToCombatDecimals(per * mult))} bruto por inimigo tocado pelo feixe`
    : "— (precisas de pelo menos 1 carga)";
  return tooltipAbilityHtml(sk.name, [
    { label: "Nível arma:", value: tipInt(w), kind: "fx" },
    {
      label: "Custo de mana:",
      value: tipInt(sk.manaCost ?? 0),
      kind: "mana",
    },
    { label: "CDR:", value: cdrStr, kind: "cdr" },
    {
      label: "Cargas:",
      value: `${tipInt(charges)}/5 (+220% dano bruto por carga; máximo 1200%); mínimo 1 para disparar`,
      kind: "fx",
    },
    { label: "Alcance:", value: formatTooltipNumber(alc), kind: "range" },
    {
      label: "Dano (atual):",
      value: dmgLine,
      kind: "dmg",
    },
    {
      label: "Efeito:",
      value:
        "Com a skill escolhida, move o rato: vês o feixe e os hexes atingidos. Clica num hex válido (não o teu) para disparar nessa direção. Cargas acumulam no fim de cada turno em que não usares a skill.",
      kind: "fx",
    },
  ]);
}

function tooltipFormaFinalHudSlot(
  h: Unit,
  m: GameModel,
  isViewingActive: boolean,
): string {
  const cap = FORMA_FINAL_LEVEL;
  const cur = Math.min(cap, h.level);
  const ultNm =
    h.heroClass && h.ultimateId
      ? HEROES[h.heroClass].ultimates.find((x) => x.id === h.ultimateId)
          ?.name
      : undefined;
  const body =
    h.ultimateId && h.formaFinal && ultNm
      ? `Arma evoluída — ${ultNm}. O teu herói usa esta forma na arena (modelo 3D mais imponente).`
      : h.ultimateId
        ? `Progresso ${tipInt(cur)}/${cap}. Já escolheste uma forma final.`
        : cur < cap
          ? `${tipInt(cur)}/${cap} — a barra prismática enche quando sobem de nível.`
          : isViewingActive && m.phase === "combat"
            ? `${cap}/${cap} — clica para escolher a tua forma final.`
            : `${cap}/${cap} — na tua vez em combate, clica aqui para escolher a forma final.`;
  return tooltipPassiveHtml("Níveis até a forma final", body);
}

function cdrSkillValue(h: Unit, sk: SkillDef): string {
  const rest = h.skillCd[sk.id] ?? 0;
  if (rest > 0) return `${tipInt(rest)} onda(s) até disponível`;
  if (sk.cooldownWaves <= 0) return "—";
  return tipInt(sk.cooldownWaves);
}

function tooltipSkillAtirar(h: Unit, m: GameModel, sk: SkillDef): string {
  const w = h.weaponLevel;
  const alc = m.effectiveAlcanceForHero(h);
  const per = m.tooltipPreviewAtirarDamagePerHit(h);
  const cdv = h.skillCd[sk.id] ?? 0;
  const cdB = atirarCooldownWaves(w);
  const cdrStr =
    cdv > 0
      ? `${tipInt(cdv)} onda(s) até disponível`
      : `${tipInt(cdB)} onda(s)`;
  return tooltipAbilityHtml(sk.name, [
    { label: "Nível arma:", value: tipInt(w), kind: "fx" },
    {
      label: "Custo de mana:",
      value: tipInt(sk.manaCost ?? 0),
      kind: "mana",
    },
    { label: "CDR:", value: cdrStr, kind: "cdr" },
    { label: "Alcance:", value: formatTooltipNumber(alc), kind: "range" },
    {
      label: "Dano:",
      value: `${formatTooltipNumber(per)} bruto por inimigo no alcance`,
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
  const gDmg = m.tooltipPreviewDuelGladiatorHitDamage(h);
  const cdv = h.skillCd[sk.id] ?? 0;
  const cdB = ateMorteCooldownWaves(w);
  const cdrStr =
    cdv > 0
      ? `${tipInt(cdv)} onda(s) até disponível`
      : cdB <= 0
        ? "—"
        : `${tipInt(cdB)} onda(s)`;
  const perWin = gladiadorDuelHpPerWin(h.level);
  return tooltipAbilityHtml(sk.name, [
    { label: "Nível arma:", value: tipInt(w), kind: "fx" },
    {
      label: "Custo de mana:",
      value: tipInt(ateMorteManaCost(w)),
      kind: "mana",
    },
    { label: "CDR:", value: cdrStr, kind: "cdr" },
    { label: "Alcance:", value: tipInt(1), kind: "range" },
    {
      label: "Dano:",
      value: `${formatTooltipNumber(gDmg)} bruto por teu golpe no duelo`,
      kind: "dmg",
    },
    {
      label: "Efeito:",
      value: `Duelo até morrer; vitória +${formatTooltipNumber(perWin)} PV máx e atual (escala com nível)`,
      kind: "fx",
    },
  ]);
}

function tooltipSkillPisotear(h: Unit, _m: GameModel): string {
  const w = h.weaponLevel;
  const dmgApprox =
    heroDanoPlusRoninOverflow(h) * pisotearDamageMult(w);
  const cdv = h.skillCd["pisotear"] ?? 0;
  const cdB = pisotearCooldownWaves(w);
  const cdrStr =
    cdv > 0
      ? `${tipInt(cdv)} onda(s) até disponível`
      : cdB <= 0
        ? "—"
        : `${tipInt(cdB)} onda(s)`;
  const maxD = pisotearMaxHexDistance(w);
  return tooltipAbilityHtml("Pisotear", [
    { label: "Nível arma:", value: tipInt(w), kind: "fx" },
    {
      label: "Custo de mana:",
      value: tipInt(pisotearManaCost(w)),
      kind: "mana",
    },
    { label: "CDR:", value: cdrStr, kind: "cdr" },
    {
      label: "Alcance:",
      value: `Inimigos a ${tipInt(1)}–${tipInt(maxD)} hex`,
      kind: "range",
    },
    {
      label: "Dano:",
      value: `${formatTooltipNumber(dmgApprox)} bruto por alvo`,
      kind: "dmg",
    },
    {
      label: "Efeito:",
      value: "Só durante Fúria do gigante",
      kind: "fx",
    },
  ]);
}

function bunkerMinasAbilityLines(
  h: Unit,
  tier: 0 | 1 | 2,
  cdrLabel: string,
): { label: string; value: string; kind: TooltipLineKind }[] {
  const mult = bunkerMinasDamageMult(tier);
  const rings = bunkerMinasMaxRing(tier);
  const baseDano =
    heroDanoPlusRoninOverflow(h) +
    h.pistoleiroBonusDanoWave +
    h.curandeiroDanoWave;
  const per = baseDano * mult;
  return [
    { label: "Custo de mana:", value: tipInt(0), kind: "mana" },
    { label: "CDR:", value: cdrLabel, kind: "cdr" },
    {
      label: "Alcance:",
      value: `Até ${tipInt(rings)} anel(is) em volta do bunker`,
      kind: "range",
    },
    {
      label: "Dano:",
      value: `${formatTooltipNumber(per)} bruto por inimigo em cada anel (por onda)`,
      kind: "dmg",
    },
    {
      label: "Efeito:",
      value:
        "Primeiro aparecem os hexes afetados (anéis); clique num hex destacado para confirmar",
      kind: "fx",
    },
  ];
}

function tooltipBunkerMinasCombat(h: Unit, m: GameModel): string {
  const b = m.bunkerAtHex(h.q, h.r);
  if (!b) {
    return tooltipPassiveHtml("Minas terrestres", "—");
  }
  const cdBase = bunkerMinasCooldownWaves(b.tier);
  const cdv = h.skillCd["bunker_minas"] ?? 0;
  const cdrStr =
    cdv > 0
      ? `${tipInt(cdv)} onda(s) até disponível`
      : tipInt(cdBase);
  const lines = bunkerMinasAbilityLines(h, b.tier, cdrStr);
  return tooltipAbilityHtml("Minas terrestres (bunker)", lines);
}

function bunkerTiroAbilityLines(
  h: Unit,
  cdrLabel: string,
): { label: string; value: string; kind: TooltipLineKind }[] {
  const baseDano =
    heroDanoPlusRoninOverflow(h) +
    h.pistoleiroBonusDanoWave +
    h.curandeiroDanoWave;
  const raw = baseDano * 10;
  return [
    { label: "Custo de mana:", value: tipInt(0), kind: "mana" },
    { label: "CDR:", value: cdrLabel, kind: "cdr" },
    { label: "Alcance:", value: "Qualquer inimigo no coliseu", kind: "range" },
    { label: "Dano:", value: `${formatTooltipNumber(raw)} bruto (morteiro)`, kind: "dmg" },
    {
      label: "Efeito:",
      value: "Projétil em arco até ao alvo selecionado",
      kind: "fx",
    },
  ];
}

function tooltipBunkerTiroCombat(h: Unit, _m: GameModel): string {
  const cdv = h.skillCd["bunker_tiro_preciso"] ?? 0;
  const cd = bunkerTiroCooldownWaves();
  const cdrStr =
    cdv > 0
      ? `${tipInt(cdv)} onda(s) até disponível`
      : tipInt(cd);
  return tooltipAbilityHtml(
    "Tiro preciso",
    bunkerTiroAbilityLines(h, cdrStr),
  );
}

/** Tooltip ao pairar o mapa no hex do bunker (combate); não depende do alcance de movimento. */
function combatBunkerWorldTooltipHtml(
  b: BunkerState,
  occupant: Unit | undefined,
): string {
  const nv = bunkerDisplayLevel(b.tier);
  const parts: string[] = [
    `<div class="game-ui-tooltip-inner">`,
    `<div class="game-ui-tooltip-title">Bunker nv. ${nv}</div>`,
    `<p class="game-ui-tooltip-passive"><span class="tt-lbl">PV da estrutura:</span> ${formatTooltipNumber(b.hp)} / ${formatTooltipNumber(b.maxHp)}</p>`,
    `<p class="game-ui-tooltip-passive"><span class="tt-lbl">Defesa:</span> ${formatTooltipNumber(b.defesa)}</p>`,
  ];
  if (occupant && occupant.isPlayer && occupant.hp > 0) {
    parts.push(
      `<p class="game-ui-tooltip-subhead">${escapeHtml(occupant.name)} no bunker</p>`,
      `<p class="game-ui-tooltip-passive"><span class="tt-lbl">PV do herói:</span> ${formatTooltipNumber(occupant.hp)} / ${formatTooltipNumber(occupant.maxHp)} · <span class="tt-lbl">Mana:</span> ${formatTooltipNumber(occupant.mana)} / ${formatTooltipNumber(occupant.maxMana)}</p>`,
      `<p class="game-ui-tooltip-passive game-ui-tooltip-passive--tight-top">Inimigos reduzem primeiro a vida do bunker enquanto estiveres dentro.</p>`,
    );
  } else {
    parts.push(
      `<p class="game-ui-tooltip-passive game-ui-tooltip-passive--tight-top">Move o herói até este hex (com movimento disponível) para entrar e proteger-te.</p>`,
    );
  }
  parts.push(`</div>`);
  return parts.join("");
}

function tooltipSkillSentenca(h: Unit, m: GameModel, sk: SkillDef): string {
  const w = h.weaponLevel;
  const bio = biomeAt(m.grid, h.q, h.r) as BiomeId;
  const dPv = m.tooltipPreviewSentencaDamagePerEnemy(h);
  const healEff = m.tooltipPreviewSentencaHealEffective(h);
  const cdv = h.skillCd[sk.id] ?? 0;
  const cdB = sentencaCooldownWaves(w);
  const cdrStr =
    cdv > 0
      ? `${tipInt(cdv)} onda(s) até disponível`
      : cdB <= 0
        ? "—"
        : `${tipInt(cdB)} onda(s)`;
  const mc = sentencaManaCost(w);
  const escudoExcessoMax = m.tooltipPreviewSentencaShieldOverflowMax(h);
  return tooltipAbilityHtml(sk.name, [
    { label: "Nível arma:", value: tipInt(w), kind: "fx" },
    {
      label: "Custo de mana:",
      value: tipInt(mc),
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
      value: `${formatTooltipNumber(dPv)} bruto por inimigo`,
      kind: "dmg",
    },
    {
      label: "Cura:",
      value: `${formatTooltipNumber(healEff)} PV por aliado`,
      kind: "fx",
    },
    {
      label: "Efeito:",
      value: `Excesso de cura vira ${formatTooltipNumber(escudoExcessoMax)} PV em escudo por aliado`,
      kind: "fx",
    },
  ]);
}

function tooltipSkillById(h: Unit, m: GameModel, sk: SkillDef): string {
  if (sk.id === "tiro_destruidor") return tooltipTiroDestruidor(h, m, sk);
  if (sk.id === "atirar_todo_lado") return tooltipSkillAtirar(h, m, sk);
  if (sk.id === "ate_a_morte") return tooltipSkillAteMorte(h, m, sk);
  if (sk.id === "pisotear") return tooltipSkillPisotear(h, m);
  if (sk.id === "sentenca") return tooltipSkillSentenca(h, m, sk);
  return tooltipAbilityHtml(sk.name, [
    {
      label: "Custo de mana:",
      value: tipInt(sk.manaCost ?? 0),
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
  const raw = m.tooltipPreviewEspecialistaDestruicaoRaw(h);
  return tooltipAbilityHtml("Especialista da destruição", [
    { label: "Custo de mana:", value: tipInt(0), kind: "mana" },
    { label: "CDR:", value: "—", kind: "cdr" },
    { label: "Alcance:", value: formatTooltipNumber(alc), kind: "range" },
    {
      label: "Dano:",
      value: `${formatTooltipNumber(raw)} de dano bruto (crítico e defesa do alvo aplicam depois)`,
      kind: "dmg",
    },
    {
      label: "Efeito:",
      value: "Um inimigo; clique no alvo no alcance vermelho",
      kind: "fx",
    },
  ]);
}

function stripGameTooltipInner(html: string): string {
  const marker = "game-ui-tooltip-inner";
  const i = html.indexOf(marker);
  if (i < 0) return html;
  const gt = html.indexOf(">", i);
  if (gt < 0) return html;
  const start = gt + 1;
  const end = html.lastIndexOf("</div>");
  if (end < start) return html;
  return html.slice(start, end).trim();
}

function unitCloneSemFormaFinal(u: Unit): Unit {
  const o = { ...u } as Unit;
  delete o.ultimateId;
  return o;
}

function unitCloneComFormaFinal(u: Unit, ultId: string): Unit {
  return { ...u, ultimateId: ultId };
}

/** Skill principal (W) / básico conforme a forma — para o menu da forma final. */
function formaFinalPrimarySkillTooltip(u: Unit, m: GameModel): string {
  const cls = u.heroClass;
  if (!cls) return tooltipPassiveHtml("—", "—");
  if (cls === "pistoleiro" && u.ultimateId === "especialista_destruicao") {
    return tooltipEspecialista(u, m);
  }
  if (cls === "pistoleiro" && u.ultimateId === "arauto_caos") {
    return tooltipTiroDestruidor(u, m, pistoleiroTiroDestruidorSkillDef());
  }
  const sk = HEROES[cls].skills[0]!;
  return tooltipSkillById(u, m, sk);
}

function formaFinalPickMergedTooltipHtml(
  u: Unit,
  m: GameModel,
  branch: "weapon" | 0 | 1,
): string {
  const cls = u.heroClass!;
  const tmpl = HEROES[cls];
  const ultList = tmpl.ultimates;
  const preview: Unit =
    branch === "weapon"
      ? unitCloneSemFormaFinal(u)
      : unitCloneComFormaFinal(u, ultList[branch as 0 | 1]!.id);
  const skillBlock = stripGameTooltipInner(formaFinalPrimarySkillTooltip(preview, m));
  const ultSource: Unit = branch === "weapon" ? unitCloneSemFormaFinal(u) : preview;
  const ultBlock = stripGameTooltipInner(tooltipWeaponUltimate(ultSource));
  let extraForma = "";
  if (branch !== "weapon") {
    const ult = ultList[branch as 0 | 1]!;
    extraForma = `<div class="forma-final-tt-divider" role="separator"></div><p class="game-ui-tooltip-passive forma-final-tt-passiva"><strong class="tt-ult-forma">${escapeHtml(ult.name)}</strong> — ${escapeHtml(ult.description)}</p>`;
  }
  return `<div class="game-ui-tooltip-inner game-ui-tooltip-inner--forma-final-pick">${skillBlock}<div class="forma-final-tt-divider" role="separator"></div>${ultBlock}${extraForma}</div>`;
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

/** Regen de vida/mana por turno com bioma, deserto e sinergias (igual à grelha de atributos). */
function computeHeroEffectiveTurnRegen(h: Unit, m: GameModel): {
  hp: number;
  mana: number;
} {
  const bio = biomeAt(m.grid, h.q, h.r) as BiomeId;
  const ign = unitIgnoresTerrain(h);
  const fd = forgeSynergyTier(h.forgeLoadout, "deserto");
  const desertoBlock = bio === "deserto" && !ign && fd < 1;
  const regMult = h.isPlayer && fd >= 2 && bio === "deserto" ? 2 : 1;
  const rulerDesertRegenFlat =
    h.isPlayer && fd >= 1 && (h.artifacts["ruler"] ?? 0) > 0 ? 2 : 0;
  return {
    hp:
      Math.floor((desertoBlock ? 0 : h.regenVida) * regMult) +
      (h.isPlayer ? m.desertoAllyRegenExtraHp(h) : 0) +
      rulerDesertRegenFlat,
    mana:
      Math.floor((desertoBlock ? 0 : h.regenMana) * regMult) +
      (h.isPlayer ? m.desertoAllyRegenExtraMana(h) : 0) +
      rulerDesertRegenFlat,
  };
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
  const waveSacDef = h.isPlayer ? (h.sacrificioResilienteWaveDef ?? 0) : 0;
  const effDef =
    coreDefHero +
    (h.isPlayer ? m.montanhosoAllyDefBonus(h) : 0) +
    waveSacDef;
  const movPool = m.heroMovementPool(h);
  /** No combate, no turno deste herói: movimento na grelha = restantes / pool (inteiros). */
  const heroMovCombatTurn =
    h.isPlayer &&
    !!h.heroClass &&
    m.phase === "combat" &&
    !m.inEnemyPhase &&
    !m.duel &&
    m.currentHero()?.id === h.id;
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
  const { hp: effRegV, mana: effRegM } = computeHeroEffectiveTurnRegen(h, m);

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
      const hpDisp = `${formatTooltipNumber(h.hp)}/${formatTooltipNumber(h.maxHp)}`;
      const hpPair = valWithDelta(hpDisp, h.maxHp - b.maxHp, "int");
      cells.push({
        icon: "max_hp",
        label: "Vida",
        value: hpDisp,
        valueHtml: hpPair.html,
        tooltipValue: hpPair.plain,
        statCategory: "defense",
        tooltipHtml: combatHeroStatTooltip({
          stat: "max_hp",
          display: hpDisp,
          detailPlain: hpPair.plain,
        }),
      });
    }
    {
      const mpDisp = `${formatTooltipNumber(h.mana)}/${formatTooltipNumber(h.maxMana)}`;
      const mpPair = valWithDelta(mpDisp, h.maxMana - b.maxMana, "int");
      cells.push({
        icon: "max_mana",
        label: "Mana",
        value: mpDisp,
        valueHtml: mpPair.html,
        tooltipValue: mpPair.plain,
        statCategory: "defense",
        tooltipHtml: combatHeroStatTooltip({
          stat: "max_mana",
          display: mpDisp,
          detailPlain: mpPair.plain,
        }),
      });
    }
    pushStat(
      cells,
      "regen_hp",
      "Regen. vida",
      formatTooltipNumber(effRegV),
      effRegV - baseRegV,
      "int",
      (plain) =>
        combatHeroStatTooltip({
          stat: "regen_hp",
          display: formatTooltipNumber(effRegV),
          detailPlain: plain,
        }),
      "defense",
    );
    pushStat(
      cells,
      "regen_mp",
      "Regen. mana",
      formatTooltipNumber(effRegM),
      effRegM - baseRegM,
      "int",
      (plain) =>
        combatHeroStatTooltip({
          stat: "regen_mp",
          display: formatTooltipNumber(effRegM),
          detailPlain: plain,
        }),
      "defense",
    );
    {
      const effDmg = m.computeBasicAttackRawDamage(h);
      const baseRaw = roundToCombatDecimals(
        heroDanoPlusRoninFromBaseline(b) +
          waveExtra +
          garraFerroRawBonusFromDefesaAndStacks(b.defesa, b.artifacts),
      );
      const dmgDelta = effDmg - baseRaw;
      const roninFlat = heroDanoPlusRoninOverflow(h) - h.dano;
      const dmgDisp = formatTooltipNumber(effDmg);
      const dmgPair = valWithDelta(dmgDisp, dmgDelta, "int");
      let dmgPlain = dmgPair.plain;
      if (roninFlat > 0) {
        dmgPlain += ` — +${formatTooltipNumber(roninFlat)} do Ronin (crítico >100%)`;
      }
      cells.push({
        icon: "dmg",
        label: "Dano",
        value: dmgDisp,
        valueHtml: dmgPair.html,
        tooltipValue: dmgPlain,
        statCategory: "offense",
        tooltipHtml: combatHeroStatTooltip({
          stat: "dmg",
          display: dmgDisp,
          detailPlain: dmgPlain,
        }),
      });
    }
    {
      const critDisp = displayedCritChancePercent(h);
      const critDispDelta =
        critDisp - displayedCritChanceFromParts(b.acertoCritico, b.artifacts);
      const critDispStr = `${formatTooltipNumber(critDisp)}%`;
      const critPair = valWithDelta(critDispStr, critDispDelta, "pct");
      const tot = totalCritChancePercent(h);
      let critPlain = critPair.plain;
      if (tot > critDisp) {
        critPlain += ` — +${formatTooltipNumber(tot - critDisp)}% acima do teto de crítico (sem Ronin não entra no dado; com Ronin mostra o total e vira dano).`;
      } else if (tot > 100 && (h.artifacts["ronin"] ?? 0) > 0) {
        critPlain += ` — excesso acima de 100% converte em dano (Ronin).`;
      }
      cells.push({
        icon: "crit_hit",
        label: "Acerto crítico",
        value: critDispStr,
        valueHtml: critPair.html,
        tooltipValue: critPlain,
        statCategory: "offense",
        tooltipHtml: combatHeroStatTooltip({
          stat: "crit_hit",
          display: critDispStr,
          detailPlain: critPlain,
        }),
      });
    }
    pushStat(
      cells,
      "crit_dmg",
      "Dano critico",
      `${formatTooltipNumber(Math.round(critMultCur * 100))}%`,
      Math.round((critMultCur - critMultBase) * 100),
      "pct",
      (plain) =>
        combatHeroStatTooltip({
          stat: "crit_dmg",
          display: `${formatTooltipNumber(Math.round(critMultCur * 100))}%`,
          detailPlain: plain,
        }),
      "offense",
    );
    {
      const { html } = valWithDelta(
        formatTooltipNumber(effDef),
        effDef - baseEffDef,
        "int",
      );
      cells.push({
        icon: "def",
        label: ign ? "Defesa (ruler ignora bioma)" : "Defesa",
        value: formatTooltipNumber(effDef),
        valueHtml: html,
        tooltipValue: defenseReductionTooltipText(effDef),
        statCategory: "defense",
        tooltipHtml: combatHeroStatTooltip({
          stat: "def",
          display: formatTooltipNumber(effDef),
          defenseNumeric: formatTooltipNumber(effDef),
          defenseReductionPct: formatDefenseReductionPct(effDef),
        }),
      });
    }
    const movDeltaCore = movPool - b.movimento;
    const movPoolIntStr = tipInt(movPool);
    const movDisp = heroMovCombatTurn
      ? `${tipInt(m.movementLeft)}/${movPoolIntStr}`
      : movPoolIntStr;
    const movPair = heroMovCombatTurn
      ? { html: escapeHtml(movDisp), plain: movDisp }
      : valWithDelta(movPoolIntStr, movDeltaCore, "int");
    const movDetailCore = heroMovCombatTurn
      ? `${movDisp} (restantes / máximo neste turno)`
      : movPair.plain;
    const pantHexSlow =
      bio === "pantano" &&
      !ign &&
      forgeSynergyTier(h.forgeLoadout, "pantano") < 1;
    const pantExtra = pantHexSlow
      ? ` <span class="lol-stat-delta lol-stat-delta--down">(−50% mobilidade)</span>`
      : "";
    const pantTail = pantHexSlow ? " — hexes no pântano custam 2 pontos" : "";
    cells.push({
      icon: "mov",
      label: "Movimento",
      value: movDisp,
      valueHtml: movPair.html + pantExtra,
      tooltipValue: movDetailCore + pantTail,
      statCategory: "utility",
      tooltipHtml: combatHeroStatTooltip({
        stat: "mov",
        display: movDisp,
        detailPlain: `${movDetailCore}${pantTail}`,
      }),
    });

    pushStat(
      cells,
      "range",
      ign ? "Alcance (ruler ignora bioma)" : "Alcance",
      formatTooltipNumber(effAlc),
      effAlc - baseEffAlc,
      "int",
      (plain) =>
        combatHeroStatTooltip({
          stat: "range",
          display: formatTooltipNumber(effAlc),
          detailPlain: plain,
        }),
      "utility",
    );
    pushStat(
      cells,
      "pot",
      "Potencial de cura e escudo",
      formatTooltipNumber(h.potencialCuraEscudo),
      h.potencialCuraEscudo - b.potencialCuraEscudo,
      "float",
      (plain) =>
        combatHeroStatTooltip({
          stat: "pot",
          display: formatTooltipNumber(h.potencialCuraEscudo),
          potencialNumeric: h.potencialCuraEscudo,
          detailPlain: plain,
        }),
      "utility",
    );
    {
      const xpCur = m.xpGainBonusPercentForHero(h);
      const tre0 = b.artifacts["trevo"] ?? 0;
      const shop0 = b.artifacts["_xp_shop"] ?? 0;
      const xpBase = Math.floor(
        25 * tre0 +
          shop0 +
          permPercent(m.meta.permXp) +
          m.partyXpBonusPct +
          pantanoHelmoXpBonusPercent(h.forgeLoadout),
      );
      const xpDisp = `+${formatTooltipNumber(xpCur)}%`;
      pushStat(
        cells,
        "xp_bonus",
        "Bônus XP",
        xpDisp,
        xpCur - xpBase,
        "pct",
        (plain) =>
          combatHeroStatTooltip({
            stat: "xp_bonus",
            display: xpDisp,
            detailPlain: plain,
          }),
        "utility",
      );
    }
    pushStat(
      cells,
      "pen",
      "Penetração",
      formatTooltipNumber(h.penetracao),
      h.penetracao - b.penetracao,
      "int",
      (plain) =>
        combatHeroStatTooltip({
          stat: "pen",
          display: formatTooltipNumber(h.penetracao),
          detailPlain: plain,
        }),
      "offense",
    );
    pushStat(
      cells,
      "pen_escudo",
      "Penetração de escudo",
      formatTooltipNumber(h.penetracaoEscudo),
      h.penetracaoEscudo - b.penetracaoEscudo,
      "int",
      (plain) =>
        combatHeroStatTooltip({
          stat: "pen_escudo",
          display: formatTooltipNumber(h.penetracaoEscudo),
          detailPlain: plain,
        }),
      "utility",
    );
    pushStat(
      cells,
      "lifesteal",
      "Roubo de vida",
      `${formatTooltipNumber(h.lifesteal)}%`,
      h.lifesteal - b.lifesteal,
      "pct",
      (plain) =>
        combatHeroStatTooltip({
          stat: "lifesteal",
          display: `${formatTooltipNumber(h.lifesteal)}%`,
          detailPlain: plain,
        }),
      "utility",
    );
    pushStat(
      cells,
      "luck",
      "Sorte",
      formatTooltipNumber(m.effectiveSorte(h)),
      m.effectiveSorte(h) - b.sorte,
      "int",
      (plain) =>
        combatHeroStatTooltip({
          stat: "luck",
          display: formatTooltipNumber(m.effectiveSorte(h)),
          detailPlain: plain,
        }),
      "utility",
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
      statCategory: "utility",
      tooltipHtml: combatHeroStatTooltip({
        stat: "fly",
        display: flyStr,
        detailPlain: flyPlain,
      }),
    });
  } else {
    const we = h.pistoleiroBonusDanoWave + h.curandeiroDanoWave;
    const hpDE = `${formatTooltipNumber(h.hp)}/${formatTooltipNumber(h.maxHp)}`;
    cells.push({
      icon: "max_hp",
      label: "Vida",
      value: hpDE,
      statCategory: "defense",
      tooltipHtml: combatHeroStatTooltip({ stat: "max_hp", display: hpDE }),
    });
    const mpDE = `${formatTooltipNumber(h.mana)}/${formatTooltipNumber(h.maxMana)}`;
    cells.push({
      icon: "max_mana",
      label: "Mana",
      value: mpDE,
      statCategory: "defense",
      tooltipHtml: combatHeroStatTooltip({ stat: "max_mana", display: mpDE }),
    });
    cells.push({
      icon: "regen_hp",
      label: "Regen. vida",
      value: formatTooltipNumber(effRegV),
      statCategory: "defense",
      tooltipHtml: combatHeroStatTooltip({
        stat: "regen_hp",
        display: formatTooltipNumber(effRegV),
      }),
    });
    cells.push({
      icon: "regen_mp",
      label: "Regen. mana",
      value: formatTooltipNumber(effRegM),
      statCategory: "defense",
      tooltipHtml: combatHeroStatTooltip({
        stat: "regen_mp",
        display: formatTooltipNumber(effRegM),
      }),
    });
    cells.push({
      icon: "dmg",
      label: "Dano",
      value: formatTooltipNumber(heroDanoPlusRoninOverflow(h)),
      tooltipValue: (() => {
        const eff = heroDanoPlusRoninOverflow(h);
        const flat = eff - h.dano;
        const dmgDE = formatTooltipNumber(eff);
        const base =
          we > 0
            ? `${dmgDE} (+${formatTooltipNumber(we)} bônus de wave no combate)`
            : dmgDE;
        return flat > 0
          ? `${base} — +${formatTooltipNumber(flat)} do Ronin (crítico >100%)`
          : base;
      })(),
      statCategory: "offense",
      tooltipHtml: combatHeroStatTooltip({
        stat: "dmg",
        display: formatTooltipNumber(heroDanoPlusRoninOverflow(h)),
        detailPlain: (() => {
          const eff = heroDanoPlusRoninOverflow(h);
          const flat = eff - h.dano;
          const dmgDE = formatTooltipNumber(eff);
          const base =
            we > 0
              ? `${dmgDE} (+${formatTooltipNumber(we)} bônus de wave no combate)`
              : dmgDE;
          return flat > 0
            ? `${base} — +${formatTooltipNumber(flat)} do Ronin (crítico >100%)`
            : base;
        })(),
      }),
    });
    const critPctElse = displayedCritChancePercent(h);
    const critDE = `${formatTooltipNumber(critPctElse)}%`;
    const totCritElse = totalCritChancePercent(h);
    const critTv =
      totCritElse > critPctElse
        ? `${critDE} (chance no dado; +${formatTooltipNumber(totCritElse - critPctElse)}% acima de 100% sem efeito em crítico até teres Ronin)`
        : totCritElse > 100
          ? `${critDE} (excesso acima de 100% vira +1 dano por cada 5% com Ronin)`
          : critDE;
    cells.push({
      icon: "crit_hit",
      label: "Acerto crítico",
      value: critDE,
      tooltipValue: critTv,
      statCategory: "offense",
      tooltipHtml: combatHeroStatTooltip({
        stat: "crit_hit",
        display: critDE,
        detailPlain: critTv,
      }),
    });
    const critDmgDE = `${formatTooltipNumber(Math.round(critMultCur * 100))}%`;
    cells.push({
      icon: "crit_dmg",
      label: "Dano critico",
      value: critDmgDE,
      statCategory: "offense",
      tooltipHtml: combatHeroStatTooltip({
        stat: "crit_dmg",
        display: critDmgDE,
      }),
    });
    cells.push({
      icon: "def",
      label: ign ? "Defesa (ruler ignora bioma)" : "Defesa",
      value: formatTooltipNumber(effDef),
      tooltipValue: defenseReductionTooltipText(effDef),
      statCategory: "defense",
      tooltipHtml: combatHeroStatTooltip({
        stat: "def",
        display: formatTooltipNumber(effDef),
        defenseNumeric: formatTooltipNumber(effDef),
        defenseReductionPct: formatDefenseReductionPct(effDef),
      }),
    });
    const pantHexSlowElse =
      bio === "pantano" &&
      !ign &&
      forgeSynergyTier(h.forgeLoadout, "pantano") < 1;
    const pantF = pantHexSlowElse
      ? ` <span class="lol-stat-delta lol-stat-delta--down">(−50% mobilidade)</span>`
      : "";
    const movPoolElseStr = tipInt(movPool);
    const movElseDisp = heroMovCombatTurn
      ? `${tipInt(m.movementLeft)}/${movPoolElseStr}`
      : movPoolElseStr;
    const movElseDetail = heroMovCombatTurn
      ? `${movElseDisp} (restantes / máximo neste turno)`
      : movElseDisp;
    const pantTailElse = pantHexSlowElse
      ? " — hexes no pântano custam 2 pontos"
      : "";
    cells.push({
      icon: "mov",
      label: "Movimento",
      value: movElseDisp,
      valueHtml: escapeHtml(movElseDisp) + pantF,
      tooltipValue: movElseDetail + pantTailElse,
      statCategory: "utility",
      tooltipHtml: combatHeroStatTooltip({
        stat: "mov",
        display: movElseDisp,
        detailPlain: `${movElseDetail}${pantTailElse}`,
      }),
    });
    cells.push({
      icon: "range",
      label: ign ? "Alcance (ruler ignora bioma)" : "Alcance",
      value: formatTooltipNumber(effAlc),
      statCategory: "utility",
      tooltipHtml: combatHeroStatTooltip({
        stat: "range",
        display: formatTooltipNumber(effAlc),
      }),
    });
    cells.push({
      icon: "pot",
      label: "Potencial de cura e escudo",
      value: formatTooltipNumber(h.potencialCuraEscudo),
      statCategory: "utility",
      tooltipHtml: combatHeroStatTooltip({
        stat: "pot",
        display: formatTooltipNumber(h.potencialCuraEscudo),
        potencialNumeric: h.potencialCuraEscudo,
      }),
    });
    const xpDE = `+${formatTooltipNumber(model.xpGainBonusPercentForHero(h))}%`;
    cells.push({
      icon: "xp_bonus",
      label: "Bônus XP",
      value: xpDE,
      tooltipValue: xpDE,
      statCategory: "utility",
      tooltipHtml: combatHeroStatTooltip({
        stat: "xp_bonus",
        display: xpDE,
      }),
    });
    cells.push({
      icon: "pen",
      label: "Penetração",
      value: formatTooltipNumber(h.penetracao),
      statCategory: "offense",
      tooltipHtml: combatHeroStatTooltip({
        stat: "pen",
        display: formatTooltipNumber(h.penetracao),
      }),
    });
    cells.push({
      icon: "pen_escudo",
      label: "Penetração de escudo",
      value: formatTooltipNumber(h.penetracaoEscudo),
      statCategory: "utility",
      tooltipHtml: combatHeroStatTooltip({
        stat: "pen_escudo",
        display: formatTooltipNumber(h.penetracaoEscudo),
      }),
    });
    cells.push({
      icon: "lifesteal",
      label: "Roubo de vida",
      value: `${formatTooltipNumber(h.lifesteal)}%`,
      statCategory: "utility",
      tooltipHtml: combatHeroStatTooltip({
        stat: "lifesteal",
        display: `${formatTooltipNumber(h.lifesteal)}%`,
      }),
    });
    cells.push({
      icon: "luck",
      label: "Sorte",
      value: formatTooltipNumber(m.effectiveSorte(h)),
      statCategory: "utility",
      tooltipHtml: combatHeroStatTooltip({
        stat: "luck",
        display: formatTooltipNumber(m.effectiveSorte(h)),
      }),
    });
    const flyDE = h.flying ? "Sim" : "Não";
    cells.push({
      icon: "fly",
      label: "Voo",
      value: flyDE,
      statCategory: "utility",
      tooltipHtml: combatHeroStatTooltip({ stat: "fly", display: flyDE }),
    });
  }

  if (h.gladiadorKills)
    pushStat(
      cells,
      "kills",
      "Eliminações (passiva do gladiador)",
      formatTooltipNumber(h.gladiadorKills),
      h.gladiadorKills,
      "int",
      undefined,
      "utility",
    );
  if (h.duroPedraDefStacks)
    pushStat(
      cells,
      "stone",
      "Duro como pedra (acúmulos de defesa no turno)",
      formatTooltipNumber(h.duroPedraDefStacks),
      h.duroPedraDefStacks,
      "int",
      undefined,
      "utility",
    );
  if (h.motorMorteNextBasicPct)
    pushStat(
      cells,
      "motor",
      "Golpe Relâmpago (próximo básico, %)",
      `${formatTooltipNumber(h.motorMorteNextBasicPct)}%`,
      h.motorMorteNextBasicPct,
      "pct",
      undefined,
      "utility",
    );
  if (h.poison && h.poison.instances.length > 0) {
    const pi = poisonInstanceCount(h);
    const pn = sumNextPoisonTickDamage(h);
    const pr = dotTickConsumeCount(h);
    cells.push({
      icon: "poison",
      label: "Veneno",
      value: `${pi} inst. · próx. ${formatTooltipNumber(pn)} (${pr}/tick)`,
      tooltipValue: `${pi} instância(s); próximo tick ${formatTooltipNumber(pn)} dano; consome ${pr} por turno. Ignora defesa.`,
      statCategory: "utility",
    });
  }
  if (h.hot && h.hot.instances.length > 0) {
    const hi = hotInstanceCount(h);
    const hn = sumNextHotTickHeal(h);
    const hr = dotTickConsumeCount(h);
    cells.push({
      icon: "regen_hp",
      label: "Cura contínua",
      value: `${hi} inst. · próx. +${formatTooltipNumber(hn)} (${hr}/tick)`,
      tooltipValue: `${hi} instância(s); próximo tick +${formatTooltipNumber(hn)} PV; consome ${hr} por turno.`,
      statCategory: "utility",
    });
  }
  if (h.ultimateId)
    cells.push({
      icon: "ult",
      label: "Ultimate escolhida",
      value: h.ultimateId,
      statCategory: "utility",
    });
  if (h.formaFinal)
    cells.push({
      icon: "forma",
      label: "Forma final",
      value: "Sim",
      statCategory: "utility",
    });
  if (h.isPlayer && h.heroClass) {
    const cap = m.maxBasicAttacksForHero(h);
    const theirTurn =
      m.phase === "combat" &&
      !m.inEnemyPhase &&
      !m.duel &&
      m.currentHero()?.id === h.id;
    const dispNum = theirTurn ? m.basicLeft : cap;
    const dispStr = formatTooltipNumber(dispNum);
    let detailPlain: string | undefined;
    if (!theirTurn) {
      if (m.phase === "combat" && m.inEnemyPhase)
        detailPlain = `Máximo ${formatTooltipNumber(cap)} por turno de herói. No turno deste herói, o valor mostra quantos restam.`;
      else if (m.phase === "combat")
        detailPlain = `Máximo ${formatTooltipNumber(cap)} por turno. No turno deste herói, este valor passa a mostrar os restantes.`;
      else
        detailPlain = `Máximo ${formatTooltipNumber(cap)} por turno no combate (braço forte, helmo rochoso). No teu turno, mostra os que ainda podes usar.`;
    }
    cells.push({
      icon: "basic",
      label: "Ataque Extra",
      value: dispStr,
      statCategory: "offense",
      tooltipHtml: combatHeroStatTooltip({
        stat: "basic",
        display: dispStr,
        ...(detailPlain ? { detailPlain } : {}),
      }),
    });
  }
  const Bb = h.isPlayer ? m.bunkerForOccupant(h.id) : null;
  const inBunkHud = !!Bb && Bb.hp > 0;
  if (inBunkHud && Bb) {
    const B = Bb;
    cells.unshift({
      icon: "def",
      label: "Bunker (estrutura)",
      value: `${formatTooltipNumber(B.hp)}/${formatTooltipNumber(B.maxHp)} · def ${formatTooltipNumber(B.defesa)}`,
      tooltipValue: `PV e defesa do bunker; inimigos reduzem esta vida antes da sua.`,
      statCategory: "defense",
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
    | "burnDot"
  >,
): void {
  const el = document.createElement("div");
  el.className = "combat-float";
  const poisonDot = ev.kind === "damage" && !!ev.poisonDot;
  const burnDot = ev.kind === "damage" && !!ev.burnDot;
  const amtStr = formatCombatFloatAmount(amount);
  const text =
    ev.kind === "damage" && ev.crit && !poisonDot && !burnDot
      ? `${amtStr}!`
      : amtStr;
  el.textContent = text;
  if (ev.kind === "damage") {
    if (poisonDot) {
      el.classList.add("combat-float--dmg-poison");
    } else if (burnDot) {
      el.classList.add("combat-float--dmg-burn");
    } else if (ev.bunkerDamage) {
      el.classList.add("combat-float--dmg-bunker");
    } else {
      el.classList.add(
        ev.targetIsPlayer
          ? "combat-float--dmg-hero"
          : "combat-float--dmg-enemy",
      );
    }
    if (ev.crit && !poisonDot && !burnDot) el.classList.add("combat-float--crit");
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
  combatCornerResizeObserver?.disconnect();
  combatCornerResizeObserver = null;
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
  removeEquipmentModal();
  uiRoot.innerHTML = "";
  const sandboxHudHtml = model.devSandboxMode
    ? `<div class="hud-block hud-sandbox-pill" role="note">Sandbox — painel ao centro (arrastar pelo título) · <kbd class="hud-sandbox-kbd">A</kbd> mostrar/ocultar · artefatos esq./dir.</div>`
    : "";
  const hud = el(`
    <div class="hud">
      ${sandboxHudHtml}
      <div class="hud-block hint-inline">Cada <strong>rodada</strong> começa pelos <strong>inimigos</strong>. Clique no <strong>seu herói</strong> para <strong>movimento</strong> (hexes azuis) ou <strong>Espaço</strong> para o herói do turno. Com <strong>ataque ou skill</strong> selecionados, os hexes <strong>azuis</strong> permitem <strong>reposicionar</strong> antes do alvo; o <strong>vermelho</strong> é o alcance da ação. Clique num <strong>inimigo</strong> para ver atributos <strong>só sem</strong> ataque/skill selecionados. <strong>Atirar pra todo lado</strong> (pistoleiro): com movimento, ao escolheres a skill vês só hexes <strong>azuis</strong>; após <strong>um</strong> passo a ráfaga dispara sozinha. Sem movimento, vês o alcance em <strong>vermelho</strong> e confirmas com um clique na arena (hex ou inimigo no alcance). Repetir a mesma tecla da skill cancela a seleção. <strong>WASD</strong> ou <strong>arrastar botão esquerdo</strong> na arena para mover a câmera · <strong>roda</strong> zoom. <strong>I</strong> equipamentos forjados · <strong>Esc</strong> pausar.</div>
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
          <div class="combat-artifacts-main">
            <div class="combat-artifacts-strip" id="combat-artifacts-strip" aria-label="Artefatos"></div>
            <div class="combat-artifacts-pager-stack">
              <button type="button" class="combat-artifacts-pager combat-artifacts-pager--up" id="combat-artifacts-up" aria-label="Artefatos anteriores">▲</button>
              <button type="button" class="combat-artifacts-pager combat-artifacts-pager--down" id="combat-artifacts-down" aria-label="Artefatos seguintes">▼</button>
            </div>
          </div>
        </div>
        <div class="combat-above-rarity combat-rarity-hint" id="combat-rarity-hint" aria-live="polite"></div>
      </div>
      <div class="combat-above-bar-right">
        <div class="combat-skip-toggles" role="group" aria-label="Animações de combate">
          <label class="combat-skip-toggle-label" for="chk-skip-enemy-move">
            <input type="checkbox" id="chk-skip-enemy-move" />
            <span>Inimigas</span>
          </label>
          <label class="combat-skip-toggle-label" for="chk-skip-allied-combat-anim">
            <input type="checkbox" id="chk-skip-allied-combat-anim" />
            <span>Aliadas</span>
          </label>
        </div>
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
              <div class="lol-skill-slot lol-skill-slot--passive" id="lol-passive-slot">P</div>
            </div>
          </div>
          <div class="lol-col lol-col-bars">
            <div class="lol-bars-row">
              <div class="lol-portrait-wrap">
                <div class="lol-portrait" id="lol-portrait"></div>
                <div class="lol-bravura-badge" id="lol-bravura-badge" hidden aria-hidden="true"></div>
                <div class="lol-level-badge" id="lol-level">1</div>
              </div>
              <div class="lol-bars-stack">
                <div class="lol-name-row">
                  <span class="lol-champ-name" id="lol-name">—</span>
                  <span class="lol-biome-pill" id="lol-biome-pill"></span>
                </div>
                <div class="lol-hp-slot">
                  <div class="lol-hp-single-wrap" id="lol-hp-single-wrap">
                    <div class="lol-bar lol-bar--hp" aria-hidden="true">
                      <div class="lol-bar-track lol-bar-track--with-ico">
                        <span class="lol-bar-ico" aria-hidden="true">${statIconWrap("max_hp", 0)}</span>
                        <div class="lol-bar-track-mid">
                          <div class="lol-bar-fill lol-bar-fill--hp" id="lol-hp-fill"></div>
                          <span class="lol-bar-label" id="lol-hp-txt"></span>
                        </div>
                      </div>
                      <span class="lol-bar-regen-hint lol-bar-regen-hint--hp" id="lol-hp-regen" aria-hidden="true"></span>
                    </div>
                  </div>
                  <div class="lol-hp-dual-wrap" id="lol-hp-dual-wrap" hidden>
                    <div class="lol-hp-dual-row">
                      <div class="lol-hp-dual-stack" id="lol-hp-dual-stack" data-focus="bunker">
                        <div class="lol-bar lol-bar--hp lol-hp-layer lol-hp-layer--hero" aria-hidden="true">
                          <div class="lol-bar-track lol-bar-track--with-ico">
                            <span class="lol-bar-ico" aria-hidden="true">${statIconWrap("max_hp", 1)}</span>
                            <div class="lol-bar-track-mid">
                              <div class="lol-bar-fill lol-bar-fill--hp" id="lol-hp-fill-hero"></div>
                              <span class="lol-bar-label" id="lol-hp-txt-hero"></span>
                            </div>
                          </div>
                          <span class="lol-bar-regen-hint lol-bar-regen-hint--hp" id="lol-hp-regen-hero" aria-hidden="true"></span>
                        </div>
                        <div class="lol-bar lol-bar--hp lol-hp-layer lol-hp-layer--bunker" aria-hidden="true">
                          <div class="lol-bar-track lol-bar-track--with-ico">
                            <span class="lol-bar-ico" aria-hidden="true">${statIconWrap("max_hp", 2)}</span>
                            <div class="lol-bar-track-mid">
                              <div class="lol-bar-fill lol-bar-fill--hp" id="lol-hp-fill-bunker"></div>
                              <span class="lol-bar-label" id="lol-hp-txt-bunker"></span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div class="lol-hp-focus-toggle" role="group" aria-label="Primeiro plano — barras de vida">
                        <button type="button" class="lol-hp-focus-btn" data-lol-hp-focus="hero" id="lol-hp-btn-hero" title="Herói em primeiro plano" aria-pressed="false">Herói</button>
                        <button type="button" class="lol-hp-focus-btn" data-lol-hp-focus="bunker" id="lol-hp-btn-bunker" title="Bunker em primeiro plano" aria-pressed="true">Bunker</button>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="lol-bar lol-bar--mana" aria-hidden="true">
                  <div class="lol-bar-track lol-bar-track--with-ico">
                    <span class="lol-bar-ico" aria-hidden="true">${statIconWrap("max_mana", 0)}</span>
                    <div class="lol-bar-track-mid">
                      <div class="lol-bar-fill lol-bar-fill--mana" id="lol-mana-fill"></div>
                      <span class="lol-bar-label" id="lol-mana-txt"></span>
                    </div>
                  </div>
                  <span class="lol-bar-regen-hint lol-bar-regen-hint--mana" id="lol-mana-regen" aria-hidden="true"></span>
                </div>
                <div class="lol-bar lol-bar--xp" aria-hidden="true">
                  <div class="lol-bar-track">
                    <div class="lol-bar-fill lol-bar-fill--xp" id="lol-xp-fill"></div>
                    <span class="lol-bar-label" id="lol-xp-txt"></span>
                  </div>
                </div>
                <div class="lol-bar lol-bar--shield" aria-hidden="true">
                  <div class="lol-bar-track lol-bar-track--with-ico">
                    <span class="lol-bar-ico" aria-hidden="true">${statIconWrap("pen_escudo", 3)}</span>
                    <div class="lol-bar-track-mid">
                      <div class="lol-bar-fill lol-bar-fill--shield" id="lol-shield-fill"></div>
                      <span class="lol-bar-label lol-bar-label--shield-inline" id="lol-shield-lbl">
                        <span class="lol-bar-resource-name" id="lol-shield-resource-name">Escudo</span>
                        <span id="lol-shield-txt">0</span>
                      </span>
                    </div>
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
  const combatArtifactsDock = el(
    `<div class="combat-hud-artifacts-dock"><button type="button" class="btn btn-combat-hud-artifacts" id="combat-corner-artifact-btn" title="Consulta de artefatos (A)">Artefatos</button></div>`,
  ) as HTMLElement;
  const combatDockStack = el(`<div class="combat-bottom-stack"></div>`);
  /* Artefatos: imediatamente acima da barra escura (Encerrar turno / raridade), não por cima do painel LOL. */
  combatDockStack.appendChild(combatArtifactsDock);
  combatDockStack.appendChild(combatAboveBar);
  combatDockStack.appendChild(bottom);
  const combatCornerLayer = el(`<div class="combat-corner-layer" id="combat-corner-layer" hidden>
    <div class="combat-corner-triangle combat-corner-triangle--attacks" role="status" aria-live="polite">
      <div class="combat-corner-triangle__shape" aria-hidden="true"></div>
      <div class="combat-corner-triangle__stack">
        <span class="combat-corner-triangle__lbl">ataques</span>
        <span class="combat-corner-triangle__val" id="combat-corner-atk"></span>
      </div>
    </div>
    <div class="combat-corner-triangle combat-corner-triangle--moves" role="status" aria-live="polite">
      <div class="combat-corner-triangle__shape" aria-hidden="true"></div>
      <div class="combat-corner-triangle__stack">
        <span class="combat-corner-triangle__lbl">Movimento</span>
        <span class="combat-corner-triangle__val" id="combat-corner-mov"></span>
      </div>
    </div>
  </div>`) as HTMLElement;
  const combatCornerAtk = combatCornerLayer.querySelector(
    "#combat-corner-atk",
  ) as HTMLElement;
  const combatCornerMov = combatCornerLayer.querySelector(
    "#combat-corner-mov",
  ) as HTMLElement;
  const syncCombatCornerStackOffset = (): void => {
    const h = `${Math.ceil(combatDockStack.getBoundingClientRect().height)}px`;
    combatCornerLayer.style.setProperty("--combat-stack-h", h);
    uiRoot.style.setProperty("--combat-stack-h", h);
  };
  combatCornerResizeObserver = new ResizeObserver(syncCombatCornerStackOffset);
  combatCornerResizeObserver.observe(combatDockStack);
  window.addEventListener("resize", syncCombatCornerStackOffset, {
    signal: combatInputSignal,
  });
  uiRoot.appendChild(hud);
  uiRoot.appendChild(stipendOverlay);
  uiRoot.appendChild(enemyInspectPanel);
  uiRoot.appendChild(turnOrderWrap);
  uiRoot.appendChild(combatCornerLayer);
  const lolFormaFinalDock = el(
    `<div id="lol-forma-final-dock" class="lol-forma-final-dock" hidden aria-hidden="true"></div>`,
  ) as HTMLElement;
  uiRoot.appendChild(lolFormaFinalDock);
  uiRoot.appendChild(combatDockStack);
  requestAnimationFrame(() => syncCombatCornerStackOffset());
  mountCombatSandboxDevtools(combatInputSignal);
  const lolPortrait = bottom.querySelector("#lol-portrait") as HTMLElement;
  const lolBravuraBadge = bottom.querySelector(
    "#lol-bravura-badge",
  ) as HTMLElement | null;
  const lolPassiveSlot = bottom.querySelector("#lol-passive-slot") as HTMLElement;
  const actionRow = bottom.querySelector("#action-row")!;
  const lolStatsGrid = bottom.querySelector("#lol-stats-grid") as HTMLElement;
  const lolName = bottom.querySelector("#lol-name") as HTMLElement;
  const lolBiomePill = bottom.querySelector("#lol-biome-pill") as HTMLElement;
  const lolShieldFill = bottom.querySelector("#lol-shield-fill") as HTMLElement;
  const lolShieldTxt = bottom.querySelector("#lol-shield-txt") as HTMLElement;
  const lolShieldResourceName = bottom.querySelector(
    "#lol-shield-resource-name",
  ) as HTMLElement | null;
  const lolHpSingleWrap = bottom.querySelector("#lol-hp-single-wrap") as HTMLElement;
  const lolHpDualWrap = bottom.querySelector("#lol-hp-dual-wrap") as HTMLElement;
  const lolHpDualStack = bottom.querySelector("#lol-hp-dual-stack") as HTMLElement;
  const lolHpFill = bottom.querySelector("#lol-hp-fill") as HTMLElement;
  const lolHpTxt = bottom.querySelector("#lol-hp-txt") as HTMLElement;
  const lolHpFillHero = bottom.querySelector("#lol-hp-fill-hero") as HTMLElement | null;
  const lolHpTxtHero = bottom.querySelector("#lol-hp-txt-hero") as HTMLElement | null;
  const lolHpFillBunker = bottom.querySelector("#lol-hp-fill-bunker") as HTMLElement | null;
  const lolHpTxtBunker = bottom.querySelector("#lol-hp-txt-bunker") as HTMLElement | null;
  const lolHpBtnHero = bottom.querySelector("#lol-hp-btn-hero") as HTMLButtonElement | null;
  const lolHpBtnBunker = bottom.querySelector("#lol-hp-btn-bunker") as HTMLButtonElement | null;
  const lolManaFill = bottom.querySelector("#lol-mana-fill") as HTMLElement;
  const lolManaTxt = bottom.querySelector("#lol-mana-txt") as HTMLElement;
  const lolHpRegen = bottom.querySelector("#lol-hp-regen") as HTMLElement | null;
  const lolHpRegenHero = bottom.querySelector(
    "#lol-hp-regen-hero",
  ) as HTMLElement | null;
  const lolManaRegen = bottom.querySelector(
    "#lol-mana-regen",
  ) as HTMLElement | null;
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

  bottom.addEventListener(
    "click",
    (ev) => {
      const t = (ev.target as HTMLElement).closest(
        "[data-lol-hp-focus]",
      ) as HTMLButtonElement | null;
      if (!t || !bottom.contains(t)) return;
      const f = t.getAttribute("data-lol-hp-focus");
      if (f !== "hero" && f !== "bunker") return;
      combatBunkerHpHudFocus = f;
      lolHpDualStack?.setAttribute("data-focus", f);
      if (lolHpBtnHero)
        lolHpBtnHero.setAttribute("aria-pressed", f === "hero" ? "true" : "false");
      if (lolHpBtnBunker)
        lolHpBtnBunker.setAttribute("aria-pressed", f === "bunker" ? "true" : "false");
    },
    { signal: combatInputSignal },
  );

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
    const hex = view.pickCombatHex(x, y, model.grid);
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
    if (active.bunkerReentryBlocked || (!active.flying && adjEnemy >= 2)) {
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
    if (pendingCombat != null) {
      combatInspectEnemyId = null;
    }
    const activeHero = model.currentHero();
    const h = lolViewedHero(model);
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
        <span class="wave-stipend-line"><span class="wave-stipend-gold">${formatOuroDisplay(sumWaveGold)}</span> <span class="wave-stipend-drain">(−${formatOuroDisplay(drainNext)})</span></span>
        <div class="wave-stipend-wave" aria-hidden="true">
          <span class="wave-stipend-bar" style="--wave-tick:0.32"></span>
          <span class="wave-stipend-bar" style="--wave-tick:0.5"></span>
          <span class="wave-stipend-bar" style="--wave-tick:0.72"></span>
          <span class="wave-stipend-wave-center" title="Ouro da wave">${coin}</span>
          <span class="wave-stipend-bar" style="--wave-tick:0.72"></span>
          <span class="wave-stipend-bar" style="--wave-tick:0.5"></span>
          <span class="wave-stipend-bar" style="--wave-tick:0.32"></span>
        </div>
        <div class="wave-stipend-count" role="status" aria-label="Onda atual">${escapeHtml(coliseumTitleAtRunWave(model.wave, model.coliseumTier))} · onda <strong id="combat-wave-num">${waveIndexWithinColiseumPhase(model.wave)}</strong>/20</div>
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
    bottom.querySelector("#party-ouro-sum")!.textContent =
      formatOuroDisplay(sumBolsa);
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
          `Quantidade: ${model.meta.essences[id] ?? 0}. O tipo segue o bioma do hex onde o inimigo morre; no castelo (centro) o tipo é aleatório entre os biomas de combate.`,
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
        artStrip.innerHTML = `<span class="combat-artifacts-label">Artefatos</span>${artifactRaritySlotsStripHtml(h, model.getParty())}<span class="combat-artifacts-empty">—</span>`;
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
        artStrip.innerHTML = `<span class="combat-artifacts-label">Artefatos</span>${artifactRaritySlotsStripHtml(h, model.getParty())}${rangeHint}<div class="combat-artifacts-cards">${cards}</div>`;
        artStrip.querySelectorAll("[data-artifact-id]").forEach((node) => {
          const el = node as HTMLElement;
          const aid = el.dataset.artifactId!;
          bindGameTooltip(el, () =>
            artifactTooltipHtml(aid, h!.artifacts[aid] ?? 0, h!, {
              showNext: true,
            }),
          );
        });
        bindArtifactMiniCardStackHover(artStrip, h);
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
      const brav = bravuraInstancesCount(u);
      const bravBadge =
        brav > 0
          ? `<span class="turn-order-bravura-badge" role="img" aria-label="Bravura, ${brav} instância(s)">${brav > 1 ? `Br ×${brav}` : "Br"}</span>`
          : "";
      turnEntries.push({
        unitId: uid,
        rowHtml: (seq: number) =>
          `<div class="turn-order-row"><span class="turn-order-idx">${seq}</span><span class="turn-order-tile-wrap"><span class="${cls}" style="${escapeHtml(bgSt)}" data-unit-id="${escapeHtml(uid)}" role="button" tabindex="0" title="${escapeHtml(heroDisp)}" aria-label="${escapeHtml(heroDisp)}"></span>${bravBadge}</span></div>`,
      });
    }
    for (const id of order) {
      const u = model.units.find((x) => x.id === id);
      if (!u || u.hp <= 0 || !u.isPlayer) continue;
      const stacks = Math.min(3, Math.max(0, u.artifacts["coroa_ferro"] ?? 0));
      if (stacks <= 0) continue;
      let cls = "turn-tile turn-chip turn-summon";
      if (
        model.inSummonPhase &&
        model.currentSummonOwnerId === u.id &&
        !model.currentSummonActorId
      ) {
        cls += " turn-active";
      }
      const bgSt = turnTileBackgroundStyle(
        true,
        heroSplashDataUrl(u.heroClass!),
      );
      const disp = `Espada flamejante (${u.name})`;
      const summonKey = `summon:${u.id}`;
      turnEntries.push({
        unitId: summonKey,
        rowHtml: (seq: number) =>
          `<div class="turn-order-row"><span class="turn-order-idx">${seq}</span><span class="turn-order-tile-wrap"><span class="${cls}" style="${escapeHtml(bgSt)}" data-unit-id="${escapeHtml(summonKey)}" role="button" tabindex="0" title="${escapeHtml(disp)}" aria-label="${escapeHtml(disp)}"></span><span class="turn-order-summon-badge" role="img" aria-label="Invocação">Inv</span></span></div>`,
      });
    }
    for (const su of model.units) {
      if (!su.isAllySummon || su.hp <= 0) continue;
      const own = model.units.find((x) => x.id === su.summonOwnerHeroId);
      if (!own || !own.isPlayer || own.hp <= 0 || !own.heroClass) continue;
      let cls = "turn-tile turn-chip turn-summon";
      if (model.inSummonPhase && model.currentSummonActorId === su.id) {
        cls += " turn-active";
      }
      const bgSt = turnTileBackgroundStyle(
        true,
        heroSplashDataUrl(own.heroClass),
      );
      const isGolem = su.summonKind === "mega_golem";
      const disp = isGolem
        ? `Mega golem (${own.name})`
        : `Sombra (${own.name})`;
      const badge = isGolem ? "Gol" : "Som";
      const badgeAria = isGolem ? "Mega golem" : "Sombra";
      const uid = su.id;
      turnEntries.push({
        unitId: uid,
        rowHtml: (seq: number) =>
          `<div class="turn-order-row"><span class="turn-order-idx">${seq}</span><span class="turn-order-tile-wrap"><span class="${cls}" style="${escapeHtml(bgSt)}" data-unit-id="${escapeHtml(uid)}" role="button" tabindex="0" title="${escapeHtml(disp)}" aria-label="${escapeHtml(disp)}"></span><span class="turn-order-summon-badge" role="img" aria-label="${escapeHtml(badgeAria)}">${escapeHtml(badge)}</span></span></div>`,
      });
    }
    const focusKey = model.inEnemyPhase
      ? `E:${model.lastEnemyActedId ?? ""}`
      : model.inSummonPhase
        ? model.currentSummonActorId
          ? `A:${model.currentSummonActorId}`
          : `S:${model.currentSummonOwnerId ?? ""}`
        : `P:${model.currentHero()?.id ?? ""}`;
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
      } else if (model.inSummonPhase) {
        const aid = model.currentSummonActorId;
        if (aid) {
          const ix = turnEntries.findIndex((t) => t.unitId === aid);
          if (ix >= 0) currentTurnIdx = ix;
        } else {
          const id = model.currentSummonOwnerId;
          if (id) {
            const ix = turnEntries.findIndex((t) => t.unitId === `summon:${id}`);
            if (ix >= 0) currentTurnIdx = ix;
          }
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
      const rowId = t.getAttribute("data-unit-id");
      if (!rowId) return;
      const summonOwnerId = rowId.startsWith("summon:")
        ? rowId.slice("summon:".length)
        : null;
      const id = summonOwnerId ?? rowId;
      const u = model.units.find((x) => x.id === id);
      if (!u || u.hp <= 0) return;
      view.focusOnAxial(u.q, u.r, false);
      if (u.isAllySummon) {
        combatInspectEnemyId = null;
        combatLolInspectHeroId = null;
      } else if (u.isPlayer) {
        combatInspectEnemyId = null;
        const ch = model.currentHero();
        combatLolInspectHeroId =
          ch && u.id !== ch.id ? u.id : null;
      } else {
        combatInspectEnemyId = pendingCombat != null ? null : id;
      }
      update();
    };
    const btnEnd = combatAboveBar.querySelector("#btn-end") as HTMLButtonElement;
    btnEnd.disabled =
      model.inEnemyPhase ||
      model.inSummonPhase ||
      model.hasPendingCombatSchedule();
    const btnCancel = combatAboveBar.querySelector(
      "#btn-cancel-sel",
    ) as HTMLButtonElement;
    const showCancel =
      !model.inEnemyPhase &&
      !model.inSummonPhase &&
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
      if (lolShieldResourceName) lolShieldResourceName.textContent = "Escudo";
      lolHpSingleWrap.hidden = false;
      lolHpDualWrap.hidden = true;
      lolHpFill.style.transform = "scaleX(0)";
      lolHpTxt.textContent = "";
      if (lolHpFillHero) lolHpFillHero.style.transform = "scaleX(0)";
      if (lolHpTxtHero) lolHpTxtHero.textContent = "";
      if (lolHpFillBunker) lolHpFillBunker.style.transform = "scaleX(0)";
      if (lolHpTxtBunker) lolHpTxtBunker.textContent = "";
      lolManaFill.style.transform = "scaleX(0)";
      lolManaTxt.textContent = "";
      if (lolHpRegen) lolHpRegen.textContent = "";
      if (lolHpRegenHero) lolHpRegenHero.textContent = "";
      if (lolManaRegen) lolManaRegen.textContent = "";
      lolXpFill.style.transform = "scaleX(0)";
      lolXpTxt.textContent = "";
      lolStatsGrid.innerHTML = "";
      clearGameTooltipHandlers(lolPassiveSlot);
      clearGameTooltipHandlers(lolPortrait);
      clearGameTooltipHandlers(lolBiomePill);
      if (lolBravuraBadge) {
        lolBravuraBadge.hidden = true;
        lolBravuraBadge.textContent = "";
        clearGameTooltipHandlers(lolBravuraBadge);
      }
      combatCornerLayer.hidden = true;
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
    const bunkHere = h.isPlayer ? model.bunkerForOccupant(h.id) : null;
    const bunkHud = !!bunkHere && bunkHere.hp > 0;
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
    if (bunkHud && bunkHere) {
      if (lolShieldResourceName)
        lolShieldResourceName.textContent = "Escudo do bunker";
      const capS = Math.max(0, bunkHere.fortifyShieldCap);
      const curS = Math.min(Math.max(0, bunkHere.fortifyShield), capS);
      const shR =
        capS > 0 ? Math.max(0, Math.min(1, curS / capS)) : 0;
      lolShieldFill.style.transform = `scaleX(${shR})`;
      lolShieldTxt.textContent =
        capS > 0
          ? `${formatTooltipNumber(curS)} / ${formatTooltipNumber(capS)}`
          : "0";
    } else {
      if (lolShieldResourceName) lolShieldResourceName.textContent = "Escudo";
      const shR =
        h.maxHp > 0
          ? Math.max(0, Math.min(1, h.shieldGGBlue / Math.max(1, h.maxHp)))
          : 0;
      lolShieldFill.style.transform = `scaleX(${shR})`;
      lolShieldTxt.textContent =
        h.shieldGGBlue > 0 ? formatTooltipNumber(h.shieldGGBlue) : "0";
    }
    if (bunkHud && bunkHere && lolHpFillHero && lolHpTxtHero && lolHpFillBunker && lolHpTxtBunker) {
      const B = bunkHere;
      lolHpSingleWrap.hidden = true;
      lolHpDualWrap.hidden = false;
      lolHpDualStack.setAttribute("data-focus", combatBunkerHpHudFocus);
      if (lolHpBtnHero)
        lolHpBtnHero.setAttribute(
          "aria-pressed",
          combatBunkerHpHudFocus === "hero" ? "true" : "false",
        );
      if (lolHpBtnBunker)
        lolHpBtnBunker.setAttribute(
          "aria-pressed",
          combatBunkerHpHudFocus === "bunker" ? "true" : "false",
        );
      const heroR =
        h.maxHp > 0 ? Math.max(0, Math.min(1, h.hp / h.maxHp)) : 0;
      const bunkR =
        B.maxHp > 0 ? Math.max(0, Math.min(1, B.hp / B.maxHp)) : 0;
      lolHpFillHero.style.transform = `scaleX(${heroR})`;
      lolHpTxtHero.textContent = `${formatTooltipNumber(h.hp)} / ${formatTooltipNumber(h.maxHp)}`;
      lolHpFillBunker.style.transform = `scaleX(${bunkR})`;
      lolHpTxtBunker.textContent = `${formatTooltipNumber(B.hp)} / ${formatTooltipNumber(B.maxHp)}`;
    } else {
      combatBunkerHpHudFocus = "bunker";
      lolHpSingleWrap.hidden = false;
      lolHpDualWrap.hidden = true;
      const hpR =
        h.maxHp > 0 ? Math.max(0, Math.min(1, h.hp / h.maxHp)) : 0;
      lolHpFill.style.transform = `scaleX(${hpR})`;
      lolHpTxt.textContent = `${formatTooltipNumber(h.hp)} / ${formatTooltipNumber(h.maxHp)}`;
    }
    const manaR =
      h.maxMana > 0 ? Math.max(0, Math.min(1, h.mana / h.maxMana)) : 0;
    lolManaFill.style.transform = `scaleX(${manaR})`;
    lolManaTxt.textContent = `${formatTooltipNumber(h.mana)} / ${formatTooltipNumber(h.maxMana)}`;
    const turnRegen = computeHeroEffectiveTurnRegen(h, model);
    const hpRegLine = `+${formatTooltipNumber(turnRegen.hp)} por turno.`;
    const manaRegLine = `+${formatTooltipNumber(turnRegen.mana)} por turno.`;
    if (lolHpRegen) lolHpRegen.textContent = hpRegLine;
    if (lolHpRegenHero) lolHpRegenHero.textContent = hpRegLine;
    if (lolManaRegen) lolManaRegen.textContent = manaRegLine;
    let xpR = 1;
    if (Number.isFinite(h.xpToNext) && h.xpToNext > 0)
      xpR = Math.max(0, Math.min(1, h.xp / h.xpToNext));
    lolXpFill.style.transform = `scaleX(${xpR})`;
    lolXpTxt.textContent =
      !Number.isFinite(h.xpToNext) || h.xpToNext <= 0
        ? "XP —"
        : `${h.xp} / ${h.xpToNext} XP`;
    renderHeroStatsGridWithTabs(
      lolStatsGrid,
      heroStatCells(h, model),
      combatHeroStatsTabRef,
    );
    if (h.heroClass) {
      clearGameTooltipHandlers(lolFormaFinalDock);
      lolFormaFinalDock.removeAttribute("aria-label");
      const formaCap = FORMA_FINAL_LEVEL;
      const barPct = Math.min(1, Math.min(h.level, formaCap) / formaCap);
      const formaReady =
        model.phase === "combat" &&
        isViewingActive &&
        h.level >= formaCap &&
        !h.ultimateId &&
        !bunkHud;
      const readyCls = formaReady ? " lol-forma-final-slot--ready" : "";
      const formaEvolved = !!(h.ultimateId && h.formaFinal);
      const evolvedBadge = formaEvolved
        ? `<span class="lol-forma-final-evolved-badge" aria-hidden="true">${formaFinalWeaponIconSvg(h.heroClass, h.ultimateId!)}</span>`
        : "";
      const slotTitle = "Forma final";
      const lvShow = Math.min(formaCap, h.level);
      lolFormaFinalDock.innerHTML = `<button type="button" class="lol-forma-final-slot lol-forma-final-slot--dock-vertical${formaEvolved ? " lol-forma-final-slot--evolved" : ""}${readyCls}" style="--forma-pct:${barPct}" ${formaReady ? "" : "disabled"} aria-label="Forma final — nível ${lvShow} de ${formaCap}">
<span class="lol-forma-final-title">${escapeHtml(slotTitle)}</span>
<span class="lol-forma-final-ico-wrap lol-forma-final-ico-wrap--humanoid" aria-hidden="true">${formaFinalHumanoidAuraSvg()}${evolvedBadge}</span>
<span class="lol-forma-final-track-v" aria-hidden="true"><span class="lol-forma-final-fill-v"></span></span>
<span class="lol-forma-final-meta" aria-hidden="true">${lvShow}/${formaCap}</span>
</button>`;
      lolFormaFinalDock.hidden = false;
      lolFormaFinalDock.removeAttribute("aria-hidden");
      const formaBtn = lolFormaFinalDock.querySelector(
        "button.lol-forma-final-slot",
      ) as HTMLButtonElement | null;
      if (formaBtn) {
        bindGameTooltip(formaBtn, () =>
          tooltipFormaFinalHudSlot(h, model, isViewingActive),
        );
        formaBtn.addEventListener("click", (ev) => {
          ev.preventDefault();
          if (!formaReady) return;
          if (!combatAbilityInputDebounce()) return;
          dismissCombatTransientUi();
          if (model.tryOpenFormaFinalPickFromHud()) update();
        });
      }
    } else {
      clearGameTooltipHandlers(lolFormaFinalDock);
      lolFormaFinalDock.removeAttribute("aria-label");
      lolFormaFinalDock.innerHTML = "";
      lolFormaFinalDock.hidden = true;
      lolFormaFinalDock.setAttribute("aria-hidden", "true");
    }
    bindGameTooltip(lolPassiveSlot, () =>
      tooltipPassiveHtml("Passiva", combatPassiveDescription(h)),
    );
    bindGameTooltip(lolPortrait, () =>
      tooltipPassiveHtml(
        bunkHud ? "bunker" : tmpl.name,
        bunkHud
          ? `${tmpl.name} dentro do bunker — duas barras de PV sobrepostas: usa os botões Herói/Bunker para escolher qual fica em primeiro plano. A mana do herói está na barra azul.`
          : isViewingActive
            ? "Herói ativo na ordem de jogada."
            : "Apenas visualização — não é o turno deste herói.",
      ),
    );
    if (lolBravuraBadge) {
      const br = bravuraInstancesCount(h);
      if (br > 0) {
        lolBravuraBadge.hidden = false;
        lolBravuraBadge.removeAttribute("aria-hidden");
        lolBravuraBadge.setAttribute("aria-label", `Bravura, ${br} instância(s)`);
        lolBravuraBadge.textContent = br > 1 ? `Br ×${br}` : "Br";
        bindGameTooltip(lolBravuraBadge, () =>
          tooltipPassiveHtml(
            "Bravura",
            "Instâncias de Bravura concedem ataques básicos extra neste turno (ex.: Alento da morte). Expiram no fim do turno deste herói.",
          ),
        );
      } else {
        lolBravuraBadge.hidden = true;
        lolBravuraBadge.setAttribute("aria-hidden", "true");
        lolBravuraBadge.textContent = "";
        clearGameTooltipHandlers(lolBravuraBadge);
      }
    }

    const capBasic = model.maxBasicAttacksForHero(h);
    const curBasic = isViewingActive ? model.basicLeft : capBasic;
    const bb = el(
      combatSquareSkillHtml({
        disabled: !isViewingActive || model.basicLeft <= 0,
        iconHtml: basicAttackIconHtml(),
        hotkey: "Q",
        combatHotkey: "q",
        manaBadge: "",
        omitManaBadge: true,
        ariaLabel: `Ataque básico — Ataques ${curBasic} de ${capBasic}`,
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
      const cdEff = model.sandboxNoCdUltEnabled() ? 0 : cd;
      const dis = cdEff > 0 || extraDisabled || !isViewingActive;
      const key = hotkeys[hotkeyIdx++] ?? "?";
      const manaBadge = manaCostBadgeText(skillDef.manaCost ?? 0);
      const maxCd = combatSkillMaxCdWaves(model, h, id, cdEff, skillDef);
      const fillPct = combatSkillCdFillPercent(cdEff, maxCd);
      const b = el(
        combatSquareSkillHtml({
          disabled: dis,
          iconHtml: skillButtonIconHtml(id),
          hotkey: key,
          combatHotkey: key.length === 1 && key !== "?" ? key.toLowerCase() : undefined,
          manaBadge,
          ariaLabel: ariaSkillLabel(name, cdEff),
          cdTurns: cdEff > 0 ? cdEff : undefined,
          skillCdFillPct: fillPct,
          selectKind: "skill",
          selectId: id,
        }),
      );
      bindGameTooltip(b, () => tooltipSkillById(h, model, skillDef));
      b.addEventListener("click", () => {
        if (!isViewingActive) return;
        cancelPendingOrDebouncedActivate(b, () => {
          const atirarFirst =
            id === "atirar_todo_lado" && model.movementLeft > 0;
          pendingCombat = atirarFirst
            ? { kind: "skill", id, atirarMoveFirst: true }
            : { kind: "skill", id };
          movePreviewActive = false;
          refreshOverlays();
          update();
        });
      });
      actionRow.appendChild(b);
    };

    if (bunkHud && bunkHere) {
      const cdM = model.sandboxNoCdUltEnabled()
        ? 0
        : (h.skillCd["bunker_minas"] ?? 0);
      const maxM = combatSkillMaxCdWaves(model, h, "bunker_minas", cdM);
      const fillM = combatSkillCdFillPercent(cdM, maxM);
      const keyW = hotkeys[hotkeyIdx++] ?? "W";
      const bMin = el(
        combatSquareSkillHtml({
          disabled: cdM > 0 || !isViewingActive,
          iconHtml: skillButtonIconHtml("bunker_minas"),
          hotkey: keyW,
          combatHotkey:
            keyW.length === 1 && keyW !== "?" ? keyW.toLowerCase() : undefined,
          manaBadge: manaCostBadgeText(0),
          ariaLabel: ariaSkillLabel("Minas terrestres", cdM),
          cdTurns: cdM > 0 ? cdM : undefined,
          skillCdFillPct: fillM,
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
      if (bunkHere.tier >= 2) {
        const cdT = model.sandboxNoCdUltEnabled()
          ? 0
          : (h.skillCd["bunker_tiro_preciso"] ?? 0);
        const maxT = combatSkillMaxCdWaves(model, h, "bunker_tiro_preciso", cdT);
        const fillT = combatSkillCdFillPercent(cdT, maxT);
        const keyE = hotkeys[hotkeyIdx++] ?? "E";
        const bTiro = el(
          combatSquareSkillHtml({
            disabled: cdT > 0 || !isViewingActive,
            iconHtml: skillButtonIconHtml("bunker_tiro_preciso"),
            hotkey: keyE,
            combatHotkey:
              keyE.length === 1 && keyE !== "?" ? keyE.toLowerCase() : undefined,
            manaBadge: manaCostBadgeText(0),
            ariaLabel: ariaSkillLabel("Tiro preciso", cdT),
            cdTurns: cdT > 0 ? cdT : undefined,
            skillCdFillPct: fillT,
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
          const cd = model.sandboxNoCdUltEnabled()
            ? 0
            : (h.skillCd["pisotear"] ?? 0);
          const mc = pisotearManaCost(h.weaponLevel);
          const dis =
            cd > 0 ||
            !isViewingActive ||
            (mc > 0 && h.maxMana > 0 && h.mana < mc);
          const maxP = combatSkillMaxCdWaves(model, h, "pisotear", cd);
          const fillP = combatSkillCdFillPercent(cd, maxP);
          const key = hotkeys[hotkeyIdx++] ?? "?";
          const b = el(
            combatSquareSkillHtml({
              disabled: dis,
              iconHtml: skillButtonIconHtml("pisotear"),
              hotkey: key,
              combatHotkey:
                key.length === 1 && key !== "?" ? key.toLowerCase() : undefined,
              manaBadge: manaCostBadgeText(mc),
              ariaLabel: ariaSkillLabel("Pisotear", cd),
              cdTurns: cd > 0 ? cd : undefined,
              skillCdFillPct: fillP,
            }),
          );
          bindGameTooltip(b, () => tooltipSkillPisotear(h, model));
          b.addEventListener("click", () => {
            if (!isViewingActive) return;
            if (!combatAbilityInputDebounce()) return;
            dismissCombatTransientUi();
            if (model.trySkill("pisotear")) {
              resetCombatSelection();
              resumeMovementPreviewAfterHeroAction();
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
            const cdS = model.sandboxNoCdUltEnabled()
              ? 0
              : (h.skillCd[sk.id] ?? 0);
            const dis =
              cdS > 0 || h.mana < sm || !isViewingActive;
            const maxS = combatSkillMaxCdWaves(model, h, "sentenca", cdS, sk);
            const fillS = combatSkillCdFillPercent(cdS, maxS);
            const key = hotkeys[hotkeyIdx++] ?? "?";
            const manaBadge = manaCostBadgeText(sm);
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
                skillCdFillPct: fillS,
              }),
            );
            bindGameTooltip(b, () => tooltipSkillById(h, model, sk));
            b.addEventListener("click", () => {
              if (!isViewingActive) return;
              if (!combatAbilityInputDebounce()) return;
              dismissCombatTransientUi();
              if (model.trySkill("sentenca")) {
                resetCombatSelection();
                resumeMovementPreviewAfterHeroAction();
                refreshOverlays();
                update();
              }
            });
            actionRow.appendChild(b);
            continue;
          }
          if (
            sk.id === "atirar_todo_lado" &&
            h.heroClass === "pistoleiro" &&
            h.ultimateId === "arauto_caos"
          ) {
            const tiroSk = pistoleiroTiroDestruidorSkillDef();
            const tiroCharges = h.tiroDestruidorCharges ?? 0;
            const tiroNoCharges =
              !model.devSandboxMode && tiroCharges < 1;
            const tiroCdShow =
              model.sandboxNoCdUltEnabled() || tiroCharges >= 1
                ? 0
                : h.skillCd["tiro_destruidor"] ?? 0;
            addSkillBtn(
              "tiro_destruidor",
              tiroSk.name,
              tiroCdShow,
              tiroNoCharges,
              tiroSk,
            );
            continue;
          }
          const noMana = false;
          addSkillBtn(sk.id, sk.name, h.skillCd[sk.id] ?? 0, noMana, sk);
        }
      }
    }

    if (
      !bunkHud &&
      (h.heroClass === "sacerdotisa" ||
        h.heroClass === "pistoleiro" ||
        h.heroClass === "gladiador")
    ) {
      const cls = h.heroClass!;
      const ready =
        model.sandboxNoCdUltEnabled() || h.weaponUltMeter >= 1;
      const pct = Math.round(
        model.sandboxNoCdUltEnabled() ? 100 : h.weaponUltMeter * 100,
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
          manaBadge: manaCostBadgeText(0),
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
        dismissCombatTransientUi();
        if (model.tryWeaponUltimate()) {
          resetCombatSelection();
          resumeMovementPreviewAfterHeroAction();
          refreshOverlays();
          update();
        }
      });
      actionRow.appendChild(bWU);
    }

    if (!bunkHud && h.ultimateId === "especialista_destruicao") {
      const ult = HEROES.pistoleiro.ultimates.find(
        (u) => u.id === "especialista_destruicao",
      )!;
      const manaUlt = manaCostBadgeText(0);
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

    {
      const showCorners =
        model.phase === "combat" &&
        !model.inEnemyPhase &&
        isViewingActive &&
        activeHero &&
        activeHero.hp > 0;
      if (showCorners) {
        combatCornerLayer.hidden = false;
        syncCombatCornerStackOffset();
        const capB = model.maxBasicAttacksForHero(h);
        const movMax = model.heroMovementPool(h);
        const atkCur = combatCornerIntText(model.basicLeft);
        const atkTot = combatCornerIntText(capB);
        const movCur = combatCornerIntText(model.movementLeft);
        const movTot = combatCornerIntText(movMax);
        combatCornerAtk.textContent = `${atkCur}/${atkTot}`;
        combatCornerMov.textContent = `${movCur}/${movTot}`;
        combatCornerAtk.parentElement!.parentElement!.setAttribute(
          "aria-label",
          `ataques: ${atkCur} de ${atkTot}`,
        );
        combatCornerMov.parentElement!.parentElement!.setAttribute(
          "aria-label",
          `Movimento: ${movCur} de ${movTot}`,
        );
      } else {
        combatCornerLayer.hidden = true;
      }
    }

    refreshOverlays();
    maybeCombatNoActionsAutoEndOrModal(update);
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
    dismissCombatTransientUi();
    activate();
  }
  function focusTurnHeroMovePreview(): void {
    const active = model.currentHero();
    if (!active || !active.heroClass || active.hp <= 0) return;
    clearCombatAtirarFireTimer();
    combatLolInspectHeroId = null;
    combatInspectEnemyId = null;
    view.focusOnAxial(active.q, active.r, false);
    movePreviewActive = true;
    pendingCombat = null;
    refreshOverlays();
    update();
  }

  const chkSkipEnemy = combatAboveBar.querySelector(
    "#chk-skip-enemy-move",
  ) as HTMLInputElement | null;
  if (chkSkipEnemy) {
    chkSkipEnemy.checked = getSkipEnemyCombatAnimations();
    chkSkipEnemy.addEventListener("change", () => {
      setSkipEnemyCombatAnimations(chkSkipEnemy.checked);
    });
  }
  const chkSkipAllied = combatAboveBar.querySelector(
    "#chk-skip-allied-combat-anim",
  ) as HTMLInputElement | null;
  if (chkSkipAllied) {
    chkSkipAllied.checked = getSkipAlliedCombatAnimations();
    chkSkipAllied.addEventListener("change", () => {
      setSkipAlliedCombatAnimations(chkSkipAllied.checked);
    });
  }
  combatAboveBar.querySelector("#btn-cancel-sel")!.addEventListener("click", () => {
    resetCombatSelection();
    view.clearCameraFocus();
    refreshOverlays();
    update();
  });
  combatAboveBar.querySelector("#btn-end")!.addEventListener("click", () => {
    combatNoActionsDeclinedForHeroId = null;
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
  document
    .getElementById("combat-corner-artifact-btn")
    ?.addEventListener("click", () => {
      openCombatArtifactReferenceOverlay();
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
      if (ev.code === "KeyA") {
        if (model.phase === "combat" && !model.inEnemyPhase) {
          ev.preventDefault();
          openCombatArtifactReferenceOverlay();
        }
        return;
      }
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

  refreshCombatHud = update;
  update();

  canvas.onmousemove = (ev) => {
    if (model.phase === "combat") {
      const r = canvas.getBoundingClientRect();
      const ndcX = ((ev.clientX - r.left) / r.width) * 2 - 1;
      const ndcY = -((ev.clientY - r.top) / r.height) * 2 + 1;
      if (!model.inEnemyPhase) {
        updateCombatPhantomHoverFromCanvas(ndcX, ndcY);
        updateTiroDestruidorAimPreview(ndcX, ndcY);
      }
      const st = view.pickStatusTooltip(canvas, ev.clientX, ev.clientY);
      if (st) {
        const tip = getOrCreateGameTooltip();
        tip.innerHTML = st.html;
        tip.hidden = false;
        positionGameTooltip(tip, ev.clientX, ev.clientY);
        tip.classList.add("game-ui-tooltip--visible");
        clearBunkerHoverHint();
        if (combatHoverEnemyId !== null) {
          combatHoverEnemyId = null;
          applyCombatOverlays();
        }
        return;
      }
      const hex = view.pickCombatHex(ndcX, ndcY, model.grid);
      const b =
        hex != null ? model.bunkerAtHex(hex.q, hex.r) : undefined;
      if (b && b.hp > 0) {
        const occ =
          b.occupantId != null
            ? model.units.find((u) => u.id === b.occupantId)
            : undefined;
        const tip = getOrCreateGameTooltip();
        tip.innerHTML = combatBunkerWorldTooltipHtml(b, occ);
        tip.hidden = false;
        positionGameTooltip(tip, ev.clientX, ev.clientY);
        tip.classList.add("game-ui-tooltip--visible");
        updateBunkerHoverHint(ev);
        if (combatHoverEnemyId !== null) {
          combatHoverEnemyId = null;
          applyCombatOverlays();
        }
        return;
      }
      hideGameTooltip();
    }
    updateBunkerHoverHint(ev);
    updateCombatEnemyHoverFromCanvas(ev);
  };
  canvas.onmouseleave = () => {
    clearBunkerHoverHint();
    hideGameTooltip();
    if (combatHoverEnemyId !== null) {
      combatHoverEnemyId = null;
      applyCombatOverlays();
    }
    if (combatPhantomHoverHex !== null) {
      combatPhantomHoverHex = null;
      applyCombatOverlays();
    }
    if (
      pendingCombat?.kind === "skill" &&
      pendingCombat.id === "tiro_destruidor" &&
      combatTiroAimCacheSig !== ""
    ) {
      combatTiroBeamPreviewKeys = null;
      combatTiroBeamPath = null;
      combatTiroAimCacheSig = "";
      applyCombatOverlays();
    }
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

    const hexAtPointer = view.pickCombatHex(x, y, model.grid);
    if (combatInspectEnemyId != null && hexAtPointer != null) {
      combatInspectEnemyId = null;
      update();
    }

    const uid = view.pickUnit(x, y, {
      grid: model.grid,
      bunkerOccupantIdAt: (q, r) => {
        const b = model.bunkerAtHex(q, r);
        if (!b || b.hp <= 0 || !b.occupantId) return null;
        const u = model.units.find((z) => z.id === b.occupantId);
        return u && u.isPlayer && u.hp > 0 ? b.occupantId : null;
      },
    });

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
      clearCombatAtirarFireTimer();
      pendingCombat = null;
      combatInspectEnemyId = null;
      openMovePreviewIfPossible();
      view.focusOnAxial(active.q, active.r, false);
      refreshOverlays();
      update();
    };

    if (pendingCombat && uid === active.id) {
      cancelPendingCombatToMove();
      return;
    }

    if (
      pendingCombat &&
      model.movementLeft > 0 &&
      hexAtPointer &&
      (hexAtPointer.q !== active.q || hexAtPointer.r !== active.r) &&
      !model.liveEnemyIdAtHex(hexAtPointer.q, hexAtPointer.r)
    ) {
      const reach = model.reachableForCurrentHero();
      const hk = axialKey(hexAtPointer.q, hexAtPointer.r);
      if (reach.has(hk)) {
        let allowMove = true;
        if (pendingCombat.kind === "skill") {
          allowMove = !pendingGroundSkillHexConsumesMoveClick(
            model,
            pendingCombat.id,
            hexAtPointer,
            active,
          );
        }
        if (allowMove && model.tryMoveHero(hexAtPointer.q, hexAtPointer.r)) {
          view.clearHeroAttackFacing(active.id);
          const chainAtirar =
            pendingCombat.kind === "skill" &&
            pendingCombat.id === "atirar_todo_lado" &&
            pendingCombat.atirarMoveFirst === true;
          if (chainAtirar) {
            const delayMs = model.consumeLastHeroMoveAnimEstimateMs() + 25;
            combatPhantomHoverHex = null;
            pendingCombat = {
              kind: "skill",
              id: "atirar_todo_lado",
              atirarExecPending: true,
            };
            if (combatAtirarTodoLadoFireTimer != null) {
              window.clearTimeout(combatAtirarTodoLadoFireTimer);
            }
            combatAtirarTodoLadoFireTimer = window.setTimeout(() => {
              combatAtirarTodoLadoFireTimer = null;
              if (model.phase !== "combat" || model.inEnemyPhase) return;
              const hero = model.currentHero();
              if (!hero || hero.hp <= 0 || hero.heroClass !== "pistoleiro") {
                resetCombatSelection();
                refreshCombatHud?.();
                return;
              }
              dismissCombatTransientUi();
              if (model.trySkill("atirar_todo_lado")) {
                resetCombatSelection();
                resumeMovementPreviewAfterHeroAction();
                refreshCombatHud?.();
              } else {
                resetCombatSelection();
                refreshCombatHud?.();
              }
            }, delayMs);
          }
          refreshOverlays();
          update();
          return;
        }
      }
    }

    const resolveLiveEnemyAtClick = (): string | null => {
      if (uid) {
        const u = model.units.find((z) => z.id === uid);
        if (u && !u.isPlayer && u.hp > 0) return uid;
      }
      const hex = view.pickCombatHex(x, y, model.grid);
      if (!hex) return null;
      return model.liveEnemyIdAtHex(hex.q, hex.r);
    };

    if (pendingCombat?.kind === "basic") {
      const tid = resolveLiveEnemyAtClick();
      if (tid && model.validateEnemyForBasicAttack(tid)) {
        dismissCombatTransientUi();
        if (model.tryMoveThenBasicAttack(tid)) {
          view.applyHeroAttackFacingFromPointer(active.id, x, y);
          resetCombatSelection();
          resumeMovementPreviewAfterHeroAction();
          update();
        }
        return;
      }
      const hex = view.pickCombatHex(x, y, model.grid);
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
        if (pendingCombat.atirarExecPending || pendingCombat.atirarMoveFirst) {
          return;
        }
        const hex = view.pickCombatHex(x, y, model.grid);
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
          dismissCombatTransientUi();
          if (model.trySkill("atirar_todo_lado")) {
            view.applyHeroAttackFacingFromPointer(active.id, x, y);
            resetCombatSelection();
            resumeMovementPreviewAfterHeroAction();
            update();
          }
        } else {
          cancelPendingCombatToMove();
        }
        return;
      }
      if (sid === "tiro_destruidor") {
        const hex = view.pickCombatHex(x, y, model.grid);
        if (!hex) {
          cancelPendingCombatToMove();
          return;
        }
        if (hex.q === active.q && hex.r === active.r) {
          cancelPendingCombatToMove();
          return;
        }
        if (!model.hexInSkillRange(sid, hex.q, hex.r)) {
          cancelPendingCombatToMove();
          return;
        }
        dismissCombatTransientUi();
        if (
          model.trySkill("tiro_destruidor", `beam:${hex.q}:${hex.r}`)
        ) {
          view.applyHeroAttackFacingFromPointer(active.id, x, y);
          resetCombatSelection();
          resumeMovementPreviewAfterHeroAction();
          update();
        }
        return;
      }
      if (sid === "ate_a_morte" || sid === "especialista_destruicao") {
        const tid = resolveLiveEnemyAtClick();
        if (tid && model.canSkillTargetEnemy(sid, tid)) {
          dismissCombatTransientUi();
          if (model.trySkill(sid, tid)) {
            view.applyHeroAttackFacingFromPointer(active.id, x, y);
            resetCombatSelection();
            resumeMovementPreviewAfterHeroAction();
            update();
          }
          return;
        }
        const hex = view.pickCombatHex(x, y, model.grid);
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
          dismissCombatTransientUi();
          if (model.trySkill(sid, tid)) {
            view.applyHeroAttackFacingFromPointer(active.id, x, y);
            resetCombatSelection();
            resumeMovementPreviewAfterHeroAction();
            update();
          }
          return;
        }
        const hex = view.pickCombatHex(x, y, model.grid);
        if (!hex || !model.hexInSkillRange(sid, hex.q, hex.r)) {
          cancelPendingCombatToMove();
          return;
        }
        cancelPendingCombatToMove();
        return;
      }
      if (sid === "bunker_minas") {
        const hex = view.pickCombatHex(x, y, model.grid);
        const onHex = hex && model.hexInSkillRange(sid, hex.q, hex.r);
        if (onHex) {
          dismissCombatTransientUi();
          if (model.trySkill("bunker_minas")) {
            view.applyHeroAttackFacingFromPointer(active.id, x, y);
            resetCombatSelection();
            resumeMovementPreviewAfterHeroAction();
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
          view.focusOnAxial(u.q, u.r, false);
          update();
          return;
        }
      } else if (u && !u.isPlayer && u.hp > 0) {
        if (pendingCombat != null) {
          return;
        }
        combatInspectEnemyId = uid;
        view.focusOnAxial(u.q, u.r);
        update();
        return;
      }
    }

    if (uid === active.id) {
      combatLolInspectHeroId = null;
      combatInspectEnemyId = null;
      view.focusOnAxial(active.q, active.r, false);
      movePreviewActive = true;
      pendingCombat = null;
      refreshOverlays();
      update();
      return;
    }

    const hex = view.pickCombatHex(x, y, model.grid);
    if (hex && movePreviewActive) {
      const k = axialKey(hex.q, hex.r);
      const reach = model.reachableForCurrentHero();
      if (reach.has(k) && model.tryMoveHero(hex.q, hex.r)) {
        view.clearHeroAttackFacing(active.id);
        refreshOverlays();
        update();
      }
    }
  };
}

function showLevelPick(): void {
  hideGameTooltip();
  removeEquipmentModal();
  const p = model.pendingArtifacts!;
  const hero = model.units.find((x) => x.id === p.unitId);
  uiRoot.innerHTML = "";
  const heroLine = hero
    ? escapeHtml(hero.name)
    : "Herói";
  const rerollFree = p.rerollsFreeLeft > 0;
  const rerollDisabled =
    !rerollFree &&
    !(
      p.rerollsPaidUsed < ARTIFACT_PICK_PAID_CHARGES_MAX &&
      model.crystalsRun >= ARTIFACT_PICK_PAID_CRYSTAL_COST
    );
  const rerollCostNow =
    rerollFree || p.rerollsPaidUsed >= ARTIFACT_PICK_PAID_CHARGES_MAX
      ? 0
      : ARTIFACT_PICK_PAID_CRYSTAL_COST;
  let rerollLabel = "";
  if (rerollFree) {
    rerollLabel = "Rerol";
  } else if (
    p.rerollsPaidUsed < ARTIFACT_PICK_PAID_CHARGES_MAX &&
    model.crystalsRun >= ARTIFACT_PICK_PAID_CRYSTAL_COST
  ) {
    rerollLabel = "Rerol";
  } else if (p.rerollsPaidUsed >= ARTIFACT_PICK_PAID_CHARGES_MAX) {
    rerollLabel = "Rerol";
  } else {
    rerollLabel = "Rerol";
  }
  const banCostNow =
    p.bansFreeLeft > 0 ||
    p.bansPaidUsed >= ARTIFACT_PICK_PAID_CHARGES_MAX ||
    !(
      p.bansPaidUsed < ARTIFACT_PICK_PAID_CHARGES_MAX &&
      model.crystalsRun >= ARTIFACT_PICK_PAID_CRYSTAL_COST
    )
      ? 0
      : ARTIFACT_PICK_PAID_CRYSTAL_COST;
  const banBtnActive = p.banMode ? " artifact-pick-ban-btn--active" : "";
  const ownedChips =
    hero != null
      ? Object.entries(hero.artifacts)
          .filter(([id, n]) => n > 0 && !id.startsWith("_"))
          .sort(([a], [b]) => a.localeCompare(b))
      : [];
  const ownedBlock =
    hero != null
      ? ownedChips.length === 0
        ? `<div class="artifact-pick-owned" aria-label="Artefatos atuais"><p class="artifact-pick-owned__title">Os teus artefatos</p><p class="artifact-pick-owned__empty">Ainda sem artefatos neste herói.</p></div>`
        : `<div class="artifact-pick-owned" aria-label="Artefatos atuais"><p class="artifact-pick-owned__title">Os teus artefatos</p><div class="artifact-pick-owned__chips" role="list">${ownedChips
            .map(([id, n]) => {
              const nm = pickChoiceDisplayName(id);
              const rare = pickChoiceRarity(id);
              const rCls = rare
                ? artifactRarityClass(rare)
                : "artifact-rarity--common";
              const label = `${nm} ${artifactStackCounterLabel(id, n)}`;
              return `<div class="artifact-pick-owned-card ${rCls}" role="listitem" tabindex="0" data-artifact-owned-id="${escapeHtml(id)}" aria-label="${escapeHtml(label)}">
                <div class="artifact-pick-owned-card__art">${artifactCardInnerHtml(id)}</div>
                <span class="artifact-pick-owned-card__badge">${escapeHtml(artifactStackCounterLabel(id, n))}</span>
              </div>`;
            })
            .join("")}</div></div>`
      : "";
  const s = el(`<div class="modal modal--crystal"><div class="modal-inner modal-inner--artifact-pick">
    <h2 class="crystal-modal-title">Escolha um artefato — ${heroLine}</h2>
    <p class="artifact-pick-hint">Passe o rato sobre a carta para ver o <strong>efeito atual</strong> (e o que ganhas se escolheres). Ative <strong>Banir</strong>, paira num artefato (fica vermelho) e clica para retirá-lo da run.</p>
    ${ownedBlock}
    <div id="opts" class="artifact-pick-grid"></div>
    <div class="artifact-pick-actions artifact-pick-actions--split">
      <button type="button" class="btn artifact-pick-ban-btn${banBtnActive}" id="btn-artifact-ban-mode" aria-pressed="${p.banMode ? "true" : "false"}">
        <span class="artifact-pick-btn__label">${p.banMode ? "Banir (ativo)" : "Banir"}</span>
        <span class="artifact-pick-btn__crystal" aria-hidden="true">
          <span class="artifact-pick-btn__crystal-num">${banCostNow}</span>${metaCrystalIconSvgHtml(
            "artifact-pick-btn__crystal-ico",
          )}
        </span>
      </button>
      <button type="button" class="btn" id="btn-artifact-reroll" ${rerollDisabled ? "disabled" : ""}>
        <span class="artifact-pick-btn__label">${rerollLabel}</span>
        <span class="artifact-pick-btn__crystal" aria-hidden="true">
          <span class="artifact-pick-btn__crystal-num">${rerollCostNow}</span>${metaCrystalIconSvgHtml(
            "artifact-pick-btn__crystal-ico",
          )}
        </span>
      </button>
    </div>
  </div></div>`);
  uiRoot.appendChild(s);
  if (hero) {
    s.querySelectorAll<HTMLElement>("[data-artifact-owned-id]").forEach((node) => {
      const aid = node.dataset.artifactOwnedId;
      if (!aid) return;
      const stacks = hero.artifacts[aid] ?? 0;
      bindGameTooltip(node, () =>
        artifactTooltipHtml(aid, stacks, hero, { showNext: false }),
      );
    });
  }
  const btnBan = s.querySelector("#btn-artifact-ban-mode") as HTMLButtonElement;
  btnBan.addEventListener("click", () => {
    model.toggleArtifactPickBanMode();
    render();
  });
  const btnReroll = s.querySelector("#btn-artifact-reroll") as HTMLButtonElement;
  if (!rerollDisabled) {
    btnReroll.addEventListener("click", () => {
      model.rerollArtifactPick();
      render();
    });
  }
  const opts = s.querySelector("#opts")!;
  for (const id of p.choices) {
    const stacks = hero?.artifacts[id] ?? 0;
    const tier = id.startsWith("_pick")
      ? "—"
      : artifactStackCounterLabel(id, stacks);
    const dispName = pickChoiceDisplayName(id);
    const rare = pickChoiceRarity(id);
    const rCls = rare
      ? artifactRarityClass(rare)
      : "artifact-pick-card--special";
    const rarityLine = rare
      ? ARTIFACT_RARITY_LABELS[rare]
      : "Especial";
    const b = el(
      `<button type="button" class="artifact-pick-card ${rCls}" data-artifact="${escapeHtml(id)}">
        <span class="artifact-pick-card__rarity">${escapeHtml(rarityLine)}</span>
        <div class="artifact-pick-card__art">${artifactCardInnerHtml(id)}</div>
        <span class="artifact-pick-card__name">${escapeHtml(dispName)}</span>
        <span class="artifact-pick-card__badge" aria-hidden="true">${escapeHtml(tier)}</span>
      </button>`,
    );
    if (hero) {
      bindGameTooltip(b, () => artifactPickChoiceTooltip(id, hero));
    }
    const canBanHover = p.banMode && !id.startsWith("_pick");
    if (canBanHover) {
      b.addEventListener("mouseenter", () => {
        b.classList.add("artifact-pick-card--ban-hover");
      });
      b.addEventListener("mouseleave", () => {
        b.classList.remove("artifact-pick-card--ban-hover");
      });
    }
    b.addEventListener("click", () => {
      if (p.banMode && !id.startsWith("_pick")) {
        model.banArtifactFromPick(id);
        render();
        return;
      }
      model.pickArtifact(id);
      render();
    });
    opts.appendChild(b);
  }
}

function showUltimatePick(): void {
  hideGameTooltip();
  removeEquipmentModal();
  const p = model.pendingUltimate!;
  const u = model.units.find((x) => x.id === p.unitId);
  uiRoot.innerHTML = "";
  const cls = u?.heroClass;
  const heroName = u ? escapeHtml(u.name) : "Herói";
  const weaponIco =
    cls && u
      ? `<span class="forma-final-node__weapon-ico" aria-hidden="true">${hudWeaponIconSvg(cls)}</span>`
      : "";
  const s = el(`<div class="modal modal--crystal"><div class="modal-inner modal-inner--ultimate-pick">
    <h2 class="crystal-modal-title crystal-modal-title--forma-final">${heroName}</h2>
    <p class="forma-final-subtitle">Escolha sua forma final</p>
    <div class="forma-final-tree" id="forma-final-tree" role="group" aria-label="Forma final">
      <div class="forma-final-tree__root-wrap">
        <button type="button" class="forma-final-node forma-final-node--root" id="forma-final-root" aria-label="Arma principal — pairar para ver habilidade e ultimate da arma">
          ${weaponIco}
          <span class="forma-final-node__label">Arma principal</span>
        </button>
      </div>
      <svg class="forma-final-tree__svg" viewBox="0 0 320 72" preserveAspectRatio="none" aria-hidden="true">
        <path d="M 160 0 L 160 22 M 160 22 L 72 72 M 160 22 L 288 72" fill="none" stroke="rgba(201,162,55,0.55)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <div class="forma-final-tree__leaves" id="forma-final-leaves"></div>
    </div>
  </div></div>`);
  uiRoot.appendChild(s);
  const rootBtn = s.querySelector("#forma-final-root") as HTMLButtonElement | null;
  const leaves = s.querySelector("#forma-final-leaves") as HTMLElement | null;
  if (u && rootBtn) {
    bindGameTooltip(rootBtn, () => formaFinalPickMergedTooltipHtml(u, model, "weapon"));
  }
  const list =
    cls === "pistoleiro"
      ? HEROES.pistoleiro.ultimates
      : cls === "gladiador"
        ? HEROES.gladiador.ultimates
        : HEROES.sacerdotisa.ultimates;
  list.forEach((ult, idx) => {
    const branch = idx as 0 | 1;
    const branchIco =
      cls != null ? formaFinalWeaponIconSvg(cls, ult.id) : "";
    const b = el(
      `<button type="button" class="forma-final-node forma-final-node--pick" data-ult-id="${escapeHtml(ult.id)}" aria-label="Forma ${idx + 1}: ${escapeHtml(ult.name)}">
        <span class="forma-final-node__weapon-ico forma-final-node__weapon-ico--branch" aria-hidden="true">${branchIco}</span>
        <span class="forma-final-node__form-cap">Forma ${idx + 1}</span>
        <span class="forma-final-node__form-name">${escapeHtml(ult.name)}</span>
      </button>`,
    );
    if (u) {
      bindGameTooltip(b, () => formaFinalPickMergedTooltipHtml(u, model, branch));
    }
    b.addEventListener("click", () => {
      model.pickUltimate(ult.id);
      render();
    });
    leaves?.appendChild(b);
  });
}

function showColiseumCleared(): void {
  hideGameTooltip();
  removeEquipmentModal();
  uiRoot.innerHTML = "";
  const title = escapeHtml(model.coliseuClearedTitle ?? "Coliseu concluído!");
  const s = el(`
    <div class="screen screen--crystal-veil screen--coliseum-cleared">
      <h1 class="hero-setup-main-title">${title}</h1>
      <p class="crystal-endgame-copy">Cristais da run foram adicionados à tua conta. Podes continuar para ondas mais difíceis ou voltar ao menu.</p>
      <p class="crystal-endgame-copy crystal-endgame-copy--sub">Se continuar, os inimigos ficam <strong>2× mais fortes</strong> a cada 5 ondas (21–25, 26–30, …).</p>
      <div class="coliseum-cleared-actions">
        <button type="button" class="btn btn-primary" id="coliseum-cleared-continue">Continuar</button>
        <button type="button" class="btn" id="coliseum-cleared-ok">Menu principal</button>
      </div>
    </div>`);
  uiRoot.appendChild(s);
  s.querySelector("#coliseum-cleared-continue")!.addEventListener("click", () => {
    model.continueRunAfterColiseuMilestone();
    render();
  });
  s.querySelector("#coliseum-cleared-ok")!.addEventListener("click", () => {
    model.dismissColiseumClearedScreen();
    render();
  });
}

function showVictory(): void {
  hideGameTooltip();
  removeEquipmentModal();
  uiRoot.innerHTML = "";
  const s = el(`
    <div class="screen screen--crystal-veil screen--victory-end">
      <h1 class="hero-setup-main-title">Vitória!</h1>
      <p class="crystal-endgame-copy">Venceste o Quinto coliseu: o imperador caiu. Run completa (${FINAL_VICTORY_WAVE} ondas).</p>
      <button class="btn btn-primary" id="ok">Menu</button>
    </div>`);
  uiRoot.appendChild(s);
  s.querySelector("#ok")!.addEventListener("click", () => {
    clearRunSessionCheckpoint();
    model.phase = "main_menu";
    render();
  });
}

function showDefeat(): void {
  hideGameTooltip();
  removeEquipmentModal();
  uiRoot.innerHTML = "";
  const s = el(`
    <div class="screen screen--crystal-veil screen--defeat-end">
      <h1 class="hero-setup-main-title">Derrota</h1>
      <p class="crystal-endgame-copy">Cristais salvos na conta.</p>
      <button class="btn btn-primary" id="ok">Menu</button>
    </div>`);
  uiRoot.appendChild(s);
  s.querySelector("#ok")!.addEventListener("click", () => {
    clearRunSessionCheckpoint();
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

/**
 * Pausa (Esc) usa backdrop em `document.body`. Se a fase mudar ou o estado dessincronizar,
 * o véu escuro pode ficar por cima de tudo e bloquear o jogo.
 */
function syncPauseMenuWithGamePhase(): void {
  const orphan = document.getElementById("run-pause-backdrop");
  if (orphan && !runPauseOpen) {
    orphan.remove();
  }
  if (runPauseOpen && !orphan) {
    runPauseOpen = false;
    runPauseEl = null;
  }
  if (!isRunPhaseForPauseMenu(model.phase)) {
    closeRunPauseMenu();
  }
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
  syncPauseMenuWithGamePhase();
  /** Canvas WebGL dentro de `uiRoot` — evitar `innerHTML` noutra fase sem `dispose` (context lost). */
  if (model.phase !== "setup_biomes") {
    disposeBiomePicker();
    disposeBioHeroPreview();
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
    cancelGoldShopLayoutRaf();
    refreshGoldShop = null;
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
    disposeEnemyInspectPreview();
    refreshCombatHud = null;
    combatCornerResizeObserver?.disconnect();
    combatCornerResizeObserver = null;
    combatHotkeysAbort?.abort();
    combatHotkeysAbort = null;
    killWaveIntroTimers();
    document.querySelectorAll(".wave-intro-overlay").forEach((n) => n.remove());
    disposeCombatNoActionsModal();
    resetCombatSelection();
  } else if (prevPhase !== "combat") {
    resetCombatSelection();
  }
  if (model.phase === "main_menu") {
    canvas.style.opacity = view.isArenaLayoutEditActive() ? "1" : "0.35";
    if (view.isArenaLayoutEditActive()) showArenaLayoutEditHud();
    else showMainMenu();
  } else if (model.phase === "crystal_shop") {
    canvas.style.opacity = "0.35";
    showCrystalShop();
  } else if (model.phase === "setup_coliseum") {
    canvas.style.opacity = "0.62";
    showColiseumSetup();
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
    if (!model.inEnemyPhase && model.consumePlayerTurnJustStarted()) {
      const ch = model.currentHero();
      if (ch && ch.hp > 0 && ch.heroClass) {
        combatLolInspectHeroId = null;
        movePreviewActive = true;
        pendingCombat = null;
        combatInspectEnemyId = null;
        combatHoverEnemyId = null;
        view.snapCameraToAxial(ch.q, ch.r);
      }
    }
    if (prevPhase !== "combat" || !refreshCombatHud) {
      showCombatHUD();
    } else {
      refreshCombatHud();
    }
    if (prevPhase === "shop_initial" || prevPhase === "shop_wave") {
      requestAnimationFrame(() =>
        showWaveIntroOverlay(
          model.wave,
          model.coliseumTier,
          releaseEnemyPhaseAfterWaveIntroOrCometa,
        ),
      );
    }
  } else if (model.phase === "level_up_pick") {
    showLevelPick();
  } else if (model.phase === "ultimate_pick") {
    showUltimatePick();
  } else if (model.phase === "coliseum_cleared") {
    canvas.style.opacity = "0.4";
    showColiseumCleared();
  } else if (model.phase === "victory") {
    canvas.style.opacity = "0.4";
    showVictory();
  } else if (model.phase === "defeat") {
    canvas.style.opacity = "0.4";
    showDefeat();
  }

  if (model.phase === "combat" && model.takePendingCometaArcanoWithoutIntro()) {
    requestAnimationFrame(() => startCometaArcanoCinematicThenRelease());
  }

  const layoutSceneEdit =
    import.meta.env.DEV &&
    model.phase === "main_menu" &&
    view.isArenaLayoutEditActive();

  const mv = model.takePendingMoveAnimation();
  view.syncUnits(
    layoutSceneEdit ? model.layoutEditorSyntheticUnits() : model.units,
    model.phase === "combat" ? model.wave : null,
  );
  if (mv) {
    const segMs = mv.segmentMs ?? UNIT_MOVE_SEGMENT_MS;
    if (mv.kind === "flamingSword") {
      view.queueFlamingSwordMoveAlongCells(mv.heroId, mv.cells, mv.segmentMs);
      const segs = Math.max(0, mv.cells.length - 1);
      const totalMs = segs * segMs;
      if (totalMs > 0) {
        window.setTimeout(() => {
          render();
        }, totalMs + 20);
      }
    } else {
      view.queueUnitMoveAlongCells(mv.unitId, mv.cells, mv.segmentMs, {
        playHeroRun: mv.playHeroRunAnim === true,
      });
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
  }
  const showBunkers =
    shouldShowBunkerMeshes(model.phase) || layoutSceneEdit;
  const bunkersFromModel = model.bunkersForRender();
  const bunkerList =
    showBunkers
      ? layoutSceneEdit && bunkersFromModel.length === 0
        ? model.layoutEditorSyntheticBunkerPlacements().map((p) => ({
            q: p.q,
            r: p.r,
            hp: 1,
            maxHp: 1,
            tier: 0 as const,
            biome: p.biome,
          }))
        : bunkersFromModel
      : null;
  view.setBunkers(bunkerList, showBunkers);
  applyCombatOverlays();
  view.setArenaLayoutEditEligible(
    import.meta.env.DEV && model.phase === "main_menu",
  );
  view.setCombatUsesOrthographicView(model.phase === "combat");
  view.setCameraInputEnabled(
    model.phase === "combat" &&
      !runPauseOpen &&
      !view.usesCustomSceneCamera(),
  );

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
  if (model.phase === "combat") {
    if (model.inEnemyPhase && model.lastEnemyActedId) {
      const eu = model.units.find((x) => x.id === model.lastEnemyActedId);
      if (eu && eu.hp > 0) view.focusOnAxial(eu.q, eu.r);
    } else if (model.inSummonPhase && model.currentSummonActorId) {
      const su = model.units.find((x) => x.id === model.currentSummonActorId);
      if (su && su.hp > 0 && su.isAllySummon) {
        view.focusOnAxial(su.q, su.r);
      }
    } else if (model.inSummonPhase && model.currentSummonOwnerId) {
      const hu = model.units.find((x) => x.id === model.currentSummonOwnerId);
      const fp = hu?.flamingSwordPos;
      if (
        hu &&
        hu.hp > 0 &&
        fp &&
        (hu.artifacts["coroa_ferro"] ?? 0) > 0
      ) {
        view.focusOnAxial(fp.q, fp.r);
      }
    }
  }
  schedulePersistRunSessionCheckpoint();
});

window.addEventListener("beforeunload", (e) => {
  if (isRunPhaseForPauseMenu(model.phase)) {
    e.preventDefault();
    e.returnValue = "";
  }
});

function loop(): void {
  try {
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
      const turnHero = model.currentHero();
      view.setCombatTurnHeroIdForFacing(
        model.inEnemyPhase || !turnHero || turnHero.hp <= 0 || !turnHero.isPlayer
          ? null
          : turnHero.id,
      );
      const orbEntries: { heroId: string; count: number }[] = [];
      for (const u of model.getParty()) {
        if (u.hp <= 0) continue;
        if ((u.artifacts["anel_dragao"] ?? 0) <= 0) continue;
        const c = u.anelDragaoOrbsEndTurn ?? 0;
        if (c > 0) orbEntries.push({ heroId: u.id, count: c });
      }
      view.syncAnelDragaoIdleOrbs(orbEntries);
    } else {
      view.setCombatSelectionUnitId(null);
      view.setCombatTurnHeroIdForFacing(null);
      view.clearAnelDragaoIdleOrbs();
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
        } else if (p.kind === "damage" && p.burnDot) {
          /* DoT de queimadura: só float laranja */
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
            ? null
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
  } catch (e) {
    console.error("loop/tick:", e);
  } finally {
    requestAnimationFrame(loop);
  }
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
    phase === "ultimate_pick" ||
    phase === "coliseum_cleared"
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
  view.setCameraInputEnabled(
    model.phase === "combat" && !view.usesCustomSceneCamera(),
  );
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
initSfxVolumeControl();

loop();

render();
