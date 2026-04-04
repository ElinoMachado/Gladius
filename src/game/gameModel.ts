import { axialKey, hexBeamRayThroughGrid, hexNeighbors } from "./hex";
import type {
  BiomeId,
  ForgeEssenceId,
  GamePhase,
  HeroClassId,
  MetaProgress,
  TeamColor,
  Unit,
  WeaponLevel,
} from "./types";
import {
  ARTIFACT_BAN_BONUS_COSTS,
  ARTIFACT_PICK_PAID_CHARGES_MAX,
  ARTIFACT_PICK_PAID_CRYSTAL_COST,
  ARTIFACT_REROLL_BONUS_COSTS,
} from "./types";
import { buildHexArena, getCell, type HexCell } from "./grid";
import { findPath, reachableHexes } from "./pathfinding";
import { getSkipCombatAnimations } from "./combatPrefs";
import {
  enemyMeleeAttackWindupMs,
  heroBasicMagicDamageDelayMs,
  heroBasicMeleeDamageDelayMs,
  heroBasicShootDamageDelayMs,
  heroHitReactAnimMs,
  heroRunSegmentMs,
} from "./heroCombatAnimMs";
import { getSandboxNoCdUltReady } from "./sandboxPrefs";
import { hexDistance } from "./hex";
import {
  computeMitigatedDamage,
  rollCrit,
  applyCritMultiplier,
  effectiveDefenseForBiome,
  effectiveAlcanceForBiome,
  biomeVolcanicDamage,
  roundToCombatDecimals,
  snapPlayerVitality,
  unitIgnoresTerrain,
  rulerMovementBonus,
} from "./combatMath";
import {
  biomeToEssenceId,
  essenceDropTotalPercent,
  resolveEssenceDropCount,
  FORGE_ESSENCE_LABELS,
  forgeSynergyTier,
  getForgeLevel,
  pantanoHelmoXpBonusPercent,
  resolveEquippedForgeLoadoutForMeta,
} from "./forge";
import { createEnemyUnit, createHeroUnit, xpCurve, biomeAt } from "./unitFactory";
import {
  ateMorteCooldownWaves,
  ateMorteDamageMult,
  ateMorteManaCost,
  atirarCooldownWaves,
  atirarDamageMult,
  furacaoBleedPct,
  furacaoBleedTurns,
  furacaoDamageMult,
  gladiadorDuelHpPerWin,
  normalizeWeaponLevel,
  paraisoManaShieldMult,
  paraisoRegenBonus,
  paraisoRegenTurns,
  paraisoShieldFlat,
  pistoleiroPassiveBonusPerProc,
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
} from "./weaponData";
import {
  countEnemiesForWave,
  ENEMY_BY_ID,
  ESCRAVO,
  FINAL_VICTORY_WAVE,
  getEnemyArchetype,
  enemyTierFromId,
  killXpScaleForParty,
  pickBossForWave,
  pickEliteForWave,
  pickGruntForWave,
  waveConfigFromIndex,
} from "./data/enemies";
import { COMBAT_BIOMES, BIOME_LABELS } from "./data/biomes";
import { goldDrainPerTurn } from "./data/shops";
import { loadMeta, permPercent, saveMeta } from "./metaStore";
import {
  clearRunSessionCheckpoint,
  runPhaseAllowsRunSessionPersistence,
} from "./runSessionRecovery";
import {
  canIncrementArtifactStack,
  randomArtifactChoicesForHero,
} from "./artifactUi";
import {
  ARTIFACT_POOL,
  artifactDefById,
  type ArtifactDef,
} from "./data/artifacts";
import {
  DEV_TEST_ARTIFACT_COUNT,
  DEV_TEST_CROWD_UI,
  DEV_TEST_WAVE1_ENEMY_COUNT,
} from "./devTestFlags";
import { GOLD_SHOP } from "./data/shops";
import { computePartyBonus } from "./colorSynergy";
import {
  addBravuraInstances,
  addDeslumbroInstances,
  bravuraInstancesCount,
  clearBravuraInstances,
  deslumbroInstancesCount,
} from "./effectInstances";
import {
  clearCombatOutcomeQueue,
  combatOutcomePriority,
  enqueueCombatOutcome,
  flushCombatOutcomeQueue,
} from "./combatOutcomeQueue";
import {
  ATIRAR_FIRST_DAMAGE_MS,
  ATIRAR_STAGGER_MS,
  BASIC_MAGIC_FLIGHT_MS,
  BASIC_PISTOL_FLIGHT_MS,
  BUNKER_MINAS_RING_STAGGER_MS,
  BUNKER_TIRO_FLIGHT_MS,
  DUEL_FIRST_HIT_MS,
  DUEL_HIT_MS,
  FURACAO_ULT_FIRST_DAMAGE_MS,
  FURACAO_ULT_STAGGER_MS,
  FURACAO_ULT_TAIL_BUFFER_MS,
  GOLPE_RELAMPAGO_MOVE_MS,
  GOLPE_RELAMPAGO_WINDUP_MS,
  POST_COMBAT_FLOAT_LEVEL_UP_UI_DELAY_MS,
  POST_COMBAT_FLOAT_WAVE_STAGGER_AFTER_MS,
  PISOTEAR_FIRST_DAMAGE_MS,
  PISOTEAR_STAGGER_MS,
  PISOTEAR_TAIL_BUFFER_MS,
  SENTENCA_FIRST_DAMAGE_MS,
  SENTENCA_HEAL_AFTER_LAST_HIT_MS,
  SENTENCA_STAGGER_MS,
  UNIT_MOVE_SEGMENT_MS,
} from "./combatTiming";
import {
  BUNKER_EVOLVE_COSTS,
  type BunkerState,
  bunkerMinasCooldownWaves,
  bunkerMinasDamageMult,
  bunkerMinasMaxRing,
  BUNKER_DAMAGE_TAKEN_MULT,
  bunkerStatsForTier,
  bunkerTiroCooldownWaves,
  createInitialBunkerState,
} from "./bunker";

/** Dica única para VFX/sons no canvas (consumida pelo main após trySkill). */
export type CombatVfxHint =
  | null
  | {
      kind: "atirar_todo_lado";
      heroId: string;
      targetIds: string[];
      shotCount: number;
    }
  | { kind: "duel_start"; gladiadorId: string; enemyId: string }
  | { kind: "duel_end"; gladiadorId: string }
  | {
      kind: "sentenca";
      priestId: string;
      /** Ordem = ordem dos hits (mesmo bioma). */
      targetIds: string[];
      allyIds: string[];
      enemyHitCount: number;
    }
  | {
      kind: "basic_projectile";
      fromId: string;
      toId: string;
      style: "bullet" | "magic";
      /** Duração do projétil / alinhamento ao gesto (ms). */
      flightMs?: number;
    }
  | { kind: "hero_basic_melee"; heroId: string; targetId: string }
  | { kind: "basic_volley"; fromId: string; targetIds: string[] }
  | {
      kind: "bunker_minas";
      centerQ: number;
      centerR: number;
      maxRing: number;
      staggerMs: number;
    }
  | { kind: "bunker_mortar"; fromId: string; toId: string }
  | {
      kind: "enemy_strike";
      attackerId: string;
      targetId: string;
      archetypeId: string | undefined;
    }
  | {
      kind: "weapon_ult_furacao";
      heroId: string;
      targetIds: string[];
    }
  | {
      kind: "tiro_destruidor_plasma";
      heroId: string;
      pathQr: { q: number; r: number }[];
      charges: number;
    }
  | { kind: "pisotear_chain"; heroId: string; targetIds: string[] }
  | { kind: "golpe_relampago_teleport"; heroId: string }
  | { kind: "golpe_relampago_hero_charge"; heroId: string }
  | {
      kind: "golpe_relampago_lightning";
      heroId: string;
      targetId: string;
      delayMs: number;
    };

/** Id sintético para números flutuantes de dano no bunker (HUD / canvas). */
export const BUNKER_COMBAT_FLOAT_ID = "__bunker__";

/** Teto do A* na aproximação inimiga. `movimento * 2` impedia caminhos longos (mapa raio ~25), fazendo-os “parados” até o herói chegar perto. */
const ENEMY_APPROACH_PATHFIND_MAX = 100;

/** Artefato Escudo residual: teto do escudo vindo de roubo com vida cheia (acúmulos 1–6). */
const ESCUDO_RESIDUAL_CAP_BY_STACK = [100, 250, 400, 600, 900, 1500] as const;

/** Labareda (`escama_leve`): dano por instância no tick (acúmulos 1–6). */
const LABAREDA_DMG_BY_STACK = [2, 4, 6, 8, 10, 12] as const;
/** Instâncias aplicadas por inimigo no alcance, por acúmulo. */
const LABAREDA_INSTANCES_BY_STACK = [1, 1, 2, 2, 3, 3] as const;
/** Amplicador de onda (`muralha_verdade`): +instâncias em DoTs de dano (1–3 acúmulos). */
const AMPLICADOR_EXTRA_DOT_INSTANCES = [1, 2, 3] as const;

export interface RunSetup {
  heroes: HeroClassId[];
  /** Um bioma inicial por herói (mesma ordem) */
  biomes: BiomeId[];
  /** Cores dos três slots de party (triângulo); índice = slot 0–2. */
  colors: TeamColor[];
  /**
   * Para cada entrada em `heroes`, o slot de party 0–2 (chave de `forgeByHeroSlot`
   * e de `colors`). Mesma ordem que a lista densa de heróis escolhidos.
   */
  partySlotByHero: (0 | 1 | 2)[];
}

/** Resumo ao fechar wave (ouro base vs bónus meta, cristais e essências da wave). */
export type WaveEndLootSummary = {
  wave: number;
  goldLines: { heroName: string; base: number; bonus: number; total: number }[];
  crystalsGained: number;
  essences: { id: ForgeEssenceId; n: number }[];
  /** XP total ganho na wave (após multiplicadores), soma de todos os heróis. */
  xpTotal: number;
  /**
   * Tempo de sessão desde sair da loja inicial até fechar esta wave (ms).
   * Contabilizado com `performance.now()`; não inclui tempo na loja inicial.
   */
  runElapsedMs: number;
};

export type CombatFloatKind =
  | "damage"
  | "shield_absorb"
  | "shield_gain"
  | "heal"
  | "mana";

/** Números flutuantes no canvas (dano, escudo, cura, mana). */
export interface CombatFloatEvent {
  unitId: string;
  kind: CombatFloatKind;
  amount: number;
  crit?: boolean;
  /** Vítima de dano / absorção (cor no float). */
  targetIsPlayer?: boolean;
  /** Atacante herói (SFX). */
  sourceClass?: HeroClassId;
  /** Evita SFX duplo com `basic_projectile` (tiro/whoosh no disparo). */
  suppressSourceHitSfx?: boolean;
  /** Golpe no duelo (VFX sangue + som de corte). */
  duelCut?: boolean;
  /** Dano absorvido pelo bunker (float vermelho próprio). */
  bunkerDamage?: boolean;
  /** Hex do bunker (vários bunkers na arena). */
  bunkerHex?: { q: number; r: number };
  /** Hex da unidade no momento do evento (fallback se a mesh já foi removida). */
  floatHex?: { q: number; r: number };
  /** Dano por veneno (tick); float roxo, não crita; ignora crítico de habilidades até haver efeito específico. */
  poisonDot?: boolean;
  /** Dano por queimadura / Labareda (tick); float laranja. */
  burnDot?: boolean;
}

export function roninCritBonusFromArtifacts(
  artifacts: Record<string, number>,
): number {
  return 20 * (artifacts["ronin"] ?? 0);
}

/** +1 dano por cada 5% de crítico acima de 100% (só com Ronin). */
export function roninOverflowFlatDamage(
  acertoCritico: number,
  artifacts: Record<string, number>,
): number {
  const stacks = artifacts["ronin"] ?? 0;
  if (stacks <= 0) return 0;
  const totalCrit = acertoCritico + roninCritBonusFromArtifacts(artifacts);
  if (totalCrit <= 100) return 0;
  return Math.floor((totalCrit - 100) / 5);
}

/** Dano base da ficha + bónus plano do Ronin (não altera `u.dano`). */
export function heroDanoPlusRoninOverflow(u: Unit): number {
  return u.dano + roninOverflowFlatDamage(u.acertoCritico, u.artifacts);
}

export function heroDanoPlusRoninFromBaseline(b: {
  dano: number;
  acertoCritico: number;
  artifacts: Record<string, number>;
}): number {
  return b.dano + roninOverflowFlatDamage(b.acertoCritico, b.artifacts);
}

type ShopHeroSnapshot = {
  id: string;
  ouro: number;
  maxHp: number;
  hp: number;
  maxMana: number;
  mana: number;
  regenVida: number;
  regenMana: number;
  dano: number;
  acertoCritico: number;
  danoCritico: number;
  defesa: number;
  movimento: number;
  penetracao: number;
  potencialCuraEscudo: number;
  artifacts: Record<string, number>;
};

type ShopBunkerSnapshot = {
  biome: BiomeId;
  q: number;
  r: number;
  hp: number;
  maxHp: number;
  defesa: number;
  tier: 0 | 1 | 2;
  occupantId: string | null;
};

type ShopRestoreSnapshot = {
  heroes: ShopHeroSnapshot[];
  bunkers: ShopBunkerSnapshot[];
};

function shopNumEq(a: number, b: number): boolean {
  return Math.abs(a - b) < 1e-5;
}

function shopArtifactsEq(
  a: Record<string, number>,
  b: Record<string, number>,
): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) {
    if ((a[k] ?? 0) !== (b[k] ?? 0)) return false;
  }
  return true;
}

export class GameModel {
  meta: MetaProgress;
  grid: Map<string, HexCell> = new Map();
  units: Unit[] = [];
  wave = 0;
  phase: GamePhase = "main_menu";
  partyOrder: string[] = [];
  currentHeroIndex = 0;
  movementLeft = 0;
  basicLeft = 0;
  /** Ataques básicos já usados no turno do herói atual (para `braco_forte` recontar ao ganhar stack). */
  basicAttacksSpentThisTurn = 0;
  crystalsRun = 0;
  logLines: string[] = [];
  pendingArtifacts: {
    unitId: string;
    choices: string[];
    /** Mesmo número de cartas que no primeiro sorteio (para rerol). */
    choiceCount: number;
    rerollsFreeLeft: number;
    rerollsPaidUsed: number;
    bansFreeLeft: number;
    bansPaidUsed: number;
    /** Modo banir: clique na carta remove-a da pool da run. */
    banMode: boolean;
  } | null = null;
  /** IDs de artefatos banidos pelo jogador nesta run (não voltam a aparecer nas escolhas). */
  private artifactBannedThisRun = new Set<string>();
  pendingUltimate: { unitId: string } | null = null;
  duel: { gladiatorId: string; enemyId: string } | null = null;
  selectedUnitId: string | null = null;
  victoryWave20 = false;
  /**
   * Partida de teste (menu “Modo sandbox”): ouro/cristais/essências elevados,
   * e (se a opção estiver ligada) sem CDR em combate e ultimate da arma sempre disponível.
   */
  devSandboxMode = false;

  /** Sandbox: CDR desligado + ultimate da arma pronta (`sandboxPrefs`). */
  sandboxNoCdUltEnabled(): boolean {
    return this.devSandboxMode && getSandboxNoCdUltReady();
  }
  /** Cores da run (sinergia VVA escudo/turno) */
  runColors: TeamColor[] = [];
  /** % extra de XP do grupo (ex.: tricolor verde+azul+vermelho). */
  partyXpBonusPct = 0;
  /** Bioma inicial por herói (spawn de inimigos restrito a estes + presença do jogador). */
  runHeroBiomes: BiomeId[] = [];
  /** Um bunker por bioma de combate (hex próprio). */
  bunkers: Partial<Record<BiomeId, BunkerState>> = {};
  /** Após resumo de wave: loja ou ecrã de vitória. */
  private pendingWaveSummaryNext: "shop" | "victory" | null = null;
  /** Fase inimiga em curso (turnos escalonados no tempo). */
  inEnemyPhase = false;
  /** Nova wave: aguardar overlay da UI antes de iniciar a fase inimiga. */
  private blockEnemyPhaseForWaveIntro = false;
  /**
   * Sem overlay de wave (ex.: sandbox): o main corre o cinemático do Cometa e depois chama
   * `releaseEnemyPhaseAfterWaveIntro`.
   */
  private pendingCometaArcanoWithoutIntro = false;
  /**
   * Cometa arcano: não consumir Deslumbro no fim da **primeira** fase inimiga após o impacto.
   * Sem isto, com 1 instância o efeito caía a 0 antes do jogador poder atacar (a UI parecia “sem Deslumbro”).
   */
  private skipDeslumbroDecayAfterCometaOnce = false;
  /** Mensagem única (ex.: reentrada no bunker) consumida pela UI. */
  pendingBunkerHint: { text: string; q: number; r: number } | null = null;
  /** Mensagem única de movimento bloqueado (2+ inimigos adjacentes), consumida pela UI. */
  private pendingMoveBlockedHint: { text: string; unitId: string } | null = null;
  /** Último inimigo que agiu (foco de câmera / HUD). */
  lastEnemyActedId: string | null = null;
  /** UI: acabou de iniciar o turno de um herói (câmera + preview de movimento). */
  private playerTurnJustStarted = false;
  /** Consumido pelo render: animação hex-a-hex no canvas. */
  pendingMoveAnim: {
    unitId: string;
    cells: { q: number; r: number }[];
    /** Se definido, substitui `UNIT_MOVE_SEGMENT_MS` (ex.: inimigos acelerados). */
    segmentMs?: number;
    /** Herói: animação de corrida durante o deslocamento. */
    playHeroRunAnim?: boolean;
  } | null = null;
  /** 1 = normal; menor que 1 acelera movimento/pausa na fase inimiga (muitos inimigos). */
  private enemyPhaseTimingMult = 1;
  /** Sinergia rochosa nv3: último herói com forja que se moveu — inimigos priorizam-no. */
  private rochosoTauntHeroId: string | null = null;

  private combatFloats: CombatFloatEvent[] = [];

  private listeners = new Set<() => void>();
  private enemyTurnQueue: Unit[] = [];
  /** Ações de combate escalonadas (dano alinhado a VFX). */
  private combatSchedule: { at: number; fn: () => void }[] = [];
  /**
   * Sentença: cura em grupo agendada. Se a wave acabar no último hit, `onWaveCleared`
   * limpa a fila antes do job de cura — aplicamos aqui antes de `clearCombatSchedule`.
   */
  private pendingSentencaPartyHeal: {
    priestId: string;
    heal: number;
    priestBio: BiomeId;
  } | null = null;
  private duelNextIsGladiatorStrike = true;
  /** Fila: um único campo era sobrescrito no mesmo tick (ex.: AOE inimigo), silenciando sons/VFX. */
  private pendingCombatVfxQueue: CombatVfxHint[] = [];
  /**
   * Furacão de balas: `onEnemyKilled` acumula heróis aqui em vez de abrir level-up no meio dos tiros.
   */
  private killLevelUpFlushSuppressed = false;
  private pendingKillLevelUpFlushHeroIds = new Set<string>();
  /** Heróis com XP de kill a processar após VFX + pausa (não bloqueia retorno síncrono do pick). */
  private pendingCombatLevelUpHeroIds = new Set<string>();
  /**
   * Pausa pós-VFX antes do level-up: `setTimeout` para não ser apagado por `clearCombatSchedule()`
   * no fecho de wave (o job em `queueCombat` era removido antes de disparar).
   */
  private levelUpFloatHoldTimer: ReturnType<typeof setTimeout> | null = null;
  private waveCrystalsGained = 0;
  private waveXpGained = 0;
  private waveEssencesGained: Partial<Record<ForgeEssenceId, number>> = {};
  private waveLootSummaryPending: WaveEndLootSummary | null = null;
  /** Início da contagem de tempo de sessão (após `finishInitialShop`); `null` antes da primeira entrada em combate. */
  private runPlaySessionPerfMsStart: number | null = null;
  /** Cópia de `meta.essences` ao iniciar a run; revertida ao sair com forfeit. */
  private metaEssencesAtRunStart: Partial<
    Record<ForgeEssenceId, number>
  > | null = null;

  /** Estado da loja ao abrir (ouro, stats, bunker) para reembolso. */
  private shopRestoreSnapshot: ShopRestoreSnapshot | null = null;
  /**
   * Reembolsos de loja já usados nesta run: o primeiro é grátis; os seguintes custam Cristais.
   */
  runShopRefundUses = 0;

  constructor() {
    this.meta = loadMeta();
    /** ~10× mais hexes que raio 8 (área ~9,8×); mapa bem maior. */
    this.grid = buildHexArena(25);
  }

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  /** Notifica subscritores (ex.: após mudar preferências de sandbox fora do modelo). */
  requestUiUpdate(): void {
    this.emit();
  }

  private emit(): void {
    for (const u of this.units) snapPlayerVitality(u);
    for (const l of this.listeners) l();
  }

  log(msg: string): void {
    this.logLines.push(msg);
    if (this.logLines.length > 80) this.logLines.shift();
    this.emit();
  }

  saveMeta(): void {
    saveMeta(this.meta);
  }

  /**
   * Mantém economia ampla enquanto `devSandboxMode` estiver ativo.
   * CDR zerado e ultimate da arma cheia só se `sandboxNoCdUltEnabled()`.
   */
  applyDevSandboxBuffs(): void {
    if (!this.devSandboxMode) return;
    const C = 99_999_999;
    const E = 99_999;
    this.meta.crystals = C;
    this.crystalsRun = Math.max(this.crystalsRun, C);
    for (const id of COMBAT_BIOMES) {
      this.meta.essences[id as ForgeEssenceId] = E;
    }
    for (const u of this.units) {
      if (!u.isPlayer || u.hp <= 0) continue;
      u.ouro = C;
      u.ouroWave = C;
      if (u.heroClass && this.sandboxNoCdUltEnabled()) {
        u.weaponUltMeter = 1;
        u.weaponUltHealAcc = 999999;
        u.weaponUltHitAcc = 999999;
        u.weaponUltTakenAcc = 999999;
      }
      if (this.sandboxNoCdUltEnabled()) {
        for (const k of Object.keys(u.skillCd)) {
          u.skillCd[k] = 0;
        }
      }
    }
  }

  /** Bónus % de ouro meta (loja de cristais) aplicado a qualquer ganho de ouro na run. */
  metaGoldBonusOnRaw(raw: number): { base: number; bonus: number; total: number } {
    const pct = permPercent(this.meta.permGold);
    if (pct <= 0 || raw <= 0) return { base: raw, bonus: 0, total: raw };
    const total = Math.round(raw * (1 + pct / 100));
    return { base: raw, bonus: total - raw, total };
  }

  private addHeroOuroWithMetaBonus(h: Unit, raw: number): void {
    if (raw <= 0) return;
    const { total } = this.metaGoldBonusOnRaw(raw);
    h.ouro += total;
  }

  private allBunkerStates(): BunkerState[] {
    return COMBAT_BIOMES.map((id) => this.bunkers[id]).filter(
      (x): x is BunkerState => !!x,
    );
  }

  /** Bunker no hex (estrutura). */
  bunkerAtHex(q: number, r: number): BunkerState | null {
    for (const b of this.allBunkerStates()) {
      if (b.q === q && b.r === r) return b;
    }
    return null;
  }

  bunkerForOccupant(heroId: string): BunkerState | null {
    for (const b of this.allBunkerStates()) {
      if (b.occupantId === heroId) return b;
    }
    return null;
  }

  /** Primeiro bunker na ordem dos biomas (legado / fallback). */
  bunkerForShop(): BunkerState | null {
    for (const id of COMBAT_BIOMES) {
      const b = this.bunkers[id];
      if (b) return b;
    }
    return null;
  }

  /** Bunker do bioma que o herói escolheu na run (loja: reparar / evoluir / pré-visualização). */
  bunkerForHeroHomeBiome(hero: Unit): BunkerState | null {
    if (!hero.isPlayer) return null;
    const biome = this.heroHomeBiome(hero);
    if (biome === "hub") return null;
    return this.bunkers[biome] ?? null;
  }

  /** Heróis registados como ocupantes de bunkers vivos (estrutura com PV > 0). */
  bunkerOccupantIdsForSync(): Set<string> {
    const s = new Set<string>();
    for (const b of this.allBunkerStates()) {
      if (b.hp <= 0 || !b.occupantId) continue;
      s.add(b.occupantId);
    }
    return s;
  }

  /** Render 3D: bunkers com PV > 0. */
  bunkersForRender(): {
    q: number;
    r: number;
    hp: number;
    maxHp: number;
    tier: 0 | 1 | 2;
    biome: BiomeId;
  }[] {
    const out: {
      q: number;
      r: number;
      hp: number;
      maxHp: number;
      tier: 0 | 1 | 2;
      biome: BiomeId;
    }[] = [];
    for (const id of COMBAT_BIOMES) {
      const b = this.bunkers[id];
      if (!b || b.hp <= 0) continue;
      out.push({
        q: b.q,
        r: b.r,
        hp: b.hp,
        maxHp: b.maxHp,
        tier: b.tier,
        biome: id,
      });
    }
    return out;
  }

  /**
   * Editor de cena (menu): hexes determinísticos para os 6 bunkers, sem alterar `this.bunkers`.
   */
  layoutEditorSyntheticBunkerPlacements(): {
    biome: BiomeId;
    q: number;
    r: number;
  }[] {
    const used = new Set<string>();
    const out: { biome: BiomeId; q: number; r: number }[] = [];
    for (const bi of COMBAT_BIOMES) {
      const pos = this.pickBunkerHexForBiome(bi, used);
      if (!pos) continue;
      used.add(axialKey(pos.q, pos.r));
      out.push({ biome: bi, q: pos.q, r: pos.r });
    }
    return out;
  }

  /**
   * Editor de cena: heróis das três classes + inimigos representativos em hexes válidos (só visual).
   */
  layoutEditorSyntheticUnits(): Unit[] {
    const colors: TeamColor[] = ["azul", "verde", "vermelho"];
    const meta = this.meta;
    const hGlad = createHeroUnit(
      "gladiador",
      "azul",
      colors,
      meta,
      -2,
      3,
      undefined,
      1,
    );
    hGlad.id = "layout-hero-gladiador";
    const hPriest = createHeroUnit(
      "sacerdotisa",
      "verde",
      colors,
      meta,
      0,
      3,
      undefined,
      1,
    );
    hPriest.id = "layout-hero-sacerdotisa";
    const hGun = createHeroUnit(
      "pistoleiro",
      "vermelho",
      colors,
      meta,
      2,
      3,
      undefined,
      1,
    );
    hGun.id = "layout-hero-pistoleiro";
    const bio = (q: number, r: number): BiomeId =>
      biomeAt(this.grid, q, r) as BiomeId;
    const eGlad = createEnemyUnit(
      ENEMY_BY_ID["gladinio"]!,
      1,
      3,
      3,
      -2,
      bio(3, -2),
    );
    eGlad.id = "layout-enemy-gladinio";
    const eEsc = createEnemyUnit(ESCRAVO, 1, 3, 0, -4, bio(0, -4));
    eEsc.id = "layout-enemy-escravo";
    const eLeao = createEnemyUnit(
      ENEMY_BY_ID["leao_selvagem"]!,
      1,
      3,
      -3,
      -3,
      bio(-3, -3),
    );
    eLeao.id = "layout-enemy-leao";
    return [hGlad, hPriest, hGun, eGlad, eEsc, eLeao];
  }

  /** Resumo da wave (UI do overlay antes da loja / vitória). */
  peekWaveLootSummary(): WaveEndLootSummary | null {
    return this.waveLootSummaryPending;
  }

  dismissWaveSummary(): void {
    if (this.phase !== "wave_summary") return;
    this.waveLootSummaryPending = null;
    const next = this.pendingWaveSummaryNext;
    this.pendingWaveSummaryNext = null;
    if (next === "victory") {
      this.phase = "victory";
      this.victoryWave20 = true;
      this.meta.crystals += this.crystalsRun + 5;
      this.saveMeta();
    } else if (next === "shop") {
      this.teleportPartyToHub();
      this.phase = "shop_wave";
      this.captureShopSnapshot();
    }
    this.emit();
  }

