import type { GamePhase } from "./types";

/** Backup da run na sessão do browser (recuperação após F5 / crash / fecho acidental). */
export const RUN_SESSION_STORAGE_KEY = "gladius-run-session-v1";

/** Fases em que a run está “ativa” e deve ser guardada / avisar antes de sair da página. */
export function runPhaseAllowsRunSessionPersistence(phase: GamePhase): boolean {
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

export function clearRunSessionCheckpoint(): void {
  try {
    sessionStorage.removeItem(RUN_SESSION_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function readRunSessionCheckpointJson(): string | null {
  try {
    return sessionStorage.getItem(RUN_SESSION_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function writeRunSessionCheckpointJson(json: string): void {
  try {
    sessionStorage.setItem(RUN_SESSION_STORAGE_KEY, json);
  } catch {
    /* quota / private mode */
  }
}
