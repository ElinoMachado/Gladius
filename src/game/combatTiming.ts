/** Tempos alinhados entre GameModel (dano) e GameRenderer / sons (VFX). */
/** Cada hex da animação de movimento (inimigos: ataque só após N × isto). */
export const UNIT_MOVE_SEGMENT_MS = 420;

export const ATIRAR_FIRST_DAMAGE_MS = 200;
export const ATIRAR_STAGGER_MS = 105;
export const DUEL_FIRST_HIT_MS = 520;
export const DUEL_HIT_MS = 600;
export const SENTENCA_ORB_PHASE_MS = 0;
export const SENTENCA_FIRST_DAMAGE_MS = 420;
export const SENTENCA_STAGGER_MS = 115;
export const SENTENCA_HEAL_AFTER_LAST_HIT_MS = 200;
export const BASIC_PISTOL_FLIGHT_MS = 260;
export const BASIC_MAGIC_FLIGHT_MS = 280;
/** Ondas das Minas terrestres (VFX + dano por anel). */
export const BUNKER_MINAS_RING_STAGGER_MS = 160;
export const BUNKER_TIRO_FLIGHT_MS = 520;

/** Furacão de balas (ultimate da arma do pistoleiro): dano e projéteis alinhados ao main/renderer. */
export const FURACAO_ULT_FIRST_DAMAGE_MS = 150;
export const FURACAO_ULT_STAGGER_MS = 68;
export const FURACAO_ULT_PROJECTILE_SEC = 0.09;
/** Após o último impacto: tempo para POW + floats antes de level-up / fim de wave. */
export const FURACAO_ULT_TAIL_BUFFER_MS = 480;
/** Duração do salto 3D do herói durante a ultimate. */
export const FURACAO_ULT_JUMP_MS = 520;

/** Pisotear: golpes visíveis por alvo (evita tudo no mesmo frame). */
export const PISOTEAR_FIRST_DAMAGE_MS = 110;
export const PISOTEAR_STAGGER_MS = 88;
export const PISOTEAR_TAIL_BUFFER_MS = 220;

/** Golpe Relâmpago: salto hex-a-hex visível antes do básico bónus. */
export const GOLPE_RELAMPAGO_MOVE_MS = 340;
/** Sem deslocamento no mapa: pausa antes do impacto para ler o golpe. */
export const GOLPE_RELAMPAGO_WINDUP_MS = 240;

/** Espada do fogo eterno: intervalo entre projéteis da rajada no fim do turno. */
export const ESPADA_FOGO_STAGGER_MS = 72;
export const ESPADA_FOGO_PROJECTILE_SEC = 0.22;

/**
 * Base alinhada a floats de combate (CSS `.combat-float` ~0,92s + margem).
 * Ver também `spawnCombatFloat` remove @ 950ms em main.ts.
 */
export const POST_COMBAT_FLOAT_UI_DELAY_MS = 1050;
/**
 * Depois de toda a fila de dano/VFX terminar: tempo extra antes de abrir level-up
 * (cadeias tipo Golpe Relâmpago, artefatos multi-alvo).
 */
export const POST_COMBAT_FLOAT_LEVEL_UP_UI_DELAY_MS = 1750;
/**
 * Fim de wave após o slot do level-up (ms a mais) para o menu de nível abrir antes do resumo.
 */
export const POST_COMBAT_FLOAT_WAVE_STAGGER_AFTER_MS = 80;