  /**
   * Abandona a run sem gravar cristais da run; reverte essências ao estado de antes da run.
   */
  forfeitRunToMainMenu(): void {
    clearRunSessionCheckpoint();
    if (this.metaEssencesAtRunStart) {
      this.meta.essences = { ...this.metaEssencesAtRunStart };
      this.metaEssencesAtRunStart = null;
    }
    this.crystalsRun = 0;
    this.waveCrystalsGained = 0;
    this.waveEssencesGained = {};
    this.waveLootSummaryPending = null;
    this.pendingWaveSummaryNext = null;
    this.waveXpGained = 0;
    this.runPlaySessionPerfMsStart = null;
    this.artifactBannedThisRun.clear();

    this.playerTurnJustStarted = false;
    this.inEnemyPhase = false;
    this.lastEnemyActedId = null;
    this.enemyTurnQueue = [];
    this.rochosoTauntHeroId = null;
    this.blockEnemyPhaseForWaveIntro = false;

    this.clearCombatSchedule();
    this.pendingCombatVfxQueue = [];
    clearCombatOutcomeQueue();
    this.cancelLevelUpFloatHoldTimer();
    this.pendingSentencaPartyHeal = null;
    this.duel = null;
    this.duelNextIsGladiatorStrike = true;
    this.killLevelUpFlushSuppressed = false;
    this.pendingKillLevelUpFlushHeroIds.clear();
    this.pendingCombatLevelUpHeroIds.clear();

    this.pendingArtifacts = null;
    this.pendingUltimate = null;
    this.pendingBunkerHint = null;
    this.pendingMoveBlockedHint = null;
    this.pendingMoveAnim = null;

    this.victoryWave20 = false;
    this.basicAttacksSpentThisTurn = 0;

    this.units = [];
    this.bunkers = {};
    this.partyOrder = [];
    this.phase = "main_menu";
    this.wave = 0;
    this.currentHeroIndex = 0;
    this.movementLeft = 0;
    this.basicLeft = 0;
    this.selectedUnitId = null;
    this.logLines = [];

    this.saveMeta();
    this.emit();
  }

  /**
   * Serializa a run para `sessionStorage` (loja, combate, resumo, escolhas).
   * Ao restaurar, a fila de combate em tempo real é limpa — o estado fica jogável, sem animações pendentes.
   */
  serializeRunSessionRecovery(): string | null {
    if (!runPhaseAllowsRunSessionPersistence(this.phase)) return null;
    try {
      const payload = {
        v: 1 as const,
        phase: this.phase,
        meta: JSON.parse(JSON.stringify(this.meta)) as MetaProgress,
        units: JSON.parse(JSON.stringify(this.units)) as Unit[],
        bunkers: JSON.parse(JSON.stringify(this.bunkers)) as Partial<
          Record<BiomeId, BunkerState>
        >,
        wave: this.wave,
        partyOrder: [...this.partyOrder],
        currentHeroIndex: this.currentHeroIndex,
        movementLeft: this.movementLeft,
        basicLeft: this.basicLeft,
        basicAttacksSpentThisTurn: this.basicAttacksSpentThisTurn,
        crystalsRun: this.crystalsRun,
        logLines: [...this.logLines],
        pendingArtifacts: this.pendingArtifacts
          ? JSON.parse(JSON.stringify(this.pendingArtifacts))
          : null,
        pendingUltimate: this.pendingUltimate
          ? { ...this.pendingUltimate }
          : null,
        duel: this.duel ? { ...this.duel } : null,
        selectedUnitId: this.selectedUnitId,
        victoryWave20: this.victoryWave20,
        devSandboxMode: this.devSandboxMode,
        runColors: [...this.runColors],
        partyXpBonusPct: this.partyXpBonusPct,
        runHeroBiomes: [...this.runHeroBiomes],
        inEnemyPhase: this.inEnemyPhase,
        lastEnemyActedId: this.lastEnemyActedId,
        pendingBunkerHint: this.pendingBunkerHint
          ? { ...this.pendingBunkerHint }
          : null,
        pendingMoveBlockedHint: this.pendingMoveBlockedHint
          ? { ...this.pendingMoveBlockedHint }
          : null,
        pendingMoveAnim: this.pendingMoveAnim
          ? JSON.parse(JSON.stringify(this.pendingMoveAnim))
          : null,
        pendingWaveSummaryNext: this.pendingWaveSummaryNext,
        blockEnemyPhaseForWaveIntro: this.blockEnemyPhaseForWaveIntro,
        pendingCometaArcanoWithoutIntro: this.pendingCometaArcanoWithoutIntro,
        skipDeslumbroDecayAfterCometaOnce: this.skipDeslumbroDecayAfterCometaOnce,
        playerTurnJustStarted: this.playerTurnJustStarted,
        enemyPhaseTimingMult: this.enemyPhaseTimingMult,
        rochosoTauntHeroId: this.rochosoTauntHeroId,
        enemyTurnQueueIds: this.enemyTurnQueue.map((u) => u.id),
        pendingSentencaPartyHeal: this.pendingSentencaPartyHeal
          ? { ...this.pendingSentencaPartyHeal }
          : null,
        duelNextIsGladiatorStrike: this.duelNextIsGladiatorStrike,
        killLevelUpFlushSuppressed: this.killLevelUpFlushSuppressed,
        pendingKillLevelUpFlushHeroIds: [...this.pendingKillLevelUpFlushHeroIds],
        pendingCombatLevelUpHeroIds: [...this.pendingCombatLevelUpHeroIds],
        waveCrystalsGained: this.waveCrystalsGained,
        waveXpGained: this.waveXpGained,
        waveEssencesGained: { ...this.waveEssencesGained },
        waveLootSummaryPending: this.waveLootSummaryPending
          ? JSON.parse(JSON.stringify(this.waveLootSummaryPending))
          : null,
        runPlaySessionPerfMsStart: this.runPlaySessionPerfMsStart,
        metaEssencesAtRunStart: this.metaEssencesAtRunStart
          ? { ...this.metaEssencesAtRunStart }
          : null,
        shopRestoreSnapshot: this.shopRestoreSnapshot
          ? JSON.parse(JSON.stringify(this.shopRestoreSnapshot))
          : null,
        runShopRefundUses: this.runShopRefundUses,
        artifactBannedThisRun: [...this.artifactBannedThisRun],
        combatFloats: JSON.parse(JSON.stringify(this.combatFloats)) as CombatFloatEvent[],
        pendingCombatVfxQueue: JSON.parse(
          JSON.stringify(this.pendingCombatVfxQueue),
        ) as CombatVfxHint[],
      };
      return JSON.stringify(payload);
    } catch {
      return null;
    }
  }

  applyRunSessionRecovery(json: string): boolean {
    try {
      const o = JSON.parse(json) as {
        v?: number;
        phase?: GamePhase;
        meta?: MetaProgress;
        units?: Unit[];
        bunkers?: Partial<Record<BiomeId, BunkerState>>;
        wave?: number;
        partyOrder?: string[];
        currentHeroIndex?: number;
        movementLeft?: number;
        basicLeft?: number;
        basicAttacksSpentThisTurn?: number;
        crystalsRun?: number;
        logLines?: string[];
        pendingArtifacts?: {
          unitId: string;
          choices: string[];
          choiceCount: number;
          rerollsFreeLeft: number;
          rerollsPaidUsed: number;
          bansFreeLeft: number;
          bansPaidUsed: number;
          banMode: boolean;
        } | null;
        pendingUltimate?: { unitId: string } | null;
        duel?: { gladiatorId: string; enemyId: string } | null;
        selectedUnitId?: string | null;
        victoryWave20?: boolean;
        devSandboxMode?: boolean;
        runColors?: TeamColor[];
        partyXpBonusPct?: number;
        runHeroBiomes?: BiomeId[];
        inEnemyPhase?: boolean;
        lastEnemyActedId?: string | null;
        pendingBunkerHint?: { text: string; q: number; r: number } | null;
        pendingMoveBlockedHint?: { text: string; unitId: string } | null;
        pendingMoveAnim?: {
          unitId: string;
          cells: { q: number; r: number }[];
          segmentMs?: number;
          playHeroRunAnim?: boolean;
        } | null;
        pendingWaveSummaryNext?: "shop" | "victory" | null;
        blockEnemyPhaseForWaveIntro?: boolean;
        pendingCometaArcanoWithoutIntro?: boolean;
        skipDeslumbroDecayAfterCometaOnce?: boolean;
        playerTurnJustStarted?: boolean;
        enemyPhaseTimingMult?: number;
        rochosoTauntHeroId?: string | null;
        enemyTurnQueueIds?: string[];
        pendingSentencaPartyHeal?: {
          priestId: string;
          heal: number;
          priestBio: BiomeId;
        } | null;
        duelNextIsGladiatorStrike?: boolean;
        killLevelUpFlushSuppressed?: boolean;
        pendingKillLevelUpFlushHeroIds?: string[];
        pendingCombatLevelUpHeroIds?: string[];
        waveCrystalsGained?: number;
        waveXpGained?: number;
        waveEssencesGained?: Partial<Record<ForgeEssenceId, number>>;
        waveLootSummaryPending?: WaveEndLootSummary | null;
        runPlaySessionPerfMsStart?: number | null;
        metaEssencesAtRunStart?: Partial<
          Record<ForgeEssenceId, number>
        > | null;
        shopRestoreSnapshot?: ShopRestoreSnapshot | null;
        runShopRefundUses?: number;
        artifactBannedThisRun?: string[];
      };
      if (o.v !== 1 || !o.phase || !Array.isArray(o.units) || !o.meta)
        return false;
      if (!runPhaseAllowsRunSessionPersistence(o.phase)) return false;

      this.meta = o.meta;
      this.units = o.units;
      this.bunkers = o.bunkers ?? {};
      this.wave = o.wave ?? 0;
      this.partyOrder = o.partyOrder ?? [];
      this.currentHeroIndex = o.currentHeroIndex ?? 0;
      this.movementLeft = o.movementLeft ?? 0;
      this.basicLeft = o.basicLeft ?? 0;
      this.basicAttacksSpentThisTurn = o.basicAttacksSpentThisTurn ?? 0;
      this.crystalsRun = o.crystalsRun ?? 0;
      this.logLines = o.logLines ?? [];
      this.pendingArtifacts = o.pendingArtifacts ?? null;
      this.pendingUltimate = o.pendingUltimate ?? null;
      this.duel = o.duel ?? null;
      this.selectedUnitId = o.selectedUnitId ?? null;
      this.victoryWave20 = o.victoryWave20 ?? false;
      this.devSandboxMode = o.devSandboxMode ?? false;
      this.runColors = o.runColors ?? [];
      this.partyXpBonusPct = o.partyXpBonusPct ?? 0;
      this.runHeroBiomes = o.runHeroBiomes ?? [];
      this.phase = o.phase;
      this.inEnemyPhase = o.inEnemyPhase ?? false;
      this.lastEnemyActedId = o.lastEnemyActedId ?? null;
      this.pendingBunkerHint = o.pendingBunkerHint ?? null;
      this.pendingMoveBlockedHint = o.pendingMoveBlockedHint ?? null;
      this.pendingMoveAnim = o.pendingMoveAnim ?? null;
      this.pendingWaveSummaryNext = o.pendingWaveSummaryNext ?? null;
      this.blockEnemyPhaseForWaveIntro = o.blockEnemyPhaseForWaveIntro ?? false;
      this.pendingCometaArcanoWithoutIntro =
        o.pendingCometaArcanoWithoutIntro ?? false;
      this.skipDeslumbroDecayAfterCometaOnce =
        o.skipDeslumbroDecayAfterCometaOnce ?? false;
      this.playerTurnJustStarted = o.playerTurnJustStarted ?? false;
      this.enemyPhaseTimingMult = o.enemyPhaseTimingMult ?? 1;
      this.rochosoTauntHeroId = o.rochosoTauntHeroId ?? null;
      this.pendingSentencaPartyHeal = o.pendingSentencaPartyHeal ?? null;
      this.duelNextIsGladiatorStrike = o.duelNextIsGladiatorStrike ?? true;
      this.killLevelUpFlushSuppressed = o.killLevelUpFlushSuppressed ?? false;
      this.waveCrystalsGained = o.waveCrystalsGained ?? 0;
      this.waveXpGained = o.waveXpGained ?? 0;
      this.waveEssencesGained = o.waveEssencesGained ?? {};
      this.waveLootSummaryPending = o.waveLootSummaryPending ?? null;
      this.runPlaySessionPerfMsStart = o.runPlaySessionPerfMsStart ?? null;
      this.metaEssencesAtRunStart = o.metaEssencesAtRunStart ?? null;
      this.shopRestoreSnapshot = o.shopRestoreSnapshot ?? null;
      this.runShopRefundUses = o.runShopRefundUses ?? 0;

      this.artifactBannedThisRun = new Set(o.artifactBannedThisRun ?? []);
      this.pendingKillLevelUpFlushHeroIds = new Set(
        o.pendingKillLevelUpFlushHeroIds ?? [],
      );
      this.pendingCombatLevelUpHeroIds = new Set(
        o.pendingCombatLevelUpHeroIds ?? [],
      );

      const ids = o.enemyTurnQueueIds ?? [];
      this.enemyTurnQueue = ids
        .map((id) => this.units.find((u) => u.id === id))
        .filter((u): u is Unit => !!u);

      /* Sem callbacks serializáveis: termina qualquer animação/agenda em curso. */
      this.clearCombatSchedule();
      this.cancelLevelUpFloatHoldTimer();
      clearCombatOutcomeQueue();
      this.pendingCombatVfxQueue = [];
      this.combatFloats = [];
      this.pendingMoveAnim = null;
      this.inEnemyPhase = false;
      this.blockEnemyPhaseForWaveIntro = false;
      this.playerTurnJustStarted = false;
      this.enemyTurnQueue = [];

      this.saveMeta();
      this.emit();
      return true;
    } catch {
      return false;
    }
  }

  getParty(): Unit[] {
    return this.partyOrder
      .map((id) => this.units.find((u) => u.id === id))
      .filter((u): u is Unit => !!u);
  }

  private partyHasForgeVulcanicTier(min: 2 | 3): boolean {
    for (const h of this.getParty()) {
      if (h.hp <= 0) continue;
      if (forgeSynergyTier(h.forgeLoadout, "vulcanico") >= min) return true;
    }
    return false;
  }

  private anyHeroSuppressesEnemyForestRange(): boolean {
    for (const h of this.getParty()) {
      if (h.hp <= 0) continue;
      if (biomeAt(this.grid, h.q, h.r) !== "floresta") continue;
      if (forgeSynergyTier(h.forgeLoadout, "floresta") >= 1) return true;
    }
    return false;
  }

  private anyPartyHasPantanoSynergyTier(min: 1 | 2 | 3): boolean {
    for (const h of this.getParty()) {
      if (h.hp <= 0) continue;
      if (forgeSynergyTier(h.forgeLoadout, "pantano") >= min) return true;
    }
    return false;
  }

  /** +1 mov a toda a party se alguém tiver sinergia pântano nv1+ e Ruler. */
  private partyPantanoRulerMovBonus(): number {
    for (const h of this.getParty()) {
      if (h.hp <= 0) continue;
      if (
        forgeSynergyTier(h.forgeLoadout, "pantano") >= 1 &&
        (h.artifacts["ruler"] ?? 0) > 0
      )
        return 1;
    }
    return 0;
  }

  /**
   * Pontos de movimento no início do turno (Ruler, sinergia pântano+Ruler na party,
   * dobra com sinergia pântano nv3 neste herói).
   */
  heroMovementPool(h: Unit): number {
    let mov = h.movimento + rulerMovementBonus(h);
    mov += this.partyPantanoRulerMovBonus();
    if (forgeSynergyTier(h.forgeLoadout, "pantano") >= 3) mov *= 2;
    return mov;
  }

  /**
   * Defesa extra: 25% da defesa (ou valor alternativo via `defOf`) de cada aliado com
   * sinergia montanha nv2+.
   */
  montanhosoAllyDefBonus(
    hero: Unit,
    defOf: (u: Unit) => number = (u) => u.defesa,
  ): number {
    if (!hero.isPlayer) return 0;
    let add = 0;
    for (const h of this.getParty()) {
      if (h.id === hero.id || h.hp <= 0) continue;
      if (forgeSynergyTier(h.forgeLoadout, "montanhoso") < 2) continue;
      add += Math.floor(defOf(h) * 0.25);
    }
    return add;
  }

  /** Regen extra de aliados com sinergia deserto nv2+ (50% dos stats deles). */
  desertoAllyRegenExtraHp(
    hero: Unit,
    regVOf: (u: Unit) => number = (u) => u.regenVida,
  ): number {
    if (!hero.isPlayer) return 0;
    let add = 0;
    for (const h of this.getParty()) {
      if (h.id === hero.id || h.hp <= 0) continue;
      if (forgeSynergyTier(h.forgeLoadout, "deserto") < 2) continue;
      add += Math.floor(regVOf(h) * 0.5);
    }
    return add;
  }

  desertoAllyRegenExtraMana(
    hero: Unit,
    regMOf: (u: Unit) => number = (u) => u.regenMana,
  ): number {
    if (!hero.isPlayer) return 0;
    let add = 0;
    for (const h of this.getParty()) {
      if (h.id === hero.id || h.hp <= 0) continue;
      if (forgeSynergyTier(h.forgeLoadout, "deserto") < 2) continue;
      add += Math.floor(regMOf(h) * 0.5);
    }
    return add;
  }

  /**
   * Soma ao multiplicador de dano crítico: +0,5 por aliado vivo com sinergia rochosa nv1+ e Ruler
   * (inclui o próprio atacante se cumprir).
   */
  rochosoRulerAllyCritMultBonus(att: Unit): number {
    if (!att.isPlayer) return 0;
    let add = 0;
    for (const h of this.getParty()) {
      if (h.hp <= 0) continue;
      if (forgeSynergyTier(h.forgeLoadout, "rochoso") < 1) continue;
      if ((h.artifacts["ruler"] ?? 0) <= 0) continue;
      add += 0.5;
    }
    return add;
  }

  /** Sorte efetiva (ex.: sinergia floresta nv3 dobra). */
  effectiveSorte(u: Unit): number {
    let s = u.sorte;
    if (forgeSynergyTier(u.forgeLoadout, "floresta") >= 3) s *= 2;
    return s;
  }

  takePendingMoveAnimation(): {
    unitId: string;
    cells: { q: number; r: number }[];
    segmentMs?: number;
    playHeroRunAnim?: boolean;
  } | null {
    const p = this.pendingMoveAnim;
    this.pendingMoveAnim = null;
    return p;
  }

  takeCombatFloats(): CombatFloatEvent[] {
    const p = this.combatFloats;
    this.combatFloats = [];
    return p;
  }

  /** Chamado quando o overlay “Wave N” termina (fade + remoção). */
  releaseEnemyPhaseAfterWaveIntro(): void {
    if (!this.blockEnemyPhaseForWaveIntro) return;
    if (this.phase !== "combat") return;
    this.blockEnemyPhaseForWaveIntro = false;
    this.runEnemyPhase();
  }

  /** Soma de acúmulos `guerra_total` (Cometa arcano) em heróis vivos. */
  partyGuerraTotalStackSum(): number {
    let s = 0;
    for (const h of this.getParty()) {
      if (h.hp <= 0) continue;
      s += h.artifacts["guerra_total"] ?? 0;
    }
    return s;
  }

  /**
   * Sandbox: após `startWave` sem overlay, o main consome isto uma vez e corre o cometa antes de
   * `releaseEnemyPhaseAfterWaveIntro`.
   */
  takePendingCometaArcanoWithoutIntro(): boolean {
    const p = this.pendingCometaArcanoWithoutIntro;
    this.pendingCometaArcanoWithoutIntro = false;
    return p;
  }

  /**
   * Dano em área + Deslumbro do Cometa arcano (chamar no impacto do cinemático).
   * O atacante sintético escolhido permite crítico com Lâmina mágica como nas habilidades.
   */
  applyCometaArcanoStrike(): void {
    const sumStacks = Math.min(3, this.partyGuerraTotalStackSum());
    if (sumStacks <= 0) return;
    const flat = ([50, 120, 210] as const)[sumStacks - 1]!;
    const pct = ([0.2, 0.4, 0.75] as const)[sumStacks - 1]!;
    const desN = ([1, 2, 3] as const)[sumStacks - 1]!;
    const src = this.pickCometaArcanoDamageSource();
    if (!src) return;
    for (const e of this.enemies()) {
      if (e.hp <= 0) continue;
      const tier = enemyTierFromId(e.enemyArchetypeId);
      const mult = tier === "grunt" ? 1 : 0.5;
      const raw = Math.max(
        0,
        Math.floor((flat + e.maxHp * pct) * mult),
      );
      if (raw > 0) {
        this.dealDamage(src, e, raw, false, false, false, {
          suppressLifesteal: true,
          fromCometaArcano: true,
          suppressSourceHitSfx: true,
        });
      }
      if (e.hp > 0) {
        addDeslumbroInstances(e, desN);
      }
    }
    this.onDeaths();
    this.skipDeslumbroDecayAfterCometaOnce = true;
    this.log("Cometa arcano: a onda de energia atinge os inimigos.");
    this.emit();
  }

  private pickCometaArcanoDamageSource(): Unit | null {
    const party = this.getParty().filter((h) => h.hp > 0);
    if (party.length === 0) return null;
    const withCometa = party.filter((h) => (h.artifacts["guerra_total"] ?? 0) > 0);
    const pool = withCometa.length > 0 ? withCometa : party;
    const lam = pool.find(
      (h) => h.heroClass && (h.artifacts["lamina_magica"] ?? 0) > 0,
    );
    if (lam) return lam;
    if (withCometa.length > 0) {
      let best = withCometa[0]!;
      let g = -1;
      for (const h of withCometa) {
        const gv = h.artifacts["guerra_total"] ?? 0;
        if (gv > g) {
          g = gv;
          best = h;
        }
      }
      return best;
    }
    return party[0]!;
  }

  private tickDeslumbroEndOfEnemyPhase(): void {
    if (this.skipDeslumbroDecayAfterCometaOnce) {
      this.skipDeslumbroDecayAfterCometaOnce = false;
      return;
    }
    for (const u of this.units) {
      if (u.isPlayer || u.hp <= 0) continue;
      if (deslumbroInstancesCount(u) <= 0) continue;
      addDeslumbroInstances(u, -1);
    }
  }

  takeCombatVfxHints(): CombatVfxHint[] {
    const q = this.pendingCombatVfxQueue;
    this.pendingCombatVfxQueue = [];
    return q;
  }

  /** Fila de dano/efeitos alinhada ao tempo; chamar no loop do combate. */
  tickCombatSchedule(): void {
    if (this.phase !== "combat") return;
    if (this.combatSchedule.length === 0) {
      flushCombatOutcomeQueue({
        hasPendingCombatSchedule: () => this.hasPendingCombatSchedule(),
        getPhase: () => this.phase,
      });
      return;
    }
    const now = performance.now();
    this.combatSchedule.sort((a, b) => a.at - b.at);
    while (this.combatSchedule.length > 0 && this.combatSchedule[0]!.at <= now) {
      const job = this.combatSchedule.shift()!;
      try {
        job.fn();
      } catch (e) {
        console.error(e);
      }
    }
    flushCombatOutcomeQueue({
      hasPendingCombatSchedule: () => this.hasPendingCombatSchedule(),
      getPhase: () => this.phase,
    });
  }

  private queueCombat(delayMs: number, fn: () => void): void {
    this.combatSchedule.push({ at: performance.now() + delayMs, fn });
  }

  private clearCombatSchedule(): void {
    this.combatSchedule = [];
    this.drainDeferredKillLevelUpQueue();
  }

  /** Liberta level-ups adiados (Furacão) ou limpa estado ao abortar a fila de combate. */
  private drainDeferredKillLevelUpQueue(): void {
    this.killLevelUpFlushSuppressed = false;
    const ids = [...this.pendingKillLevelUpFlushHeroIds];
    this.pendingKillLevelUpFlushHeroIds.clear();
    for (const id of ids) {
      const hero = this.units.find((u) => u.id === id);
      if (hero) this.flushCombatLevelUp(hero);
    }
  }

  private cancelLevelUpFloatHoldTimer(): void {
    if (this.levelUpFloatHoldTimer != null) {
      clearTimeout(this.levelUpFloatHoldTimer);
      this.levelUpFloatHoldTimer = null;
    }
  }

  /** Fila de dano/VFX ainda por executar (bloqueia “Encerrar turno”). */
  hasPendingCombatSchedule(): boolean {
    return this.combatSchedule.length > 0;
  }

  private pushCombatFloat(ev: CombatFloatEvent): void {
    const amount = roundToCombatDecimals(ev.amount);
    if (!Number.isFinite(amount) || amount <= 0) return;
    this.combatFloats.push({ ...ev, amount });
  }

  currentHero(): Unit | null {
    const id = this.partyOrder[this.currentHeroIndex];
    return this.units.find((u) => u.id === id) ?? null;
  }

  /** Indica início de turno de herói; consome o sinal (uma vez). */
  consumePlayerTurnJustStarted(): boolean {
    if (!this.playerTurnJustStarted) return false;
    this.playerTurnJustStarted = false;
    return true;
  }

  startNewRun(setup: RunSetup): void {
    clearRunSessionCheckpoint();
    this.playerTurnJustStarted = false;
    this.inEnemyPhase = false;
    this.lastEnemyActedId = null;
    this.enemyTurnQueue = [];
    this.units = [];
    this.wave = 0;
    this.metaEssencesAtRunStart = { ...this.meta.essences };
    this.artifactBannedThisRun.clear();
    this.crystalsRun = 0;
    this.waveCrystalsGained = 0;
    this.waveEssencesGained = {};
    this.waveLootSummaryPending = null;
    this.waveXpGained = 0;
    this.runPlaySessionPerfMsStart = null;
    this.logLines = [];
    this.duel = null;
    this.clearCombatSchedule();
    this.pendingCombatVfxQueue = [];
    clearCombatOutcomeQueue();
    this.cancelLevelUpFloatHoldTimer();
    this.pendingCombatLevelUpHeroIds.clear();
    this.basicAttacksSpentThisTurn = 0;
    this.pendingSentencaPartyHeal = null;
    this.duelNextIsGladiatorStrike = true;
    this.blockEnemyPhaseForWaveIntro = false;
    this.victoryWave20 = false;
    const colors = setup.colors;
    this.runColors = [...colors];
    this.partyXpBonusPct = computePartyBonus(colors).xpGainPct;
    this.runHeroBiomes = [...setup.biomes];
    this.bunkers = {};
    this.pendingBunkerHint = null;
    const spawnTaken = new Set<string>();
    setup.heroes.forEach((cls, i) => {
      const biome = setup.biomes[i]!;
      const partySlot = setup.partySlotByHero[i]!;
      const spawn =
        this.nextPartyHexInBiome(biome, spawnTaken) ??
        this.randomEmptyInBiome(biome);
      spawnTaken.add(axialKey(spawn.q, spawn.r));
      const forgeResolved = resolveEquippedForgeLoadoutForMeta(
        this.meta,
        partySlot,
      );
      const teamColor = colors[partySlot]!;
      const wl = normalizeWeaponLevel(
        this.meta.weaponLevelByHeroSlot[partySlot],
      );
      const u = createHeroUnit(
        cls,
        teamColor,
        colors,
        this.meta,
        spawn.q,
        spawn.r,
        forgeResolved,
        wl,
      );
      u.displayColor =
        teamColor === "azul"
          ? 0x4488ff
          : teamColor === "verde"
            ? 0x44cc66
            : 0xcc4444;
      u.partySlotIndex = partySlot;
      this.units.push(u);
    });
    /** Não usar getParty() aqui: ele depende de partyOrder, ainda vazio neste ponto. */
    this.partyOrder = this.units.filter((u) => u.isPlayer).map((u) => u.id);
    if (DEV_TEST_CROWD_UI) {
      const poolSlice = ARTIFACT_POOL.slice(0, DEV_TEST_ARTIFACT_COUNT);
      for (const u of this.units) {
        if (!u.isPlayer) continue;
        for (const a of poolSlice) {
          u.artifacts[a.id] = 1;
        }
      }
    }
    this.pendingArtifacts = null;
    this.pendingUltimate = null;
    this.runShopRefundUses = 0;
    this.ensureBunkersPlaced();
    this.captureShopSnapshot();
    this.phase = "shop_initial";
    this.currentHeroIndex = 0;
    this.rochosoTauntHeroId = null;
    this.emit();
  }

  finishInitialShop(): void {
    if (this.runPlaySessionPerfMsStart == null) {
      this.runPlaySessionPerfMsStart = performance.now();
    }
    this.phase = "combat";
    this.startWave(1);
  }

