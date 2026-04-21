import {
  type ColiseumTierId,
  coliseumPhaseIndexFromWave,
  coliseumTierAtRunWave,
  waveIndexWithinColiseumPhase,
} from "./data/coliseums";
import type { CampaignUnlocks, MetaProgress } from "./types";

/** Progressão de campanha (persistido em meta). No sandbox tudo fica disponível via `effectiveCampaignUnlocks`. */
export function defaultCampaignUnlocks(): CampaignUnlocks {
  return {
    crystalShop: false,
    forge: false,
    bunker: false,
    weaponUpgrades: false,
    heroSlots: 1,
  };
}

const LEGACY_FULL: CampaignUnlocks = {
  crystalShop: true,
  forge: true,
  bunker: true,
  weaponUpgrades: true,
  heroSlots: 3,
};

function clampHeroSlots(n: unknown): 1 | 2 | 3 {
  const x =
    typeof n === "number"
      ? n
      : typeof n === "string"
        ? Number(n)
        : NaN;
  if (!Number.isFinite(x)) return 1;
  if (x >= 3) return 3;
  if (x >= 2) return 2;
  return 1;
}

/**
 * Saves antigos sem `campaignUnlocks` tratam-se como progressão já completa (não restringir veteranos).
 */
export function normalizeCampaignUnlocksForLoad(
  raw: unknown,
  legacyFullUnlock: boolean,
): CampaignUnlocks {
  if (legacyFullUnlock) return { ...LEGACY_FULL };
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) {
    return defaultCampaignUnlocks();
  }
  const r = raw as Partial<CampaignUnlocks>;
  return {
    crystalShop: !!r.crystalShop,
    forge: !!r.forge,
    bunker: !!r.bunker,
    weaponUpgrades: !!r.weaponUpgrades,
    heroSlots: clampHeroSlots(r.heroSlots),
  };
}

export function effectiveCampaignUnlocks(
  meta: MetaProgress,
  devSandboxMode: boolean,
): CampaignUnlocks {
  if (devSandboxMode) return { ...LEGACY_FULL };
  return meta.campaignUnlocks;
}

/**
 * Atualiza desbloqueios com base na onda atual da run e no coliseu inicial escolhido.
 * Chamado no início de cada onda (não aplicar em sandbox — o caller deve ignorar).
 */
export function mergeCampaignUnlocksFromRunWave(
  wave: number,
  startTier: ColiseumTierId,
  u: CampaignUnlocks,
): void {
  if (wave < 1) return;
  const tierNow = coliseumTierAtRunWave(wave, startTier);
  const wIn = waveIndexWithinColiseumPhase(wave);
  const phase1 = coliseumPhaseIndexFromWave(wave) === 1;

  if (
    (tierNow === 1 && wIn >= 5) ||
    (startTier > 1 && phase1 && wIn >= 5)
  ) {
    u.crystalShop = true;
  }
  if (
    (tierNow === 1 && wIn >= 10) ||
    (startTier > 1 && phase1 && wIn >= 10)
  ) {
    u.bunker = true;
  }
  if (tierNow >= 2) {
    u.forge = true;
  }
  if (tierNow >= 3) {
    u.weaponUpgrades = true;
  }
  if (
    (tierNow === 2 && wIn >= 5) ||
    (startTier >= 3 && phase1 && wIn >= 5)
  ) {
    u.heroSlots = Math.max(u.heroSlots, 2) as 1 | 2 | 3;
  }
  if (
    (tierNow === 3 && wIn >= 5) ||
    (startTier >= 4 && phase1 && wIn >= 5)
  ) {
    u.heroSlots = 3;
  }
}
