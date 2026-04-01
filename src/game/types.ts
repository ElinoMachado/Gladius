export type BiomeId =
  | "hub"
  | "floresta"
  | "pantano"
  | "montanhoso"
  | "deserto"
  | "rochoso"
  | "vulcanico";

/** Biomas que geram essência / equipamento forjado (exclui hub). */
export type ForgeEssenceId = Exclude<BiomeId, "hub">;

export interface ForgePiece {
  biome: ForgeEssenceId;
  level: 1 | 2 | 3;
}

/** Níveis forjados por essência num mesmo tipo de peça (ex.: elmo pântano + elmo vulcânico). */
export type ForgePerEssenceLevels = Partial<Record<ForgeEssenceId, 1 | 2 | 3>>;

export interface ForgeHeroLoadout {
  /** Legado: uma peça por slot (migrado para *ByEssence + *Equipped ao carregar). */
  helmo?: ForgePiece;
  capa?: ForgePiece;
  manoplas?: ForgePiece;
  helmoByEssence?: ForgePerEssenceLevels;
  capaByEssence?: ForgePerEssenceLevels;
  manoplasByEssence?: ForgePerEssenceLevels;
  /** Qual linha de essência está equipada (stats + modelo em combate). */
  helmoEquipped?: ForgeEssenceId;
  capaEquipped?: ForgeEssenceId;
  manoplasEquipped?: ForgeEssenceId;
}

export type ForgeSlotKind = "helmo" | "capa" | "manoplas";

/** Nível da arma principal (meta + combate); ver `weaponData.ts`. */
export type WeaponLevel = 1 | 2 | 3 | 4 | 5;

export type TeamColor = "azul" | "vermelho" | "verde";

export type HeroClassId = "pistoleiro" | "gladiador" | "sacerdotisa";

export interface CoreStats {
  maxHp: number;
  hp: number;
  maxMana: number;
  mana: number;
  movimento: number;
  dano: number;
  defesa: number;
  acertoCritico: number;
  danoCritico: number;
  penetracao: number;
  /** Por golpe: até este valor do dano mitigado ignora o escudo azul e vai direto aos PV. */
  penetracaoEscudo: number;
  regenVida: number;
  regenMana: number;
  alcance: number;
  lifesteal: number;
  potencialCuraEscudo: number;
  /** Sorte: +1% chance de cristal por kill; +1% de 4ª carta no level-up (por ponto); afeta a raridade das cartas oferecidas. */
  sorte: number;
}

/** Snapshot dos atributos no fim da criação do herói (para deltas no HUD). */
export interface HeroStatBaseline {
  level: number;
  maxHp: number;
  maxMana: number;
  dano: number;
  defesa: number;
  acertoCritico: number;
  danoCritico: number;
  penetracao: number;
  penetracaoEscudo: number;
  regenVida: number;
  regenMana: number;
  movimento: number;
  alcance: number;
  lifesteal: number;
  potencialCuraEscudo: number;
  sorte: number;
  goldDrainReduction: number;
  ouro: number;
  ouroWave: number;
  shieldGGBlue: number;
  flying: boolean;
  /** Cópia dos artefatos na criação (para delta de stacks no HUD). */
  artifacts: Record<string, number>;
}