  startWave(n: number): void {
    this.playerTurnJustStarted = false;
    this.clearCombatSchedule();
    this.pendingCombatVfxQueue = [];
    clearCombatOutcomeQueue();
    this.cancelLevelUpFloatHoldTimer();
    this.pendingCombatLevelUpHeroIds.clear();
    this.pendingSentencaPartyHeal = null;
    this.duel = null;
    this.duelNextIsGladiatorStrike = true;
    this.waveCrystalsGained = 0;
    this.waveXpGained = 0;
    this.waveEssencesGained = {};
    this.wave = n;
    this.inEnemyPhase = false;
    this.lastEnemyActedId = null;
    this.rochosoTauntHeroId = null;
    this.enemyTurnQueue = [];
    this.clearDead();
    for (const u of this.units) {
      if (!u.isPlayer) continue;
      u.ouroWave = 100;
      if (u.hp <= 0) {
        u.hp = Math.floor(u.maxHp * 0.5);
        this.log(`${u.name} ressuscita com 50% vida.`);
      } else {
        u.hp = Math.min(u.hp, u.maxHp);
        u.mana = Math.min(u.mana, u.maxMana);
      }
      u.skillCd = {};
      u.pistoleiroBonusDanoWave = 0;
      u.curandeiroDanoWave = 0;
      u.shieldGGBlue = 0;
      u.escudoResidualTagged = 0;
      if ((u.furiaGiganteTurns ?? 0) > 0 || u.furiaExtraMaxHp) {
        const extra = u.furiaExtraMaxHp ?? 0;
        if (extra > 0) {
          u.maxHp -= extra;
          u.hp = Math.min(u.hp, u.maxHp);
        }
        if (u.furiaSavedDano != null) u.dano = u.furiaSavedDano;
        u.furiaGiganteTurns = undefined;
        u.furiaExtraMaxHp = undefined;
        u.furiaSavedDano = undefined;
      }
      if (u.ultimateId === "fada_cura") {
        u.flying = true;
        for (const ally of this.getParty()) {
          if (ally.hp <= 0) continue;
          const shield = Math.floor(ally.maxHp * 0.5);
          ally.shieldGGBlue += shield;
        }
      }
    }
    this.placePartyOnChosenBiomeFirstHexes();
    this.spawnEnemiesForWave();
    this.ensureBunkersPlaced();
    this.currentHeroIndex = 0;
    /** Fase inimiga só após o overlay da wave (ver `releaseEnemyPhaseAfterWaveIntro`). */
    this.blockEnemyPhaseForWaveIntro = true;
    const ec = this.enemies().length;
    this.log(`— Wave ${n} — ${ec} inimigo(s) na arena (alvos laranja/vermelho).`);
    this.emit();
  }

  private clearDead(): void {
    this.units = this.units.filter((u) => u.isPlayer || u.hp > 0);
  }

  /** Distância axial do centro da arena (castelo/hub em 0,0) ao hex do bunker. */
  private static readonly BUNKER_RING_FROM_CENTER = 8;

  /** Melhor hex livre no bioma: preferência anel a 8 do centro; fallback ao mais próximo desse anel. */
  private pickBunkerHexForBiome(
    biome: BiomeId,
    used: Set<string>,
  ): { q: number; r: number } | null {
    const origin = { q: 0, r: 0 };
    const target = GameModel.BUNKER_RING_FROM_CENTER;
    const scored = [...this.grid.values()]
      .filter((c) => c.biome === biome)
      .map((c) => ({
        c,
        err: Math.abs(hexDistance({ q: c.q, r: c.r }, origin) - target),
      }));
    scored.sort(
      (a, b) => a.err - b.err || a.c.q - b.c.q || a.c.r - b.c.r,
    );
    const existing = this.allBunkerStates();
    const usable = scored.filter(({ c }) => {
      if (!this.bunkerHasEnemyUsableArea(c.q, c.r, biome, 3)) return false;
      for (const b of existing) {
        if (hexDistance({ q: c.q, r: c.r }, { q: b.q, r: b.r }) <= 3) {
          return false;
        }
      }
      return true;
    });
    const pool = usable.length > 0 ? usable : scored;
    for (const { c } of pool) {
      const k = axialKey(c.q, c.r);
      if (used.has(k)) continue;
      const occ = this.units.some(
        (u) => u.hp > 0 && u.q === c.q && u.r === c.r,
      );
      if (occ) continue;
      return { q: c.q, r: c.r };
    }
    return null;
  }

  /**
   * Evita bunker em posição "morta": em raio `radius` todos os hexes devem existir e
   * pertencer ao mesmo bioma do bunker (inclui adjacentes).
   */
  private bunkerHasEnemyUsableArea(
    q: number,
    r: number,
    biome: BiomeId,
    radius: number,
  ): boolean {
    for (let dq = -radius; dq <= radius; dq++) {
      for (let dr = -radius; dr <= radius; dr++) {
        const ds = -dq - dr;
        if (Math.max(Math.abs(dq), Math.abs(dr), Math.abs(ds)) > radius) continue;
        const cell = getCell(this.grid, q + dq, r + dr);
        if (!cell) return false;
        if (cell.biome !== biome) return false;
      }
    }
    return true;
  }

  /** Um bunker por bioma de combate, no anel ~8 hex do centro (castelo). */
  private ensureBunkersPlaced(): void {
    const used = new Set<string>();
    for (const b of this.allBunkerStates()) {
      used.add(axialKey(b.q, b.r));
    }
    const origin = { q: 0, r: 0 };
    for (const bi of COMBAT_BIOMES) {
      const existing = this.bunkers[bi];
      if (existing) {
        const d = hexDistance({ q: existing.q, r: existing.r }, origin);
        if (
          d !== GameModel.BUNKER_RING_FROM_CENTER &&
          !existing.occupantId
        ) {
          used.delete(axialKey(existing.q, existing.r));
          const pos = this.pickBunkerHexForBiome(bi, used);
          if (pos) {
            existing.q = pos.q;
            existing.r = pos.r;
            used.add(axialKey(pos.q, pos.r));
          } else {
            used.add(axialKey(existing.q, existing.r));
          }
        }
        continue;
      }
      const pos = this.pickBunkerHexForBiome(bi, used);
      if (!pos) continue;
      this.bunkers[bi] = createInitialBunkerState(pos.q, pos.r);
      used.add(axialKey(pos.q, pos.r));
    }
  }

  private randomEmptyInBiome(biome: BiomeId): { q: number; r: number } {
    const origin = { q: 0, r: 0 };
    const candidates: { q: number; r: number }[] = [];
    for (const c of this.grid.values()) {
      if (c.biome !== biome) continue;
      const occ = this.units.some((u) => u.q === c.q && u.r === c.r);
      if (!occ) candidates.push({ q: c.q, r: c.r });
    }
    if (!candidates.length) return { q: 0, r: 0 };
    candidates.sort(
      (a, b) => hexDistance(a, origin) - hexDistance(b, origin),
    );
    const best = hexDistance(candidates[0]!, origin);
    const tier = candidates.filter(
      (p) => hexDistance(p, origin) <= best + 0.001,
    );
    return tier[Math.floor(Math.random() * tier.length)]!;
  }

  /**
   * Hexes do bioma do mais próximo ao centro da arena (castelo em 0,0) ao mais longe;
   * empate por (q, r). É a ordem do “primeiro hex” do bioma para spawn da party.
   */
  private partyBiomeCellsSortedFromCenter(biome: BiomeId): HexCell[] {
    const origin = { q: 0, r: 0 };
    return [...this.grid.values()]
      .filter((c) => c.biome === biome)
      .sort((a, b) => {
        const da = hexDistance({ q: a.q, r: a.r }, origin);
        const db = hexDistance({ q: b.q, r: b.r }, origin);
        if (da !== db) return da - db;
        return a.q - b.q || a.r - b.r;
      });
  }

  /** Próximo hex livre nessa ordem (vários heróis no mesmo bioma: anéis seguintes). */
  private nextPartyHexInBiome(
    biome: BiomeId,
    taken: Set<string>,
  ): { q: number; r: number } | null {
    for (const c of this.partyBiomeCellsSortedFromCenter(biome)) {
      const k = axialKey(c.q, c.r);
      if (taken.has(k)) continue;
      return { q: c.q, r: c.r };
    }
    return null;
  }

  /**
   * Após a loja, cada herói vivo começa a wave no primeiro hex livre do bioma escolhido
   * (mais próximo do centro; segundo herói no mesmo bioma: seguinte nessa ordem).
   */
  private placePartyOnChosenBiomeFirstHexes(): void {
    const taken = new Set<string>();
    for (const hero of this.getParty()) {
      if (hero.hp <= 0) continue;
      const hi = this.partyOrder.indexOf(hero.id);
      const biome =
        hi >= 0 && hi < this.runHeroBiomes.length
          ? this.runHeroBiomes[hi]!
          : (biomeAt(this.grid, hero.q, hero.r) as BiomeId);
      const pos =
        this.nextPartyHexInBiome(biome, taken) ??
        this.randomEmptyInBiome(biome);
      hero.q = pos.q;
      hero.r = pos.r;
      taken.add(axialKey(pos.q, pos.r));
    }
  }

  /** Escravo #1, #2… quando o nome base se repete. */
  private disambiguateEnemyDisplayNames(): void {
    const strip = (s: string) => s.replace(/ #\d+$/, "");
    const groups = new Map<string, Unit[]>();
    for (const u of this.units) {
      if (u.isPlayer) continue;
      const base = strip(u.name);
      const arr = groups.get(base) ?? [];
      arr.push(u);
      groups.set(base, arr);
    }
    for (const [, arr] of groups) {
      arr.sort((a, b) => a.id.localeCompare(b.id));
      if (arr.length <= 1) {
        arr[0]!.name = strip(arr[0]!.name);
        continue;
      }
      for (let i = 0; i < arr.length; i++) {
        arr[i]!.name = `${strip(arr[i]!.name)} #${i + 1}`;
      }
    }
  }

  private spawnEnemiesForWave(): void {
    this.units = this.units.filter((u) => u.isPlayer);
    const cfg = waveConfigFromIndex(this.wave);
    const partyN = this.partyOrder.length;
    const taken = new Set<string>();
    for (const h of this.getParty()) taken.add(axialKey(h.q, h.r));

    if (this.wave === 1 && !cfg.isBoss && !cfg.isElite) {
      if (DEV_TEST_CROWD_UI) {
        for (let i = 0; i < DEV_TEST_WAVE1_ENEMY_COUNT; i++) {
          const pos = this.randomSpawnEnemy(taken);
          const spawnBio = biomeAt(this.grid, pos.q, pos.r) as BiomeId;
          const e = createEnemyUnit(
            ESCRAVO,
            this.wave,
            partyN,
            pos.q,
            pos.r,
            spawnBio,
          );
          this.units.push(e);
          taken.add(axialKey(pos.q, pos.r));
        }
        this.disambiguateEnemyDisplayNames();
        return;
      }
      /** 3 escravos por herói, cada qual no bioma daquele herói (evita acumular longe de um só). */
      for (const hero of this.getParty()) {
        if (hero.hp <= 0) continue;
        const hi = this.partyOrder.indexOf(hero.id);
        const homeBiome =
          hi >= 0 && hi < this.runHeroBiomes.length
            ? this.runHeroBiomes[hi]!
            : (biomeAt(this.grid, hero.q, hero.r) as BiomeId);
        for (let k = 0; k < 3; k++) {
          const pos = this.randomSpawnEnemyInSingleBiome(taken, homeBiome, [hero]);
          const e = createEnemyUnit(
            ESCRAVO,
            this.wave,
            this.partyOrder.length,
            pos.q,
            pos.r,
            homeBiome,
          );
          this.units.push(e);
          taken.add(axialKey(pos.q, pos.r));
        }
      }
      this.disambiguateEnemyDisplayNames();
      return;
    }

    const arch = cfg.isBoss
      ? pickBossForWave(this.wave)
      : cfg.isElite
        ? pickEliteForWave(this.wave)
        : pickGruntForWave(this.wave);
    const allowedBio = this.enemySpawnAllowedBiomes();
    const biomesList = [...allowedBio]
      .filter((b) => b !== "hub")
      .sort((a, b) => a.localeCompare(b));

    if (biomesList.length === 0) {
      const total = cfg.isBoss ? 1 : countEnemiesForWave(this.wave, partyN);
      for (let i = 0; i < total; i++) {
        const pos = this.randomSpawnEnemy(taken);
        const spawnBio = biomeAt(this.grid, pos.q, pos.r) as BiomeId;
        const e = createEnemyUnit(arch, this.wave, partyN, pos.q, pos.r, spawnBio);
        this.units.push(e);
        taken.add(axialKey(pos.q, pos.r));
      }
      this.disambiguateEnemyDisplayNames();
      return;
    }

    /** Boss: um só (não replicar por bioma). */
    if (cfg.isBoss) {
      const biome = biomesList[0]!;
      const refHeroes = this.heroesWithHomeBiome(biome);
      const pos = this.randomSpawnEnemyInSingleBiome(taken, biome, refHeroes);
      this.units.push(
        createEnemyUnit(
          pickBossForWave(this.wave),
          this.wave,
          partyN,
          pos.q,
          pos.r,
          biome,
        ),
      );
      this.disambiguateEnemyDisplayNames();
      return;
    }

    /**
     * Igualdade estrita: cada bioma permitido recebe o mesmo número de inimigos.
     * `⌈raw / B⌉` por bioma garante total ≥ o desejado pela curva quando raw não é múltiplo de B
     * (ex.: 5 inimigos, 3 biomas → 2+2+2 em vez de 2+2+1).
     */
    const rawCount = countEnemiesForWave(this.wave, partyN);
    const nEach = Math.ceil(rawCount / biomesList.length);

    for (const biome of biomesList) {
      const refHeroes = this.heroesWithHomeBiome(biome);
      for (let k = 0; k < nEach; k++) {
        const pos = this.randomSpawnEnemyInSingleBiome(taken, biome, refHeroes);
        const e = createEnemyUnit(arch, this.wave, partyN, pos.q, pos.r, biome);
        this.units.push(e);
        taken.add(axialKey(pos.q, pos.r));
      }
    }
    this.disambiguateEnemyDisplayNames();
  }

  /** Bioma escolhido na run para o herói (fallback: hex atual). */
  private heroHomeBiome(hero: Unit): BiomeId {
    const hi = this.partyOrder.indexOf(hero.id);
    return hi >= 0 && hi < this.runHeroBiomes.length
      ? this.runHeroBiomes[hi]!
      : (biomeAt(this.grid, hero.q, hero.r) as BiomeId);
  }

  /** Heróis vivos cujo bioma inicial da run (`runHeroBiomes`) é `biome`. */
  private heroesWithHomeBiome(biome: BiomeId): Unit[] {
    const out: Unit[] = [];
    for (const hero of this.getParty()) {
      if (hero.hp <= 0) continue;
      if (this.heroHomeBiome(hero) === biome) out.push(hero);
    }
    return out;
  }

  /** Todos os heróis da party (vivos ou mortos) com bioma inicial `biome`. */
  private partyHeroesWithChosenBiomeAll(biome: BiomeId): Unit[] {
    if (biome === "hub") return [];
    return this.getParty().filter((h) => this.heroHomeBiome(h) === biome);
  }

  /**
   * Inimigos priorizam o(s) herói(s) que escolheram o bioma de spawn do inimigo;
   * só mudam de alvo quando esse(s) morre(m) (fallback: outros vivos).
   */
  private pickEnemyHeroTarget(e: Unit): Unit | null {
    const party = this.getParty().filter((u) => u.hp > 0);
    if (!party.length) return null;
    if (this.rochosoTauntHeroId) {
      const taunt = party.find((u) => u.id === this.rochosoTauntHeroId);
      if (taunt) return taunt;
    }
    const bio =
      e.enemySpawnBiome && e.enemySpawnBiome !== "hub"
        ? e.enemySpawnBiome
        : (biomeAt(this.grid, e.q, e.r) as BiomeId);
    if (bio === "hub") {
      party.sort((a, b) => a.hp - b.hp || a.defesa - b.defesa);
      return party[0]!;
    }
    const owners = party.filter((h) => this.heroHomeBiome(h) === bio);
    if (owners.length > 0) {
      owners.sort((a, b) => a.hp - b.hp || a.defesa - b.defesa);
      return owners[0]!;
    }
    party.sort((a, b) => a.hp - b.hp || a.defesa - b.defesa);
    return party[0]!;
  }

  /**
   * Hex livre só em `biome`, entre os mais “longe” do herói mais próximo em `referenceHeroes`
   * (igual ao critério global de spawn). Sem referência, usa distância ao centro.
   */
  private randomSpawnEnemyInSingleBiome(
    taken: Set<string>,
    biome: BiomeId,
    referenceHeroes: Unit[],
  ): { q: number; r: number } {
    const heroes =
      referenceHeroes.length > 0
        ? referenceHeroes
        : this.getParty().filter((h) => h.hp > 0);
    const origin = { q: 0, r: 0 };
    type Scored = { q: number; r: number; near: number };
    const scored: Scored[] = [];
    for (const c of this.grid.values()) {
      if (c.biome !== biome || c.biome === "hub") continue;
      const k = axialKey(c.q, c.r);
      if (taken.has(k)) continue;
      const cell = { q: c.q, r: c.r };
      let near: number;
      if (heroes.length > 0) {
        near = Infinity;
        for (const h of heroes) {
          near = Math.min(near, hexDistance(cell, h));
        }
      } else {
        near = hexDistance(cell, origin);
      }
      scored.push({ q: c.q, r: c.r, near });
    }
    if (scored.length === 0) {
      return this.randomSpawnEnemyRelaxed(taken, new Set([biome]));
    }
    scored.sort((a, b) => b.near - a.near);
    const best = scored[0]!.near;
    const pool = scored.filter((s) => s.near >= best - 1);
    return pool[Math.floor(Math.random() * pool.length)]!;
  }

  /**
   * Biomas onde inimigos podem nascer: interseção entre biomas escolhidos na run e biomas
   * onde existe pelo menos um herói vivo. Se vazio (ex.: todos no hub), usa só os escolhidos.
   */
  private enemySpawnAllowedBiomes(): Set<BiomeId> {
    const selected = new Set<BiomeId>(this.runHeroBiomes);
    if (selected.size === 0) return new Set(COMBAT_BIOMES);
    const present = new Set<BiomeId>();
    for (const h of this.getParty()) {
      if (h.hp <= 0) continue;
      present.add(biomeAt(this.grid, h.q, h.r) as BiomeId);
    }
    const inter = new Set<BiomeId>();
    for (const b of selected) {
      if (present.has(b)) inter.add(b);
    }
    if (inter.size > 0) return inter;
    return selected;
  }

  private randomSpawnEnemy(taken: Set<string>): { q: number; r: number } {
    const allowedBio = this.enemySpawnAllowedBiomes();
    const heroes = this.getParty()
      .filter((h) => h.hp > 0)
      .map((h) => ({ q: h.q, r: h.r }));
    const origin = { q: 0, r: 0 };
    type Scored = { q: number; r: number; near: number };
    const scored: Scored[] = [];
    for (const c of this.grid.values()) {
      if (c.biome === "hub") continue;
      if (!allowedBio.has(c.biome)) continue;
      const k = axialKey(c.q, c.r);
      if (taken.has(k)) continue;
      const cell = { q: c.q, r: c.r };
      let near: number;
      if (heroes.length > 0) {
        near = Infinity;
        for (const h of heroes) {
          near = Math.min(near, hexDistance(cell, h));
        }
      } else {
        near = hexDistance(cell, origin);
      }
      scored.push({ q: c.q, r: c.r, near });
    }
    if (scored.length === 0) {
      return this.randomSpawnEnemyRelaxed(taken, allowedBio);
    }
    scored.sort((a, b) => b.near - a.near);
    const best = scored[0]!.near;
    const pool = scored.filter((s) => s.near >= best - 1);
    const pick = pool[Math.floor(Math.random() * pool.length)]!;
    return { q: pick.q, r: pick.r };
  }

  /** Último recurso: qualquer hex livre nos biomas permitidos (ignora anel de distância). */
  private randomSpawnEnemyRelaxed(
    taken: Set<string>,
    allowedBio: Set<BiomeId>,
  ): { q: number; r: number } {
    const pool: { q: number; r: number }[] = [];
    for (const c of this.grid.values()) {
      if (c.biome === "hub" || !allowedBio.has(c.biome)) continue;
      const k = axialKey(c.q, c.r);
      if (!taken.has(k)) pool.push({ q: c.q, r: c.r });
    }
    if (pool.length > 0) {
      return pool[Math.floor(Math.random() * pool.length)]!;
    }
    for (const c of this.grid.values()) {
      if (c.biome === "hub" || !allowedBio.has(c.biome)) continue;
      const k = axialKey(c.q, c.r);
      if (!taken.has(k)) return { q: c.q, r: c.r };
    }
    return { q: 0, r: 0 };
  }

  beginHeroTurn(): void {
    const h = this.currentHero();
    if (!h || h.hp <= 0) {
      this.advanceHeroOrRound();
      return;
    }
    if ((h.artifacts["alento_morte"] ?? 0) > 0) {
      for (const ally of this.getParty()) {
        if (ally.id === h.id || ally.hp <= 0) continue;
        addBravuraInstances(ally, 1);
      }
      this.log(
        `${h.name}: Alento da morte — cai ao iniciar o turno; aliados recebem Bravura.`,
      );
      h.hp = 0;
      this.onDeaths();
      if (
        this.phase === "combat" &&
        this.getParty().every((u) => u.hp <= 0)
      ) {
        this.phase = "defeat";
        this.meta.crystals += this.crystalsRun;
        this.saveMeta();
        this.log("Derrota.");
        this.emit();
        return;
      }
      this.advanceHeroOrRound();
      return;
    }
    h.bunkerReentryBlocked = false;
    const mov = this.heroMovementPool(h);
    this.movementLeft = mov;
    this.basicAttacksSpentThisTurn = 0;
    this.syncBasicLeftFromSpent(h);
    h.immobileThisTurn = true;
    if (h.heroClass === "pistoleiro" && h.ultimateId === "arauto_caos") {
      h.tiroDestruidorUsedThisTurn = false;
    }
    this.playerTurnJustStarted = true;
    this.emit();
  }

  advanceHeroOrRound(): void {
    this.currentHeroIndex++;
    if (this.currentHeroIndex >= this.partyOrder.length) {
      this.maybeApplyGoldDrainAfterPlayerCycle();
      this.runEnemyPhase();
      return;
    }
    this.beginHeroTurn();
  }

  endHeroTurn(): void {
    const h = this.currentHero();
    if (h) {
      clearBravuraInstances(h);
      if (!this.sandboxNoCdUltEnabled()) {
        for (const k of Object.keys(h.skillCd)) {
          const v = h.skillCd[k] ?? 0;
          if (v > 0) h.skillCd[k] = v - 1;
        }
      }
      this.applyEndTurnEffects(h);
      if (h.ultimateId === "rainha_desespero") {
        this.rainhaEndTurn(h);
      }
      this.applyVolcanicAtEndOfTurn(h);
      if (h.furiaGiganteTurns && h.furiaGiganteTurns > 0) {
        h.furiaGiganteTurns--;
        if (h.furiaGiganteTurns <= 0) {
          this.endFuriaGigante(h);
        }
      }
      if (
        h.heroClass === "pistoleiro" &&
        h.ultimateId === "arauto_caos" &&
        !h.tiroDestruidorUsedThisTurn
      ) {
        const c = h.tiroDestruidorCharges ?? 0;
        if (c < 5) h.tiroDestruidorCharges = c + 1;
      }
    }
    if (this.phase !== "combat") {
      this.emit();
      return;
    }
    if (this.getParty().every((u) => u.hp <= 0)) {
      this.phase = "defeat";
      this.meta.crystals += this.crystalsRun;
      this.saveMeta();
      this.log("Derrota.");
      this.emit();
      return;
    }
    this.currentHeroIndex++;
    if (this.currentHeroIndex >= this.partyOrder.length) {
      this.maybeApplyGoldDrainAfterPlayerCycle();
      this.runEnemyPhase();
      return;
    }
    this.beginHeroTurn();
  }

  /** Dreno só com inimigos vivos; afeta só `ouroWave`. Se a wave já foi limpa, não drena. */
  private maybeApplyGoldDrainAfterPlayerCycle(): void {
    if (!this.hasLivingEnemies()) return;
    this.applyPlayerRoundGoldDrain();
  }

  private hasLivingEnemies(): boolean {
    return this.units.some((u) => !u.isPlayer && u.hp > 0);
  }

  private rainhaEndTurn(priest: Unit): void {
    const dmgRaw = roundToCombatDecimals(
      heroDanoPlusRoninOverflow(priest) *
        (1 + priest.potencialCuraEscudo / 100) *
        2 +
        this.tooltipGarraFerroRawPreview(priest),
    );
    let healed = 0;
    for (const e of [...this.enemies()]) {
      if (e.hp <= 0) continue;
      const prev = e.hp;
      this.dealDamage(priest, e, dmgRaw, false, true, false);
      healed += Math.max(0, prev - e.hp);
      if (this.phase !== "combat") {
        const h1 = priest.hp;
        priest.hp = Math.min(priest.maxHp, priest.hp + healed);
        const g1 = priest.hp - h1;
        if (g1 > 0) {
          this.pushCombatFloat({
            unitId: priest.id,
            kind: "heal",
            amount: g1,
          });
          this.applyCurandeiroBatalhaFromHeal(priest);
        }
        this.flushCombatLevelUp(priest);
        return;
      }
    }
    const h0 = priest.hp;
    priest.hp = Math.min(priest.maxHp, priest.hp + healed);
    const pg = priest.hp - h0;
    if (pg > 0) {
      this.pushCombatFloat({
        unitId: priest.id,
        kind: "heal",
        amount: pg,
      });
      this.applyCurandeiroBatalhaFromHeal(priest);
    }
    this.flushCombatLevelUp(priest);
    if (this.phase === "combat") {
      this.tryResolveWaveClearAfterCombatResume();
    }
  }

  private executeSentenca(p: Unit): void {
    const priestBio = biomeAt(this.grid, p.q, p.r) as BiomeId;
    const dmg = this.computeSentencaDamagePerEnemy(p);
    const heal = this.computeSentencaHealParty(p);
    const targets = [...this.enemies()].filter((e) => {
      if (e.hp <= 0) return false;
      const eb = biomeAt(this.grid, e.q, e.r) as BiomeId;
      return eb === priestBio;
    });
    const alliesToHeal = this.getParty().filter((a) => a.hp > 0);

    this.pendingSentencaPartyHeal = {
      priestId: p.id,
      heal,
      priestBio,
    };

    this.pendingCombatVfxQueue.push({
      kind: "sentenca",
      priestId: p.id,
      targetIds: targets.map((t) => t.id),
      allyIds: alliesToHeal.map((a) => a.id),
      enemyHitCount: targets.length,
    });

    targets.forEach((e, i) => {
      const delay = SENTENCA_FIRST_DAMAGE_MS + i * SENTENCA_STAGGER_MS;
      this.queueCombat(delay, () => {
        const att = this.units.find((u) => u.id === p.id);
        const tg = this.units.find((u) => u.id === e.id);
        if (!att || !tg || tg.hp <= 0 || this.phase !== "combat") return;
        this.dealDamage(att, tg, dmg, false, true, false);
      });
    });

    const n = targets.length;
    const lastHit =
      n === 0 ? 0 : SENTENCA_FIRST_DAMAGE_MS + (n - 1) * SENTENCA_STAGGER_MS;
    const healAt = lastHit + SENTENCA_HEAL_AFTER_LAST_HIT_MS;

    this.queueCombat(healAt, () => {
      this.applySentencaPartyHeal({ resumeCombat: true });
    });
  }

  private applySentencaPartyHeal(opts: { resumeCombat: boolean }): void {
    const pending = this.pendingSentencaPartyHeal;
    if (!pending) return;
    const priest = this.units.find((u) => u.id === pending.priestId);
    if (!priest || this.phase !== "combat") {
      this.pendingSentencaPartyHeal = null;
      return;
    }
    this.pendingSentencaPartyHeal = null;
    const { heal, priestBio } = pending;
    for (const ally of this.getParty()) {
      if (ally.hp <= 0) continue;
      this.healUnit(ally, heal, priest, {
        overflowToShieldHalf: true,
        overflowShieldRatio: sentencaShieldOverflowRatio(priest.weaponLevel),
        effectiveHealIncludesPotencial: true,
      });
    }
    this.log(`${priest.name}: Sentença (${BIOME_LABELS[priestBio]}).`);
    this.flushCombatLevelUp(priest);
    if (opts.resumeCombat && this.phase === "combat") {
      this.tryResolveWaveClearAfterCombatResume();
    }
    if (opts.resumeCombat) {
      this.emit();
    }
  }

  private applyPlayerRoundGoldDrain(): void {
    for (const h of this.getParty()) {
      if (h.hp <= 0) continue;
      const d = goldDrainPerTurn(h, this.partyOrder.length);
      h.ouroWave = Math.max(0, h.ouroWave - d);
    }
    this.log(`Fim do ciclo dos heróis: ouro da wave reduzido (base 5 por herói, menos reduções).`);
  }

  private runEnemyPhase(): void {
    this.inEnemyPhase = true;
    this.lastEnemyActedId = null;
    const aliveN = this.enemies().filter((e) => e.hp > 0).length;
    this.enemyPhaseTimingMult =
      aliveN <= 3 ? 1 : Math.max(0.08, Math.min(1, 3 / aliveN));
    this.enemyTurnQueue = this.enemies().filter((e) => e.hp > 0);
    this.emit();
    if (this.enemyTurnQueue.length === 0) {
      this.finishEnemyPhaseAfterAllMoves();
      return;
    }
    const t0 = Math.round(220 * this.enemyPhaseTimingMult);
    this.queueCombat(t0, () => {
      if (this.phase !== "combat" || !this.inEnemyPhase) return;
      this.processNextEnemyTurn();
    });
  }

  private processNextEnemyTurn(): void {
    if (this.phase !== "combat" || !this.inEnemyPhase) return;
    while (this.enemyTurnQueue.length > 0) {
      const ref = this.enemyTurnQueue[0]!;
      const live = this.units.find((u) => u.id === ref.id);
      if (!live || live.hp <= 0) {
        this.enemyTurnQueue.shift();
        continue;
      }
      break;
    }
    const next = this.enemyTurnQueue.shift();
    if (!next) {
      this.finishEnemyPhaseAfterAllMoves();
      return;
    }
    const e = this.units.find((u) => u.id === next.id);
    if (!e || e.hp <= 0) {
      const mult = this.enemyPhaseTimingMult;
      this.queueCombat(Math.round(50 * mult), () => {
        if (this.phase !== "combat" || !this.inEnemyPhase) return;
        this.processNextEnemyTurn();
      });
      return;
    }
    this.lastEnemyActedId = e.id;
    const enemyId = e.id;
    const moveMs = this.runEnemyAI(e);
    this.emit();
    const pauseAfterTurn = Math.round(300 * this.enemyPhaseTimingMult);
    /** Mesma fila que o golpe (`queueCombat` em runEnemyAI): garante ordem e todos os turnos. */
    this.queueCombat(moveMs + pauseAfterTurn, () => {
      if (this.phase !== "combat" || !this.inEnemyPhase) return;
      const u = this.units.find((x) => x.id === enemyId);
      if (u && !u.isPlayer && u.hp > 0) {
        this.applyRochosoTier3EndOfEnemyTurnRiposte(u);
        this.applyPoisonAndHotTick(u);
        this.onDeaths();
      }
      this.processNextEnemyTurn();
    });
  }

  /** Fecha fase inimiga; `skipFloatDelay` evita espera pós-floats (ex.: retorno do level-up). */
  private finishEnemyPhaseAfterAllMoves(skipFloatDelay = false): void {
    this.tickDeslumbroEndOfEnemyPhase();
    this.inEnemyPhase = false;
    this.lastEnemyActedId = null;
    this.enemyTurnQueue = [];
    this.currentHeroIndex = 0;
    if (this.enemies().every((x) => x.hp <= 0)) {
      const waveDelay =
        POST_COMBAT_FLOAT_LEVEL_UP_UI_DELAY_MS +
        POST_COMBAT_FLOAT_WAVE_STAGGER_AFTER_MS;
      const runWaveClear = (): void => {
        if (this.hasLivingEnemies()) return;
        if (this.phase === "level_up_pick" || this.phase === "ultimate_pick") {
          enqueueCombatOutcome(
            combatOutcomePriority.waveClear,
            "wave-clear",
            runWaveClear,
          );
          return;
        }
        if (this.phase !== "combat") return;
        if (skipFloatDelay) {
          this.onWaveCleared();
          return;
        }
        this.queueCombat(waveDelay, () => {
          if (this.hasLivingEnemies()) return;
          if (this.phase === "level_up_pick" || this.phase === "ultimate_pick") {
            enqueueCombatOutcome(
              combatOutcomePriority.waveClear,
              "wave-clear",
              () => this.attemptWaveClearAfterLevelUi(),
            );
            return;
          }
          if (this.phase === "combat") this.onWaveCleared();
        });
      };
      if (this.hasPendingCombatSchedule()) {
        enqueueCombatOutcome(
          combatOutcomePriority.waveClear,
          "wave-clear",
          runWaveClear,
        );
      } else {
        runWaveClear();
      }
      return;
    }
    if (this.getParty().every((u) => u.hp <= 0)) {
      this.phase = "defeat";
      this.meta.crystals += this.crystalsRun;
      this.saveMeta();
      this.log("Derrota.");
      this.emit();
      return;
    }
    this.beginHeroTurn();
  }

  /** Vulcânico: dano no fim do turno. Forja vulcânica + Ruler: cura em vez de perder. */
  private applyVolcanicAtEndOfTurn(u: Unit): void {
    if (u.hp <= 0) return;
    if (biomeAt(this.grid, u.q, u.r) !== "vulcanico") return;
    const fv = u.isPlayer ? forgeSynergyTier(u.forgeLoadout, "vulcanico") : 0;
    if (u.isPlayer && fv >= 1) {
      if (unitIgnoresTerrain(u)) {
        const h0 = u.hp;
        u.hp = Math.min(u.maxHp, u.hp + 10);
        const g = u.hp - h0;
        if (g > 0) {
          this.pushCombatFloat({
            unitId: u.id,
            kind: "heal",
            amount: g,
          });
        }
      }
      return;
    }
    if (unitIgnoresTerrain(u)) return;
    let d = biomeVolcanicDamage();
    if (
      !u.isPlayer &&
      this.partyHasForgeVulcanicTier(2)
    ) {
      d *= 2;
    }
    const dHit =
      !u.isPlayer && deslumbroInstancesCount(u) > 0
        ? roundToCombatDecimals(d * 1.5)
        : d;

    /** Bioma vulcânico: herói no bunker — o dano ambiental vai à estrutura, não ao herói. */
    if (u.isPlayer && this.isBunkerOccupant(u)) {
      const bk = this.bunkerAtHex(u.q, u.r)!;
      const hpDmg = d;
      bk.hp = Math.max(0, bk.hp - hpDmg);
      if (hpDmg > 0) {
        this.pushCombatFloat({
          unitId: BUNKER_COMBAT_FLOAT_ID,
          kind: "damage",
          amount: hpDmg,
          targetIsPlayer: true,
          bunkerDamage: true,
          bunkerHex: { q: bk.q, r: bk.r },
        });
      }
      if (bk.hp <= 0) {
        this.catapultHeroOutOfDestroyedBunker(u);
      }
      return;
    }

    const volcanicWasAlive = u.hp > 0;
    let shieldAbsorb = 0;
    let dmgHp = dHit;
    if (u.shieldGGBlue > 0) {
      const absorbed = Math.min(u.shieldGGBlue, dHit);
      shieldAbsorb = absorbed;
      u.shieldGGBlue -= absorbed;
      this.reduceEscudoResidualTagged(u, absorbed);
      dmgHp = dHit - absorbed;
    }
    u.hp = Math.max(0, u.hp - dmgHp);
    if (shieldAbsorb > 0) {
      this.pushCombatFloat({
        unitId: u.id,
        kind: "shield_absorb",
        amount: shieldAbsorb,
        targetIsPlayer: u.isPlayer,
        floatHex: { q: u.q, r: u.r },
      });
    }
    if (dmgHp > 0) {
      this.pushCombatFloat({
        unitId: u.id,
        kind: "damage",
        amount: dmgHp,
        crit: false,
        targetIsPlayer: u.isPlayer,
        floatHex: { q: u.q, r: u.r },
      });
    }
    let volcanicEnvKill = false;
    if (!u.isPlayer && volcanicWasAlive && u.hp <= 0) {
      this.onEnemyKilled(null, u);
      volcanicEnvKill = true;
    }
    this.onDeaths();
    if (volcanicEnvKill) {
      for (const hero of this.getParty()) {
        if (hero.hp > 0) this.flushCombatLevelUp(hero);
      }
    }
  }

  /** Sinergia rochosa nv3: dano reflexo dos heróis adjacentes ao inimigo no fim do turno dele. */
  private applyRochosoTier3EndOfEnemyTurnRiposte(e: Unit): void {
    if (e.isPlayer || e.hp <= 0) return;
    for (const h of this.getParty()) {
      if (h.hp <= 0) continue;
      if (forgeSynergyTier(h.forgeLoadout, "rochoso") < 3) continue;
      if (hexDistance({ q: h.q, r: h.r }, { q: e.q, r: e.r }) > 1) continue;
      const raw = this.computeBasicAttackRawDamage(h);
      if (raw <= 0) continue;
      const cr = rollCrit(h.acertoCritico + roninCritBonus(h));
      this.dealDamage(h, e, raw, cr, true, true);
    }
  }

  enemies(): Unit[] {
    return this.units.filter((u) => !u.isPlayer && u.hp > 0);
  }

  /**
   * Todos os inimigos morreram durante ação de herói: aplica o mesmo fecho que o fim da fase inimiga
   * (vitória/loja). Chamado após Sentença/AoE ou ao voltar do level-up com arena limpa.
   */
  /**
   * @param skipFloatDelay — `true` ao voltar do level-up/ultimate (sem floats de kill recentes).
   */
  private tryResolveWaveClearAfterCombatResume(
    skipFloatDelay = false,
  ): void {
    if (this.hasLivingEnemies()) return;
    if (
      this.phase !== "combat" &&
      this.phase !== "level_up_pick" &&
      this.phase !== "ultimate_pick"
    ) {
      return;
    }
    this.finishEnemyPhaseAfterAllMoves(skipFloatDelay);
  }

  /**
   * Após esperar floats: se o level-up abriu entretanto, retoma o fecho de wave sem novo atraso.
   */
  private attemptWaveClearAfterLevelUi(): void {
    if (this.hasLivingEnemies()) return;
    if (this.phase === "level_up_pick" || this.phase === "ultimate_pick") {
      enqueueCombatOutcome(
        combatOutcomePriority.waveClear,
        "wave-clear",
        () => this.attemptWaveClearAfterLevelUi(),
      );
      return;
    }
    if (this.phase === "combat") this.onWaveCleared();
  }

  private onWaveCleared(): void {
    this.applySentencaPartyHeal({ resumeCombat: false });
    this.cancelLevelUpFloatHoldTimer();
    if (this.pendingCombatLevelUpHeroIds.size > 0) {
      this.pollPendingCombatLevelUp();
    }
    if (this.phase === "level_up_pick" || this.phase === "ultimate_pick") {
      this.clearCombatSchedule();
      this.pendingCombatVfxQueue = [];
      enqueueCombatOutcome(
        combatOutcomePriority.waveClear,
        "wave-clear",
        () => this.attemptWaveClearAfterLevelUi(),
      );
      return;
    }
    this.clearCombatSchedule();
    this.pendingCombatVfxQueue = [];
    this.duel = null;
    this.duelNextIsGladiatorStrike = true;
    this.blockEnemyPhaseForWaveIntro = false;
    this.log(`Wave ${this.wave} vencida!`);
    this.liquidateWaveGoldToShop();
    if (this.wave >= FINAL_VICTORY_WAVE) {
      this.pendingWaveSummaryNext = "victory";
    } else {
      this.pendingWaveSummaryNext = "shop";
    }
    this.phase = "wave_summary";
    this.emit();
  }

  /** Soma o ouro restante da wave (`ouroWave`) ao ouro atual de cada herói antes da loja. */
  private liquidateWaveGoldToShop(): void {
    const goldLines: WaveEndLootSummary["goldLines"] = [];
    for (const h of this.getParty()) {
      const raw = h.ouroWave;
      const { base, bonus, total } = this.metaGoldBonusOnRaw(raw);
      goldLines.push({ heroName: h.name, base, bonus, total });
      h.ouro += total;
      h.ouroWave = 0;
      h.shieldGGBlue = 0;
      h.escudoResidualTagged = 0;
    }
    const essences: { id: ForgeEssenceId; n: number }[] = [];
    for (const id of Object.keys(this.waveEssencesGained) as ForgeEssenceId[]) {
      const n = this.waveEssencesGained[id];
      if (n && n > 0) essences.push({ id, n });
    }
    const runElapsedMs =
      this.runPlaySessionPerfMsStart != null
        ? Math.max(0, Math.floor(performance.now() - this.runPlaySessionPerfMsStart))
        : 0;
    this.waveLootSummaryPending = {
      wave: this.wave,
      goldLines,
      crystalsGained: this.waveCrystalsGained,
      essences,
      xpTotal: this.waveXpGained,
      runElapsedMs,
    };
    this.waveCrystalsGained = 0;
    this.waveXpGained = 0;
    this.waveEssencesGained = {};
  }

  teleportPartyToHub(): void {
    for (const b of this.allBunkerStates()) {
      b.occupantId = null;
    }
    const hub = [...this.grid.values()].find((c) => c.biome === "hub");
    if (!hub) return;
    let i = 0;
    for (const h of this.getParty()) {
      const off = hexNeighborsOffset(i++);
      h.q = hub.q + off.q;
      h.r = hub.r + off.r;
      const cell = getCell(this.grid, h.q, h.r);
      if (!cell) {
        h.q = hub.q;
        h.r = hub.r;
      }
    }
  }

  finishWaveShop(): void {
    this.phase = "combat";
    this.startWave(this.wave + 1);
  }

  tryMoveHero(toQ: number, toR: number): boolean {
    const h = this.currentHero();
    if (!h || h.hp <= 0) return false;
    if (this.duel) return false;
    let adjEnemy = 0;
    for (const e of this.enemies()) {
      if (hexDistance({ q: h.q, r: h.r }, { q: e.q, r: e.r }) === 1) {
        adjEnemy++;
      }
    }
    /* No chão: cerco por 2+ adjacentes impede sair; em voo isso não aplica. */
    if (!h.flying && adjEnemy >= 2) {
      this.pendingMoveBlockedHint = {
        text: "2 ou mais inimigos me bloqueiam! Preciso me livrar deles!",
        unitId: h.id,
      };
      this.emit();
      return false;
    }
    const fly = h.flying;
    const ign = unitIgnoresTerrain(h);
    const panSwamp =
      !ign && forgeSynergyTier(h.forgeLoadout, "pantano") >= 1;
    const blocked = this.occupiedHexKeysExcluding(h.id);
    const fromQ = h.q;
    const fromR = h.r;
    const reach = reachableHexes(
      this.grid,
      { q: fromQ, r: fromR },
      this.movementLeft,
      fly,
      ign,
      blocked,
      panSwamp,
    );
    const k = axialKey(toQ, toR);
    const cost = reach.get(k);
    if (cost === undefined) return false;
    const bPre = this.bunkerAtHex(toQ, toR);
    if (
      bPre &&
      bPre.hp > 0 &&
      toQ === bPre.q &&
      toR === bPre.r &&
      !bPre.occupantId &&
      h.bunkerReentryBlocked
    ) {
      this.pendingBunkerHint = {
        text: "Aguarda 1 turno para voltares a entrar no bunker.",
        q: toQ,
        r: toR,
      };
      this.emit();
      return false;
    }
    const path = findPath(
      this.grid,
      { q: fromQ, r: fromR },
      { q: toQ, r: toR },
      fly,
      ign,
      cost,
      blocked,
      panSwamp,
    );
    if (path && path.length > 1 && !getSkipCombatAnimations()) {
      this.pendingMoveAnim = {
        unitId: h.id,
        cells: path.map((p) => ({ q: p.q, r: p.r })),
        segmentMs: heroRunSegmentMs(),
        playHeroRunAnim: true,
      };
    }
    this.movementLeft -= cost;
    const bFrom = this.bunkerAtHex(fromQ, fromR);
    const leftBunker =
      bFrom &&
      bFrom.occupantId === h.id &&
      fromQ === bFrom.q &&
      fromR === bFrom.r &&
      (toQ !== bFrom.q || toR !== bFrom.r);
    h.q = toQ;
    h.r = toR;
    if (leftBunker) {
      bFrom!.occupantId = null;
      h.bunkerReentryBlocked = true;
    }
    const bTo = this.bunkerAtHex(toQ, toR);
    if (
      bTo &&
      bTo.hp > 0 &&
      toQ === bTo.q &&
      toR === bTo.r &&
      !bTo.occupantId
    ) {
      bTo.occupantId = h.id;
    }
    h.immobileThisTurn = false;
    if (forgeSynergyTier(h.forgeLoadout, "rochoso") >= 3) {
      this.rochosoTauntHeroId = h.id;
    }
    this.log(`${h.name} move para (${toQ},${toR}).`);
    this.emit();
    return true;
  }

  /** Dano bruto do ataque básico (antes de crítico/defesa). Inclui bônus do Golpe Relâmpago se ativo. */
  /** Parcela contínua da Garra de ferro (30% defesa por acúmulo, máx. 6); o total bruto arredonda a 2 casas. */
  tooltipGarraFerroRawPreview(u: Unit): number {
    if (!u.isPlayer) return 0;
    const s = Math.min(6, u.artifacts["garra_ferro"] ?? 0);
    if (s <= 0) return 0;
    return u.defesa * 0.3 * s;
  }

  computeBasicAttackRawDamage(h: Unit): number {
    return roundToCombatDecimals(this.tooltipPreviewBasicAttackRawDamage(h));
  }

  computeAtirarTodoLadoDamagePerHit(h: Unit): number {
    return roundToCombatDecimals(this.tooltipPreviewAtirarDamagePerHit(h));
  }

  computeDuelGladiatorHitDamage(h: Unit): number {
    return roundToCombatDecimals(this.tooltipPreviewDuelGladiatorHitDamage(h));
  }

  computeSentencaDamagePerEnemy(h: Unit): number {
    return roundToCombatDecimals(this.tooltipPreviewSentencaDamagePerEnemy(h));
  }

  computeSentencaHealParty(h: Unit): number {
    return roundToCombatDecimals(this.tooltipPreviewSentencaHealEffective(h));
  }

  computeEspecialistaDestruicaoRaw(h: Unit): number {
    return roundToCombatDecimals(this.tooltipPreviewEspecialistaDestruicaoRaw(h));
  }

  /** Cadeia contínua (sem `floor` intermédios); `compute*` e tooltips aplicam `roundToCombatDecimals` no total. */
  tooltipPreviewBasicAttackRawDamage(h: Unit): number {
    let raw =
      heroDanoPlusRoninOverflow(h) +
      h.pistoleiroBonusDanoWave +
      h.curandeiroDanoWave;
    if (h.heroClass === "gladiador" && h.ultimateId === "campeao") {
      raw *= 1 + 0.05 * h.gladiadorKills;
    }
    if (h.ultimateId === "estrategista_nato") {
      const ouroTotal = h.ouro + h.ouroWave;
      raw *= 1 + Math.min(2, ouroTotal * 0.005);
    }
    if (h.motorMorteNextBasicPct > 0) {
      raw *= 1 + h.motorMorteNextBasicPct / 100;
    }
    return raw + this.tooltipGarraFerroRawPreview(h);
  }

  tooltipPreviewAtirarDamagePerHit(h: Unit): number {
    const mult = atirarDamageMult(h.weaponLevel);
    return (
      (heroDanoPlusRoninOverflow(h) + h.pistoleiroBonusDanoWave) * mult +
      this.tooltipGarraFerroRawPreview(h)
    );
  }

  tooltipPreviewDuelGladiatorHitDamage(h: Unit): number {
    const mult = ateMorteDamageMult(h.weaponLevel);
    return (
      heroDanoPlusRoninOverflow(h) * mult +
      this.tooltipGarraFerroRawPreview(h)
    );
  }

  tooltipPreviewSentencaDamagePerEnemy(h: Unit): number {
    const mult = sentencaDamageMult(h.weaponLevel);
    return (
      heroDanoPlusRoninOverflow(h) * mult +
      this.tooltipGarraFerroRawPreview(h)
    );
  }

  tooltipPreviewSentencaHealEffective(h: Unit): number {
    const mult = sentencaHealMult(h.weaponLevel);
    const potMult = 1 + h.potencialCuraEscudo / 100;
    return heroDanoPlusRoninOverflow(h) * mult * potMult;
  }

  tooltipPreviewSentencaShieldOverflowMax(h: Unit): number {
    return (
      this.tooltipPreviewSentencaHealEffective(h) *
      sentencaShieldOverflowRatio(h.weaponLevel)
    );
  }

  tooltipPreviewEspecialistaDestruicaoRaw(h: Unit): number {
    return (
      heroDanoPlusRoninOverflow(h) * 7 +
      this.tooltipGarraFerroRawPreview(h)
    );
  }

  /** Ataques básicos permitidos por turno (base 1 + braço forte + helmo rochoso). */
  maxBasicAttacksForHero(h: Unit): number {
    let cap = 1 + (h.artifacts["braco_forte"] ?? 0);
    const rh = getForgeLevel(h.forgeLoadout, "helmo", "rochoso");
    if (rh === 1 || rh === 2 || rh === 3) cap += rh;
    cap += bravuraInstancesCount(h);
    return cap;
  }

  private syncBasicLeftFromSpent(h: Unit): void {
    const cap = this.maxBasicAttacksForHero(h);
    this.basicLeft = Math.max(0, cap - this.basicAttacksSpentThisTurn);
  }

  tryBasicAttack(targetId: string): boolean {
    const h = this.currentHero();
    if (!h || h.hp <= 0 || this.basicLeft <= 0) return false;
    if (this.duel) return false;
    const tgt = this.units.find((u) => u.id === targetId);
    if (!tgt || tgt.isPlayer || tgt.hp <= 0) return false;
    const dist = hexDistance({ q: h.q, r: h.r }, { q: tgt.q, r: tgt.r });
    const alc = this.effectiveAlcanceForHero(h);
    if (dist > alc) return false;

    const runStrikeAndFinish = (att: Unit): void => {
      let raw = this.computeBasicAttackRawDamage(att);
      if (att.motorMorteNextBasicPct > 0) {
        att.motorMorteNextBasicPct = 0;
      }
      const t2 = this.units.find((u) => u.id === targetId);
      if (t2 && !t2.isPlayer && t2.hp > 0) {
        this.strike(att, t2, raw);
      }
      this.flushCombatLevelUp(att);
      if (this.phase === "combat") {
        this.tryResolveWaveClearAfterCombatResume();
      }
      this.emit();
    };

    const skipFx = getSkipCombatAnimations();

    if (h.heroClass === "pistoleiro") {
      const dmgDelay = skipFx ? 0 : heroBasicShootDamageDelayMs();
      const flight = skipFx ? BASIC_PISTOL_FLIGHT_MS : dmgDelay;
      this.pendingCombatVfxQueue.push({
        kind: "basic_projectile",
        fromId: h.id,
        toId: tgt.id,
        style: "bullet",
        flightMs: flight,
      });
      this.basicAttacksSpentThisTurn++;
      this.syncBasicLeftFromSpent(h);
      this.queueCombat(dmgDelay, () => {
        const att = this.units.find((u) => u.id === h.id);
        if (!att || att.hp <= 0 || this.phase !== "combat") return;
        runStrikeAndFinish(att);
      });
      this.emit();
      return true;
    }

    if (h.heroClass === "sacerdotisa") {
      const dmgDelay = skipFx ? 0 : heroBasicMagicDamageDelayMs();
      const flight = skipFx ? BASIC_MAGIC_FLIGHT_MS : dmgDelay;
      this.pendingCombatVfxQueue.push({
        kind: "basic_projectile",
        fromId: h.id,
        toId: tgt.id,
        style: "magic",
        flightMs: flight,
      });
      this.basicAttacksSpentThisTurn++;
      this.syncBasicLeftFromSpent(h);
      this.queueCombat(dmgDelay, () => {
        const att = this.units.find((u) => u.id === h.id);
        if (!att || att.hp <= 0 || this.phase !== "combat") return;
        runStrikeAndFinish(att);
      });
      this.emit();
      return true;
    }

    if (!skipFx) {
      this.pendingCombatVfxQueue.push({
        kind: "hero_basic_melee",
        heroId: h.id,
        targetId: tgt.id,
      });
    }
    const meleeDelay = skipFx ? 0 : heroBasicMeleeDamageDelayMs();
    this.basicAttacksSpentThisTurn++;
    this.syncBasicLeftFromSpent(h);
    this.queueCombat(meleeDelay, () => {
      const att = this.units.find((u) => u.id === h.id);
      const t2 = this.units.find((u) => u.id === targetId);
      if (!att || att.hp <= 0 || this.phase !== "combat") return;
      let rawD = this.computeBasicAttackRawDamage(att);
      if (att.motorMorteNextBasicPct > 0) {
        att.motorMorteNextBasicPct = 0;
      }
      if (t2 && !t2.isPlayer && t2.hp > 0) {
        this.strike(att, t2, rawD);
      }
      this.flushCombatLevelUp(att);
      if (this.phase === "combat") {
        this.tryResolveWaveClearAfterCombatResume();
      }
      this.emit();
    });
    this.emit();
    return true;
  }

  trySkill(skillId: string, targetId?: string): boolean {
    const h = this.currentHero();
    if (!h || h.hp <= 0) return false;

    if (skillId === "bunker_minas") {
      if (!this.sandboxNoCdUltEnabled() && (h.skillCd[skillId] ?? 0) > 0) return false;
      const b = this.bunkerAtHex(h.q, h.r);
      if (!b || b.hp <= 0 || b.occupantId !== h.id) return false;
      const tier = b.tier;
      const mult = bunkerMinasDamageMult(tier);
      const maxR = bunkerMinasMaxRing(tier);
      if (!this.sandboxNoCdUltEnabled())
        h.skillCd[skillId] = bunkerMinasCooldownWaves(tier);
      const fromQ = b.q;
      const fromR = b.r;
      const stag = BUNKER_MINAS_RING_STAGGER_MS;
      this.pendingCombatVfxQueue.push({
        kind: "bunker_minas",
        centerQ: fromQ,
        centerR: fromR,
        maxRing: maxR,
        staggerMs: stag,
      });
      const baseDano =
        heroDanoPlusRoninOverflow(h) +
        h.pistoleiroBonusDanoWave +
        h.curandeiroDanoWave;
      for (let ring = 1; ring <= maxR; ring++) {
        const delay = (ring - 1) * stag;
        this.queueCombat(delay, () => {
          const att = this.units.find((u) => u.id === h.id);
          if (!att || att.hp <= 0 || this.phase !== "combat") return;
          for (const e of this.enemies()) {
            if (e.hp <= 0) continue;
            if (
              hexDistance({ q: fromQ, r: fromR }, { q: e.q, r: e.r }) !==
              ring
            )
              continue;
            const raw = roundToCombatDecimals(baseDano * mult);
            this.dealDamage(
              att,
              e,
              raw,
              rollCrit(att.acertoCritico + roninCritBonus(att)),
              true,
              false,
            );
          }
          this.emit();
        });
      }
      const tail = maxR <= 0 ? 0 : (maxR - 1) * stag + 40;
      this.queueCombat(tail, () => {
        const att = this.units.find((u) => u.id === h.id);
        if (att) this.flushCombatLevelUp(att);
        if (this.phase === "combat") {
          this.tryResolveWaveClearAfterCombatResume();
        }
        this.emit();
      });
      this.log(`${h.name}: Minas terrestres!`);
      this.emit();
      return true;
    }

    if (skillId === "bunker_tiro_preciso") {
      if (!this.sandboxNoCdUltEnabled() && (h.skillCd[skillId] ?? 0) > 0) return false;
      const b = this.bunkerAtHex(h.q, h.r);
      if (!b || b.occupantId !== h.id || b.tier < 2) return false;
      if (!targetId) return false;
      const tgt = this.units.find((u) => u.id === targetId);
      if (!tgt || tgt.isPlayer || tgt.hp <= 0) return false;
      const baseDano =
        heroDanoPlusRoninOverflow(h) +
        h.pistoleiroBonusDanoWave +
        h.curandeiroDanoWave;
      const raw = roundToCombatDecimals(baseDano * 10);
      if (!this.sandboxNoCdUltEnabled())
        h.skillCd[skillId] = bunkerTiroCooldownWaves();
      this.pendingCombatVfxQueue.push({
        kind: "bunker_mortar",
        fromId: h.id,
        toId: targetId,
      });
      this.queueCombat(BUNKER_TIRO_FLIGHT_MS, () => {
        const att = this.units.find((u) => u.id === h.id);
        const tg = this.units.find((u) => u.id === targetId);
        if (!att || !tg || tg.hp <= 0 || this.phase !== "combat") return;
        this.dealDamage(
          att,
          tg,
          raw,
          rollCrit(att.acertoCritico + roninCritBonus(att)),
          true,
          false,
        );
        this.flushCombatLevelUp(att);
        if (this.phase === "combat") {
          this.tryResolveWaveClearAfterCombatResume();
        }
        this.emit();
      });
      this.log(`${h.name}: Tiro preciso!`);
      this.emit();
      return true;
    }

    if (this.bunkerAtHex(h.q, h.r)?.occupantId === h.id) return false;

    if (skillId === "tiro_destruidor") {
      if (h.heroClass !== "pistoleiro" || h.ultimateId !== "arauto_caos")
        return false;
      if (!this.sandboxNoCdUltEnabled() && (h.skillCd["tiro_destruidor"] ?? 0) > 0)
        return false;
      if (!this.devSandboxMode && (h.tiroDestruidorCharges ?? 0) < 1)
        return false;
      if (!targetId?.startsWith("beam:")) return false;
      const rest = targetId.slice("beam:".length);
      const si = rest.indexOf(":");
      if (si < 0) return false;
      const tq = Number(rest.slice(0, si));
      const tr = Number(rest.slice(si + 1));
      if (!Number.isFinite(tq) || !Number.isFinite(tr)) return false;
      if (tq === h.q && tr === h.r) return false;
      const d0 = hexDistance({ q: h.q, r: h.r }, { q: tq, r: tr });
      const alc = this.effectiveAlcanceForHero(h);
      if (d0 < 1 || d0 > alc) return false;
      const beamHexes = hexBeamRayThroughGrid(
        { q: h.q, r: h.r },
        { q: tq, r: tr },
        (qq, rr) => this.grid.has(axialKey(qq, rr)),
        48,
      );
      const charges = Math.min(5, Math.max(0, h.tiroDestruidorCharges ?? 0));
      const mult = 1 + 2.2 * charges;
      const dmgBase = this.computeAtirarTodoLadoDamagePerHit(h);
      const critRoll = rollCrit(h.acertoCritico + roninCritBonus(h));
      this.pendingCombatVfxQueue.push({
        kind: "tiro_destruidor_plasma",
        heroId: h.id,
        pathQr: beamHexes.map((c) => ({ q: c.q, r: c.r })),
        charges,
      });
      let delay = 0;
      const stepMs = 42;
      const hitEnemyIds: string[] = [];
      for (const cell of beamHexes) {
        const eid = this.liveEnemyIdAtHex(cell.q, cell.r);
        if (!eid || hitEnemyIds.includes(eid)) continue;
        hitEnemyIds.push(eid);
        const curDelay = delay;
        const enemyId = eid;
        this.queueCombat(curDelay, () => {
          const att = this.units.find((u) => u.id === h.id);
          const tg = this.units.find((u) => u.id === enemyId);
          if (!att || !tg || tg.hp <= 0 || this.phase !== "combat") return;
          const raw = roundToCombatDecimals(dmgBase * mult);
          this.dealDamage(att, tg, raw, critRoll, true, false);
          this.emit();
        });
        delay += stepMs;
      }
      h.tiroDestruidorCharges = 0;
      h.tiroDestruidorUsedThisTurn = true;
      if (!this.sandboxNoCdUltEnabled())
        h.skillCd["tiro_destruidor"] = atirarCooldownWaves(h.weaponLevel);
      this.log(`${h.name}: Tiro destruidor! (${charges} carga(s))`);
      this.queueCombat(delay + 55, () => {
        const att = this.units.find((u) => u.id === h.id);
        if (att) this.flushCombatLevelUp(att);
        if (this.phase === "combat") {
          this.tryResolveWaveClearAfterCombatResume();
        }
        this.emit();
      });
      this.emit();
      return true;
    }

    if (!this.sandboxNoCdUltEnabled() && (h.skillCd[skillId] ?? 0) > 0) return false;

    if (
      skillId === "atirar_todo_lado" &&
      h.heroClass === "pistoleiro" &&
      h.ultimateId !== "arauto_caos"
    ) {
      const alc = this.effectiveAlcanceForHero(h);
      const dmg = this.computeAtirarTodoLadoDamagePerHit(h);
      const targets = [...this.enemies()].filter(
        (e) =>
          e.hp > 0 &&
          hexDistance({ q: h.q, r: h.r }, { q: e.q, r: e.r }) <= alc,
      );
      const targetIds = targets.map((t) => t.id);
      const shotCount = Math.max(14, targetIds.length * 4);
      this.pendingCombatVfxQueue.push({
        kind: "atirar_todo_lado",
        heroId: h.id,
        targetIds,
        shotCount,
      });
      if (!this.sandboxNoCdUltEnabled())
        h.skillCd[skillId] = atirarCooldownWaves(h.weaponLevel);
      this.log(`${h.name}: Atirar pra todo lado!`);

      targets.forEach((e, i) => {
        const delay = ATIRAR_FIRST_DAMAGE_MS + i * ATIRAR_STAGGER_MS;
        this.queueCombat(delay, () => {
          const att = this.units.find((u) => u.id === h.id);
          const tg = this.units.find((u) => u.id === e.id);
          if (!att || !tg || tg.hp <= 0 || this.phase !== "combat") return;
          this.dealDamage(
            att,
            tg,
            dmg,
            rollCrit(att.acertoCritico + roninCritBonus(att)),
            true,
            false,
          );
        });
      });

      const last =
        targets.length === 0
          ? 0
          : ATIRAR_FIRST_DAMAGE_MS + (targets.length - 1) * ATIRAR_STAGGER_MS;
      this.queueCombat(last + 60, () => {
        const att = this.units.find((u) => u.id === h.id);
        if (att) this.flushCombatLevelUp(att);
        if (this.phase === "combat") {
          this.tryResolveWaveClearAfterCombatResume();
        }
        this.emit();
      });
      this.emit();
      return true;
    }

    if (skillId === "pisotear" && h.heroClass === "gladiador") {
      if (!h.furiaGiganteTurns || h.furiaGiganteTurns <= 0) return false;
      if (!this.sandboxNoCdUltEnabled() && (h.skillCd["pisotear"] ?? 0) > 0)
        return false;
      const mc = pisotearManaCost(h.weaponLevel);
      if (mc > 0 && h.maxMana > 0 && h.mana < mc) return false;
      const maxD = pisotearMaxHexDistance(h.weaponLevel);
      const mult = pisotearDamageMult(h.weaponLevel);
      const raw = roundToCombatDecimals(
        heroDanoPlusRoninOverflow(h) * mult +
          this.tooltipGarraFerroRawPreview(h),
      );
      const targets = [...this.enemies()].filter((e) => {
        if (e.hp <= 0) return false;
        const d = hexDistance({ q: h.q, r: h.r }, { q: e.q, r: e.r });
        return d >= 1 && d <= maxD;
      });
      if (targets.length === 0) return false;
      if (mc > 0 && h.maxMana > 0) h.mana -= mc;
      if (!this.sandboxNoCdUltEnabled())
        h.skillCd["pisotear"] = pisotearCooldownWaves(h.weaponLevel);
      const targetIds = targets.map((t) => t.id);
      this.pendingCombatVfxQueue.push({
        kind: "pisotear_chain",
        heroId: h.id,
        targetIds,
      });
      targets.forEach((e, i) => {
        const enemyId = e.id;
        const delay = PISOTEAR_FIRST_DAMAGE_MS + i * PISOTEAR_STAGGER_MS;
        this.queueCombat(delay, () => {
          const att = this.units.find((u) => u.id === h.id);
          const tg = this.units.find((u) => u.id === enemyId);
          if (!att || !tg || tg.hp <= 0 || this.phase !== "combat") return;
          this.dealDamage(
            att,
            tg,
            raw,
            rollCrit(att.acertoCritico + roninCritBonus(att)),
            true,
            false,
            { suppressSourceHitSfx: true },
          );
          this.emit();
        });
      });
      const last =
        PISOTEAR_FIRST_DAMAGE_MS +
        (targets.length - 1) * PISOTEAR_STAGGER_MS;
      this.queueCombat(last + PISOTEAR_TAIL_BUFFER_MS, () => {
        this.flushCombatLevelUp(h);
        if (this.phase === "combat") {
          this.tryResolveWaveClearAfterCombatResume();
        }
        this.emit();
      });
      this.emit();
      return true;
    }

    if (skillId === "ate_a_morte" && h.heroClass === "gladiador") {
      if (h.furiaGiganteTurns && h.furiaGiganteTurns > 0) return false;
      const mc = ateMorteManaCost(h.weaponLevel);
      if (mc > 0 && h.maxMana > 0 && h.mana < mc) return false;
      const tgt = this.units.find((u) => u.id === targetId);
      if (!tgt || tgt.isPlayer) return false;
      if (hexDistance({ q: h.q, r: h.r }, { q: tgt.q, r: tgt.r }) > 1)
        return false;
      if (mc > 0 && h.maxMana > 0) h.mana -= mc;
      this.startDuel(h, tgt);
      if (!this.sandboxNoCdUltEnabled())
        h.skillCd[skillId] = ateMorteCooldownWaves(h.weaponLevel);
      return true;
    }

    if (skillId === "sentenca" && h.heroClass === "sacerdotisa") {
      const sm = sentencaManaCost(h.weaponLevel);
      if (h.mana < sm) return false;
      h.mana -= sm;
      this.executeSentenca(h);
      if (!this.sandboxNoCdUltEnabled())
        h.skillCd[skillId] = sentencaCooldownWaves(h.weaponLevel);
      this.emit();
      return true;
    }

    if (skillId === "especialista_destruicao" && h.ultimateId === "especialista_destruicao") {
      const tgt = this.units.find((u) => u.id === targetId);
      if (!tgt || tgt.isPlayer) return false;
      const raw = this.computeEspecialistaDestruicaoRaw(h);
      this.dealDamage(h, tgt, raw, false, true, false);
      this.log(`Especialista da destruição!`);
      this.flushCombatLevelUp(h);
      if (this.phase === "combat") {
        this.tryResolveWaveClearAfterCombatResume();
      }
      this.emit();
      return true;
    }

    return false;
  }

  private startDuel(g: Unit, e: Unit): void {
    this.duel = { gladiatorId: g.id, enemyId: e.id };
    this.duelNextIsGladiatorStrike = true;
    this.pendingCombatVfxQueue.push({
      kind: "duel_start",
      gladiadorId: g.id,
      enemyId: e.id,
    });
    this.log(`Duelo mortal: ${g.name} vs ${e.name}`);
    this.emit();
    this.queueCombat(DUEL_FIRST_HIT_MS, () => this.duelTick());
  }

  private duelTick(): void {
    if (!this.duel || this.phase !== "combat") return;
    const { gladiatorId, enemyId } = this.duel;
    const g = this.units.find((u) => u.id === gladiatorId);
    const e = this.units.find((u) => u.id === enemyId);
    if (!g || !e || g.hp <= 0 || e.hp <= 0) {
      this.finishDuel();
      return;
    }

    if (this.duelNextIsGladiatorStrike) {
      this.dealDamage(
        g,
        e,
        this.computeDuelGladiatorHitDamage(g),
        rollCrit(g.acertoCritico),
        true,
        false,
      );
      this.duelNextIsGladiatorStrike = false;
    } else {
      this.dealDamage(e, g, e.dano, rollCrit(e.acertoCritico), true, true);
      this.duelNextIsGladiatorStrike = true;
    }

    const g2 = this.units.find((u) => u.id === gladiatorId);
    const e2 = this.units.find((u) => u.id === enemyId);
    if (!g2 || !e2 || g2.hp <= 0 || e2.hp <= 0) {
      this.finishDuel();
      return;
    }
    this.emit();
    this.queueCombat(DUEL_HIT_MS, () => this.duelTick());
  }

  private finishDuel(): void {
    const ref = this.duel;
    const gladId = ref?.gladiatorId;
    this.duel = null;
    this.duelNextIsGladiatorStrike = true;
    if (gladId) {
      this.pendingCombatVfxQueue.push({
        kind: "duel_end",
        gladiadorId: gladId,
      });
    }
    const gladiator = gladId ? this.units.find((u) => u.id === gladId) : undefined;
    if (gladiator && gladiator.hp > 0) {
      gladiator.gladiadorDuelWins = (gladiator.gladiadorDuelWins ?? 0) + 1;
      this.syncGladiadorDuelPassiveHp(gladiator);
      this.log(`${gladiator.name} vence o duelo!`);
    }
    if (gladiator) this.flushCombatLevelUp(gladiator);
    this.onDeaths();
    if (
      this.phase === "combat" &&
      this.getParty().every((x) => x.hp <= 0)
    ) {
      this.phase = "defeat";
      this.meta.crystals += this.crystalsRun;
      this.saveMeta();
      this.log("Derrota.");
    }
    this.emit();
  }

  private strike(att: Unit, def: Unit, raw: number): void {
    const crit = rollCrit(att.acertoCritico + roninCritBonus(att));
    const hpDmg = this.dealDamage(att, def, raw, crit, true, true);
    if (
      hpDmg > 0 &&
      crit &&
      att.isPlayer &&
      forgeSynergyTier(att.forgeLoadout, "vulcanico") >= 3
    ) {
      const splash = Math.max(1, roundToCombatDecimals(hpDmg * 0.5));
      for (const e of this.enemies()) {
        if (e.id === def.id || e.hp <= 0) continue;
        this.dealDamage(att, e, splash, false, false, false);
      }
    }
    if (
      hpDmg > 0 &&
      crit &&
      att.isPlayer &&
      forgeSynergyTier(att.forgeLoadout, "rochoso") >= 2
    ) {
      for (const e of this.enemies()) {
        if (e.id === def.id || e.hp <= 0) continue;
        const d = hexDistance(
          { q: def.q, r: def.r },
          { q: e.q, r: e.r },
        );
        if (d < 1 || d > 2) continue;
        this.dealDamage(
          att,
          e,
          raw,
          rollCrit(att.acertoCritico + roninCritBonus(att)),
          true,
          true,
        );
      }
    }
  }

  private dealDamage(
    src: Unit,
    tgt: Unit,
    raw: number,
    crit: boolean,
    canProc: boolean,
    fromBasicAttack: boolean,
    opts?: {
      suppressSourceHitSfx?: boolean;
      /** Dano secundário (ex.: Seda vampira): nunca dispara roubo de vida. */
      suppressLifesteal?: boolean;
      /** Cometa arcano: não aplica multiplicadores de habilidade nem veneno/Labareda. */
      fromCometaArcano?: boolean;
      /**
       * Preenchido com o crítico efetivo no dano (habilidades com Lâmina mágica rerolam;
       * sem Lâmina em habilidade, o crítico do parâmetro é anulado — ver corpo de `dealDamage`).
       */
      skillCritOut?: { value: boolean };
    },
  ): number {
    if (tgt.hp <= 0) return 0;
    let rawUse = raw;
    if (
      !opts?.fromCometaArcano &&
      !fromBasicAttack &&
      src.isPlayer &&
      src.heroClass &&
      !tgt.isPlayer
    ) {
      const v = src.artifacts["vendaval_arcana"] ?? 0;
      const c = src.artifacts["ceu_partido"] ?? 0;
      if (v > 0 || c > 0) {
        rawUse = Math.floor(rawUse * (1 + 0.08 * v + 0.15 * c));
      }
    }
    if (
      !src.isPlayer &&
      src.hp > 0 &&
      src.movimento < 4 &&
      this.anyPartyHasPantanoSynergyTier(2)
    ) {
      rawUse = Math.max(1, Math.floor(rawUse * 0.5));
    }
    if (
      src.isPlayer &&
      forgeSynergyTier(src.forgeLoadout, "montanhoso") >= 2
    ) {
      rawUse += Math.floor(src.defesa * 0.1);
    }
    const defBio = biomeAt(this.grid, tgt.q, tgt.r) as BiomeId;
    const atkBio = biomeAt(this.grid, src.q, src.r) as BiomeId;
    const bunkerHere = this.bunkerAtHex(tgt.q, tgt.r);
    const bkOcc =
      bunkerHere &&
      bunkerHere.hp > 0 &&
      bunkerHere.occupantId === tgt.id &&
      tgt.isPlayer;
    const useBunkerDefense = !!bkOcc && !src.isPlayer;
    const ignTgt = unitIgnoresTerrain(tgt);
    const monT1 =
      tgt.isPlayer &&
      forgeSynergyTier(tgt.forgeLoadout, "montanhoso") >= 1 &&
      !ignTgt;
    let defStat = effectiveDefenseForBiome(
      useBunkerDefense ? bunkerHere!.defesa : tgt.defesa,
      defBio,
      ignTgt,
      { montanhosoForgeSynergyTier1: monT1 },
    );
    if (tgt.isPlayer && !useBunkerDefense) {
      defStat += this.montanhosoAllyDefBonus(tgt);
    }
    if (
      src.isPlayer &&
      !tgt.isPlayer &&
      defBio === "montanhoso" &&
      forgeSynergyTier(src.forgeLoadout, "montanhoso") >= 1 &&
      (src.artifacts["ruler"] ?? 0) > 0
    ) {
      defStat = Math.max(0, Math.floor(defStat * 0.5));
    }
    let mit = computeMitigatedDamage(rawUse, defStat, src.penetracao);
    const ignAtk = unitIgnoresTerrain(src);
    let rochosoCritAdd = 0;
    if (atkBio === "rochoso" && !ignAtk) {
      if (
        src.isPlayer &&
        forgeSynergyTier(src.forgeLoadout, "rochoso") >= 1
      ) {
        rochosoCritAdd = 2;
      } else {
        rochosoCritAdd = 1;
      }
    }
    let useCrit = crit;
    let critMultExtra = 0;
    if (!fromBasicAttack && src.isPlayer && src.heroClass) {
      const lm = src.artifacts["lamina_magica"] ?? 0;
      if (lm <= 0) useCrit = false;
      else {
        useCrit = rollCrit(src.acertoCritico + roninCritBonus(src));
        critMultExtra = 0.25 * lm;
      }
    }
    if (opts?.skillCritOut) opts.skillCritOut.value = useCrit;
    mit = applyCritMultiplier(
      mit,
      src.danoCritico +
        critMultExtra +
        this.rochosoRulerAllyCritMultBonus(src),
      useCrit,
      rochosoCritAdd,
    );
    let dmg = mit;
    if (useBunkerDefense) {
      dmg = Math.max(1, roundToCombatDecimals(dmg * BUNKER_DAMAGE_TAKEN_MULT));
    }
    if (!tgt.isPlayer && deslumbroInstancesCount(tgt) > 0) {
      dmg = roundToCombatDecimals(dmg * 1.5);
    }
    let shieldAbsorb = 0;
    if (tgt.shieldGGBlue > 0) {
      const bypass = Math.max(0, Math.floor(src.penetracaoEscudo));
      const dmgVsShield = Math.max(0, dmg - bypass);
      const absorbed = Math.min(tgt.shieldGGBlue, dmgVsShield);
      shieldAbsorb = absorbed;
      tgt.shieldGGBlue -= absorbed;
      this.reduceEscudoResidualTagged(tgt, absorbed);
      dmg -= absorbed;
      const stacks = src.artifacts["escudo_sangue"] ?? 0;
      if (stacks > 0 && absorbed > 0) {
        const ret = Math.floor(absorbed * 0.75 * stacks);
        if (ret > 0) src.hp = Math.max(0, src.hp - ret);
      }
    }
    let dmgToHero = dmg;
    let bunkerAbsorbed = 0;
    const bk = bunkerHere;
    if (
      tgt.isPlayer &&
      bk &&
      bk.hp > 0 &&
      bk.occupantId === tgt.id &&
      dmgToHero > 0
    ) {
      const absorb = Math.min(dmgToHero, bk.hp);
      bunkerAbsorbed = absorb;
      bk.hp -= absorb;
      dmgToHero -= absorb;
      if (absorb > 0) {
        this.pushCombatFloat({
          unitId: BUNKER_COMBAT_FLOAT_ID,
          kind: "damage",
          amount: absorb,
          bunkerDamage: true,
          targetIsPlayer: true,
          bunkerHex: { q: bk.q, r: bk.r },
        });
      }
      if (bk.hp <= 0) {
        this.catapultHeroOutOfDestroyedBunker(tgt);
      }
    }
    const wasAlive = tgt.hp > 0;
    tgt.hp = Math.max(0, tgt.hp - dmgToHero);
    if (!src.isPlayer && tgt.isPlayer && src.hp > 0) {
      const sp = tgt.artifacts["espinhos_reais"] ?? 0;
      if (sp > 0 && dmgToHero > 0) {
        const ref = Math.floor(dmgToHero * 0.08 * sp);
        if (ref > 0) {
          src.hp = Math.max(0, src.hp - ref);
          this.pushCombatFloat({
            unitId: src.id,
            kind: "damage",
            amount: ref,
            crit: false,
            targetIsPlayer: false,
          });
        }
      }
    }
    if (canProc && !opts?.suppressLifesteal && src.lifesteal > 0) {
      const ls = roundToCombatDecimals((dmg * src.lifesteal) / 100);
      if (ls > 0) {
        const h0 = src.hp;
        const erStacks = src.isPlayer ? (src.artifacts["escudo_residual"] ?? 0) : 0;
        const erCap =
          erStacks > 0 && h0 >= src.maxHp
            ? this.escudoResidualCapFromStacks(erStacks)
            : 0;
        if (erCap > 0) {
          const tagged = src.escudoResidualTagged ?? 0;
          const room = Math.max(0, erCap - tagged);
          const add = Math.min(ls, room);
          if (add > 0) {
            src.shieldGGBlue = roundToCombatDecimals(src.shieldGGBlue + add);
            src.escudoResidualTagged = roundToCombatDecimals(tagged + add);
            this.pushCombatFloat({
              unitId: src.id,
              kind: "shield_gain",
              amount: add,
              targetIsPlayer: src.isPlayer,
              floatHex: { q: src.q, r: src.r },
            });
          }
        } else {
          src.hp = Math.min(src.maxHp, src.hp + ls);
          const g = src.hp - h0;
          if (g > 0) {
            this.pushCombatFloat({
              unitId: src.id,
              kind: "heal",
              amount: g,
            });
            this.applySedaVampiraSplash(src, g);
          }
        }
      }
    }
    if (mit > 0 && (dmgToHero > 0 || shieldAbsorb > 0) && tgt !== src) {
      if (dmgToHero > 0) {
        this.pushCombatFloat({
          unitId: tgt.id,
          kind: "damage",
          amount: dmgToHero,
          crit: useCrit,
          targetIsPlayer: tgt.isPlayer,
          sourceClass: src.isPlayer ? src.heroClass : undefined,
          suppressSourceHitSfx:
            opts?.suppressSourceHitSfx ??
            (!!src.isPlayer &&
              !!src.heroClass &&
              fromBasicAttack &&
              (src.heroClass === "pistoleiro" ||
                src.heroClass === "sacerdotisa")),
          duelCut: !!this.duel && tgt !== src,
          floatHex: { q: tgt.q, r: tgt.r },
        });
      }
      if (shieldAbsorb > 0) {
        this.pushCombatFloat({
          unitId: tgt.id,
          kind: "shield_absorb",
          amount: shieldAbsorb,
          targetIsPlayer: tgt.isPlayer,
          floatHex: { q: tgt.q, r: tgt.r },
        });
      }
    }
    if (
      !src.isPlayer &&
      tgt.isPlayer &&
      mit > 0 &&
      tgt !== src &&
      (shieldAbsorb > 0 || bunkerAbsorbed > 0 || dmgToHero > 0)
    ) {
      this.pendingCombatVfxQueue.push({
        kind: "enemy_strike",
        attackerId: src.id,
        targetId: tgt.id,
        archetypeId: src.enemyArchetypeId ?? undefined,
      });
    }
    if (
      src.isPlayer &&
      src.heroClass &&
      !tgt.isPlayer &&
      tgt !== src &&
      mit > 0 &&
      (dmg > 0 || shieldAbsorb > 0)
    ) {
      this.applyPoison(src, tgt);
      if (!opts?.fromCometaArcano) {
        this.applyLabareda(src, tgt);
      }
    }
    if (tgt === src) {
      this.onDeaths();
      return dmgToHero;
    }
    if (
      canProc &&
      src.heroClass === "pistoleiro" &&
      !tgt.isPlayer &&
      mit > 0 &&
      (dmg > 0 || shieldAbsorb > 0)
    ) {
      src.pistoleiroBonusDanoWave += pistoleiroPassiveBonusPerProc(src.level);
      this.addWeaponUltHitCharge(src);
    }
    if (
      tgt.isPlayer &&
      tgt.heroClass === "gladiador" &&
      !src.isPlayer &&
      mit > 0 &&
      tgt !== src &&
      (dmgToHero > 0 || shieldAbsorb > 0) &&
      (tgt.furiaGiganteTurns ?? 0) <= 0
    ) {
      this.addWeaponUltTakenCharge(tgt, dmgToHero + shieldAbsorb);
    }
    if (!tgt.isPlayer && wasAlive && tgt.hp <= 0) {
      this.onEnemyKilled(src.isPlayer ? src : null, tgt);
      if (src.ultimateId === "rainha_desespero" && src.heroClass === "sacerdotisa") {
        this.addHeroOuroWithMetaBonus(src, 5);
      }
    }
    if (src.hp > 0 && src.hp <= src.maxHp * 0.5) {
      const im = src.artifacts["imortal"] ?? 0;
      if (im > 0) {
        const add = Math.floor(src.regenVida * im * 0.5);
        if (add > 0) {
          const h0 = src.hp;
          src.hp = Math.min(src.maxHp, src.hp + add);
          const g = src.hp - h0;
          if (g > 0) {
            this.pushCombatFloat({
              unitId: src.id,
              kind: "heal",
              amount: g,
            });
            this.applyCurandeiroBatalhaFromHeal(src);
          }
        }
      }
    }
    this.onDeaths();
    return dmgToHero;
  }

  private onEnemyKilled(killer: Unit | null, victim: Unit): void {
    const deathBio = biomeAt(this.grid, victim.q, victim.r) as BiomeId;
    const biomeHeroes = this.heroesHavingChosenBiome(deathBio);
    const lootHero =
      killer?.isPlayer ? killer : (biomeHeroes[0] ?? null);

    if (killer?.isPlayer && killer.heroClass === "gladiador") {
      killer.gladiadorKills++;
      if (killer.ultimateId === "campeao") {
        const add = Math.floor(killer.maxHp * 0.1);
        killer.maxHp += add;
        killer.hp += add;
        if (add > 0) {
          this.pushCombatFloat({
            unitId: killer.id,
            kind: "heal",
            amount: add,
          });
          this.applyCurandeiroBatalhaFromHeal(killer);
        }
      }
    }
    const aid = victim.enemyArchetypeId ?? "gladinio";
    const archDef = getEnemyArchetype(aid);
    const rawXp =
      victim.enemyXpReward ??
      archDef?.xpReward ??
      ENEMY_BY_ID["gladinio"]!.xpReward;
    const xpScale = killXpScaleForParty(this.partyOrder.length);
    const baseXp = Math.max(0, Math.floor(rawXp * xpScale));
    const xpRecipients = this.grantKillXpToBiomeOwners(
      victim,
      baseXp,
      killer,
    );
    for (const h of xpRecipients) {
      if (this.killLevelUpFlushSuppressed) {
        this.pendingKillLevelUpFlushHeroIds.add(h.id);
      } else {
        this.flushCombatLevelUp(h);
      }
    }
    if (killer?.isPlayer) {
      const fo = killer.artifacts["furacao_ouro"] ?? 0;
      if (fo > 0) this.addHeroOuroWithMetaBonus(killer, 5 * fo);
    }
    if (lootHero) {
      const dropChance = this.crystalDropChanceForKill(lootHero, victim);
      if (victim.enemyGuaranteeCrystal || Math.random() < dropChance) {
        const cx = Math.min(4, lootHero.artifacts["crystal_extra"] ?? 0);
        const n = 1 + cx;
        this.crystalsRun += n;
        this.waveCrystalsGained += n;
        this.log(n > 1 ? `${n} cristais obtidos!` : "Cristal obtido!");
      }
    }
    const essId = biomeToEssenceId(deathBio);
    if (essId && lootHero) {
      const essPct = essenceDropTotalPercent(
        this.wave,
        this.effectiveSorte(lootHero),
      );
      let nEss = resolveEssenceDropCount(essPct);
      if (victim.enemyGrantsBossEssence) nEss = Math.max(1, nEss);
      if (nEss > 0) {
        this.meta.essences[essId] = (this.meta.essences[essId] ?? 0) + nEss;
        this.waveEssencesGained[essId] =
          (this.waveEssencesGained[essId] ?? 0) + nEss;
        this.saveMeta();
        this.log(
          nEss > 1
            ? `${nEss}× ${FORGE_ESSENCE_LABELS[essId]} obtidas!`
            : `${FORGE_ESSENCE_LABELS[essId]} obtida!`,
        );
      }
    }
    if (killer?.isPlayer) {
      const pv = Math.min(12, killer.artifacts["pulso_verde"] ?? 0);
      if (pv > 0) {
        const healEach = 5 * pv;
        for (const ally of this.getParty()) {
          if (ally.hp <= 0) continue;
          const h0 = ally.hp;
          ally.hp = Math.min(ally.maxHp, ally.hp + healEach);
          const g = ally.hp - h0;
          if (g > 0) {
            this.pushCombatFloat({
              unitId: ally.id,
              kind: "heal",
              amount: g,
            });
            this.applyCurandeiroBatalhaFromHeal(killer);
          }
        }
      }
      this.applyGolpeRelampagoAfterKill(killer, victim);
    }
  }

  /** Heróis vivos cuja escolha de bioma na run coincide com `bioma`. */
  private heroesHavingChosenBiome(biome: BiomeId): Unit[] {
    if (biome === "hub") return [];
    return this.getParty().filter(
      (hero) => hero.hp > 0 && this.heroHomeBiome(hero) === biome,
    );
  }

  /**
   * XP pelo bioma de spawn do inimigo: repartida entre donos vivos desse bioma.
   * Se todos os donos estiverem mortos, cada um recebe XP integral e o assassino herói também (se for outro).
   * Retorna heróis que receberam XP (>0) para poder correr level-up (ex.: dono do bioma quando outro mata).
   */
  private grantKillXpToBiomeOwners(
    victim: Unit,
    baseXp: number,
    killerForFallback: Unit | null,
  ): Unit[] {
    const recipients: Unit[] = [];
    if (baseXp <= 0) return recipients;
    const bio =
      victim.enemySpawnBiome && victim.enemySpawnBiome !== "hub"
        ? victim.enemySpawnBiome
        : (biomeAt(this.grid, victim.q, victim.r) as BiomeId);
    if (bio === "hub") {
      if (killerForFallback?.isPlayer) {
        this.grantXp(killerForFallback, baseXp);
        recipients.push(killerForFallback);
      }
      return recipients;
    }

    const ownersAll = this.partyHeroesWithChosenBiomeAll(bio);
    const ownersAlive = ownersAll.filter((h) => h.hp > 0);

    if (ownersAlive.length > 0) {
      const n = ownersAlive.length;
      let share = Math.floor(baseXp / n);
      let rem = baseXp - share * n;
      for (const h of ownersAlive) {
        let add = share;
        if (rem > 0) {
          add++;
          rem--;
        }
        if (add > 0) {
          this.grantXp(h, add);
          recipients.push(h);
        }
      }
      return recipients;
    }

    for (const h of ownersAll) {
      this.grantXp(h, baseXp);
      recipients.push(h);
    }
    const killer =
      killerForFallback?.isPlayer && killerForFallback.hp > 0
        ? killerForFallback
        : null;
    if (killer && !ownersAll.some((o) => o.id === killer.id)) {
      this.grantXp(killer, baseXp);
      recipients.push(killer);
    }
    return recipients;
  }

  /** Chance 0–1 de cristal ao matar (sorte do assassino + meta + ultimate). */
  crystalDropChanceForKill(killer: Unit, victim: Unit): number {
    if (victim.enemyGuaranteeCrystal) return 1;
    const aid = victim.enemyArchetypeId ?? "gladinio";
    const archDef = getEnemyArchetype(aid);
    const base =
      victim.enemyCrystalBase ??
      archDef?.crystalDropChance ??
      ENEMY_BY_ID["gladinio"]!.crystalDropChance;
    let dropChance =
      base +
      this.effectiveSorte(killer) * 0.01 +
      (this.meta.permCrystalDrop / 100) * 0.15;
    if (killer.ultimateId === "estrategista_nato") {
      dropChance = Math.min(1, dropChance * 2);
    }
    const fc = Math.min(10, killer.artifacts["fio_cruel"] ?? 0);
    dropChance += 0.03 * fc;
    return Math.min(1, dropChance);
  }

  /** Chance total de essência (wave + sorte), pode passar de 100%. */
  essenceDropTotalPercentForKill(killer: Unit): number {
    return essenceDropTotalPercent(this.wave, this.effectiveSorte(killer));
  }

  /**
   * Golpe Relâmpago: inimigo vivo mais próximo no mesmo bioma do herói (hex atual).
   * No hub, contam todos os inimigos (como Seda vampira).
   */
  private nearestEnemyToInHeroBiome(hero: Unit, excludeId: string): Unit | null {
    const heroBio = biomeAt(this.grid, hero.q, hero.r) as BiomeId;
    let best: Unit | null = null;
    let d = Infinity;
    for (const e of this.enemies()) {
      if (e.id === excludeId || e.hp <= 0) continue;
      if (heroBio !== "hub") {
        const eb = biomeAt(this.grid, e.q, e.r) as BiomeId;
        if (eb !== heroBio) continue;
      }
      const dist = hexDistance({ q: hero.q, r: hero.r }, { q: e.q, r: e.r });
      if (dist < d) {
        d = dist;
        best = e;
      }
    }
    return best;
  }

  /**
   * Golpe Relâmpago (motor_morte): após eliminar, anima salto ao vizinho do alvo no bioma,
   * depois o básico bónus (projétil ou corpo a corpo); se matar, pode encadear.
   * Se após o salto ainda não houver alcance, mantém só o bônus no próximo básico manual.
   */
  private applyGolpeRelampagoAfterKill(killer: Unit, victim: Unit): void {
    if (this.phase !== "combat" || this.duel) return;
    const motor = killer.artifacts["motor_morte"] ?? 0;
    if (motor <= 0 || killer.hp <= 0) return;
    const near = this.nearestEnemyToInHeroBiome(killer, victim.id);
    if (!near) return;

    const fromQ = killer.q;
    const fromR = killer.r;
    const jump = this.nearestFreeHexAdjacentToUnit(killer, near);
    if (jump) {
      killer.q = jump.q;
      killer.r = jump.r;
    }

    const movedOnMap =
      jump != null && (killer.q !== fromQ || killer.r !== fromR);
    const alc = this.effectiveAlcanceForHero(killer);
    const distToTarget = hexDistance(
      { q: killer.q, r: killer.r },
      { q: near.q, r: near.r },
    );
    const bonusPct = 10 * motor;

    if (distToTarget > alc) {
      killer.motorMorteNextBasicPct = bonusPct;
      if (movedOnMap) {
        if (!getSkipCombatAnimations()) {
          this.pendingMoveAnim = {
            unitId: killer.id,
            cells: [
              { q: fromQ, r: fromR },
              { q: killer.q, r: killer.r },
            ],
            segmentMs: GOLPE_RELAMPAGO_MOVE_MS,
            playHeroRunAnim: true,
          };
        }
        this.pendingCombatVfxQueue.push({
          kind: "golpe_relampago_teleport",
          heroId: killer.id,
        });
        this.pendingCombatVfxQueue.push({
          kind: "golpe_relampago_hero_charge",
          heroId: killer.id,
        });
      }
      this.emit();
      return;
    }

    let delayBeforeStrike = getSkipCombatAnimations()
      ? 0
      : GOLPE_RELAMPAGO_WINDUP_MS;
    if (movedOnMap) {
      if (!getSkipCombatAnimations()) {
        this.pendingMoveAnim = {
          unitId: killer.id,
          cells: [
            { q: fromQ, r: fromR },
            { q: killer.q, r: killer.r },
          ],
          segmentMs: GOLPE_RELAMPAGO_MOVE_MS,
          playHeroRunAnim: true,
        };
        delayBeforeStrike = GOLPE_RELAMPAGO_MOVE_MS;
      }
      this.pendingCombatVfxQueue.push({
        kind: "golpe_relampago_teleport",
        heroId: killer.id,
      });
    }
    this.pendingCombatVfxQueue.push({
      kind: "golpe_relampago_hero_charge",
      heroId: killer.id,
    });

    this.emit();
    this.queueCombat(delayBeforeStrike, () => {
      this.executeGolpeRelampagoBonusStrike(killer.id, near.id, bonusPct);
    });
  }

  /**
   * Básico bónus do Golpe Relâmpago após o salto (ou windup): alinhado a VFX de ataque básico.
   */
  private executeGolpeRelampagoBonusStrike(
    killerId: string,
    targetId: string,
    bonusPct: number,
  ): void {
    const att = this.units.find((u) => u.id === killerId);
    const tgt = this.units.find((u) => u.id === targetId);
    if (
      !att ||
      !tgt ||
      att.hp <= 0 ||
      tgt.isPlayer ||
      tgt.hp <= 0 ||
      this.phase !== "combat" ||
      this.duel
    ) {
      this.emit();
      return;
    }

    const applyDamage = (): void => {
      const a = this.units.find((u) => u.id === killerId);
      const t = this.units.find((u) => u.id === targetId);
      if (
        !a ||
        !t ||
        a.hp <= 0 ||
        t.isPlayer ||
        t.hp <= 0 ||
        this.phase !== "combat" ||
        this.duel
      ) {
        this.emit();
        return;
      }
      a.motorMorteNextBasicPct = bonusPct;
      const raw = this.computeBasicAttackRawDamage(a);
      a.motorMorteNextBasicPct = 0;
      this.strike(a, t, raw);
      this.flushCombatLevelUp(a);
      if (this.phase === "combat") {
        this.tryResolveWaveClearAfterCombatResume();
      }
      this.emit();
    };

    const skipFx = getSkipCombatAnimations();
    if (att.heroClass === "pistoleiro") {
      const dly = skipFx ? 0 : heroBasicShootDamageDelayMs();
      const fl = skipFx ? BASIC_PISTOL_FLIGHT_MS : dly;
      this.pendingCombatVfxQueue.push({
        kind: "basic_projectile",
        fromId: att.id,
        toId: tgt.id,
        style: "bullet",
        flightMs: fl,
      });
      this.pendingCombatVfxQueue.push({
        kind: "golpe_relampago_lightning",
        heroId: att.id,
        targetId: tgt.id,
        delayMs: dly,
      });
      this.queueCombat(dly, applyDamage);
      this.emit();
      return;
    }
    if (att.heroClass === "sacerdotisa") {
      const dly = skipFx ? 0 : heroBasicMagicDamageDelayMs();
      const fl = skipFx ? BASIC_MAGIC_FLIGHT_MS : dly;
      this.pendingCombatVfxQueue.push({
        kind: "basic_projectile",
        fromId: att.id,
        toId: tgt.id,
        style: "magic",
        flightMs: fl,
      });
      this.pendingCombatVfxQueue.push({
        kind: "golpe_relampago_lightning",
        heroId: att.id,
        targetId: tgt.id,
        delayMs: dly,
      });
      this.queueCombat(dly, applyDamage);
      this.emit();
      return;
    }
    if (!skipFx) {
      this.pendingCombatVfxQueue.push({
        kind: "hero_basic_melee",
        heroId: att.id,
        targetId: tgt.id,
      });
    }
    const mel = skipFx ? 0 : heroBasicMeleeDamageDelayMs();
    this.pendingCombatVfxQueue.push({
      kind: "golpe_relampago_lightning",
      heroId: att.id,
      targetId: tgt.id,
      delayMs: mel,
    });
    this.queueCombat(mel, applyDamage);
    this.emit();
  }

  /** Alcance total acima do snapshot inicial da run (artefatos, loja, forja já no baseline). */
  private heroBonusAlcanceNaRun(u: Unit): number {
    const base = u.statBaseline?.alcance ?? u.alcance;
    return Math.max(0, u.alcance - base);
  }

  /** Amplicador de onda: +N instâncias em efeitos de dano por instância deste herói. */
  private amplicadorOndaExtraInstances(att: Unit): number {
    const s = Math.min(3, Math.max(0, att.artifacts["muralha_verdade"] ?? 0));
    if (s <= 0) return 0;
    return AMPLICADOR_EXTRA_DOT_INSTANCES[s - 1]!;
  }

  /** Dobra temporal: +consumo/tick de instâncias de dano (soma da party). */
  private partyDobraTemporalExtraDotConsume(): number {
    let sum = 0;
    for (const h of this.getParty()) {
      if (h.hp <= 0) continue;
      sum += Math.min(5, h.artifacts["manto_espectral"] ?? 0);
    }
    return sum;
  }

  private dotDamageInstancesConsumedPerTick(u: Unit): number {
    const base = Math.max(1, Math.floor(u.dotConsumePerTick ?? 1));
    return base + this.partyDobraTemporalExtraDotConsume();
  }

  private dotHealInstancesConsumedPerTick(u: Unit): number {
    return Math.max(1, Math.floor(u.dotConsumePerTick ?? 1));
  }

  /** Mãos venenosas: instâncias de veneno (3×acúmulos); +extra do Amplicador de onda. */
  private applyPoison(att: Unit, tgt: Unit): void {
    const s = att.artifacts["maos_venenosas"] ?? 0;
    if (s <= 0) return;
    const dmg = 3 * s;
    const n = 2 + this.amplicadorOndaExtraInstances(att);
    const add = Array.from({ length: n }, () => dmg);
    const cur = tgt.poison?.instances ?? [];
    tgt.poison = { instances: [...cur, ...add], sourceId: att.id };
  }

  /**
   * Labareda: a cada dano a inimigo, aplica instâncias de queimadura em inimigos
   * a 1..(1 + alcance extra na run) hexes do alvo principal. Bloqueia regen natural no tick.
   */
  private applyLabareda(att: Unit, tgt: Unit): void {
    const stacks = Math.min(6, Math.max(0, att.artifacts["escama_leve"] ?? 0));
    if (stacks <= 0) return;
    const dmg = LABAREDA_DMG_BY_STACK[stacks - 1]!;
    const nInst = LABAREDA_INSTANCES_BY_STACK[stacks - 1]!;
    const maxRing = 1 + this.heroBonusAlcanceNaRun(att);
    for (const e of this.enemies()) {
      if (e.hp <= 0 || e.id === tgt.id) continue;
      const d = hexDistance({ q: tgt.q, r: tgt.r }, { q: e.q, r: e.r });
      if (d < 1 || d > maxRing) continue;
      const add = Array.from({ length: nInst }, () => dmg);
      const cur = e.burn?.instances ?? [];
      e.burn = { instances: [...cur, ...add], sourceId: att.id };
    }
  }

  /**
   * Seda vampira: só em cura por roubo de vida. % da cura em HP vira dano bruto em inimigos do mesmo bioma
   * (20% × acúmulos, máx. 10). O dano usa `suppressLifesteal` para não gerar novo roubo de vida.
   * No hex “hub” (castelo), o bioma do herói não coincide com os setores — contam-se todos os inimigos.
   */
  private applySedaVampiraSplash(hero: Unit, healHp: number): void {
    if (!hero.isPlayer || healHp <= 0) return;
    const s = Math.min(10, hero.artifacts["seda_vampira"] ?? 0);
    if (s <= 0) return;
    const rawSplash = roundToCombatDecimals(healHp * 0.2 * s);
    if (rawSplash <= 0) return;
    const heroBio = biomeAt(this.grid, hero.q, hero.r) as BiomeId;
    for (const e of this.enemies()) {
      if (e.hp <= 0) continue;
      const eb = biomeAt(this.grid, e.q, e.r) as BiomeId;
      if (heroBio !== "hub" && eb !== heroBio) continue;
      this.dealDamage(hero, e, rawSplash, false, false, false, {
        suppressLifesteal: true,
      });
    }
  }

  /** Consome a parcela “marcada” do escudo quando o escudo azul absorve dano. */
  private reduceEscudoResidualTagged(u: Unit, shieldAbsorbed: number): void {
    if (shieldAbsorbed <= 0) return;
    const t = u.escudoResidualTagged ?? 0;
    if (t <= 0) return;
    u.escudoResidualTagged = roundToCombatDecimals(
      Math.max(0, t - Math.min(shieldAbsorbed, t)),
    );
  }

  /** Teto do escudo gerado pelo artefato Escudo residual (0 se sem acúmulos). */
  private escudoResidualCapFromStacks(stacks: number): number {
    const s = Math.min(6, Math.max(0, Math.floor(stacks)));
    if (s <= 0) return 0;
    return ESCUDO_RESIDUAL_CAP_BY_STACK[s - 1]!;
  }

  /**
   * Curandeiro de batalha: +2 dano na wave por acúmulo quando o herói cura aliado ou a si.
   * Usar em `healUnit` e em curas explícitas de artefatos (não roubo de vida).
   */
  private applyCurandeiroBatalhaFromHeal(healer: Unit): void {
    if (!healer.isPlayer) return;
    const cb = healer.artifacts["curandeiro_batalha"] ?? 0;
    if (cb <= 0) return;
    healer.curandeiroDanoWave += 2 * cb;
  }

  private healUnit(
    target: Unit,
    base: number,
    src: Unit,
    opts?: {
      overflowToShieldHalf?: boolean;
      overflowShieldRatio?: number;
      skipWeaponUltMeter?: boolean;
      /** `base` já inclui potencial de cura (ex. Sentença). */
      effectiveHealIncludesPotencial?: boolean;
    },
  ): void {
    if (target.hp <= 0) return;
    const pct = 1 + src.potencialCuraEscudo / 100;
    const amt = opts?.effectiveHealIncludesPotencial
      ? roundToCombatDecimals(base)
      : roundToCombatDecimals(base * pct);
    const shieldRatio = opts?.overflowShieldRatio ?? 0.5;
    if (opts?.overflowToShieldHalf) {
      const space = Math.max(0, target.maxHp - target.hp);
      const toHp = Math.min(space, amt);
      if (toHp > 0) {
        target.hp += toHp;
        this.pushCombatFloat({
          unitId: target.id,
          kind: "heal",
          amount: toHp,
        });
        this.addWeaponUltHealCharge(src, toHp, opts?.skipWeaponUltMeter);
      }
      const over = amt - toHp;
      if (over > 0) {
        const sh =
          opts?.effectiveHealIncludesPotencial && space <= 0
            ? roundToCombatDecimals(
                this.tooltipPreviewSentencaHealEffective(src) * shieldRatio,
              )
            : roundToCombatDecimals(over * shieldRatio);
        if (sh > 0) {
          target.shieldGGBlue += sh;
          this.pushCombatFloat({
            unitId: target.id,
            kind: "shield_gain",
            amount: sh,
          });
          this.addWeaponUltHealCharge(src, sh, opts?.skipWeaponUltMeter);
        }
      }
    } else {
      const h0 = target.hp;
      target.hp = Math.min(target.maxHp, target.hp + amt);
      const g = target.hp - h0;
      if (g > 0) {
        this.pushCombatFloat({
          unitId: target.id,
          kind: "heal",
          amount: g,
        });
        this.addWeaponUltHealCharge(src, g, opts?.skipWeaponUltMeter);
      }
    }
    this.applyCurandeiroBatalhaFromHeal(src);
  }

  /** Carga da ultimate da arma: PV curados e escudo aplicado por `healUnit` (ex. Sentença). */
  private addWeaponUltHealCharge(
    src: Unit,
    amount: number,
    skip?: boolean,
  ): void {
    if (skip || !src.isPlayer || src.heroClass !== "sacerdotisa") return;
    if (amount <= 0) return;
    const th = weaponUltThreshold("sacerdotisa");
    src.weaponUltHealAcc = (src.weaponUltHealAcc ?? 0) + amount;
    src.weaponUltMeter = Math.min(1, (src.weaponUltHealAcc ?? 0) / th);
  }

  private addWeaponUltHitCharge(att: Unit): void {
    if (!att.isPlayer || att.heroClass !== "pistoleiro") return;
    const th = weaponUltThreshold("pistoleiro");
    att.weaponUltHitAcc = (att.weaponUltHitAcc ?? 0) + 1;
    att.weaponUltMeter = Math.min(1, (att.weaponUltHitAcc ?? 0) / th);
  }

  private addWeaponUltTakenCharge(tgt: Unit, amount: number): void {
    if (!tgt.isPlayer || tgt.heroClass !== "gladiador") return;
    if (amount <= 0) return;
    const th = weaponUltThreshold("gladiador");
    tgt.weaponUltTakenAcc = (tgt.weaponUltTakenAcc ?? 0) + amount;
    tgt.weaponUltMeter = Math.min(1, (tgt.weaponUltTakenAcc ?? 0) / th);
  }

  private resetWeaponUltCharge(h: Unit): void {
    h.weaponUltMeter = 0;
    h.weaponUltHealAcc = 0;
    h.weaponUltHitAcc = 0;
    h.weaponUltTakenAcc = 0;
  }

  tryWeaponUltimate(): boolean {
    const h = this.currentHero();
    if (!h || h.hp <= 0 || this.phase !== "combat") return false;
    if (!this.sandboxNoCdUltEnabled() && h.weaponUltMeter < 1) return false;
    if (h.heroClass === "sacerdotisa") return this.castParaisoNaTerra(h);
    if (h.heroClass === "pistoleiro") return this.castFuracaoBalas(h);
    if (h.heroClass === "gladiador") return this.castFuriaGigante(h);
    return false;
  }

  private castParaisoNaTerra(h: Unit): boolean {
    const w = h.weaponLevel;
    const flat = paraisoShieldFlat(w);
    const mm = paraisoManaShieldMult(w);
    const regTick = paraisoRegenBonus(w);
    const regT = paraisoRegenTurns(w);
    const potMult = 1 + h.potencialCuraEscudo / 100;
    const perHp = roundToCombatDecimals(regTick * potMult);
    const perMana = roundToCombatDecimals(regTick * potMult);
    for (const ally of this.getParty()) {
      if (ally.hp <= 0) continue;
      const shieldRaw = flat + ally.maxMana * mm;
      ally.shieldGGBlue += roundToCombatDecimals(shieldRaw * potMult);
      const hotAdd = Array.from({ length: regT }, () => perHp);
      const curH = ally.hot?.instances ?? [];
      ally.hot = { instances: [...curH, ...hotAdd], sourceId: h.id };
      ally.paraisoRegenBonus = {
        turns: regT,
        bonusMana: perMana,
      };
    }
    if (!this.sandboxNoCdUltEnabled()) this.resetWeaponUltCharge(h);
    this.log(`${h.name}: Paraíso na terra!`);
    this.emit();
    return true;
  }

  private castFuracaoBalas(h: Unit): boolean {
    const mult = furacaoDamageMult(h.weaponLevel);
    const base =
      heroDanoPlusRoninOverflow(h) +
      h.pistoleiroBonusDanoWave +
      h.curandeiroDanoWave;
    const raw = roundToCombatDecimals(base * mult);
    const targets = [...this.enemies()].filter((e) => e.hp > 0);
    const targetIds = targets.map((t) => t.id);
    this.pendingCombatVfxQueue.push({
      kind: "weapon_ult_furacao",
      heroId: h.id,
      targetIds,
    });
    if (!this.sandboxNoCdUltEnabled()) this.resetWeaponUltCharge(h);
    this.killLevelUpFlushSuppressed = true;
    this.pendingKillLevelUpFlushHeroIds.clear();
    this.log(`${h.name}: Furacão de balas!`);

    targets.forEach((e, i) => {
      const enemyId = e.id;
      const delay = FURACAO_ULT_FIRST_DAMAGE_MS + i * FURACAO_ULT_STAGGER_MS;
      this.queueCombat(delay, () => {
        const att = this.units.find((u) => u.id === h.id);
        const tg = this.units.find((u) => u.id === enemyId);
        if (!att || !tg || tg.hp <= 0 || this.phase !== "combat") return;
        const crit = rollCrit(att.acertoCritico + roninCritBonus(att));
        const skillCritOut = { value: false };
        const dealt = this.dealDamage(att, tg, raw, crit, true, false, {
          suppressSourceHitSfx: true,
          skillCritOut,
        });
        const lm = (att.artifacts["lamina_magica"] ?? 0) > 0;
        const bleedFromUltCrit = lm ? skillCritOut.value : crit;
        if (bleedFromUltCrit && dealt > 0 && tg.hp > 0) {
          const T = furacaoBleedTurns(att.weaponLevel);
          const pct = furacaoBleedPct(att.weaponLevel);
          const total = Math.max(1, roundToCombatDecimals(dealt * pct));
          const per = Math.max(0.01, roundToCombatDecimals(total / T));
          const extra = this.amplicadorOndaExtraInstances(att);
          const add = Array.from({ length: T + extra }, () => per);
          const cur = tg.bleed?.instances ?? [];
          tg.bleed = { instances: [...cur, ...add], sourceId: att.id };
        }
        this.emit();
      });
    });

    const last =
      targets.length === 0
        ? 0
        : FURACAO_ULT_FIRST_DAMAGE_MS +
          (targets.length - 1) * FURACAO_ULT_STAGGER_MS;
    const tailMs = last + FURACAO_ULT_TAIL_BUFFER_MS;
    this.queueCombat(tailMs, () => {
      this.drainDeferredKillLevelUpQueue();
      if (this.phase === "combat") {
        this.tryResolveWaveClearAfterCombatResume();
      }
      this.emit();
    });
    this.emit();
    return true;
  }

  private castFuriaGigante(h: Unit): boolean {
    if (h.furiaGiganteTurns && h.furiaGiganteTurns > 0) return false;
    h.furiaSavedDano = h.dano;
    const extra = roundToCombatDecimals(h.maxHp * 0.5);
    h.furiaExtraMaxHp = extra;
    h.maxHp += extra;
    h.hp += extra;
    h.dano = Math.max(0.01, roundToCombatDecimals(h.maxHp * 0.1));
    h.furiaGiganteTurns = 3;
    if (!this.sandboxNoCdUltEnabled()) this.resetWeaponUltCharge(h);
    this.log(`${h.name}: Fúria do gigante!`);
    this.emit();
    return true;
  }

  private endFuriaGigante(h: Unit): void {
    const extra = h.furiaExtraMaxHp ?? 0;
    if (extra > 0) {
      h.maxHp -= extra;
      h.hp = Math.min(h.hp, h.maxHp);
    }
    if (h.furiaSavedDano != null) h.dano = h.furiaSavedDano;
    h.furiaGiganteTurns = undefined;
    h.furiaExtraMaxHp = undefined;
    h.furiaSavedDano = undefined;
    h.skillCd["pisotear"] = 0;
    this.log(`${h.name}: Fúria do gigante termina.`);
    this.emit();
  }

  private syncGladiadorDuelPassiveHp(u: Unit): void {
    const wins = u.gladiadorDuelWins ?? 0;
    if (wins <= 0) return;
    const per = gladiadorDuelHpPerWin(u.level);
    const target = wins * per;
    const prev = u.gladiadorDuelHpGranted ?? 0;
    const diff = target - prev;
    if (diff !== 0) {
      u.maxHp += diff;
      u.hp += diff;
      u.gladiadorDuelHpGranted = target;
    }
  }

  private syncWeaponPassivesOnLevelUp(u: Unit): void {
    if (u.heroClass === "sacerdotisa") {
      const target = priestPassivePotencialPoints(u.level);
      const prev = u.priestPassivePotencialSnapshot ?? 0;
      u.potencialCuraEscudo += target - prev;
      u.priestPassivePotencialSnapshot = target;
    }
    if (u.heroClass === "gladiador") {
      this.syncGladiadorDuelPassiveHp(u);
    }
  }

  /**
   * Onda creptante: cada instância de dano/cura pode critar; +0,1 ao mult. de crítico por acúmulo (máx. 6).
   */
  private applyOndaCreptanteInstanceCrit(
    base: number,
    sourceId: string | undefined,
  ): { value: number; crit: boolean } {
    if (base <= 0) return { value: base, crit: false };
    if (!sourceId) return { value: base, crit: false };
    const src = this.units.find((x) => x.id === sourceId);
    if (!src?.isPlayer) return { value: base, crit: false };
    const st = Math.min(6, Math.max(0, src.artifacts["olho_agucado"] ?? 0));
    if (st <= 0) return { value: base, crit: false };
    const cr = rollCrit(src.acertoCritico + roninCritBonus(src));
    if (!cr) return { value: base, crit: false };
    const extra = st * 0.1;
    const v = applyCritMultiplier(base, src.danoCritico + extra, true);
    return { value: v, crit: true };
  }

  /**
   * Veneno, queimadura, sangramento e HoT: filas de instâncias.
   * Dano por instância usa consumo base + Dobra temporal (party); HoT só o base.
   */
  private applyPoisonAndHotTick(u: Unit): void {
    if (u.hp <= 0) return;
    const dmgRate = this.dotDamageInstancesConsumedPerTick(u);
    const healRate = this.dotHealInstancesConsumedPerTick(u);

    if (u.poison && u.poison.instances.length > 0) {
      const srcId = u.poison.sourceId;
      let pd = 0;
      const n = Math.min(dmgRate, u.poison.instances.length);
      for (let i = 0; i < n; i++) {
        const base = u.poison.instances.shift()!;
        pd += this.applyOndaCreptanteInstanceCrit(base, srcId).value;
      }
      if (pd > 0) {
        const pdFinal =
          !u.isPlayer && deslumbroInstancesCount(u) > 0
            ? roundToCombatDecimals(pd * 1.5)
            : pd;
        this.pushCombatFloat({
          unitId: u.id,
          kind: "damage",
          amount: pdFinal,
          crit: false,
          targetIsPlayer: u.isPlayer,
          floatHex: { q: u.q, r: u.r },
          poisonDot: true,
        });
        u.hp = Math.max(0, u.hp - pdFinal);
      }
      if (u.poison.instances.length === 0) u.poison = undefined;
    }

    if (u.burn && u.burn.instances.length > 0) {
      const srcId = u.burn.sourceId;
      let fd = 0;
      const n = Math.min(dmgRate, u.burn.instances.length);
      for (let i = 0; i < n; i++) {
        const base = u.burn.instances.shift()!;
        fd += this.applyOndaCreptanteInstanceCrit(base, srcId).value;
      }
      if (fd > 0) {
        const fdFinal =
          !u.isPlayer && deslumbroInstancesCount(u) > 0
            ? roundToCombatDecimals(fd * 1.5)
            : fd;
        this.pushCombatFloat({
          unitId: u.id,
          kind: "damage",
          amount: fdFinal,
          crit: false,
          targetIsPlayer: u.isPlayer,
          floatHex: { q: u.q, r: u.r },
          burnDot: true,
        });
        u.hp = Math.max(0, u.hp - fdFinal);
      }
      if (u.burn.instances.length === 0) u.burn = undefined;
    }

    if (u.hot && u.hot.instances.length > 0 && u.hp > 0) {
      const srcId = u.hot.sourceId;
      let ht = 0;
      const n = Math.min(healRate, u.hot.instances.length);
      for (let i = 0; i < n; i++) {
        const base = u.hot.instances.shift()!;
        ht += this.applyOndaCreptanteInstanceCrit(base, srcId).value;
      }
      if (ht > 0) {
        const h0 = u.hp;
        u.hp = Math.min(u.maxHp, u.hp + ht);
        const g = u.hp - h0;
        if (g > 0) {
          this.pushCombatFloat({
            unitId: u.id,
            kind: "heal",
            amount: g,
            floatHex: { q: u.q, r: u.r },
          });
        }
      }
      if (u.hot.instances.length === 0) u.hot = undefined;
    }

    if (u.bleed && u.bleed.instances.length > 0) {
      const srcId = u.bleed.sourceId;
      let bd = 0;
      const n = Math.min(dmgRate, u.bleed.instances.length);
      for (let i = 0; i < n; i++) {
        const base = u.bleed.instances.shift()!;
        bd += this.applyOndaCreptanteInstanceCrit(base, srcId).value;
      }
      if (bd > 0) {
        const bdFinal =
          !u.isPlayer && deslumbroInstancesCount(u) > 0
            ? roundToCombatDecimals(bd * 1.5)
            : bd;
        this.pushCombatFloat({
          unitId: u.id,
          kind: "damage",
          amount: bdFinal,
          crit: false,
          targetIsPlayer: u.isPlayer,
          floatHex: { q: u.q, r: u.r },
        });
        u.hp = Math.max(0, u.hp - bdFinal);
      }
      if (u.bleed.instances.length === 0) u.bleed = undefined;
    }
  }

  private applyEndTurnEffects(u: Unit): void {
    if (u.hp <= 0) return;
    const bio = biomeAt(this.grid, u.q, u.r) as BiomeId;
    const mana0 = u.mana;
    const hp0 = u.hp;
    const sh0 = u.shieldGGBlue;
    const fd = u.isPlayer ? forgeSynergyTier(u.forgeLoadout, "deserto") : 0;
    const noDesertDrain =
      bio !== "deserto" ||
      unitIgnoresTerrain(u) ||
      (u.isPlayer && fd >= 1);
    const regenMult =
      u.isPlayer && fd >= 2 && bio === "deserto" ? 2 : 1;
    const rulerDesertRegenFlat =
      u.isPlayer && fd >= 1 && (u.artifacts["ruler"] ?? 0) > 0 ? 2 : 0;
    const allyDesertHp = this.desertoAllyRegenExtraHp(u);
    const allyDesertMana = this.desertoAllyRegenExtraMana(u);
    let paraisoMana = 0;
    if (u.paraisoRegenBonus && u.paraisoRegenBonus.turns > 0) {
      paraisoMana = u.paraisoRegenBonus.bonusMana;
      u.paraisoRegenBonus.turns--;
      if (u.paraisoRegenBonus.turns <= 0) u.paraisoRegenBonus = undefined;
    }
    if (noDesertDrain) {
      u.mana = Math.min(
        u.maxMana,
        u.mana +
          Math.floor(u.regenMana * regenMult) +
          paraisoMana +
          allyDesertMana +
          rulerDesertRegenFlat,
      );
    } else {
      const extraMana =
        paraisoMana + allyDesertMana + rulerDesertRegenFlat;
      if (extraMana > 0) {
        u.mana = Math.min(u.maxMana, u.mana + extraMana);
      }
    }
    let rvFromRegen =
      bio === "deserto" && !noDesertDrain ? 0 : u.regenVida;
    if ((u.burn?.instances?.length ?? 0) > 0) rvFromRegen = 0;
    let rv =
      Math.floor(rvFromRegen * regenMult) +
      allyDesertHp +
      rulerDesertRegenFlat;
    const ton = u.artifacts["tonico"] ?? 0;
    if (ton > 0) {
      u.mana = Math.min(u.maxMana, u.mana + Math.floor(rv * 0.5 * ton));
    }
    u.hp = Math.min(u.maxHp, u.hp + rv);
    const manaGain = u.mana - mana0;
    if (manaGain > 0) {
      this.pushCombatFloat({
        unitId: u.id,
        kind: "mana",
        amount: manaGain,
      });
    }
    const healRv = u.hp - hp0;
    if (healRv > 0) {
      this.pushCombatFloat({
        unitId: u.id,
        kind: "heal",
        amount: healRv,
      });
    }
    this.applyPoisonAndHotTick(u);

    if (u.immobileThisTurn) {
      u.defesa += u.artifacts["duro_pedra"] ?? 0;
    }
    const pb = computePartyBonus(this.runColors);
    if (pb.shieldPerTurn > 0) {
      u.shieldGGBlue += pb.shieldPerTurn;
      const sg = u.shieldGGBlue - sh0;
      if (sg > 0) {
        this.pushCombatFloat({
          unitId: u.id,
          kind: "shield_gain",
          amount: sg,
        });
      }
    }
  }

  private onDeaths(): void {
    this.units = this.units.filter((u) => u.isPlayer || u.hp > 0);
    for (const b of this.allBunkerStates()) {
      const bid = b.occupantId;
      if (!bid) continue;
      const occ = this.units.find((u) => u.id === bid);
      if (!occ || occ.hp <= 0) b.occupantId = null;
    }
  }

  /** Herói dentro do bunker com estrutura intacta: inimigos terrestres podem atingir o alvo (dano vai ao bunker). */
  private isBunkerOccupant(u: Unit): boolean {
    const b = this.bunkerAtHex(u.q, u.r);
    return (
      u.isPlayer &&
      !!b &&
      b.hp > 0 &&
      b.occupantId === u.id
    );
  }

  /**
   * Quando o bunker chega a 0 PV, expulsa o ocupante para o hex livre vizinho mais próximo do resto do grupo.
   */
  private catapultHeroOutOfDestroyedBunker(hero: Unit): void {
    const b = this.bunkerForOccupant(hero.id);
    if (!b || b.occupantId !== hero.id) return;
    const dest = this.findBestBunkerEjectHex(hero, b);
    b.occupantId = null;
    if (!dest) {
      this.emit();
      return;
    }
    const fromQ = hero.q;
    const fromR = hero.r;
    hero.q = dest.q;
    hero.r = dest.r;
    if (!getSkipCombatAnimations()) {
      this.pendingMoveAnim = {
        unitId: hero.id,
        cells: [
          { q: fromQ, r: fromR },
          { q: dest.q, r: dest.r },
        ],
        segmentMs: heroRunSegmentMs(),
        playHeroRunAnim: true,
      };
    }
    this.log(`${hero.name} foi arremessado para fora do bunker destruído!`);
    this.emit();
  }

  private findBestBunkerEjectHex(
    hero: Unit,
    b: BunkerState,
  ): { q: number; r: number } | null {
    const allies = this.getParty().filter(
      (u) => u.hp > 0 && u.id !== hero.id,
    );
    const scoreNeighbor = (n: { q: number; r: number }): number => {
      if (!this.grid.has(axialKey(n.q, n.r))) return Infinity;
      const blocked = this.units.some(
        (u) =>
          u.hp > 0 &&
          u.id !== hero.id &&
          u.q === n.q &&
          u.r === n.r,
      );
      if (blocked) return Infinity;
      if (allies.length === 0) return 0;
      return Math.min(
        ...allies.map((a) => hexDistance(n, { q: a.q, r: a.r })),
      );
    };
    const scored = hexNeighbors(b.q, b.r).map((n) => ({
      q: n.q,
      r: n.r,
      s: scoreNeighbor(n),
    }));
    scored.sort((a, b) => a.s - b.s || a.q - b.q || a.r - b.r);
    const pick = scored.find((x) => x.s < Infinity);
    if (pick) return { q: pick.q, r: pick.r };
    for (let ring = 2; ring <= 12; ring++) {
      const pool: { q: number; r: number }[] = [];
      for (const c of this.grid.values()) {
        if (c.biome === "hub") continue;
        if (
          hexDistance({ q: b.q, r: b.r }, { q: c.q, r: c.r }) !== ring
        )
          continue;
        const occ = this.units.some(
          (u) =>
            u.hp > 0 &&
            u.id !== hero.id &&
            u.q === c.q &&
            u.r === c.r,
        );
        if (!occ) pool.push({ q: c.q, r: c.r });
      }
      if (pool.length === 0) continue;
      pool.sort((a, b) => {
        const da =
          allies.length === 0
            ? 0
            : Math.min(
                ...allies.map((al) =>
                  hexDistance(a, { q: al.q, r: al.r }),
                ),
              );
        const db =
          allies.length === 0
            ? 0
            : Math.min(
                ...allies.map((al) =>
                  hexDistance(b, { q: al.q, r: al.r }),
                ),
              );
        return da - db || a.q - b.q || a.r - b.r;
      });
      return pool[0]!;
    }
    return null;
  }

  /**
   * Move o inimigo até ter alcance (se precisar) e agenda ataque + vulcânico
   * só após a animação de movimento no canvas.
   * @returns ms até o fim do movimento (0 se não andou).
   */
  private runEnemyAI(e: Unit): number {
    const tgt = this.pickEnemyHeroTarget(e);
    if (!tgt) return 0;
    const cells: { q: number; r: number }[] = [{ q: e.q, r: e.r }];
    let steps = e.movimento;
    while (steps > 0) {
      const bypassFly = this.isBunkerOccupant(tgt);
      const distNow = hexDistance(
        { q: e.q, r: e.r },
        { q: tgt.q, r: tgt.r },
      );
      const eAlcNow = this.effectiveAlcanceForEnemy(e);
      if (
        !(tgt.flying && !e.flying && !bypassFly) &&
        distNow >= 1 &&
        distNow <= eAlcNow
      ) {
        break;
      }
      const blocked = this.occupiedHexKeysExcluding(e.id);
      this.addBunkerHexForEnemyPath(blocked);
      const path = this.findEnemyApproachPath(e, tgt, blocked);
      if (!path || path.length <= 1) break;
      const next = path[1]!;
      const nk = axialKey(next.q, next.r);
      if (blocked.has(nk)) break;
      e.q = next.q;
      e.r = next.r;
      cells.push({ q: e.q, r: e.r });
      steps--;
    }
    const moveSegs = Math.max(0, cells.length - 1);
    const mult = this.enemyPhaseTimingMult;
    const segMs = UNIT_MOVE_SEGMENT_MS * mult;
    const skipAnim = getSkipCombatAnimations();
    if (cells.length > 1 && !skipAnim) {
      this.pendingMoveAnim = {
        unitId: e.id,
        cells,
        segmentMs: segMs,
      };
    }
    const moveMs = skipAnim ? 0 : moveSegs * segMs;
    const atkWind = skipAnim ? 0 : enemyMeleeAttackWindupMs();
    const hitReact =
      skipAnim || !tgt.isPlayer ? 0 : heroHitReactAnimMs();
    const enemyId = e.id;
    const targetId = tgt.id;
    this.queueCombat(moveMs + atkWind, () => {
      const ex = this.units.find((u) => u.id === enemyId);
      const tgx = this.units.find((u) => u.id === targetId);
      if (!ex || !tgx || ex.hp <= 0 || tgx.hp <= 0 || this.phase !== "combat") {
        if (ex && ex.hp > 0) this.applyVolcanicAtEndOfTurn(ex);
        this.emit();
        return;
      }
      const bypassFly = this.isBunkerOccupant(tgx);
      const dist = hexDistance(
        { q: ex.q, r: ex.r },
        { q: tgx.q, r: tgx.r },
      );
      if (tgx.flying && !ex.flying && !bypassFly) {
        this.applyVolcanicAtEndOfTurn(ex);
        this.emit();
        return;
      }
      const eAlc = this.effectiveAlcanceForEnemy(ex);
      if (dist >= 1 && dist <= eAlc) {
        const crit0 = rollCrit(ex.acertoCritico);
        this.dealDamage(ex, tgx, ex.dano, crit0, true, true);
        if (ex.enemyAttackKind === "aoe1" && ex.hp > 0) {
          for (const ally of this.getParty()) {
            if (ally.hp <= 0 || ally.id === tgx.id) continue;
            const da = hexDistance(
              { q: tgx.q, r: tgx.r },
              { q: ally.q, r: ally.r },
            );
            if (da <= 1) {
              this.dealDamage(
                ex,
                ally,
                ex.dano,
                rollCrit(ex.acertoCritico),
                true,
                true,
              );
            }
          }
        }
      }
      this.applyVolcanicAtEndOfTurn(ex);
      this.emit();
    });
    return moveMs + atkWind + hitReact;
  }

  /** Inimigos não podem entrar no hex dos bunkers (estruturas). */
  private addBunkerHexForEnemyPath(blocked: Set<string>): void {
    for (const b of this.allBunkerStates()) {
      if (b.hp <= 0) continue;
      blocked.add(axialKey(b.q, b.r));
    }
  }

  /** Hexes ocupados por unidades vivas (e lápides de heróis mortos), exceto `unitId`. */
  occupiedHexKeysExcluding(unitId: string): Set<string> {
    const s = new Set<string>();
    for (const u of this.units) {
      if (u.hp <= 0) {
        if (u.isPlayer) s.add(axialKey(u.q, u.r));
        continue;
      }
      if (u.id === unitId) continue;
      s.add(axialKey(u.q, u.r));
    }
    return s;
  }

  /**
   * Caminho até um hex de ataque (1..alcance do alvo), nunca sobre o alvo.
   * Se estiver tudo bloqueado à frente, aproxima o máximo possível do herói (hex alcançável com menor distância).
   */
  private findEnemyApproachPath(
    e: Unit,
    tgt: Unit,
    blocked: Set<string>,
  ): ReturnType<typeof findPath> | null {
    const primary = this.findEnemyApproachPathToAttackRing(e, tgt, blocked);
    if (primary && primary.length > 1) return primary;
    return this.findEnemyApproachPathBestCloser(e, tgt, blocked);
  }

  /** Caminho até um hex válido para atacar o alvo (distância 1..alcance). */
  private findEnemyApproachPathToAttackRing(
    e: Unit,
    tgt: Unit,
    blocked: Set<string>,
  ): ReturnType<typeof findPath> | null {
    const eAlc = this.effectiveAlcanceForEnemy(e);
    const goals: { q: number; r: number }[] = [];
    for (const c of this.grid.values()) {
      const d = hexDistance({ q: c.q, r: c.r }, { q: tgt.q, r: tgt.r });
      if (d < 1 || d > eAlc) continue;
      const k = axialKey(c.q, c.r);
      if (blocked.has(k)) continue;
      goals.push({ q: c.q, r: c.r });
    }
    goals.sort(
      (a, b) =>
        hexDistance(a, { q: e.q, r: e.r }) -
        hexDistance(b, { q: e.q, r: e.r }),
    );
    const maxCost = ENEMY_APPROACH_PATHFIND_MAX;
    const fly = e.flying;
    const ign = unitIgnoresTerrain(e);
    const start = { q: e.q, r: e.r };
    for (const goal of goals) {
      const p = findPath(
        this.grid,
        start,
        goal,
        fly,
        ign,
        maxCost,
        blocked,
      );
      if (p && p.length > 1) return p;
    }
    return null;
  }

  /**
   * Quando não há rota até hex de ataque (filas de inimigos bloqueiam), escolhe o hex alcançável
   * que mais reduz a distância axial ao herói e devolve o caminho até lá.
   */
  private findEnemyApproachPathBestCloser(
    e: Unit,
    tgt: Unit,
    blocked: Set<string>,
  ): ReturnType<typeof findPath> | null {
    const start = { q: e.q, r: e.r };
    const startK = axialKey(start.q, start.r);
    const d0 = hexDistance(start, { q: tgt.q, r: tgt.r });
    const maxCost = ENEMY_APPROACH_PATHFIND_MAX;
    const fly = e.flying;
    const ign = unitIgnoresTerrain(e);
    const costs = reachableHexes(
      this.grid,
      start,
      maxCost,
      fly,
      ign,
      blocked,
    );
    let bestH: { q: number; r: number } | null = null;
    let bestDist = Infinity;
    let bestPathCost = Infinity;
    for (const [k, c] of costs) {
      if (k === startK) continue;
      const [q, r] = k.split(",").map(Number) as [number, number];
      const h = { q: q!, r: r! };
      const dT = hexDistance(h, { q: tgt.q, r: tgt.r });
      if (dT < bestDist || (dT === bestDist && c < bestPathCost)) {
        bestDist = dT;
        bestPathCost = c;
        bestH = h;
      }
    }
    if (!bestH || bestDist >= d0) return null;
    const p = findPath(
      this.grid,
      start,
      bestH,
      fly,
      ign,
      maxCost,
      blocked,
    );
    return p && p.length > 1 ? p : null;
  }

  /** Hex vizinho livre ao alvo, o mais próximo da posição atual do atacante (ex.: Golpe Relâmpago). */
  private nearestFreeHexAdjacentToUnit(
    mover: Unit,
    around: Unit,
  ): { q: number; r: number } | null {
    const occ = this.occupiedHexKeysExcluding(mover.id);
    let best: { q: number; r: number } | null = null;
    let bestD = Infinity;
    for (const n of hexNeighbors(around.q, around.r)) {
      const nk = axialKey(n.q, n.r);
      if (!this.grid.has(nk) || occ.has(nk)) continue;
      const d = hexDistance(n, { q: mover.q, r: mover.r });
      if (d < bestD) {
        bestD = d;
        best = { q: n.q, r: n.r };
      }
    }
    return best;
  }

  /** Bônus total de XP em % (trevo, loja, meta permanente, sinergia de cores), igual ao usado em `grantXp`. */
  xpGainBonusPercentForHero(u: Unit): number {
    const trevo = u.artifacts["trevo"] ?? 0;
    const shopXp = u.artifacts["_xp_shop"] ?? 0;
    return Math.floor(
      25 * trevo +
        shopXp +
        this.meta.permXp +
        this.partyXpBonusPct +
        pantanoHelmoXpBonusPercent(u.forgeLoadout),
    );
  }

  private grantXp(u: Unit, base: number): void {
    const trevo = u.artifacts["trevo"] ?? 0;
    const shopXp = u.artifacts["_xp_shop"] ?? 0;
    const metaXp = this.meta.permXp;
    let mult =
      1 +
      0.25 * trevo +
      shopXp / 100 +
      metaXp / 100 +
      this.partyXpBonusPct / 100 +
      pantanoHelmoXpBonusPercent(u.forgeLoadout) / 100;
    const gained = Math.floor(base * mult);
    this.waveXpGained += gained;
    u.xp += gained;
  }

  /**
   * Agenda level-up após a fila de combate esvaziar e uma pausa extra (cadeias de dano/VFX).
   * `pickArtifact` / `pickUltimate` continuam a usar `checkLevelUp` imediato.
   */
  private flushCombatLevelUp(hero: Unit): void {
    if (!hero.isPlayer || hero.hp <= 0) return;
    this.pendingCombatLevelUpHeroIds.add(hero.id);
    if (this.phase !== "combat") return;
    enqueueCombatOutcome(
      combatOutcomePriority.levelUpAfterCombat,
      "level-up-after-combat",
      () => this.processLevelUpAfterCombatOutcome(),
    );
  }

  /** Espera `combatSchedule` vazio; depois `setTimeout` (não `queueCombat`) para não perder o job no fecho de wave. */
  private processLevelUpAfterCombatOutcome(): void {
    if (this.pendingCombatLevelUpHeroIds.size === 0) return;
    if (this.phase !== "combat") {
      enqueueCombatOutcome(
        combatOutcomePriority.levelUpAfterCombat,
        "level-up-after-combat",
        () => this.processLevelUpAfterCombatOutcome(),
      );
      return;
    }
    if (this.hasPendingCombatSchedule()) {
      enqueueCombatOutcome(
        combatOutcomePriority.levelUpAfterCombat,
        "level-up-after-combat",
        () => this.processLevelUpAfterCombatOutcome(),
      );
      return;
    }
    this.cancelLevelUpFloatHoldTimer();
    this.levelUpFloatHoldTimer = setTimeout(() => {
      this.levelUpFloatHoldTimer = null;
      if (this.phase !== "combat") {
        enqueueCombatOutcome(
          combatOutcomePriority.levelUpAfterCombat,
          "level-up-after-combat",
          () => this.processLevelUpAfterCombatOutcome(),
        );
        return;
      }
      this.pollPendingCombatLevelUp();
    }, POST_COMBAT_FLOAT_LEVEL_UP_UI_DELAY_MS);
  }

  /** Processa heróis pendentes por ordem da party até abrir pick ou esgotar fila. */
  private pollPendingCombatLevelUp(): void {
    if (this.phase !== "combat") return;
    const orderedIds = this.partyOrder.filter((id) =>
      this.pendingCombatLevelUpHeroIds.has(id),
    );
    for (const id of orderedIds) {
      if (this.phase !== "combat") break;
      if (!this.pendingCombatLevelUpHeroIds.has(id)) continue;
      const h = this.units.find((u) => u.id === id);
      if (!h || !h.isPlayer || h.hp <= 0) {
        this.pendingCombatLevelUpHeroIds.delete(id);
        continue;
      }
      const canLevel =
        Number.isFinite(h.xpToNext) &&
        h.xpToNext > 0 &&
        h.xp >= h.xpToNext;
      if (!canLevel) {
        this.pendingCombatLevelUpHeroIds.delete(id);
        continue;
      }
      this.pendingCombatLevelUpHeroIds.delete(id);
      this.checkLevelUp(h);
    }
  }

  checkLevelUp(u: Unit): void {
    if (!u.isPlayer) return;
    if (
      !Number.isFinite(u.xpToNext) ||
      u.xpToNext <= 0 ||
      u.xp < u.xpToNext
    )
      return;
    u.xp -= u.xpToNext;
    u.level++;
    u.xpToNext = xpCurve(u.level);
    this.syncWeaponPassivesOnLevelUp(u);
    u.hp = Math.min(u.hp, u.maxHp);
    u.mana = Math.min(u.mana, u.maxMana);
    if (forgeSynergyTier(u.forgeLoadout, "deserto") >= 3) {
      for (const ally of this.getParty()) {
        if (ally.hp <= 0) continue;
        let pool = ally.maxHp;
        const space = ally.maxHp - ally.hp;
        const toHp = Math.min(space, pool);
        ally.hp += toHp;
        pool -= toHp;
        ally.shieldGGBlue += pool;
        ally.mana = ally.maxMana;
      }
    }
    this.log(`${u.name} sobe para nível ${u.level}!`);
    if (u.level >= 60 && !u.ultimateId) {
      this.pendingUltimate = { unitId: u.id };
      this.phase = "ultimate_pick";
      this.emit();
      return;
    }
    const sorteEff = this.effectiveSorte(u);
    const nArt = 3 + this.meta.initialCards;
    const choices = randomArtifactChoicesForHero(u, nArt, sorteEff, new Set(), {
      bypassRarityCaps: this.devSandboxMode,
      bannedIds: this.artifactBannedThisRun,
    });
    if (choices.length === 0) {
      this.log(`${u.name}: sem cartas de level-up disponíveis.`);
    } else {
      const freeRerolls = 1 + this.meta.artifactRerollBonus;
      const freeBans = 1 + this.meta.artifactBanBonus;
      this.pendingArtifacts = {
        unitId: u.id,
        choices,
        choiceCount: nArt,
        rerollsFreeLeft: freeRerolls,
        rerollsPaidUsed: 0,
        bansFreeLeft: freeBans,
        bansPaidUsed: 0,
        banMode: false,
      };
      this.phase = "level_up_pick";
    }
    this.emit();
  }

  /** Novo lote com o mesmo número de cartas (grátis meta + 1 base; depois até 3×2 cristais da run). */
  rerollArtifactPick(): void {
    const pa = this.pendingArtifacts;
    if (!pa) return;
    const u = this.units.find((x) => x.id === pa.unitId);
    if (!u) return;
    const sorteEff = this.effectiveSorte(u);
    const choices = randomArtifactChoicesForHero(u, pa.choiceCount, sorteEff, new Set(), {
      bypassRarityCaps: this.devSandboxMode,
      bannedIds: this.artifactBannedThisRun,
    });
    if (choices.length === 0) {
      this.log(`${u.name}: sem cartas de reroll disponíveis.`);
      return;
    }
    if (pa.rerollsFreeLeft > 0) {
      pa.rerollsFreeLeft--;
    } else if (
      pa.rerollsPaidUsed < ARTIFACT_PICK_PAID_CHARGES_MAX &&
      this.crystalsRun >= ARTIFACT_PICK_PAID_CRYSTAL_COST
    ) {
      this.crystalsRun -= ARTIFACT_PICK_PAID_CRYSTAL_COST;
      pa.rerollsPaidUsed++;
    } else {
      this.log(`${u.name}: sem rerolls disponíveis.`);
      return;
    }
    this.pendingArtifacts = {
      ...pa,
      choices,
    };
    this.emit();
  }

  toggleArtifactPickBanMode(): void {
    const pa = this.pendingArtifacts;
    if (!pa) return;
    pa.banMode = !pa.banMode;
    this.emit();
  }

  /**
   * Remove um artefato da pool da run e substitui a carta por outra sorteada.
   * Ofertas especiais (_pick_*) não podem ser banidas.
   */
  banArtifactFromPick(artifactId: string): boolean {
    const pa = this.pendingArtifacts;
    if (!pa) return false;
    if (artifactId.startsWith("_pick")) {
      this.log("Ofertas especiais não podem ser banidas.");
      return false;
    }
    const u = this.units.find((x) => x.id === pa.unitId);
    if (!u) return false;
    const ix = pa.choices.indexOf(artifactId);
    if (ix < 0) return false;

    const testBanned = new Set(this.artifactBannedThisRun);
    testBanned.add(artifactId);
    const keep = pa.choices.filter((x) => x !== artifactId);
    const need = pa.choiceCount - keep.length;
    const sorteEff = this.effectiveSorte(u);
    const opts = {
      bypassRarityCaps: this.devSandboxMode,
      bannedIds: testBanned,
    };
    const extra = randomArtifactChoicesForHero(
      u,
      need,
      sorteEff,
      new Set(keep),
      opts,
    );
    if (extra.length < need) {
      this.log(
        `${u.name}: não há cartas de substituição — não foi possível banir.`,
      );
      return false;
    }

    if (pa.bansFreeLeft > 0) {
      pa.bansFreeLeft--;
    } else if (
      pa.bansPaidUsed < ARTIFACT_PICK_PAID_CHARGES_MAX &&
      this.crystalsRun >= ARTIFACT_PICK_PAID_CRYSTAL_COST
    ) {
      this.crystalsRun -= ARTIFACT_PICK_PAID_CRYSTAL_COST;
      pa.bansPaidUsed++;
    } else {
      this.log(`${u.name}: sem banimentos disponíveis.`);
      return false;
    }

    this.artifactBannedThisRun.add(artifactId);
    pa.choices = [...keep, ...extra];
    pa.banMode = false;
    const def = artifactDefById(artifactId);
    this.log(`${u.name}: ${def?.name ?? artifactId} banido nesta run.`);
    this.emit();
    return true;
  }

  nextArtifactRerollBonusCost(): number | null {
    const cur = this.meta.artifactRerollBonus;
    if (cur >= 3) return null;
    return ARTIFACT_REROLL_BONUS_COSTS[cur]!;
  }

  buyArtifactRerollBonus(): boolean {
    const cur = this.meta.artifactRerollBonus;
    if (cur >= 3) return false;
    const cost = ARTIFACT_REROLL_BONUS_COSTS[cur];
    if (cost === undefined || this.meta.crystals < cost) return false;
    this.meta.crystals -= cost;
    this.meta.artifactRerollBonus = cur + 1;
    this.saveMeta();
    return true;
  }

  nextArtifactBanBonusCost(): number | null {
    const cur = this.meta.artifactBanBonus;
    if (cur >= 3) return null;
    return ARTIFACT_BAN_BONUS_COSTS[cur]!;
  }

  buyArtifactBanBonus(): boolean {
    const cur = this.meta.artifactBanBonus;
    if (cur >= 3) return false;
    const cost = ARTIFACT_BAN_BONUS_COSTS[cur];
    if (cost === undefined || this.meta.crystals < cost) return false;
    this.meta.crystals -= cost;
    this.meta.artifactBanBonus = cur + 1;
    this.saveMeta();
    return true;
  }

  private applyPickBonusPerStack(
    u: Unit,
    b: ArtifactDef["pickBonusPerStack"] | undefined,
  ): void {
    if (!b) return;
    if (b.dano) u.dano += b.dano;
    if (b.defesa) u.defesa += b.defesa;
    if (b.maxHp) u.maxHp += b.maxHp;
    if (b.hp) u.hp += b.hp;
    if (b.acertoCritico) u.acertoCritico += b.acertoCritico;
    if (b.danoCritico) u.danoCritico += b.danoCritico;
    if (b.penetracao) u.penetracao += b.penetracao;
    if (b.regenVida) u.regenVida += b.regenVida;
    if (b.regenMana) u.regenMana += b.regenMana;
    if (b.alcance) u.alcance += b.alcance;
    if (b.movimento) u.movimento += b.movimento;
    if (b.lifesteal) u.lifesteal += b.lifesteal;
    if (b.sorte) u.sorte += b.sorte;
    if (b.potencialCuraEscudo) u.potencialCuraEscudo += b.potencialCuraEscudo;
  }

  private removePickBonusPerStack(
    u: Unit,
    b: ArtifactDef["pickBonusPerStack"] | undefined,
  ): void {
    if (!b) return;
    if (b.dano) u.dano -= b.dano;
    if (b.defesa) u.defesa -= b.defesa;
    if (b.maxHp) {
      u.maxHp -= b.maxHp;
      u.hp = Math.min(u.hp, u.maxHp);
    }
    if (b.hp) u.hp -= b.hp;
    if (b.acertoCritico) u.acertoCritico -= b.acertoCritico;
    if (b.danoCritico) u.danoCritico -= b.danoCritico;
    if (b.penetracao) u.penetracao -= b.penetracao;
    if (b.regenVida) u.regenVida -= b.regenVida;
    if (b.regenMana) u.regenMana -= b.regenMana;
    if (b.alcance) u.alcance -= b.alcance;
    if (b.movimento) u.movimento -= b.movimento;
    if (b.lifesteal) u.lifesteal -= b.lifesteal;
    if (b.sorte) u.sorte -= b.sorte;
    if (b.potencialCuraEscudo) u.potencialCuraEscudo -= b.potencialCuraEscudo;
  }

  /** +1 acúmulo e bônus de stats da carta (se existir). */
  private incrementArtifactStack(u: Unit, artifactId: string): boolean {
    if (
      !canIncrementArtifactStack(u, artifactId, {
        bypassRarityCaps: this.devSandboxMode,
      })
    )
      return false;
    const prev = u.artifacts[artifactId] ?? 0;
    u.artifacts[artifactId] = prev + 1;
    const def = artifactDefById(artifactId);
    this.applyPickBonusPerStack(u, def?.pickBonusPerStack);
    return true;
  }

  /** −1 acúmulo e reverte bônus de stats desse acúmulo. */
  private decrementArtifactStack(u: Unit, artifactId: string): boolean {
    const prev = u.artifacts[artifactId] ?? 0;
    if (prev <= 0) return false;
    const def = artifactDefById(artifactId);
    this.removePickBonusPerStack(u, def?.pickBonusPerStack);
    if (prev <= 1) delete u.artifacts[artifactId];
    else u.artifacts[artifactId] = prev - 1;
    return true;
  }

  /**
   * Modo sandbox: ajustar acúmulos de artefato (combate ou outras fases).
   * Esquerdo +1, direito −1 na UI (delta ±1).
   */
  sandboxAdjustArtifact(
    heroId: string,
    artifactId: string,
    delta: 1 | -1,
  ): boolean {
    if (!this.devSandboxMode) return false;
    if (artifactId.startsWith("_")) return false;
    if (!artifactDefById(artifactId)) return false;
    const u = this.units.find((x) => x.id === heroId);
    if (!u?.isPlayer) return false;
    const ok =
      delta === 1
        ? this.incrementArtifactStack(u, artifactId)
        : this.decrementArtifactStack(u, artifactId);
    if (!ok) return false;
    u.hp = Math.max(0, Math.min(u.hp, u.maxHp));
    u.mana = Math.max(0, Math.min(u.mana, u.maxMana));
    if (artifactId === "braco_forte") {
      const ch = this.currentHero();
      if (ch && u.id === ch.id) this.syncBasicLeftFromSpent(ch);
    }
    this.emit();
    return true;
  }

  /**
   * Modo sandbox: durante o combate, recomeçar na wave indicada (novos inimigos, etc.).
   * Sem overlay de intro — liberta logo a fase inimiga como após fechar o splash.
   */
  sandboxRestartWave(n: number): void {
    if (!this.devSandboxMode || this.phase !== "combat") return;
    const w = Math.max(1, Math.min(FINAL_VICTORY_WAVE, Math.floor(n)));
    this.startWave(w);
    if (this.partyGuerraTotalStackSum() > 0) {
      this.pendingCometaArcanoWithoutIntro = true;
    } else {
      this.releaseEnemyPhaseAfterWaveIntro();
    }
  }

  /** Modo sandbox: alternar voo do herói (afeta pathfinding/combate e visual 3D). */
  sandboxToggleHeroFlying(heroId: string): void {
    if (!this.devSandboxMode || this.phase !== "combat") return;
    const u = this.units.find((x) => x.id === heroId);
    if (!u?.isPlayer || u.hp <= 0) return;
    u.flying = !u.flying;
    this.log(
      `[Sandbox] ${u.name}: voo ${u.flying ? "ativado" : "desativado"}.`,
    );
    this.emit();
  }

  /**
   * Modo sandbox: +1 nível como no jogo normal — `checkLevelUp` abre escolha de
   * artefato ou forma final (nível 60) em vez de só alterar o número.
   */
  /**
   * HUD: com nv. ≥60 e sem forma final, abre o menu de escolha (combate).
   */
  tryOpenFormaFinalPickFromHud(): boolean {
    if (this.phase !== "combat") return false;
    const h = this.currentHero();
    if (!h?.isPlayer || h.hp <= 0 || h.level < 60 || h.ultimateId) return false;
    this.cancelLevelUpFloatHoldTimer();
    this.pendingArtifacts = null;
    this.pendingUltimate = { unitId: h.id };
    this.phase = "ultimate_pick";
    this.emit();
    return true;
  }

  sandboxAddHeroLevel(heroId: string): void {
    if (!this.devSandboxMode) return;
    if (this.phase === "level_up_pick" || this.phase === "ultimate_pick") return;
    if (this.phase !== "combat") return;
    const u = this.units.find((x) => x.id === heroId);
    if (!u?.isPlayer || u.hp <= 0) return;
    if (u.level >= 100) return;
    if (!Number.isFinite(u.xpToNext) || u.xpToNext <= 0) return;
    u.xp = u.xpToNext;
    this.checkLevelUp(u);
  }

  /**
   * Modo sandbox: abre já o menu de escolha de forma final (nível 60) para este herói.
   * Repõe ultimate/forma se já existirem, sobe para nv. 60 se for preciso e muda a fase para `ultimate_pick`.
   */
  sandboxOpenFormaFinalPick(heroId: string): void {
    if (!this.devSandboxMode) return;
    if (this.phase === "level_up_pick" || this.phase === "ultimate_pick") return;
    if (this.phase !== "combat") return;
    const u = this.units.find((x) => x.id === heroId);
    if (!u?.isPlayer || u.hp <= 0 || !u.heroClass) return;
    this.cancelLevelUpFloatHoldTimer();
    this.pendingArtifacts = null;
    delete u.ultimateId;
    u.formaFinal = false;
    u.flying = false;
    if (u.level < 60) {
      u.level = 60;
      u.xpToNext = xpCurve(u.level);
      u.xp = 0;
      this.syncWeaponPassivesOnLevelUp(u);
    }
    u.hp = Math.min(u.hp, u.maxHp);
    u.mana = Math.min(u.mana, u.maxMana);
    this.pendingUltimate = { unitId: u.id };
    this.phase = "ultimate_pick";
    this.log(
      `[Sandbox] ${u.name}: menu de forma final (nv. ${u.level}).`,
    );
    this.emit();
  }

  /** Modo sandbox: matar herói (remove da arena como morte normal). */
  sandboxKillHero(heroId: string): void {
    if (!this.devSandboxMode || this.phase !== "combat") return;
    const u = this.units.find((x) => x.id === heroId);
    if (!u?.isPlayer || u.hp <= 0) return;
    u.hp = 0;
    this.log(`[Sandbox] ${u.name} eliminado(a).`);
    this.onDeaths();
    if (!this.units.some((x) => x.isPlayer)) {
      this.phase = "defeat";
      this.meta.crystals += this.crystalsRun;
      this.saveMeta();
      this.log("Derrota.");
    }
    this.emit();
  }

  pickArtifact(artifactId: string): void {
    if (!this.pendingArtifacts) return;
    this.cancelLevelUpFloatHoldTimer();
    const u = this.units.find((x) => x.id === this.pendingArtifacts!.unitId);
    if (!u) return;
    if (artifactId === "_pick_gold") {
      this.addHeroOuroWithMetaBonus(u, 50);
    } else if (artifactId === "_pick_restore") {
      u.hp = u.maxHp;
      u.mana = u.maxMana;
    } else if (artifactId === "_pick_crystals") {
      this.crystalsRun += 5;
    } else {
      if (!this.incrementArtifactStack(u, artifactId)) return;
    }
    u.hp = Math.min(u.hp, u.maxHp);
    u.mana = Math.min(u.mana, u.maxMana);
    this.pendingArtifacts = null;
    this.phase = "combat";
    if (artifactId === "braco_forte") {
      const ch = this.currentHero();
      if (ch && u.id === ch.id) this.syncBasicLeftFromSpent(ch);
    }
    this.checkLevelUp(u);
    this.pollPendingCombatLevelUp();
    if (this.phase === "combat") {
      this.tryResolveWaveClearAfterCombatResume(true);
    }
    flushCombatOutcomeQueue({
      hasPendingCombatSchedule: () => this.hasPendingCombatSchedule(),
      getPhase: () => this.phase,
    });
    this.emit();
  }

  pickUltimate(id: string): void {
    if (!this.pendingUltimate) return;
    this.cancelLevelUpFloatHoldTimer();
    const u = this.units.find((x) => x.id === this.pendingUltimate!.unitId);
    if (!u) return;
    u.ultimateId = id;
    u.formaFinal = true;
    if (id === "arauto_caos") {
      u.tiroDestruidorCharges = 0;
      u.tiroDestruidorUsedThisTurn = false;
    }
    if (id === "fada_cura") u.flying = true;
    u.hp = Math.min(u.hp, u.maxHp);
    u.mana = Math.min(u.mana, u.maxMana);
    this.pendingUltimate = null;
    this.phase = "combat";
    this.checkLevelUp(u);
    this.pollPendingCombatLevelUp();
    if (this.phase === "combat") {
      this.tryResolveWaveClearAfterCombatResume(true);
    }
    flushCombatOutcomeQueue({
      hasPendingCombatSchedule: () => this.hasPendingCombatSchedule(),
      getPhase: () => this.phase,
    });
    this.emit();
  }

  buyBunkerRepair(heroId: string): boolean {
    const u = this.units.find((x) => x.id === heroId);
    if (!u || !u.isPlayer) return false;
    const b = this.bunkerForHeroHomeBiome(u);
    if (!b) return false;
    const missing = b.maxHp - b.hp;
    if (missing <= 0) return false;
    const cost = Math.ceil(missing);
    if (u.ouro < cost) return false;
    u.ouro -= cost;
    b.hp = b.maxHp;
    const biome = this.heroHomeBiome(u);
    this.log(
      `Bunker do bioma ${BIOME_LABELS[biome]} reparado (${cost} ouro).`,
    );
    this.emit();
    return true;
  }

  buyBunkerEvolve(heroId: string): boolean {
    const u = this.units.find((x) => x.id === heroId);
    if (!u || !u.isPlayer) return false;
    const biome = this.heroHomeBiome(u);
    if (biome === "hub") return false;
    const b = this.bunkers[biome];
    if (!b) return false;
    const t = b.tier;
    if (t >= 2) return false;
    const cost = BUNKER_EVOLVE_COSTS[t as 0 | 1];
    let c = cost;
    if (u.ultimateId === "estrategista_nato") c = Math.ceil(c * 0.5);
    if (u.ouro < c) return false;
    u.ouro -= c;
    const nt = (t + 1) as 1 | 2;
    const st = bunkerStatsForTier(nt);
    b.tier = nt;
    b.maxHp = st.maxHp;
    b.defesa = st.defesa;
    b.hp = st.maxHp;
    this.log(
      `Bunker do bioma ${BIOME_LABELS[biome]} evoluiu (nível ${nt}).`,
    );
    this.emit();
    return true;
  }

  takePendingBunkerHint(): { text: string; q: number; r: number } | null {
    const s = this.pendingBunkerHint;
    this.pendingBunkerHint = null;
    return s;
  }

  takePendingMoveBlockedHint(): { text: string; unitId: string } | null {
    const s = this.pendingMoveBlockedHint;
    this.pendingMoveBlockedHint = null;
    return s;
  }


  buyGoldItem(heroId: string, itemId: string): boolean {
    const u = this.units.find((x) => x.id === heroId);
    if (!u || !u.isPlayer) return false;
    const item = GOLD_SHOP.find((i) => i.id === itemId);
    if (!item) return false;
    if (item.id === "xp_pct" && (u.artifacts["_xp_shop"] ?? 0) >= 60)
      return false;
    let cost = item.cost;
    if (u.ultimateId === "estrategista_nato") cost = Math.ceil(cost * 0.5);
    if (u.ouro < cost) return false;
    u.ouro -= cost;
    item.apply(u);
    this.emit();
    return true;
  }

  /** Cristais cobrados no próximo reembolso de loja (0 no primeiro uso da run). */
  nextShopRefundCrystalCost(): number {
    return this.runShopRefundUses === 0 ? 0 : 5;
  }

  /** Há diferença face ao snapshot da abertura desta visita à loja? */
  shopHasChangesFromSnapshot(): boolean {
    const snap = this.shopRestoreSnapshot;
    if (!snap) return false;
    const party = this.getParty();
    if (party.length !== snap.heroes.length) return true;
    for (const u of party) {
      const sh = snap.heroes.find((h) => h.id === u.id);
      if (!sh) return true;
      if (u.ouro !== sh.ouro) return true;
      if (u.maxHp !== sh.maxHp || u.hp !== sh.hp) return true;
      if (u.maxMana !== sh.maxMana || u.mana !== sh.mana) return true;
      if (u.regenVida !== sh.regenVida || u.regenMana !== sh.regenMana)
        return true;
      if (u.dano !== sh.dano) return true;
      if (u.acertoCritico !== sh.acertoCritico) return true;
      if (!shopNumEq(u.danoCritico, sh.danoCritico)) return true;
      if (u.defesa !== sh.defesa) return true;
      if (u.movimento !== sh.movimento) return true;
      if (u.penetracao !== sh.penetracao) return true;
      if (u.potencialCuraEscudo !== sh.potencialCuraEscudo) return true;
      if (!shopArtifactsEq(u.artifacts, sh.artifacts)) return true;
    }
    const curBunkers = this.snapshotBunkersNow();
    if (curBunkers.length !== snap.bunkers.length) return true;
    const sortB = (xs: ShopBunkerSnapshot[]) =>
      [...xs].sort((a, b) => a.biome.localeCompare(b.biome));
    const a = sortB(snap.bunkers);
    const b = sortB(curBunkers);
    for (let i = 0; i < a.length; i++) {
      const x = a[i]!;
      const y = b[i]!;
      if (
        x.biome !== y.biome ||
        x.q !== y.q ||
        x.r !== y.r ||
        x.hp !== y.hp ||
        x.maxHp !== y.maxHp ||
        x.defesa !== y.defesa ||
        x.tier !== y.tier ||
        x.occupantId !== y.occupantId
      )
        return true;
    }
    return false;
  }

  /**
   * Reverte ouro, atributos e bunkers ao estado da abertura da loja.
   * 1.º reembolso na run: grátis; seguintes: 5 Cristais.
   */
  tryShopRefund():
    | "ok"
    | "no_snapshot"
    | "no_changes"
    | "no_crystals" {
    if (!this.shopRestoreSnapshot) return "no_snapshot";
    if (!this.shopHasChangesFromSnapshot()) return "no_changes";
    const cost = this.nextShopRefundCrystalCost();
    if (cost > 0 && this.meta.crystals < cost) return "no_crystals";
    if (cost > 0) {
      this.meta.crystals -= cost;
      this.saveMeta();
    }
    this.applyShopSnapshot();
    this.runShopRefundUses++;
    this.emit();
    return "ok";
  }

  private heroToShopSnapshot(u: Unit): ShopHeroSnapshot {
    return {
      id: u.id,
      ouro: u.ouro,
      maxHp: u.maxHp,
      hp: u.hp,
      maxMana: u.maxMana,
      mana: u.mana,
      regenVida: u.regenVida,
      regenMana: u.regenMana,
      dano: u.dano,
      acertoCritico: u.acertoCritico,
      danoCritico: u.danoCritico,
      defesa: u.defesa,
      movimento: u.movimento,
      penetracao: u.penetracao,
      potencialCuraEscudo: u.potencialCuraEscudo,
      artifacts: { ...u.artifacts },
    };
  }

  private snapshotBunkersNow(): ShopBunkerSnapshot[] {
    const out: ShopBunkerSnapshot[] = [];
    for (const bi of COMBAT_BIOMES) {
      const b = this.bunkers[bi];
      if (!b) continue;
      out.push({
        biome: bi,
        q: b.q,
        r: b.r,
        hp: b.hp,
        maxHp: b.maxHp,
        defesa: b.defesa,
        tier: b.tier,
        occupantId: b.occupantId,
      });
    }
    return out;
  }

  private captureShopSnapshot(): void {
    this.shopRestoreSnapshot = {
      heroes: this.getParty().map((u) => this.heroToShopSnapshot(u)),
      bunkers: this.snapshotBunkersNow(),
    };
  }

  private applyShopSnapshot(): void {
    const snap = this.shopRestoreSnapshot;
    if (!snap) return;
    for (const sh of snap.heroes) {
      const u = this.units.find((x) => x.id === sh.id);
      if (!u || !u.isPlayer) continue;
      u.ouro = sh.ouro;
      u.maxHp = sh.maxHp;
      u.hp = sh.hp;
      u.maxMana = sh.maxMana;
      u.mana = sh.mana;
      u.regenVida = sh.regenVida;
      u.regenMana = sh.regenMana;
      u.dano = sh.dano;
      u.acertoCritico = sh.acertoCritico;
      u.danoCritico = sh.danoCritico;
      u.defesa = sh.defesa;
      u.movimento = sh.movimento;
      u.penetracao = sh.penetracao;
      u.potencialCuraEscudo = sh.potencialCuraEscudo;
      u.artifacts = { ...sh.artifacts };
    }
    for (const sb of snap.bunkers) {
      this.bunkers[sb.biome] = {
        q: sb.q,
        r: sb.r,
        hp: sb.hp,
        maxHp: sb.maxHp,
        defesa: sb.defesa,
        tier: sb.tier,
        occupantId: sb.occupantId,
      };
    }
  }

  /** Cristais: compra meta (fora de run) */
  buyMetaTrack(
    track:
      | "permDamage"
      | "permHp"
      | "permDef"
      | "permHealShield"
      | "permXp"
      | "permGold"
      | "permCrystalDrop",
  ): boolean {
    const cur = this.meta[track];
    if (cur >= 5) return false;
    const costs = [1, 2, 4, 6, 9];
    const cost = costs[cur];
    if (cost === undefined || this.meta.crystals < cost) return false;
    this.meta.crystals -= cost;
    this.meta[track]++;
    this.saveMeta();
    return true;
  }

  buyInitialCards(): boolean {
    const cur = this.meta.initialCards;
    if (cur >= 3) return false;
    const costs = [2, 5, 9];
    const cost = costs[cur];
    if (cost === undefined || this.meta.crystals < cost) return false;
    this.meta.crystals -= cost;
    this.meta.initialCards++;
    this.saveMeta();
    return true;
  }

  buyWeaponUpgrade(slot: 0 | 1 | 2): boolean {
    const cur = this.meta.weaponLevelByHeroSlot[slot];
    if (cur >= 5) return false;
    const cost = weaponUpgradeCrystalCost(cur);
    if (cost == null || this.meta.crystals < cost) return false;
    this.meta.crystals -= cost;
    const next = (cur + 1) as WeaponLevel;
    const w: [WeaponLevel, WeaponLevel, WeaponLevel] = [
      ...this.meta.weaponLevelByHeroSlot,
    ];
    w[slot] = next;
    this.meta.weaponLevelByHeroSlot = w;
    this.saveMeta();
    return true;
  }

  reachableForCurrentHero(): Map<string, number> {
    const h = this.currentHero();
    if (!h) return new Map();
    const blocked = this.occupiedHexKeysExcluding(h.id);
    const ign = unitIgnoresTerrain(h);
    const panSwamp = !ign && forgeSynergyTier(h.forgeLoadout, "pantano") >= 1;
    return reachableHexes(
      this.grid,
      { q: h.q, r: h.r },
      this.movementLeft,
      h.flying,
      ign,
      blocked,
      panSwamp,
    );
  }

  /**
   * Hexes que um inimigo pode alcançar com `movimento` neste turno (mesmas regras que a IA de aproximação).
   */
  enemyMovementPreviewKeys(enemyId: string): Set<string> {
    const e = this.units.find((u) => u.id === enemyId);
    if (!e || e.isPlayer || e.hp <= 0) return new Set();
    const blocked = this.occupiedHexKeysExcluding(e.id);
    this.addBunkerHexForEnemyPath(blocked);
    const reach = reachableHexes(
      this.grid,
      { q: e.q, r: e.r },
      e.movimento,
      e.flying,
      unitIgnoresTerrain(e),
      blocked,
    );
    const here = axialKey(e.q, e.r);
    const out = new Set<string>();
    for (const k of reach.keys()) {
      if (k !== here) out.add(k);
    }
    return out;
  }

  /** Hexes onde o inimigo pode atacar à distância (anel 1..alcance), para pré-visualização na UI. */
  enemyAttackPreviewKeys(enemyId: string): Set<string> {
    const e = this.units.find((u) => u.id === enemyId);
    if (!e || e.isPlayer || e.hp <= 0) return new Set();
    const alc = this.effectiveAlcanceForEnemy(e);
    return this.hexKeysInRing(e.q, e.r, 1, Math.max(1, alc));
  }

  effectiveAlcanceForHero(h: Unit): number {
    const bio = biomeAt(this.grid, h.q, h.r) as BiomeId;
    const ign = unitIgnoresTerrain(h);
    const ft = forgeSynergyTier(h.forgeLoadout, "floresta");
    let total = h.alcance;
    if (ft >= 2) total += 2;
    else if (ft >= 1 && bio === "floresta") total += 2;
    else if (!ign && bio === "floresta") total += 1;
    const bk = this.bunkerAtHex(h.q, h.r);
    if (
      bk &&
      bk.hp > 0 &&
      bk.occupantId === h.id &&
      h.q === bk.q &&
      h.r === bk.r
    ) {
      total += 1;
    }
    return total;
  }

  private effectiveAlcanceForEnemy(e: Unit): number {
    const bio = biomeAt(this.grid, e.q, e.r) as BiomeId;
    const suppressForest =
      bio === "floresta" && this.anyHeroSuppressesEnemyForestRange();
    return effectiveAlcanceForBiome(
      e.alcance,
      bio,
      unitIgnoresTerrain(e),
      { suppressForestEnemyBonus: suppressForest },
    );
  }

  /** Hexes com distância axial [minD, maxD] do centro (inclusive). */
  hexKeysInRing(q: number, r: number, minD: number, maxD: number): Set<string> {
    const out = new Set<string>();
    for (const c of this.grid.values()) {
      const d = hexDistance({ q, r }, { q: c.q, r: c.r });
      if (d >= minD && d <= maxD) out.add(axialKey(c.q, c.r));
    }
    return out;
  }

  /**
   * Pré-visualização do Tiro destruidor: feixe em linha recta até sair do mapa,
   * na direção do hex `through` (deve estar no alcance e não ser o hex do herói).
   */
  tiroDestruidorAimPreview(
    tq: number,
    tr: number,
  ): { keys: Set<string>; path: { q: number; r: number }[] } | null {
    const h = this.currentHero();
    if (!h || h.hp <= 0) return null;
    if (h.heroClass !== "pistoleiro" || h.ultimateId !== "arauto_caos")
      return null;
    if (tq === h.q && tr === h.r) return null;
    const d0 = hexDistance({ q: h.q, r: h.r }, { q: tq, r: tr });
    const alc = this.effectiveAlcanceForHero(h);
    if (d0 < 1 || d0 > alc) return null;
    const beamHexes = hexBeamRayThroughGrid(
      { q: h.q, r: h.r },
      { q: tq, r: tr },
      (qq, rr) => this.grid.has(axialKey(qq, rr)),
      48,
    );
    if (beamHexes.length < 2) return null;
    const keys = new Set(beamHexes.map((c) => axialKey(c.q, c.r)));
    return { keys, path: beamHexes.map((c) => ({ q: c.q, r: c.r })) };
  }

  getBasicAttackRangeHexKeys(): Set<string> {
    const h = this.currentHero();
    if (!h || h.hp <= 0) return new Set();
    const alc = this.effectiveAlcanceForHero(h);
    return this.hexKeysInRing(h.q, h.r, 1, Math.max(1, alc));
  }

  getSkillRangeHexKeys(skillId: string): Set<string> {
    const h = this.currentHero();
    if (!h || h.hp <= 0) return new Set();
    if (skillId === "bunker_minas") {
      const b = this.bunkerAtHex(h.q, h.r);
      if (!b || b.hp <= 0 || b.occupantId !== h.id) return new Set();
      const maxR = bunkerMinasMaxRing(b.tier);
      if (maxR < 1) return new Set();
      return this.hexKeysInRing(b.q, b.r, 1, maxR);
    }
    if (skillId === "bunker_tiro_preciso") {
      const keys = new Set<string>();
      for (const u of this.units) {
        if (u.isPlayer || u.hp <= 0) continue;
        keys.add(axialKey(u.q, u.r));
      }
      return keys;
    }
    if (skillId === "ate_a_morte") return this.hexKeysInRing(h.q, h.r, 1, 1);
    if (
      skillId === "atirar_todo_lado" ||
      skillId === "tiro_destruidor" ||
      skillId === "especialista_destruicao"
    ) {
      return this.getBasicAttackRangeHexKeys();
    }
    if (skillId === "sentenca") {
      return new Set();
    }
    return new Set();
  }

  /** Inimigo vivo neste hex (um por célula). */
  liveEnemyIdAtHex(q: number, r: number): string | null {
    const t = this.units.find(
      (u) => !u.isPlayer && u.hp > 0 && u.q === q && u.r === r,
    );
    return t?.id ?? null;
  }

  validateEnemyForBasicAttack(targetId: string): boolean {
    const h = this.currentHero();
    const t = this.units.find((u) => u.id === targetId);
    if (!h || !t || t.isPlayer || t.hp <= 0) return false;
    const d = hexDistance({ q: h.q, r: h.r }, { q: t.q, r: t.r });
    const alc = this.effectiveAlcanceForHero(h);
    return d >= 1 && d <= alc;
  }

  /** Skills que exigem clique em inimigo (não hex vazio). */
  canSkillTargetEnemy(skillId: string, targetId: string): boolean {
    const t = this.units.find((u) => u.id === targetId);
    const h = this.currentHero();
    if (!t || !h || t.isPlayer || t.hp <= 0) return false;
    if (skillId === "ate_a_morte") {
      return hexDistance({ q: h.q, r: h.r }, { q: t.q, r: t.r }) <= 1;
    }
    if (skillId === "especialista_destruicao") {
      return this.validateEnemyForBasicAttack(targetId);
    }
    if (skillId === "bunker_tiro_preciso") return true;
    return false;
  }

  hexInSkillRange(skillId: string, q: number, r: number): boolean {
    return this.getSkillRangeHexKeys(skillId).has(axialKey(q, r));
  }
}

function roninCritBonus(u: Unit): number {
  return roninCritBonusFromArtifacts(u.artifacts);
}

function hexNeighborsOffset(i: number): { q: number; r: number } {
  const ring = [
    { q: 0, r: 0 },
    { q: 1, r: 0 },
    { q: 0, r: 1 },
    { q: -1, r: 1 },
  ];
  return ring[i % ring.length]!;
}