export interface Unit extends CoreStats {
  id: string;
  name: string;
  isPlayer: boolean;
  heroClass?: HeroClassId;
  teamColor?: TeamColor;
  q: number;
  r: number;
  flying: boolean;
  /** Imóvel neste turno (para artefato duro como pedra) */
  immobileThisTurn: boolean;
  /** Escudo azul (GG); não passa de wave para wave (zerado ao fechar a wave). */
  shieldGGBlue: number;
  goldDrainReduction: number;
  /** Ouro atual do herói: bolsa persistente, gasta na loja entre waves. Não é drenado no combate. */
  ouro: number;
  /** Ouro da wave: 100 iniciais; dreno por ciclo aliado; extras em combate (ex. kills); ao vencer a wave soma-se a `ouro` (sem valor extra escondido). */
  ouroWave: number;
  level: number;
  xp: number;
  xpToNext: number;
  /** Acúmulos de artefatos por id */
  artifacts: Record<string, number>;
  /** Cooldowns skill por id (turnos restantes) */
  skillCd: Record<string, number>;
  /** Ultimate escolhida (nível 60 — forma final). */
  ultimateId?: string;
  formaFinal: boolean;
  /** Pistoleiro: dano extra na rodada/wave */
  pistoleiroBonusDanoWave: number;
  /** Gladiador: kills para passiva campeão */
  gladiadorKills: number;
  /** Curandeiro de batalha stacks */
  curandeiroDanoWave: number;
  /** Duro como pedra: defesa por imobilidade */
  duroPedraDefStacks: number;
  /** Motor da morte: próximo básico % */
  motorMorteNextBasicPct: number;
  /** Saiu do bunker neste ciclo: não pode reentrar até ao próprio turno. */
  bunkerReentryBlocked?: boolean;
  /** Mãos venenosas: { turnsLeft, dps } */
  poison?: { turns: number; perTurn: number };
  /** Cura contínua por turno (outras fontes). */
  hot?: { turns: number; perTurn: number };
  /** Sangramento (ex.: Furacão de balas). */
  bleed?: { turns: number; perTurn: number };
  /** Nível da arma principal (loja de cristais); escala skills e ultimate da arma. */
  weaponLevel: WeaponLevel;
  /** Progresso 0–1 para ultimate da arma (cura+escudo / golpes / dano sofrido). */
  weaponUltMeter: number;
  /** Sacerdotisa: PV curados + escudo aplicado por curas (ex. Sentença); recalcula `weaponUltMeter`. */
  weaponUltHealAcc?: number;
  weaponUltHitAcc?: number;
  weaponUltTakenAcc?: number;
  /** Sacerdotisa: snapshot do bônus de passiva em potencial cura (para recalcular no level up). */
  priestPassivePotencialSnapshot?: number;
  /** Gladiador: vitórias em duelo mortal (passiva escalável). */
  gladiadorDuelWins?: number;
  /** Gladiador: PV máx já concedidos pela passiva de duelos (para retroação ao subir nível). */
  gladiadorDuelHpGranted?: number;
  /** Fúria do gigante: turnos restantes; 0 = inativo. */
  furiaGiganteTurns?: number;
  /** Dano base guardado durante Fúria. */
  furiaSavedDano?: number;
  /** PV máx extra adicionados na Fúria (para reverter). */
  furiaExtraMaxHp?: number;
  /** Bônus de regen do Paraíso na terra. */
  paraisoRegenBonus?: {
    turns: number;
    bonusHp: number;
    bonusMana: number;
  };
  /** Ronin overflow já convertido em dano % — simplificado em bonus plano */
  displayColor: number;
  /** Bioma de spawn da wave (XP / IA de foco); só inimigos. */
  enemySpawnBiome?: BiomeId;
  /** Arquétipo do inimigo (visual + XP); ausente em heróis. */
  enemyArchetypeId?: string;
  /** XP concedida ao herói que mata este inimigo (só inimigos). */
  enemyXpReward?: number;
  /** Ouro da wave concedido ao herói que mata (só inimigos). */
  enemyGoldReward?: number;
  /** Chance base (0–1) de cristal ao matar, antes de sorte/meta (só inimigos). */
  enemyCrystalBase?: number;
  /** Elite: cristal garantido (100% antes de outros mods). */
  enemyGuaranteeCrystal?: boolean;
  /** Chefe de marco: garante pelo menos 1 essência do bioma do assassino. */
  enemyGrantsBossEssence?: boolean;
  /** Ataque em área: após acertar o alvo, heróis adjacentes ao alvo também levam o mesmo dano base. */
  enemyAttackKind?: "single" | "aoe1";
  /** Baseline de stats na criação (só heróis). */
  statBaseline?: HeroStatBaseline;
  /** Equipamento forjado (meta) aplicado ao criar a run. */
  forgeLoadout?: ForgeHeroLoadout;
  /** Slot de party 0–2 na formação inicial (= índice em `forgeByHeroSlot` e cor no triângulo). */
  partySlotIndex?: 0 | 1 | 2;
}

export type GamePhase =
  | "main_menu"
  | "crystal_shop"
  | "setup_heroes"
  | "setup_biomes"
  | "setup_colors"
  | "shop_initial"
  | "shop_wave"
  | "combat"
  | "wave_summary"
  | "level_up_pick"
  | "ultimate_pick"
  | "victory"
  | "defeat";

export interface WaveConfig {
  index: number;
  isElite: boolean;
  isBoss: boolean;
}

export interface MetaProgress {
  crystals: number;
  /** 0-5 por trilho de % */
  permDamage: number;
  permHp: number;
  permDef: number;
  permHealShield: number;
  permXp: number;
  permGold: number;
  permCrystalDrop: number;
  /** 0-3 cartas iniciais extra */
  initialCards: number;
  /** Essências por bioma (permanente, drop em combate). */
  essences: Partial<Record<ForgeEssenceId, number>>;
  /** Equipamentos forjados por slot de herói na party (0–2). */
  forgeByHeroSlot: [ForgeHeroLoadout, ForgeHeroLoadout, ForgeHeroLoadout];
  /** Nível da arma principal por slot de party (1–5). */
  weaponLevelByHeroSlot: [WeaponLevel, WeaponLevel, WeaponLevel];
}

export const META_COSTS = [1, 2, 4, 6, 9] as const;
export const INITIAL_CARD_COSTS = [2, 5, 9] as const;
